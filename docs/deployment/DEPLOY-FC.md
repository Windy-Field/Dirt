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
