# 阿里云函数计算 FC 部署

网站通过 FC Web 函数运行，由 `server.js` 提供网页、AI 代理和数据库 API

## 当前服务配置

- 服务端源码：项目根目录 `server.js`
- FC 包装目录：`deploy/fc/`
- 最终上传文件：`releases/niyun-zhitan-fc.zip`
- 监听地址：`0.0.0.0`
- 监听端口：优先读取 `PORT`，其次读取 `FC_SERVER_PORT`
- 文字问答：百炼应用 Completion API
- 图片问答：`qwen-vl-plus`
- 默认百炼应用 ID：`c786fc9824414081980b6aa3258bb787`

## FC 环境变量

必须设置：

```text
DASHSCOPE_API_KEY=你的百炼API Key
```

建议显式设置：

```text
DASHSCOPE_APP_ID=c786fc9824414081980b6aa3258bb787
QWEN_VL_MODEL=qwen-vl-plus
```

使用 RDS 时还需要：

```text
DB_HOST=RDS 内网地址
DB_PORT=3306
DB_NAME=nimeng_xinyun
DB_USER=nimeng_app
DB_PASSWORD=云数据库账号密码
DB_CONNECTION_LIMIT=5
```

FC 与 RDS 使用同一地域和互通的 VPC，`DB_HOST` 填写 RDS 内网地址

前端和 API 分开部署时，建议设置：

```text
FRONTEND_ORIGIN=https://你的正式前端地址
```

HTTPS 稳定运行后可设置 `ENABLE_HSTS=true`，密钥和密码保存在 FC 环境变量中

## Web 函数设置

```text
运行环境：Node.js 20（Node.js 18 也可）
启动命令：npm start
监听端口：9000（如果控制台要求填写）
请求处理程序：Web 函数无需传统 handler
超时时间：建议 60 秒
内存：建议 512 MB 或更高
```

## 生成部署包

在项目根目录执行：

```powershell
npm run package:fc
```

脚本会执行 `npm run check` 和 `npm run build`，清理并重建 `deploy/fc/dist/`，同步根目录的 `server.js` 与 `server/`，在 `deploy/fc/` 内执行 `npm ci --omit=dev` 安装生产依赖（`dotenv` 和 `mysql2`），然后生成 `releases/niyun-zhitan-fc.zip`。脚本还会检查部署入口是否齐全，并拒绝包含 `.env`、`.git` 或 `docs/` 的压缩包

运行依赖随 `node_modules/` 一起上传。压缩包内使用正斜杠路径，兼容 Linux

上传 zip 后，解压根目录应直接包含：

```text
server.js
server/
package.json
package-lock.json
node_modules/
dist/
```

以上文件直接位于压缩包根目录。修改页面或服务端源码后重新打包

## 前端地址配置

如果网页与 API 同域，可以将 [js/config.ts](../../js/config.ts) 中对应 API 地址设为空字符串，让浏览器使用同域 `/api/*`。部署包会在构建时把 TypeScript 编译结果放入 `dist/.runtime/`

如果前端部署在 OSS、API 部署在 FC：

1. 将 `AI_API_BASE_URL` 指向 FC 公网地址
2. 数据库模式需要将 `API_BASE_URL` 指向 FC 地址
3. 将 FC 环境变量 `FRONTEND_ORIGIN` 设置为 OSS 或自定义域名的完整 HTTPS 地址
4. 根据需要开启 `USE_DATABASE` 和 `USE_QUIZ_DATABASE`


## 部署后检查

```text
GET /api/health
GET /api/ai/status
GET /api/data/stats
GET /api/data/sites
GET /api/quiz/start
```

数据库连接正常时，健康接口应返回：

```json
{"server":"ok","database":"ok"}
```

未配置数据库时返回 `database: "not-configured"`，这不影响静态页面和 AI 接口

单题判定：

```http
POST /api/quiz/answer
Content-Type: application/json

{"questionId": 1, "answer": "B"}
```

`GET /api/quiz/start` 返回最多十道题目和 `scorePerQuestion`，正确答案在提交后返回

## 上线前检查

- 确认 `.env`、API Key 和数据库密码不在代码包或 Git 历史中
- RDS 不开放 `0.0.0.0/0`，网站使用权限受限的数据库账号
- `FRONTEND_ORIGIN` 不长期使用 `*`
- 在 API 网关或 WAF 增加统一限流、日志和费用告警
- 保留 DEM、行政边界、图片、字体和音乐所需的来源与授权说明
