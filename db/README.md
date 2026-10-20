# 数据库说明

网站默认读取 `data/` 中的本地数据。需要在线维护地点、藏品、课程或题库时，可启用 MySQL

## 初始化

1. 用 MySQL 管理员账号执行 [schema.sql](./schema.sql)
2. 在项目根目录复制 `.env.example` 为 `.env`，填入数据库连接信息
3. 运行 `npm run db:seed`
4. 在 [js/config.ts](../js/config.ts) 中打开需要的数据库开关
5. 启动服务，访问 `http://127.0.0.1:3000/api/health` 检查连接

本地配置示例：

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=nimeng_xinyun
DB_USER=nimeng_app
DB_PASSWORD=你的数据库密码
DB_CONNECTION_LIMIT=5
```

端口按实际配置填写，RDS 通常使用 `3306`。云端 `DB_HOST` 填写 RDS 内网地址，并确保 FC 与 RDS 的 VPC 互通

## 数据开关

```js
USE_DATABASE: true,
USE_QUIZ_DATABASE: true
```

`USE_DATABASE` 控制地点、藏品、课程等栏目，`USE_QUIZ_DATABASE` 只控制趣味问答。二者可以单独开启

## 种子数据

`db/seed.js` 按主键更新地点、藏品、课程和文创数据，可重复运行

题库仅在 `questions` 表为空时导入。重建题库前先备份现有题目

旧数据库若缺少 `questions.difficulty` 字段，执行一次：

```text
db/migrations/001-add-question-difficulty.sql
```

新数据库直接执行 `schema.sql`

## 题库字段

```text
question_text                              题干
option_a / option_b / option_c / option_d  四个选项
correct_answer                             A、B、C 或 D
explanation                                答案解析
difficulty                                 简单、中等或困难
is_published                               1 表示参与抽题，0 表示停用
```

每轮随机抽取最多 10 道已发布题目，作答后返回对错、答案、解析和得分

```text
GET  /api/quiz/start
POST /api/quiz/answer
```

## 上线注意事项

- 数据库账号和密码只放在 `.env` 或 FC 环境变量中
- 网站使用单独的低权限账号
- RDS 白名单仅放行需要连接的地址
- 部署后通过 `/api/health` 检查连接
