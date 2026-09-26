# Hermes Agent 部署与运维手册

> 部署日期：2026-09-26 · 服务器：腾讯云轻量 4C/4G/70G SSD（Ubuntu 22.04，IP 49.235.136.237）
> Hermes 版本：v0.21.5（2026.9.24）· 安装方式：中文社区镜像脚本 + 手工修复
>
> **本文档不含任何密码与 API Key**，真实凭据的存放位置见「安全注意事项」。

---

## 一、部署架构总览

```
用户浏览器
   │  https://49.235.136.237          (TCP 443)  ← 你的入口
   │  https://49.235.136.237:8443     (TCP 8443) ← 家人独立入口（profile: wangying）
   ▼
Nginx（宿主机）          ← 第一层：Basic Auth 门禁（每个入口独立的 htpasswd 文件）
   │  反向代理 + WebSocket 升级 + 50M 上传限制
   ▼
Hermes Dashboard × 2 个实例，彼此完全隔离（会话/记忆/Skills/配置/Key）
   ├─ 127.0.0.1:9119  profile default   ← 服务 hermes-dashboard
   │     第二层：网页登录表单 + Cookie 会话（账号在 systemd 环境变量）
   │     第三层：Host 头校验（dashboard.public_url）
   └─ 127.0.0.1:9120  profile wangying  ← 服务 hermes-dashboard-wangying
         鉴权结构同上，账号独立
   ▼
GLM API (open.bigmodel.cn/api/coding/paas/v4, glm-5.3-flash；两个 profile 各自的 .env)
备用：DeepSeek API（Key 已存于服务器 .env）
```

| 组件 | 落地形式 | 管理命令 |
|---|---|---|
| Dashboard（主） | systemd 服务 `hermes-dashboard`，profile default，端口 9119 | `sudo systemctl status/restart hermes-dashboard` |
| Dashboard（家人） | systemd 服务 `hermes-dashboard-wangying`，profile wangying，端口 9120 | `sudo systemctl status/restart hermes-dashboard-wangying` |
| 反向代理 | Nginx server 块：`hermes`(443) / `hermes-wangying`(8443) | `sudo nginx -t && sudo systemctl reload nginx` |
| 门禁账号 | `/etc/nginx/.htpasswd_hermes`(443) / `.htpasswd_wangying`(8443) | `sudo htpasswd ...`（见第四节） |
| TLS 证书 | Let's Encrypt IP 短证书（6 天有效，**对任意端口通用**），acme.sh cron 自动续期+自动 reload | `~/.acme.sh/acme.sh --info -d 49.235.136.237` |
| 个人网站 | 宿主机 Nginx 80 口静态站（/var/www/xiaomuhub），与 Hermes 互不影响 | — |
| swap | 4G /swapfile（已写入 fstab） | `free -h` |

访问入口：

- 你的入口：**https://49.235.136.237**
- 家人入口：**https://49.235.136.237:8443**（wangying 独立实例，与你的数据完全隔离）

登录均为两步（同一组凭据输两次）：① 浏览器原生弹窗（Nginx 门禁）→ ② 网页登录表单（Dashboard 会话）。

---

## 二、安装过程中发现的问题与修复（重要存档）

本次使用中文社区镜像脚本（res1.hermesagent.org.cn）在**国内 Ubuntu 22.04 服务器**上安装，镜像安装器存在以下问题，均已修复。**下次重装或升级遇到同样报错时按此对照处理。**

### 问题 1：镜像安装器创建了 Python 3.11 venv，但当前版本要求 3.14

**现象**：`hermes` 能出版本号，但实际对话/子命令报 `ModuleNotFoundError: No module named 'ruamel'`、`OpenAI SDK: Not installed`；venv 里核心包（openai/httpx/rich 等）全部缺失。

**根因**：v0.21.x 的 `pyproject.toml` 中核心依赖全部标注 `python_version >= '3.14'`（3.11 无对应 pin），而镜像安装器仍按旧文档建 3.11 venv。

**修复**（在服务器上执行）：

```bash
export PATH="$HOME/.hermes/bin:$PATH"          # uv 在这里
export UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple
cd ~/.hermes/hermes-agent
uv python install 3.14.6                       # 下载托管解释器
rm -rf venv && uv venv venv --python 3.14.6    # 重建 venv
uv sync --frozen --extra web --extra pty --extra cron --extra mcp
```

### 问题 2：`pm/uv.lock` 与源码不一致

**现象**：任何 `hermes` 子命令启动时报：
`error: The lockfile at 'uv.lock' needs to be updated, but '--locked' was provided.`

**根因**：PM 子系统（`pm/` 目录）有自己独立的一对 `pyproject.toml + uv.lock`，镜像分发过程中锁文件与源码版本脱节。**注意：报错里的 uv.lock 指的是 `pm/uv.lock`，不是仓库根目录的。**

**修复**：

```bash
cd ~/.hermes/hermes-agent/pm
uv lock            # 重新生成（该子项目仅 5 个纯 PyPI 依赖，秒级完成）
```

> 坑：在**仓库根目录**跑 `uv lock` 无效且会因 GitHub git 依赖被墙卡死（见问题 3），必须进 `pm/` 目录。

### 问题 3：默认 extras=all 内含 GitHub 直链依赖，国内被墙

**现象**：启动卡在 `hermes: completing source-update dependencies...`，ps 可见子进程
`uv sync --frozen --all-packages --extra all` 长时间无进展；`hermes pm install` 卡在 Installing Python dependencies。

**根因**：extras `all` 里的 `kittentts` 等是 GitHub Releases 直链 wheel，国内无法访问；镜像安装器本以为精简掉了，但 PM 的"安装状态账本"（`~/.hermes/installs/<id>/facts.json`）缺失时回退到 legacy 全量选择（`all`）。

**修复**（三步）：

```bash
# 1. uv 全局走清华镜像（永久）
mkdir -p ~/.config/uv
printf 'index-url = "https://pypi.tuna.tsinghua.edu.cn/simple"\n' > ~/.config/uv/uv.toml

# 2. 补写安装状态账本，指定实际需要的 extras（键名是 "schema" 不是 "schemaVersion"）
#    文件：~/.hermes/installs/<install-id>/facts.json
{ "schema": 1,
  "packages": { "venv": {
      "stamp": "00...（64个0）",
      "extras": ["cron", "mcp", "pty", "web"] } } }
# stamp 故意填全 0 → PM 判定"过期"后自动按上述 extras 重新同步并回写真实 stamp

# 3. 触发一次同步让它完成（首次较久）
hermes -z "hi"
```

### 问题 4：`hermes pm install` 卡在 agent-browser

**现象**：工具安装阶段卡在 `→ Installing agent-browser (browser tools...)`。

**根因**：agent-browser 附带浏览器组件下载（镜像安装器当初特意跳过的部分），国内不可达。

**修复**：不需要浏览器自动化就跳过它：

```bash
hermes pm install --without agent-browser
```

（本次最终 facts.json 回写的 extras 为 all+computer-use+doc-extract+vision+web，配合镜像全部装成；agent-browser 用上法排除。）

### 问题 5：acme.sh 官方安装脚本在国内失败

**现象**：`curl https://get.acme.sh | sh` 输出 `Install error / 中国大陆用户请参考...`。

**修复**：走 gitee 镜像：

```bash
git clone --depth 1 https://gitee.com/neilpang/acme.sh.git /tmp/acme.sh
/tmp/acme.sh/acme.sh --install -m <你的邮箱> --home ~/.acme.sh
```

### 问题 6：IP 证书 tls-alpn 验证失败 → 改用 webroot

**现象**：`--alpn` 模式签发报 `Timeout during connect` 或 `Connection refused`（前者=腾讯云防火墙未放行 443；后者=nginx 与 acme.sh 抢 443 的时序问题）。

**修复**：本机 80 口本来就是活的静态网站，直接用 **webroot 模式**，零停机、不动 nginx：

```bash
mkdir -p /var/www/xiaomuhub/.well-known/acme-challenge
~/.acme.sh/acme.sh --issue --server letsencrypt -d 49.235.136.237 \
  -w /var/www/xiaomuhub --keylength ec-256 --certificate-profile shortlived
~/.acme.sh/acme.sh --install-cert -d 49.235.136.237 --ecc \
  --fullchain-file /etc/nginx/ssl/fullchain.pem \
  --key-file       /etc/nginx/ssl/privkey.pem \
  --reloadcmd "sudo systemctl reload nginx"
```

前提：腾讯云防火墙放行 TCP 443（已在控制台操作过）。

### 问题 7：Dashboard 的 Host 头校验返回 400

**现象**：通过公网 IP 访问返回
`{"detail":"Invalid Host header. Dashboard requests must use the bound hostname or the configured public hostname."}`

**根因**：Dashboard 有 DNS 重绑定防护（GHSA-ppp5-vxwm-4cf7），反代场景必须显式声明信任的公网主机名；且声明非回环地址后会强制启用内层鉴权（fail-closed）。

**修复**：

```bash
hermes config set dashboard.public_url https://49.235.136.237
# 同时在 systemd unit 里配置 HERMES_DASHBOARD_BASIC_AUTH_USERNAME/_PASSWORD（见第六节）
sudo systemctl daemon-reload && sudo systemctl restart hermes-dashboard
```

### 经验总结

- 镜像安装器产物**默认不可用**，三处修复（3.14 venv / pm 锁 / extras）缺一不可；
- 已做的长效配置：`~/.config/uv/uv.toml`（清华 PyPI）、npm registry 已切 npmmirror；
- 以后任何 `hermes` 命令若又出现 `completing source-update dependencies` 且超过 2 分钟无输出，基本可判定又撞上 GitHub 依赖，**Ctrl+C 后按问题 2/3 排查，不要干等**。

---

## 三、日常使用

- **你的入口**：https://49.235.136.237 ；**家人入口**：https://49.235.136.237:8443（wangying 独立实例）。登录两步：浏览器原生弹窗（Nginx 门禁）→ 网页登录表单（Dashboard 会话），两层账号密码一致，输同一组即可。
- **Chat 页**：完整 TUI 内嵌（WebSocket），可斜杠命令、恢复历史会话；让 agent 生成 Word/Excel 后可在网页中查看/下载。
- **其他页**：Status（状态）、Config（图形化改 150+ 配置）、API Keys（网页上管理 .env 密钥）、Sessions（全文搜索历史）、Logs、Analytics（用量与成本）、Cron（定时任务）。
- **CLI 直连**（服务器上）：`hermes`（交互，默认 profile）、`wangying`（该 profile 的别名命令，profile create 时自动生成）、`hermes -z "一句话"`（一次性）、`hermes profile list`（查看所有实例）。
- **手机/平板**：浏览器直接访问对应入口地址，无需装任何 App。
- **内存特征**：每打开一个 Chat 页，服务器会孵化一组 TUI 进程（python + node，约 350MB/组），页面关闭后约 10 分钟空闲自动回收。期间 `free -h` 的 used 偏高属正常现象，无需处理；反复刷新/重连 Chat 页可能叠加多组进程，等自动回收即可。

---

## 四、账号管理

当前采用**独立 profile 多实例**模式：每个用户一个 Hermes profile + 一个专属端口入口，数据完全隔离。当前实例：

| 入口 | profile | systemd 服务 | Nginx 门禁文件 | Dashboard 层账号 |
|---|---|---|---|---|
| https://49.235.136.237 | default | `hermes-dashboard` | `/etc/nginx/.htpasswd_hermes` | systemd 环境变量 |
| https://49.235.136.237:8443 | wangying | `hermes-dashboard-wangying` | `/etc/nginx/.htpasswd_wangying` | systemd 环境变量 |

鉴权真实模型（实测确认，修正早期认知）：

- **Nginx 层**：Basic Auth 门禁，浏览器原生弹窗，决定"谁能连到这个实例"；
- **Dashboard 层**：网页登录表单 + Cookie 会话（`auth_flows: cookie`），决定"能否用这个实例"，受保护 API（sessions/config/keys）无有效会话一律 401。Basic 头**不会**被 Dashboard 直接采信，因此每层各输一次、两层账号密码配成一致即可；
- `/api/status` 是设计上公开的健康检查端点（暴露版本/组件状态，无敏感数据），公网可达属预期。

### 4.1 新增一个独立用户（完整流程）

以新增用户 `xiaoming`、端口 `8444`（内部 9121）为例：

```bash
# ① 创建 profile（--clone 从 default 克隆模型配置/API Key/SOUL/Skills；--bare 则全新空白）
hermes profile create xiaoming --clone
hermes --profile xiaoming config set dashboard.public_url https://49.235.136.237:8444

# ② systemd 服务（账号密码即该用户的 Dashboard 登录凭据）
sudo tee /etc/systemd/system/hermes-dashboard-xiaoming.service > /dev/null <<'EOF'
[Unit]
Description=Hermes Agent Dashboard (profile: xiaoming)
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=ubuntu
Environment=HERMES_DASHBOARD_BASIC_AUTH_USERNAME=xiaoming
Environment=HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=该用户密码
ExecStart=/home/ubuntu/.local/bin/hermes --profile xiaoming dashboard --isolated --host 127.0.0.1 --port 9121 --no-open
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload && sudo systemctl enable --now hermes-dashboard-xiaoming

# ③ Nginx 入口（复用同一张 IP 证书，任意端口通用）
sudo htpasswd -bB -c /etc/nginx/.htpasswd_xiaoming xiaoming 该用户密码
sudo tee /etc/nginx/sites-available/hermes-xiaoming > /dev/null <<'EOF'
server {
    listen 8444 ssl default_server;
    listen [::]:8444 ssl default_server;
    server_name 49.235.136.237;
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    client_max_body_size 50m;
    auth_basic "Hermes (xiaoming)";
    auth_basic_user_file /etc/nginx/.htpasswd_xiaoming;
    # Safari/iOS 不在 WebSocket 升级请求携带 Basic 凭据：WS/SSE 端点豁免外层门禁，
    # 这些端点由 Dashboard 的 ws-ticket 会话鉴权保护（漏配会导致 iOS 进 Chat 页登录死循环）
    location ~ ^/api/(ws|pty|events) {
        auth_basic off;
        proxy_pass http://127.0.0.1:9121;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
    location / {
        proxy_pass http://127.0.0.1:9121;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/hermes-xiaoming /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

④ 腾讯云控制台防火墙放行 TCP 8444（每个新端口都要放行一次）。

**端口分配约定**：入口端口从 8443 起递增（8443=wangying、8444=xiaoming…），内部端口从 9120 起递增，避免混乱。

> ⚠️ **`--isolated` 不能省**：dashboard 默认是"机器级单例"模式——`--profile X dashboard` 不带 `--isolated` 时会路由到已运行的 machine dashboard（由主实例服务），并非独立进程。多实例部署时每个 unit 必须带 `--isolated`。

> **隔离边界**：profile 方案提供的是**数据分目录 + 独立账号入口**（各自的会话/记忆/Skills/.env/模型 Key），两个实例的 systemd 服务完全独立、可同时运行互不影响。但同一机器上的所有 profile 在 Dashboard UI 的 profile 切换器里**互相可见**——wangying 登录后理论上可切到 default 查看你的会话，反之亦然。对家人/信任圈内用户够用；需要真正的数据访问隔离时，须知 Hermes dashboard 是机器级视角，进程参数做不到，只能上操作系统级手段（独立 Linux 用户 + 各自完整安装），成本高且 PM 拒绝跨用户共享代码树，不推荐。

### 4.2 账号的日常操作

```bash
# 改某用户的 Nginx 门禁密码（对已有用户重设即覆盖）
sudo htpasswd -B /etc/nginx/.htpasswd_wangying wang.ying

# 改某用户的 Dashboard 登录密码（改 systemd 环境变量）
sudo systemctl edit --full hermes-dashboard-wangying   # 改 _PASSWORD 行
sudo systemctl daemon-reload && sudo systemctl restart hermes-dashboard-wangying

# 查看某入口现有账号
cut -d: -f1 /etc/nginx/.htpasswd_wangying

# 每次 htpasswd 改动后生效
sudo systemctl reload nginx
```

> 注意：htpasswd 加 `-c` 会清空整个文件重建，对已有文件操作**不要带 -c**。两层密码建议保持一致（浏览器两步输同一组，体验顺）。

### 4.3 停用/启用某个实例（互不影响）

各实例是完全独立的 systemd 服务：

```bash
sudo systemctl stop hermes-dashboard                 # 临时停用你的实例（重启服务器后自启恢复）
sudo systemctl disable --now hermes-dashboard        # 彻底停用（不开机自启，数据保留）
sudo systemctl enable --now hermes-dashboard         # 恢复
```

停用后验证内存是否释放：`free -h` 看 used；若不降，用 `sudo ss -tlnp | grep 9119` 查是否有孤儿进程仍占端口（历史上 machine dashboard 模式产生过孤儿后端，见 4.1 的 `--isolated` 提醒），`sudo kill <PID>` 后即释放。

### 4.4 删除一个独立用户

```bash
sudo systemctl disable --now hermes-dashboard-xiaoming     # 停服务
sudo rm /etc/systemd/system/hermes-dashboard-xiaoming.service
sudo rm /etc/nginx/sites-enabled/hermes-xiaoming /etc/nginx/sites-available/hermes-xiaoming
sudo rm /etc/nginx/.htpasswd_xiaoming
sudo nginx -t && sudo systemctl reload nginx
hermes profile delete xiaoming -y        # 删除数据（会话/记忆/Skills）
# 可选：腾讯云防火墙回收 8444
```

### 4.5 备选：共用实例（不做数据隔离）

如果不需要隔离，把对方账号加进任一入口的 htpasswd 即可共享该实例（`sudo htpasswd -B ...`，无 -c）。对方与该实例所有者看到相同会话/记忆，并共用 `.env` 里的模型 Key 额度。早期曾用过"Nginx 校验后注入 Authorization 头"的做法，实测 Dashboard 不采信 Basic 头（表单+Cookie 模型），该注入已移除，勿再使用。

---

## 五、模型管理

当前默认：provider `zai`（智谱 GLM），模型 `glm-5.3-flash`，端点 `https://open.bigmodel.cn/api/coding/paas/v4`（GLM coding plan 专用计费通道，勿改成普通 paas 端点，会报余额不足）。

### 切换模型

```bash
# 方式 1：交互式（推荐，列表即当前可选项）
hermes model

# 方式 2：直接改配置
hermes config set model.provider zai            # 或 deepseek / kimi-coding / minimax-cn ...
hermes config set model.default  glm-5.3-flash  # 或 deepseek-chat 等
hermes config get model.default                 # 查看当前

# 方式 3：单次会话临时切换（不动默认配置）
hermes -m glm-5.2 --provider zai
```

网页端：Dashboard → **Config** 页同样可以改 model 段，保存后新会话生效。

### 添加新的模型供应商

1. 把对应 API Key 写入 `~/.hermes/.env`（已有：`GLM_API_KEY`、`DEEPSEEK_API_KEY`；常用对照：智谱=`GLM_API_KEY`、DeepSeek=`DEEPSEEK_API_KEY`、Kimi=`KIMI_API_KEY`、MiniMax 国内=`MINIMAX_CN_API_KEY`）；
2. `chmod 600 ~/.hermes/.env`；
3. 运行 `hermes model` 选择新供应商/模型，或用 `hermes config set` 手动指定；
4. 网页端：Dashboard → **API Keys** 页可图形化填 Key。

> coding plan 类 Key 的坑：Hermes 对 GLM/Kimi 的订阅型 Key 有专门的 coding 端点探测逻辑（`hermes_cli/auth_zai_kimi.py`）。若换了新 Key 后报 "Insufficient balance"，通常是端点与 Key 类型不匹配，重新执行 `hermes model` 让它重新探测，或手动设置正确的 `model.base_url`。

---

## 六、安全注意事项

- **本文档与代码仓库中一律不放真实密码/密钥**。真实凭据只存在于服务器上：
  - Nginx 门禁账号：`/etc/nginx/.htpasswd_hermes`（443）、`/etc/nginx/.htpasswd_wangying`（8443），每新增用户一个文件
  - Dashboard 登录账号：各 `hermes-dashboard*.service` systemd unit（root 可读）
  - 模型 API Key：各 profile 的 `.env`（default 在 `~/.hermes/.env`，wangying 在 `~/.hermes/profiles/wangying/.env`，权限 600）
- **截图/分享日志前先脱敏**：`hermes` 的输出有自动 redaction，但 nginx 日志、systemd unit、`.env` 内容不会。
- 初次部署用的登录密码偏弱，**建议尽快更换**（第四节有完整流程，两层一起改）。
- 9119/9120 端口仅监听 127.0.0.1，公网不可达；公网只暴露 443 与 8443。
- `/api/status` 端点公开（仅版本/健康信息，设计如此）；受保护数据端点均有会话鉴权，已实测 401。
- 备份文件 `tar czf hermes-backup.tgz ~/.hermes` **内含全部 API Key**，存放需加密或限定权限，不要放进网站目录/网盘公开链接。
- 服务器侧护栏：agent 可执行命令，切勿把 sudo 免密开放给 ubuntu 之外的用户；如需更高隔离可将 terminal 后端切为 docker（`hermes config set terminal.backend docker`，需先装 Docker）。
- profile 隔离的是 Hermes 状态层（数据/配置/密钥），不是操作系统层——多 profile 的 agent 仍跑在同一台机器上，完全外部人员慎用（见 terminal 后端 Docker 化）。

---

## 七、更新与维护

### 升级 Hermes

```bash
hermes update          # 拉取上游并自动完成依赖同步（全部 profile 共用同一份代码）
hermes --version       # 确认版本
sudo systemctl restart hermes-dashboard hermes-dashboard-wangying   # 让所有常驻服务用上新版
```

> ⚠️ 升级是最容易触发第二节问题 2/3 的场景（源码更新后 pm/uv.lock 再次脱节、重新进入全量同步）。若卡在 `completing source-update dependencies` 超过 2 分钟：Ctrl+C → `cd ~/.hermes/hermes-agent/pm && uv lock` → 重试。升级前先做备份（见下）。

### 健康自检

```bash
hermes pm doctor                          # 工具链体检
hermes profile list                       # 实例清单
sudo systemctl status hermes-dashboard hermes-dashboard-wangying   # 服务状态
journalctl -u hermes-dashboard-wangying -f    # 实时日志（换 -u 看别的实例）
curl -s -u <账号> https://49.235.136.237/api/status | head -c 300        # 公网探活（主）
curl -s -u <账号> https://49.235.136.237:8443/api/status | head -c 300   # 公网探活（家人）
```

### 证书（自动，无需人工）

```bash
crontab -l | grep acme                    # 每天 4 次自动检查续期（ARI 择期）
~/.acme.sh/acme.sh --info -d 49.235.136.237   # 查看当前证书与下次续期时间
```

续期走 webroot（80 口），成功后自动 reload nginx，全程无感。证书为 6 天短证书属正常设计。

### 备份与恢复

```bash
tar czf hermes-backup-$(date +%F).tgz ~/.hermes   # 会话/记忆/Skills/配置/API Key 全在里面
# 恢复：新机器装好 hermes 后，解包覆盖 ~/.hermes 再重启服务即可
```

建议放入 crontab 每日备份并转存（注意第六节的密钥提醒）。

---

## 八、后续规划（备案通过后）

1. **切域名**：DNS 解析 `hermes.<你的域名>` → 49.235.136.237；acme.sh 用 DNS-01（DNSPod API）签 90 天证书；Nginx 加 `server_name hermes.<你的域名>` 的 server 块（与 IP 入口并存，零停机）；`hermes config set dashboard.public_url https://hermes.<你的域名>`；停用 6 天 IP 证书的续期任务。
2. **接企业微信**：`hermes gateway setup` 选 WeCom，回调 URL 填域名地址，`hermes gateway install` 装成服务；届时手机上直接在企业微信里和 agent 对话（生成交付文件也可直接发送）。网关支持多路复用（multiplex）模式，可同时伺服 default + wangying 两个 profile（聊天账号经 allowlist 映射到各自实例），届时家人无需再开网页。
