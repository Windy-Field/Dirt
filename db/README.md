# 数据库部署

1. 使用 MySQL Workbench 的管理员账号执行 `schema.sql`。
2. 在项目根目录配置 `.env`，填写 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER` 和 `DB_PASSWORD`。
3. 执行 `npm run db:seed`，把当前项目中的地点、藏品、课程和文创数据导入数据库。
4. 执行 `npm start`，访问 `http://127.0.0.1:3000/api/health` 检查连接。

`seed.js` 是幂等的：重复执行会更新已有内容，不会重复插入地点、藏品、课程和文创。题库只会在表为空时加入十二道四选一示例题。

趣味问答每轮会从 `is_published = 1` 的记录中随机抽取最多十道且不重复。开发初期少于十道时会返回当前全部已发布题，达到十道后自动按完整十题运行。如果数据库已经存在早期题目，种子脚本不会覆盖它们。

已有数据库需要执行一次 `db/migrations/001-add-question-difficulty.sql`，为题库增加难度字段。Workbench 中直接填写：`简单`、`中等`或`困难`。如果该列已经存在，不要重复执行迁移脚本。

正式部署时，把同样的数据库环境变量填写到阿里云 FC，不要把真实 `.env` 上传或提交到 Git。

## 题库字段

在 Workbench 中维护 `questions` 表时，每条记录需要填写：

```text
question_text                      题干
option_a / option_b / option_c / option_d  四个选项
correct_answer                     A、B、C 或 D
explanation                        详细解析
difficulty                         简单、中等或困难
is_published                       1 显示，0 停止抽取
```

## 问答接口

```text
GET /api/quiz/start
```

随机返回最多十道不重复的已发布题目，不返回正确答案。题库少于十道时返回当前已有题目，题库为空时返回明确错误。

```text
POST /api/quiz/answer
Content-Type: application/json

{"questionId": 1, "answer": "B"}
```

后端只判定当前一道题，返回 `correct`、`correctAnswer`、`explanation` 和 `earnedScore`。前端选项虽然会重新排列，但会把原始答案键提交给后端，并将返回答案转换为当前显示字母。
