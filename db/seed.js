const fs = require("fs");
const path = require("path");
const vm = require("vm");
const mysql = require("mysql2/promise");
require("dotenv").config();

if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  throw new Error("请先配置 DB_HOST、DB_NAME、DB_USER 和 DB_PASSWORD");
}

// 浏览器数据使用 window 保存内容，这里在独立上下文中读取，供导入使用
function loadBrowserData(fileNames) {
  const context = { window: {} };
  vm.createContext(context);
  for (let index = 0; index < fileNames.length; index += 1) {
    const fileName = fileNames[index];
    const filePath = path.join(__dirname, "..", fileName);
    const fileContent = fs.readFileSync(filePath, "utf8");
    vm.runInContext(fileContent, context);
  }
  return context.window;
}

// 按表导入初始数据，使用事务统一提交
async function main() {
  const data = loadBrowserData(["data/ppt-knowledge.js", "data/mock-data.js"]);
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: "utf8mb4",
  });
  const connection = await pool.getConnection();
  try {
    // 整批导入共用事务；任一表失败时回滚，避免展示数据只更新一部分
    await connection.beginTransaction();
    const sites = data.SEAL_KNOWLEDGE.sites;
    for (let siteIndex = 0; siteIndex < sites.length; siteIndex += 1) {
      const site = sites[siteIndex];
      await connection.execute(
        `
        INSERT INTO sites (id, city, name, period, tags, count, x, y, seals, admin, note, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE city=VALUES(city), name=VALUES(name), period=VALUES(period), tags=VALUES(tags), count=VALUES(count), x=VALUES(x), y=VALUES(y), seals=VALUES(seals), admin=VALUES(admin), note=VALUES(note), description=VALUES(description)
      `,
        [
          site.id,
          site.city,
          site.name,
          site.period,
          JSON.stringify(site.tags || []),
          site.count,
          site.x,
          site.y,
          JSON.stringify(site.seals || []),
          site.admin,
          site.note,
          `${site.note} 代表印文：${site.seals.join("、")}。古代归属：${site.admin}。`,
        ],
      );
    }
    const relics = data.MOCK_DATA.relics;
    for (let relicIndex = 0; relicIndex < relics.length; relicIndex += 1) {
      const relic = relics[relicIndex];
      await connection.execute(
        `
        INSERT INTO relics (id, name, inscription, period, location, category, tone, value, image_url, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), inscription=VALUES(inscription), period=VALUES(period), location=VALUES(location), category=VALUES(category), tone=VALUES(tone), value=VALUES(value), image_url=VALUES(image_url), summary=VALUES(summary)
      `,
        [
          relic.id,
          relic.name,
          relic.inscription,
          relic.period,
          relic.location,
          relic.category,
          relic.tone,
          relic.value,
          relic.imageUrl,
          relic.summary,
        ],
      );
    }
    const courses = data.MOCK_DATA.courses;
    for (let courseIndex = 0; courseIndex < courses.length; courseIndex += 1) {
      const course = courses[courseIndex];
      await connection.execute(
        `
        INSERT INTO courses (id, title, lesson, duration, description, video_url, poster_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE title=VALUES(title), lesson=VALUES(lesson), duration=VALUES(duration), description=VALUES(description), video_url=VALUES(video_url), poster_url=VALUES(poster_url)
      `,
        [
          course.id,
          course.title,
          course.lesson,
          course.duration,
          course.description,
          course.videoUrl,
          course.posterUrl,
        ],
      );
    }
    const creativeWorks = data.MOCK_DATA.creativeWorks;
    for (let workIndex = 0; workIndex < creativeWorks.length; workIndex += 1) {
      const work = creativeWorks[workIndex];
      await connection.execute(
        `
        INSERT INTO creative_works (id, name, category, mark, description, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), mark=VALUES(mark), description=VALUES(description), sort_order=VALUES(sort_order)
      `,
        [work.id, work.name, work.category, work.mark, work.description, workIndex],
      );
    }
    const starterQuestions = data.MOCK_DATA.questions;
    const questionQueryResult = await connection.query("SELECT COUNT(*) AS total FROM questions");
    const questionRows = questionQueryResult[0];
    const questionCount = questionRows[0];
    if (Number(questionCount.total) === 0) {
      for (let questionIndex = 0; questionIndex < starterQuestions.length; questionIndex += 1) {
        const question = starterQuestions[questionIndex];
        await connection.execute(
          `
          INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            question.question,
            question.optionA,
            question.optionB,
            question.optionC,
            question.optionD,
            question.correctAnswer,
            question.explanation,
            question.difficulty,
          ],
        );
      }
    }
    await connection.commit();
    console.log(
      `已导入 ${data.SEAL_KNOWLEDGE.sites.length} 个地点、${data.MOCK_DATA.relics.length} 件藏品、${data.MOCK_DATA.courses.length} 门课程和 ${data.MOCK_DATA.creativeWorks.length} 件文创。`,
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch(function reportSeedFailure(error) {
  console.error(error.message);
  process.exitCode = 1;
});
