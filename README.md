# 泥云智探

泥云智探整理齐鲁封泥的图片、印文和地理资料，提供数字手卷、支教课件、3D 地图、封泥牌具、AI 问答和知识测验

由 [Windy-Field](https://github.com/Windy-Field) 开发维护，源码见 [Windy-Field/Dirt](https://github.com/Windy-Field/Dirt)

[访问网站](https://www.niyunzhitan.cn) · [访客使用说明](./docs/User-Safari.md)

## 本地运行

本地构建需要 Node.js 20.19+ 或 22.12+，建议使用 LTS 版本

```powershell
npm install
npm start
```

`npm start` 会先构建前端，再启动 `server.js`。浏览器访问 `http://127.0.0.1:3000` 即可

只调试前端时可以运行：

```powershell
npm run dev
```

常用命令：

```powershell
npm run check       # 检查 TypeScript 编译结果和 JavaScript 语法
npm run build       # 生成 dist/
npm run build:three # 重新生成按需版 Three.js
npm run db:seed     # 写入数据库种子数据
npm run package:fc  # 生成阿里云 FC 部署包
```

页面结构在根目录的 `index.html` 中修改，`dist/index.html` 由构建脚本生成

双击 `index.html` 可预览静态内容，首次打开前运行 `npm run build`。AI 和数据库功能需要启动 `server.js`

## 网站功能

- 数字手卷介绍封泥从书写、系绳到验封的过程，支持按钮、键盘、滚轮、拖动和触屏滑动
- 齐鲁封泥图鉴展示代表藏品，完整图录收录 45 个现代县区的资料
- 地图有精细立体版和简化平面版，可以筛选青州、兖州、徐州等历史行政体系。地点详情显示现代位置、古代归属和资料数量
- 课程区提供三课时课件、原始 PDF、教案学习单和支教活动回顾视频。课件进度条和视频进度条都可以拖动
- 封泥牌具用 Three.js 展示麻将和扑克牌，可旋转、缩放、翻面、切换款式和全屏查看
- “印小灵”支持文字提问和图片辅助观察。一次最多上传 4 张 JPEG、PNG 或 WebP 图片，每张不超过 5 MB
- 趣味问答每轮最多抽取 10 道题，提交答案后显示解析
- 显示设置包含浅色、深色、昼夜自动主题，以及动效、背景微尘、鼠标尾迹、开屏动画、音乐和宠物设置

## 代码结构

页面主体使用原生 HTML、CSS 和 TypeScript，趣味问答使用 Vue 3，由 Vite 编译。普通前端脚本通过 `window` 上的对象共享功能，因此也能支持本地双击预览。TypeScript 源码在 `js/*.ts` 和 `data/*.ts` 中，编译后的浏览器脚本位于 `.runtime/` 目录

模块职责、生成文件来源和验证方法见[源码阅读导航](./docs/CODE-READING.md)

## 数据和配置

项目默认读取 `data/` 中的本地数据：

```js
USE_DATABASE: false,
USE_QUIZ_DATABASE: false
```

这两个开关位于 [js/config.ts](./js/config.ts)，可以分别启用栏目数据库和题库数据库。数据库准备方法见[数据库说明](./db/README.md)

课程、音乐和牌具贴图配置在 [data/media-config.ts](./data/media-config.ts)。本地资源使用 `./assets/` 相对路径，外部资源使用 HTTPS，并将主机名加入 `allowedExternalHosts`

资源维护说明：

- [课程资源](./assets/courses/README.md)
- [封泥牌具贴图](./assets/textures/README.md)
- [山东地形数据](./assets/terrain/README.md)

## AI 配置

复制 `.env.example` 为 `.env`，至少填写百炼 API Key：

```env
DASHSCOPE_API_KEY=你的百炼API Key
DASHSCOPE_APP_ID=c786fc9824414081980b6aa3258bb787
QWEN_VL_MODEL=qwen-vl-plus
```

API Key 存放在本地 `.env` 或 FC 环境变量中，前端和仓库仅保留配置示例

服务启动后可检查：

```text
GET http://127.0.0.1:3000/api/health
GET http://127.0.0.1:3000/api/ai/status
```

`/api/ai/status` 会调用百炼应用并消耗额度，成功结果缓存 5 分钟，失败结果缓存 15 秒。`configured` 表示配置是否齐全，`connected` 表示连通状态。监测服务器在线情况使用 `/api/health`

线上密钥在 FC 控制台配置，服务端优先读取环境变量中的应用 ID

## Umami 统计

Umami Cloud 配置在 [js/config.ts](./js/config.ts)，仅统计 `niyunzhitan.cn` 和 `www.niyunzhitan.cn` 的访问，并遵循浏览器的 Do Not Track 设置

更换 Umami 站点时，修改以下三项：

```js
UMAMI_WEBSITE_ID: "新的 Website ID",
UMAMI_SCRIPT_URL: "https://cloud.umami.is/script.js",
UMAMI_DOMAINS: "niyunzhitan.cn,www.niyunzhitan.cn",
```

留空 `UMAMI_WEBSITE_ID` 即可关闭统计。使用自建 Umami 时，还要在 `server.js` 的 CSP 中放行新的脚本和上报域名

## Three.js 和地图

[js/vendor/three.js](./js/vendor/three.js) 由 Three.js 0.160.0 按需构建，导出列表位于 [scripts/three-entry.js](./scripts/three-entry.js)。新增 `THREE.xxx` 调用后，补充对应导出，再运行 `npm run build:three`

地图参数放在 `js/three-map.ts` 顶部的 `MAP_VIEW`，牌具参数放在 `js/three-showcase.ts` 顶部。Three.js 许可证见 [LICENSE.three.txt](./js/vendor/LICENSE.three.txt)

浅色线表示现代市界，蓝色表示主要河流和湖区。数据来源、示意范围和更新方法见[山东地形数据说明](./assets/terrain/README.md)

## 构建和发布

构建前端：

```powershell
npm run build
```

生成 FC 包：

```powershell
npm run package:fc
```

也可双击根目录的 `package-fc.cmd` 打包。脚本会检查源码、重建前端并安装服务端运行依赖，生成可直接上传的压缩包：

```text
releases/niyun-zhitan-fc.zip
```

`dist/`、`deploy/fc/dist/` 和 `releases/` 由构建脚本生成。`deploy/fc/` 的 `package.json` 和锁文件列出运行依赖，服务端与前端文件在打包时同步。上传和部署步骤见 [FC 部署说明](./docs/deployment/DEPLOY-FC.md)

## 目录一览

```text
Web/
├─ assets/       图片、字体、课件、音视频、地形和贴图
├─ css/          页面样式
├─ data/         展示数据与公开配置
├─ db/           数据库结构、迁移和种子脚本
├─ deploy/fc/    FC 部署目录
├─ docs/         使用说明和部署文档
├─ js/           前端功能模块
├─ releases/     本地生成的发布包，不提交 Git
├─ scripts/      构建和打包脚本
├─ templates/    可复用模板
├─ index.html    页面源文件
└─ server.js     Node.js 服务入口
```
