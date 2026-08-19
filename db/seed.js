const fs = require("fs");
const path = require("path");
const vm = require("vm");
const mysql = require("mysql2/promise");
require("dotenv").config();

if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  throw new Error("请先配置 DB_HOST、DB_NAME、DB_USER 和 DB_PASSWORD");
}

function loadBrowserData(fileNames) {
  const context = { window: {} };
  vm.createContext(context);
  fileNames.forEach((fileName) => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", fileName), "utf8"), context));
  return context.window;
}

async function main() {
  const data = loadBrowserData(["data/ppt-knowledge.js", "data/mock-data.js"]);
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: "utf8mb4"
  });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const site of data.SEAL_KNOWLEDGE.sites) {
      await connection.execute(`
        INSERT INTO sites (id, city, name, period, tags, count, x, y, seals, admin, note, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE city=VALUES(city), name=VALUES(name), period=VALUES(period), tags=VALUES(tags), count=VALUES(count), x=VALUES(x), y=VALUES(y), seals=VALUES(seals), admin=VALUES(admin), note=VALUES(note), description=VALUES(description)
      `, [site.id, site.city, site.name, site.period, JSON.stringify(site.tags || []), site.count, site.x, site.y, JSON.stringify(site.seals || []), site.admin, site.note, `${site.note} 代表印文：${site.seals.join("、")}。古代归属：${site.admin}。`]);
    }
    for (const relic of data.MOCK_DATA.relics) {
      await connection.execute(`
        INSERT INTO relics (id, name, inscription, period, location, category, tone, value, image_url, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), inscription=VALUES(inscription), period=VALUES(period), location=VALUES(location), category=VALUES(category), tone=VALUES(tone), value=VALUES(value), image_url=VALUES(image_url), summary=VALUES(summary)
      `, [relic.id, relic.name, relic.inscription, relic.period, relic.location, relic.category, relic.tone, relic.value, relic.imageUrl, relic.summary]);
    }
    for (const course of data.MOCK_DATA.courses) {
      await connection.execute(`
        INSERT INTO courses (id, title, lesson, duration, description, video_url, poster_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE title=VALUES(title), lesson=VALUES(lesson), duration=VALUES(duration), description=VALUES(description), video_url=VALUES(video_url), poster_url=VALUES(poster_url)
      `, [course.id, course.title, course.lesson, course.duration, course.description, course.videoUrl, course.posterUrl]);
    }
    for (const [index, work] of data.MOCK_DATA.creativeWorks.entries()) {
      await connection.execute(`
        INSERT INTO creative_works (id, name, category, mark, description, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), mark=VALUES(mark), description=VALUES(description), sort_order=VALUES(sort_order)
      `, [work.id, work.name, work.category, work.mark, work.description, index]);
    }
    const starterQuestions = data.MOCK_DATA.questions;
    const [[questionCount]] = await connection.query("SELECT COUNT(*) AS total FROM questions");
    if (Number(questionCount.total) === 0) {
      for (const question of starterQuestions) {
        await connection.execute(`
          INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [question.question, question.optionA, question.optionB, question.optionC, question.optionD, question.correctAnswer, question.explanation, question.difficulty]);
      }
    }
    await connection.commit();
    console.log(`已导入 ${data.SEAL_KNOWLEDGE.sites.length} 个地点、${data.MOCK_DATA.relics.length} 件藏品、${data.MOCK_DATA.courses.length} 门课程和 ${data.MOCK_DATA.creativeWorks.length} 件文创。`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
