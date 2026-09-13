# XiaomuHub 个人网站执行计划

> 本文档是个人网站项目的总体执行计划，按阶段推进，每个阶段可独立完成并验收。
> 创建时间：2026-09-13

## 1. 项目目标

- 个人网站：展示**工作经历与项目作品** + 分享**技术/生活想法**（博客）
- 风格参考旧 WordPress 站：`https://zhangxiaomu01.wordpress.com/`（简洁 Portfolio 风格：项目卡片 + 文章 + 标签/分类体系）
- 部署在自己的腾讯云服务器上，先公网 IP 访问，后续绑定域名
- 代码托管在本仓库，可持续维护

## 2. 已确认的技术决策

| 决策项 | 选择 | 说明 |
|---|---|---|
| 站点类型 | **Astro 静态站点** | 内容构建成纯静态 HTML，无数据库，安全、快、免运维 |
| 写作流程 | **本地 Markdown → git push 自动部署** | 文章即仓库中的 `.md` 文件 |
| 代码托管/CI | **GitHub + GitHub Actions** | Actions 构建后通过 SSH 同步到服务器 |
| 评论系统 | **Giscus** | 基于 GitHub Discussions，零运维，评论数据存于本仓库 |
| 内容语言 | **中文为主** | 项目展示可保留英文 |
| 旧站内容 | **只迁移精选** | 旧站仍在线，随时可回看复制 |

## 3. 运行环境

| 资源 | 配置 |
|---|---|
| 服务器 | 腾讯云 2 核 CPU / 4G 内存 / 70G SSD / 6M 带宽 |
| 服务器软件 | 仅 Nginx（构建在 GitHub Actions 完成，服务器无需 Node.js） |
| 带宽注意 | 6M ≈ 750KB/s 下行，**图片必须压缩**（WebP、单页资源控制在 1MB 左右） |

## 4. 网站信息架构（仿旧站结构）

```
/                 首页：个人介绍 + 精选项目卡片
/projects         项目列表
/projects/[id]    项目详情（背景、职责、图片/视频、代码链接）
/blog             文章列表（支持分类 + 标签，对应旧站 Categories/Tags）
/blog/[id]        文章详情（含 Giscus 评论）
/about            关于我：工作经历时间线、技能、联系方式
/rss.xml          RSS 订阅
```

风格要点（延续旧站观感）：
- 白底、简洁排版、内容优先
- 项目以"卡片/标题段落"形式呈现，配效果图
- 保留分类（Articles / Projects / Photography）与标签体系

## 5. 仓库目录规划

Astro 项目直接放在仓库根目录：

```
XiaomuHub/
├── website-design/      # 设计与计划文档（本文件）
├── src/
│   ├── pages/           # 路由页面
│   ├── content/         # 内容集合（blog/、projects/ 下的 .md 文件）
│   ├── layouts/         # 页面布局
│   └── components/      # 组件（项目卡片、文章列表、评论等）
├── public/              # 静态资源（favicon、图片等）
├── astro.config.mjs
└── .github/workflows/   # CI 部署流程
```

## 6. 分阶段执行计划

### 阶段 0：环境准备 ✅（2026-09-13 完成）

**本地（Windows）：**
- [x] 安装 Node.js LTS（v22+）— v22.16.0 / npm 10.9.2
- [x] 确认 git 可用、配置用户名邮箱 — git 2.50.0
- [x] 注册/确认 GitHub 账号 — zhangxiaomu01
- [x] 生成本地 SSH 密钥 — `~/.ssh/id_ed25519`（GitHub 与服务器共用）

**服务器（Ubuntu 22.04.5，IP `49.235.136.237`，用户 `ubuntu` 免密 sudo）：**
- [x] 系统更新并重启（新内核已生效）
- [x] SSH 加固：`/etc/ssh/sshd_config.d/99-hardening.conf` 禁用密码登录与 root 登录，仅密钥认证
- [x] 安装 Nginx — 1.18.0（镜像自带），服务运行中
- [x] 腾讯云安全组：22、80 已放行（公网实测通过）
- [ ] **安全组放行 443**（HTTPS，阶段 5 前需在腾讯云控制台添加入站规则：TCP 443，源 0.0.0.0/0）

**验收：** 本地工具链正常 ✓；`http://49.235.136.237` 公网可访问 Nginx 默认页（HTTP 200）✓

远程连接服务器：ssh ubuntu@49.235.136.237

### 阶段 1：站点骨架搭建 ✅（2026-09-13 完成）

- [x] 初始化 Astro 项目（根目录即本仓库）— Astro 5.18.2，手写最小化脚手架（package.json / astro.config.mjs / tsconfig）
- [x] 建立目录结构（见第 5 节）
- [x] 定义内容集合：`blog`（title/description/pubDate/category/tags/draft）、`projects`（title/description/period/date/cover/links/featured/draft），Zod schema 校验
- [x] 实现基础布局与页面：首页（Hero+精选项目+最新文章）、项目列表/详情、博客列表/详情（含评论占位）、关于（时间线+技能+联系方式）
- [x] 移动端适配（响应式，640px 断点）

**验收：** `npm run build` 生成 11 个静态页面 ✓；`npm run dev` 本地 4321 端口 6 条路由实测全部 200 ✓

### 阶段 2：内容填充与精选迁移 ✅（2026-09-13 完成）

迁移范围（用户指定）：旧站 Home / Projects / Photography / Art Gallery / About Me

- [x] 旧站 5 个页面全部抓取（含隐藏在画廊里的图片 URL 与 Vimeo 视频清单）
- [x] 下载 44 张原图（83MB）到 `src/assets/`，构建时自动压缩为 WebP（最大断点 1668px，单图最大约 1.5MB，懒加载）
- [x] 首页对齐旧站 Home：Hero 介绍 + 精选项目完整展示（Project Overview 结构，新项目设 `featured: true` 即上首页）
- [x] /projects/ 按旧站结构分组：研究项目 → 游戏与互动媒体 → 公司作品（含 Qingty 公司介绍）；共 9 个项目
- [x] Photography（Minerals / Macrophotography 两篇）并入博客"摄影"分类；Art Gallery 做成独立文档页 `/blog/gallery/`（9 幅作品）
- [x] About Me 迁译到关于页（去掉过时的求职文字，"至今"一栏留空待用户填写；补充 Qingty 经历）
- [x] 内容全部翻译为中文（技术名词/项目名保留英文）；Vimeo 视频采用"嵌入 + 外链"方案（国内打不开播放器时可点链接）
- [x] 遗留项处理：行星项目 LOD 演示动图已压缩为动态 WebP（21MB GIF → 3.4MB，600px/87 帧，`public/images/lod.webp`，懒加载）
- [ ] **遗留项**：关于页"至今"一栏待用户填写

**验收：** `npm run build` 生成 19 个静态页面 ✓；本地 10 条路由实测全部 200 ✓

### 阶段 3：评论接入（Giscus）

- [ ] 本仓库开启 GitHub Discussions 功能
- [ ] 在 [giscus.app](https://giscus.app/zh-CN) 生成配置（仓库、映射方式、主题）
- [ ] 文章详情页嵌入 Giscus 组件（本地先放占位，部署后才能真正评论）

**验收：** 本地文章页出现评论区占位/组件，无报错。

### 阶段 4：自动部署上线（公网 IP 访问） ✅（2026-09-13 完成）

- [x] GitHub 远程仓库 `zhangxiaomu01/XiaomuHub`（Public，Giscus 依赖公开仓库）已建立并推送全部代码
- [x] 服务器：部署目录 `/var/www/xiaomuhub`；Nginx 站点配置（gzip、`/_astro/` 永久缓存、`/images/` 7 天缓存、安全头），配置副本存档于 `website-design/nginx/xiaomuhub.conf`
- [x] CI 专用部署密钥 `~/.ssh/xiaomuhub_deploy`（与个人密钥分离，便于吊销）；GitHub Secrets：`SERVER_HOST` + `SERVER_SSH_KEY`（私钥单行 base64，杜绝多行粘贴损坏）
- [x] Actions workflow（`.github/workflows/deploy.yml`）：push main / 手动触发 → npm ci → astro build → rsync（含密钥指纹日志）→ reload nginx，并发去重
- [x] push 触发部署实测通过，公网验收 200

**过程中解决的坑（备忘）：**
1. runner 无 `~/.ssh` 目录 → 重定向失败（workflow 内 `mkdir -p ~/.ssh`）
2. rsync 未指定 `-e "ssh -i ..."` → 空手握手被拒（低级失误，日志指纹验证钥匙本身是好的）
3. 本地 `github.com:443` 间歇阻断 → 配置 `~/.ssh/config` 走 `ssh.github.com:443` SSH 通道推送，稳定
4. 多行私钥经剪贴板粘贴易损坏 → Secret 改存单行 base64（workflow 内解码）

**验收：** `git push` 后约 3 分钟（构建 ~1.5 分钟 + 约 50MB 产物按服务器 6M 入口带宽同步 ~1.5 分钟），`http://49.235.136.237` 自动更新 ✓（Giscus 评论待阶段 3 接入）

### 阶段 5：域名 + HTTPS

- [ ] 购买域名（可在腾讯云）
- [ ] **提交 ICP 备案**（国内服务器绑定域名必须备案，审核周期通常 1–2 周，期间可先用 IP 访问）
- [ ] 备案通过后：DNS A 记录指向公网 IP；Nginx 配置 `server_name`
- [ ] 申请 HTTPS 证书（腾讯云免费证书或 certbot），Nginx 配置 443 + HTTP 跳转

**验收：** `https://<域名>` 正常访问，浏览器显示安全锁。

### 阶段 6：持续完善（上线后按需进行）

- [ ] SEO 基础：sitemap、robots.txt、页面 meta/OG 标签
- [ ] 站点统计（可选：自部署 Umami，或先用不依赖外网的分析方案）
- [ ] 备份策略：代码天然有 GitHub 兜底；将 Nginx 配置副本纳入本仓库 `website-design/`
- [ ] 可选进阶：文章全文搜索（Pagefind）、图片上腾讯云 COS+CDN、摄影作品集页面

## 7. 风险与注意事项

| 风险 | 应对 |
|---|---|
| 6M 带宽下大图加载慢 | 统一压缩/WebP；首屏控制资源体积；后期可上 COS+CDN |
| 域名未备案无法绑定国内服务器 | 测试期用 IP 访问；域名购买后尽早发起备案 |
| GitHub 访问波动（本地 push 慢） | 只影响发布动作，站点访问不受影响；必要时重试 |
| 服务器单点故障 | 内容与代码都在 Git 中，随时可重建；定期确认 Actions 部署正常 |

## 8. 建议执行顺序

阶段 0 → 1 → 2 → 4 可先跑通"上线"主链路（评论占位），阶段 3 评论接入穿插在阶段 2/4 之间均可，阶段 5 待域名购买后进行。每个阶段可直接交给 AI 助手按本计划逐步执行。
