# 项目文档

`docs/` 存放使用说明、源码导航和部署资料

```text
docs/
├─ User-Safari.md                  访客使用说明
├─ CODE-READING.md                 源码阅读导航
├─ deployment/DEPLOY-FC.md         阿里云 FC 部署说明
└─ 泥云智探更新与使用手册.docx      完整图文手册
```

常用入口：

- [访客使用说明](./User-Safari.md)
- [源码阅读导航](./CODE-READING.md)
- [FC 部署说明](./deployment/DEPLOY-FC.md)
- [项目总览](../README.md)

网站资源存放在 `assets/` 中，移动文件时同步更新页面、CSS 或 `data/media-config.ts` 中的路径。修改 TypeScript 后运行 `npm run compile:frontend`，生成 `.runtime/` 中的浏览器脚本

运行 `npm run package:fc`，部署包生成在根目录的 `releases/` 中
