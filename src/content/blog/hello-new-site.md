---
title: '新站上线：从 WordPress 到自己的服务器'
description: '告别过期的域名和 WordPress，用 Astro + 腾讯云重新搭一个完全属于自己的小站。'
pubDate: 2026-09-13
category: '生活'
tags: ['建站', 'Astro']
---

几年前我在 WordPress 上搭过一个个人博客，后来域名过期，更新也就慢慢停了。这次决定重新来过：代码放在自己的 GitHub 仓库里，用 Astro 生成静态页面，部署在自己的腾讯云服务器上。

## 为什么不再用 WordPress

- 想要一个**完全可控**的站点：文章就是仓库里的 Markdown 文件，版本历史天然由 Git 管理
- 静态站没有数据库、没有插件升级，安全维护成本几乎为零
- 写作流程更顺：本地写好 `git push`，自动构建部署上线

## 这个站怎么运作

```text
本地写 Markdown → git push → GitHub Actions 构建 → 同步到服务器 Nginx
```

后面会陆续把旧站里值得保留的项目和文章搬过来，也会继续写一些新的技术笔记和生活想法。

欢迎常来逛逛。
