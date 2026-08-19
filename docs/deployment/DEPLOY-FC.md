# 阿里云函数计算 FC 部署

## 已配置

- 百炼应用 ID：`c786fc9824414081980b6aa3258bb787`
- 文字问答：百炼智能体应用 Completion API
- 图片问答：千问视觉模型 `qwen-vl-plus`
- 网站和 API：同一个 Node.js Web 服务，入口文件位于代码包根目录 `server.js`
- 监听地址：`0.0.0.0`
- FC 监听端口：读取 `PORT` 或 `FC_SERVER_PORT`

## FC 环境变量

必须设置：

```text
DASHSCOPE_API_KEY=你的百炼API Key
```

使用在线数据库时还必须设置：

```text
DB_HOST=RDS 内网地址
DB_PORT=3306
DB_NAME=nimeng_xinyun
DB_USER=nimeng_app
DB_PASSWORD=云数据库账号密码
DB_CONNECTION_LIMIT=5
```

FC 与 RDS 必须位于同一地域和可通信的 VPC。`DB_HOST` 不能填写 `localhost`，真实数据库密码只能放在 FC 环境变量中。

建议设置：

```text
DASHSCOPE_APP_ID=c786fc9824414081980b6aa3258bb787
QWEN_VL_MODEL=qwen-vl-plus
```

API Key 只能填写在 FC 控制台的环境变量中，不要写入上传的代码包。

FC 默认 `fcapp.run` 域名会强制将浏览器响应作为附件下载，因此它只作为 AI API 地址使用。网站前端部署到 OSS 静态网站。演示阶段跨域来源为 `*`；获得固定前端地址后，可以设置 `FRONTEND_ORIGIN` 限制来源。

## Web 函数设置

```text
运行环境：Node.js 20（Node.js 18 也可）
启动命令：npm start
监听端口：9000（若控制台要求填写）
请求处理程序：Web 函数无需填写传统 handler
超时时间：建议 60 秒
内存：建议 512 MB
```

上传整个项目目录作为代码包。部署完成后打开 FC 提供的 HTTP 访问地址，网页会自动使用同域 `/api/ai/chat`，不需要本地脚本和正式域名。

部署数据库版后依次检查：

```text
GET /api/health
GET /api/data/stats
GET /api/quiz/start
```

健康接口应返回 `{"server":"ok","database":"ok"}`。确认后把前端 `js/config.js` 中的 `USE_DATABASE` 改为 `true`，再上传 OSS 前端文件。

`GET /api/quiz/start` 应返回十道不重复题目和 `scorePerQuestion`，且不包含正确答案。单题判定使用：

```text
POST /api/quiz/answer
Content-Type: application/json

{"questionId": 1, "answer": "B"}
```

正式上线前建议在 RDS 的 `questions` 表中保证至少十道 `is_published = 1` 的题目；少于十道时接口会返回当前已有题目，便于录入阶段测试。
