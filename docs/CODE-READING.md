# 源码阅读导航

## 入口与加载顺序

从 `index.html` 底部的脚本列表开始阅读。TypeScript 编译结果位于 `.runtime/`，模块通过 `window.Niyun*` 注册，`app.ts` 传入所需工具并启动页面。这种加载方式支持双击网页预览

`js/theme-bootstrap.ts` 在样式表之前恢复主题，浏览器实际加载 `.runtime/js/theme-bootstrap.js`。配置和数据先加载，服务和控制器随后注册，`app.ts` 最后组装页面。问答区是独立的 Vue 应用，由 `js/quiz/main.js` 挂载

## 按功能阅读

| 功能 | 主要文件 | 维护要点 |
| --- | --- | --- |
| 页面组装与内容模板 | `js/app.ts` | 提供 DOM 工具、HTML 转义、显示设置和栏目渲染 |
| 数据访问 | `js/api.ts` | 在本地展示数据与数据库接口间切换 |
| AI 请求 | `js/ai-service.ts` | 候选后端、文件编码、失败详情和状态广播 |
| AI 界面 | `js/ai-chat.ts`、`js/ai-pet.ts` | 两个入口使用独立会话存储，共享请求服务 |
| 地图 | `js/map-browser.ts`、`js/three-map.ts` | 前者负责筛选，后者负责地形、坐标投影和手势 |
| 课程与手卷 | `js/course-browser.ts`、`js/scroll-story.ts` | 滚动位置驱动页码；课程请求编号防止旧结果覆盖 |
| 3D 牌具 | `js/three-showcase.ts` | 加载贴图、管理模型资源、控制相机与渲染 |
| 搜索与图录 | `js/search-dialog.ts`、`js/source-archive.ts` | 共用入口传入的模板及定位函数 |
| 开屏与装饰 | `js/opening-loader.ts`、`js/page-effects.ts` | 管理动画帧、超时退场和可见性 |
| 鼠标尾迹 | `js/cursor-debris.ts` | 管理碎屑生成、尾迹控件、本地保存和设备限制；常用参数位于文件顶部 |
| 导航与设置 | `js/site-navigation.ts`、`js/display-settings.ts` | 设置通过回调读写，避免保存过期状态引用 |
| 音乐协调 | `js/media-coordinator.ts` | 处理播放权限、用户偏好和视频播放时暂停音乐 |
| 服务端 | `server.js`、`server/db.js` | 静态资源、AI 代理、数据库与问答 API |
| 数据初始化 | `db/schema.sql`、`db/seed.js` | 手动维护任务，导入采用事务，不在访问页面时运行 |

## 维护约定

- AI 的 `connected` 用 `true`、`false`、`null` 表示成功、失败、未知，`configured` 表示配置是否齐全
- AI 状态接口调用百炼应用并缓存结果，调用会消耗额度，服务器在线检查使用 `/api/health`
- 地图覆盖物的高度必须与显示网格一致；修改顶点后必须标记 `position.needsUpdate`
- 请求编号用于识别和丢弃过期响应，取消请求需单独处理
- 数据生成的 HTML 需要转义；媒体地址通过 `MediaSecurity.resolve` 校验
- 浏览器配置全部公开。API Key 和数据库凭据只放服务端环境变量，不写入前端或文档

## 样式与数据

正文字号和行距在 `css/02-content-layout.css` 中设置，开屏开关位于设置面板的“动态效果”分组

鼠标尾迹设置保存在 `niyun-cursor-trail` 中，通过 `media-settings-reset` 响应“恢复默认”。窄屏、触屏、系统减少动态效果或页面动效为 0 时，控件锁定关闭；限制解除后恢复已保存的设置

`css/tokens.css` 定义主题和尺寸变量，`01` 至 `06` 样式表按顺序叠加。相同选择器可能是有意覆盖，移动规则或合并媒体查询前应检查最终计算样式

`data/media-config.ts` 管理媒体地址与允许的外站；`data/ai-pet-config.ts`、`data/3d-products.ts`、`data/shandong-terrain.ts` 管理对应功能配置

## 生成文件与发布

- `js/vendor/three.js`：由 `scripts/build-three.mjs` 生成，导出入口为 `scripts/three-entry.js`
- `data/texture-inline.js`：由 `scripts/build-inline-textures.js` 生成
- `js/seal-glyph-paths.js`：由 `scripts/extract-seal-glyphs.ps1` 生成，修改逻辑应先修改生成模板
- `dist/`、`deploy/fc/dist/`、FC 服务端副本和 `releases/`：通过构建及打包同步
- `.runtime/`：由 `npm run compile:frontend` 生成，双击 `index.html` 前需完成编译

`npm run package:fc` 执行语法检查、生产构建、运行依赖安装和压缩包校验，不执行线上部署。包中不包含 `.env`，线上配置仍由 FC 环境变量提供

字形提取脚本含 UTF-8 中文，使用 PowerShell 7 执行：`pwsh -NoProfile -File scripts/extract-seal-glyphs.ps1`。旧版 Windows PowerShell 默认编码可能无法正确解析

## 验证

```sh
npm run check
node --test tests/*.test.cjs
npm run build
```

`tests/terrain-browser.cjs` 使用 Playwright 和 sharp，连接本地 `127.0.0.1:5173`，验证地图画布及移动端双触点。测试依赖单独安装，也可通过 `PLAYWRIGHT_MODULE`、`SHARP_MODULE` 指定已有安装路径

`node tests/cursor-debris.cjs` 使用 Playwright 检查尾迹生成、清理、控件和设备限制，测试自行加载页面；可通过 `PLAYWRIGHT_MODULE` 指定已有安装路径。此脚本需单独执行
