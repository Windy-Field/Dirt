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
- 随机十题、逐题判定的封泥趣味问答

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
npm install
npm start
```

复制 `.env.example` 为 `.env` 后填写 AI Key。若要使用 MySQL，再填写：

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=nimeng_xinyun
DB_USER=nimeng_app
DB_PASSWORD=你的数据库密码
```

初始化数据库：

```powershell
# 先用 Workbench 管理员账号执行 db/schema.sql
npm run db:seed
```

接口检查：

```text
http://127.0.0.1:3000/api/health
http://127.0.0.1:3000/api/quiz/start
```

普通栏目与题库使用独立开关：`USE_DATABASE` 控制藏品、地图、课程和文创，`USE_QUIZ_DATABASE` 只控制趣味问答。当前离线题库模式下两者均为 `false`。AI 前端优先使用 FC，失败后自动尝试本地 `http://127.0.0.1:3000`；状态接口会实际探测百炼网络，不再仅凭 Key 存在报告已连接。

本地 AI 还依赖电脑能够访问 `dashscope.aliyuncs.com`。如果 `HTTP_PROXY/HTTPS_PROXY` 指向未运行的本地代理（例如 `127.0.0.1:10808`），即使 Key 已配置也无法聊天；此时应启动或修复代理，或部署并使用可访问百炼的 FC 后端。

AI 状态接口会发送一次最小的真实应用请求，并缓存结果 5 分钟。新版后端通过 `verified` 标记真实探测结果，前端也兼容暂未返回该字段的旧版 FC；任意一次聊天成功后，页面会立即更新为“AI助手已连接”。若返回 403，应检查 `DASHSCOPE_API_KEY` 与 `DASHSCOPE_APP_ID` 是否属于同一阿里云账号，以及该 Key 是否有权调用对应百炼应用。

## 趣味问答接口

当前问答流程只使用两个接口：

```text
GET  /api/quiz/start     随机开始一轮十题，同一轮题目不重复
POST /api/quiz/answer    判定当前一道题，返回正确答案、解析和本题得分
```

`/api/quiz/start` 不返回正确答案。前端每次只向 `/api/quiz/answer` 提交一个 `questionId` 和一个原始答案键，选项显示顺序由浏览器随机打乱。题库达到十道后每轮抽十题；开发初期少于十道时会返回当前全部已发布题目，方便逐步录入和测试。

## 维护题库

`js/config.js` 中 `USE_QUIZ_DATABASE: false` 时使用 [mock-data.js](./data/mock-data.js)。此时增减题目只需修改 `window.MOCK_DATA.questions` 中的条目，不用修改十题数量、每题分值或其他参数，但要满足：

```text
至少保留 10 道题
每道题的 id 唯一
correctAnswer 只能是 A、B、C、D
difficulty 只能是 简单、中等、困难
optionA、optionB、optionC、optionD 和 explanation 均需填写
```

当任一选项超过 28 个字符时，页面会自动把选项从两列切换为四行单列，不需要为长选项修改额外参数。

`USE_QUIZ_DATABASE: true` 时网页忽略 mock 题库，应通过 MySQL Workbench 增删改 `questions` 表；删除操作也可以改为把 `is_published` 设为 `0`，保留数据但不参与抽题。

“再来一轮”在答题过程中始终可用；成绩出现后会移动到成绩框内并放在“分享成绩”下方。成绩状态使用自适应高度，按钮不会越出栏目或覆盖页脚。分享弹窗展示本轮段位、分数和答对题数，并可一键复制当前网页地址；成绩只在浏览器内展示，不会上传到后端或写入数据库。分享弹窗与导航搜索弹窗使用同一组进入、退出动画参数。

启动网站：

```powershell
npm start
```

打开：

```text
http://127.0.0.1:3000
```

## 响应式验收

所有页面和交互修改都需要同时检查以下典型宽度，不能只按当前桌面截图调整：

```text
320px   小屏手机
375px   常见手机
414px   大屏手机
768px   平板竖屏
1024px  平板横屏 / 小型桌面
1440px  桌面显示器
```

检查范围包括：无横向溢出、文字不遮挡、按钮不越界、固定导航不覆盖内容、触控按钮至少 44px、弹窗位于视口内，以及地图、课程、3D 展厅、AI、趣味问答和页脚在各断点下的排列。

趣味问答工具栏在手机与桌面均保持“进度数字｜进度条｜分数”单行自适应；长选项切换为四行单列并在题卡内部滚动，成绩页和分享弹窗使用自适应高度，不覆盖页脚。

“45区县金石图录索引”在主页面只渲染前三处资料，其余 42 处在完整图录弹窗中显示和筛选。弹窗复用导航搜索弹窗的进入、退出动画；弹窗卡片不参与页面栏目的渐显状态，必须始终可见。

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
├─ data/                 模拟题库、研究数据和 3D 产品贴图配置
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
DB_HOST                 MySQL/RDS 地址，只在服务端使用
DB_PORT                 MySQL 端口，RDS 通常为 3306
DB_NAME                 数据库名
DB_USER                 网站数据库账号
DB_PASSWORD             数据库密码，只在服务端配置
DB_CONNECTION_LIMIT     数据库连接池上限
FRONTEND_ORIGIN         正式前端地址，用于限制跨域来源
```

不要把 `DASHSCOPE_API_KEY` 写入任何 HTML、JavaScript 或提交到代码仓库。
不要把任何 `DB_PASSWORD` 写入前端或提交到代码仓库。数据库结构、导入和管理说明见 [数据库部署](./db/README.md)。
