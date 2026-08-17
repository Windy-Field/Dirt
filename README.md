# 泥梦新韵

齐鲁封泥文物传播与数字化保护网站。项目已经整理为可直接部署到阿里云函数计算 FC 的 Node.js Web 服务。

## 功能

- 调研文物与文物价值展示
- 齐鲁封泥文化地图
- 支教开源课程
- 数字拓印和图像增强
- 可替换 Photoshop 贴图的扑克牌与麻将 3D 展厅
- “于见泥”AI助手
- 多张图片上传、预览和删除
- 千问多模态图片分析
- 百炼智能体应用与知识库问答

## AI 调用路线

纯文字问题：

```text
浏览器 → POST /api/ai/chat → 百炼智能体应用 Completion API
```

包含图片的问题：

```text
浏览器 → POST /api/ai/chat → DashScope OpenAI兼容接口 → qwen-vl-plus
```

默认百炼应用 ID：

```text
c786fc9824414081980b6aa3258bb787
```

## 本地开发

需要 Node.js 18 或更高版本：

```powershell
$env:DASHSCOPE_API_KEY="你的百炼API Key"
npm start
```

打开：

```text
http://127.0.0.1:3000
```

## 部署

参见 [FC 部署说明](./docs/deployment/DEPLOY-FC.md)。部署到 FC 后，用户直接打开 FC 的公网地址即可使用，不需要运行 BAT，也不需要正式域名。

## 项目目录

```text
Web/
├─ index.html            网页入口
├─ server.js             静态网站与 AI 接口服务
├─ package.json          Node.js 启动和检查命令
├─ .env.example          本地环境变量示例，不包含真实 Key
├─ assets/               页面图片、字体和可替换 3D 牌具贴图
├─ css/                  全站样式和设计变量
├─ data/                 模拟数据、研究数据和 3D 产品贴图配置
├─ js/                   页面交互、AI 请求、Three.js 场景及离线依赖
├─ docs/                 部署文档、研究资料和验收截图
└─ dist/                 可交付压缩包及历史版本
```

日常修改页面时，主要关注 `index.html`、`css/`、`js/`、`data/` 和 `assets/`。`docs/` 不参与网页运行，`dist/archive/` 仅用于保存旧交付包。

3D 牌具的名称、模型尺寸和贴图路径集中在 `data/3d-products.js`。Photoshop 设计完成后，将 PNG 或 WebP 放入 `assets/textures/`；具体尺寸与目录规则见 [3D 贴图说明](./assets/textures/README.md)。Three.js 已保存在 `js/vendor/three.min.js`，网页运行时不依赖外部 CDN。直接双击 `index.html` 也能查看占位模型和切换模式；通过 `node server.js` 打开时会优先加载实际贴图文件。

## 环境变量

```text
DASHSCOPE_API_KEY       必填，只在服务端配置
DASHSCOPE_APP_ID        可选，已有默认应用ID
QWEN_VL_MODEL           可选，默认 qwen-vl-plus
PORT                    FC 或本地监听端口
```

不要把 `DASHSCOPE_API_KEY` 写入任何 HTML、JavaScript 或提交到代码仓库。
