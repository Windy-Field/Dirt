const http = require("http");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { createPool, query, isDatabaseConfigured } = require("./server/db");

// ==================== 01. 服务配置 ====================
// API Key 只从服务器环境变量读取，不能写进前端文件或提交到代码仓库。
const PORT = Number(process.env.PORT || process.env.FC_SERVER_PORT || process.env.AI_SERVER_PORT || 3000);
const WEB_ROOT = __dirname;
const API_KEY = process.env.DASHSCOPE_API_KEY || "";
const APP_ID = process.env.DASHSCOPE_APP_ID || "c786fc9824414081980b6aa3258bb787";
const VISION_MODEL = process.env.QWEN_VL_MODEL || "qwen-vl-plus";
const DASHSCOPE_BASE_URL = process.env.DASHSCOPE_BASE_URL
  || "https://dashscope.aliyuncs.com/api/v1/apps";
const DASHSCOPE_COMPATIBLE_URL = process.env.DASHSCOPE_COMPATIBLE_URL
  || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = 28 * 1024 * 1024;
const QUIZ_QUESTION_COUNT = 10;
const QUIZ_SCORE_PER_QUESTION = 10;

const dbPool = createPool();
let aiStatusCache = { checkedAt: 0, connected: false };

// ==================== 02. 通用响应和静态网页服务 ====================
// 所有 API 都用这个函数返回 JSON，并附带跨域和安全响应头。
function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end(JSON.stringify(data));
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

// 把 index.html、CSS、JavaScript 和图片发送给浏览器。
// path.resolve + startsWith 检查用于阻止访问项目文件夹以外的文件。
function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.resolve(WEB_ROOT, relativePath);
  if (!filePath.startsWith(`${WEB_ROOT}${path.sep}`)) return sendJson(response, 403, { error: "禁止访问" });

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) return sendJson(response, 404, { error: "文件不存在" });
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

// 读取 POST 请求中的 JSON，同时限制总大小，避免超大请求拖垮服务。
function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("请求内容过大"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new Error("请求数据格式不正确")); }
    });
    request.on("error", reject);
  });
}

// 图片数量、类型、单张大小和 Data URL 格式必须同时符合要求。
function validateImages(images) {
  if (!Array.isArray(images)) throw new Error("images 必须是数组");
  if (images.length > MAX_IMAGES) throw new Error(`一次最多上传 ${MAX_IMAGES} 张图片`);
  images.forEach((image) => {
    if (!image.type?.startsWith("image/")) throw new Error(`${image.name || "文件"} 不是图片`);
    if (Number(image.size) > MAX_IMAGE_BYTES) throw new Error(`${image.name || "图片"} 超过 5MB`);
    if (!String(image.dataUrl || "").startsWith("data:image/")) throw new Error("图片数据格式不正确");
  });
}

function databaseUnavailable(response) {
  return sendJson(response, 503, { error: "数据库尚未配置，请设置 DB_HOST、DB_NAME、DB_USER 和 DB_PASSWORD" });
}

async function getDatabaseStats() {
  const [rows] = await query(dbPool, `
    SELECT
      (SELECT COUNT(*) FROM relics WHERE is_published = 1) AS relics,
      (SELECT COUNT(*) FROM sites WHERE is_published = 1) AS sites,
      (SELECT COUNT(*) FROM courses WHERE is_published = 1) AS courses
  `);
  return rows[0];
}

function mapSite(row) {
  return {
    ...row,
    tags: typeof row.tags === "string" ? JSON.parse(row.tags || "[]") : row.tags || [],
    seals: typeof row.seals === "string" ? JSON.parse(row.seals || "[]") : row.seals || []
  };
}

async function getSites(period = "全部") {
  const params = [];
  let sql = "SELECT * FROM sites WHERE is_published = 1";
  if (period && period !== "全部") {
    sql += " AND period LIKE ?";
    params.push(period === "其他" ? "%" : `%${period}%`);
  }
  sql += " ORDER BY id";
  const [rows] = await query(dbPool, sql, params);
  if (period === "其他") {
    const mainSystems = ["青州", "兖州", "徐州"];
    return rows.filter((site) => !mainSystems.some((name) => site.period.includes(name))).map(mapSite);
  }
  return rows.map(mapSite);
}

async function getRelics(keyword = "") {
  const like = `%${keyword}%`;
  const [rows] = await query(dbPool, `
    SELECT id, name, inscription, period, location, category, tone, value, image_url AS imageUrl, summary
    FROM relics
    WHERE is_published = 1
      AND (? = '' OR CONCAT_WS(' ', name, inscription, period, location, category, value, summary) LIKE ?)
    ORDER BY id
  `, [keyword, like]);
  return { items: rows, total: rows.length };
}

async function getCourses() {
  const [rows] = await query(dbPool, "SELECT id, title, lesson, duration, description, video_url AS videoUrl, poster_url AS posterUrl FROM courses WHERE is_published = 1 ORDER BY lesson, id");
  return rows;
}

async function getCreativeWorks() {
  const [rows] = await query(dbPool, "SELECT id, name, category, mark, description FROM creative_works WHERE is_published = 1 ORDER BY sort_order, id");
  return rows;
}

// 开始一轮问答：最多随机取十条，同一轮不会重复；开发初期允许少于十题。
async function startQuizRound() {
  const [rows] = await query(dbPool, `
    SELECT id, question_text AS question, option_a AS optionA, option_b AS optionB,
      option_c AS optionC, option_d AS optionD, difficulty
    FROM questions
    WHERE is_published = 1
    ORDER BY RAND()
    LIMIT ${QUIZ_QUESTION_COUNT}
  `);
  if (!rows.length) throw new Error("题库中没有已发布题目");
  return { questions: rows, total: rows.length, scorePerQuestion: QUIZ_SCORE_PER_QUESTION };
}

// 每次只判断当前一道题。正确答案和解析仅在作答后返回。
async function answerQuizQuestion(questionId, selectedAnswer) {
  const [rows] = await query(dbPool, "SELECT correct_answer, explanation FROM questions WHERE id = ? AND is_published = 1 LIMIT 1", [questionId]);
  if (!rows[0]) throw new Error("题目不存在或已停止发布");
  return {
    questionId,
    selectedAnswer,
    correct: selectedAnswer === rows[0].correct_answer,
    correctAnswer: rows[0].correct_answer,
    explanation: rows[0].explanation,
    earnedScore: selectedAnswer === rows[0].correct_answer ? QUIZ_SCORE_PER_QUESTION : 0
  };
}

// 两类模型请求共用鉴权、JSON 解析和错误处理，各模型函数只负责请求体与结果格式。
async function requestDashScope(url, body, errorLabel) {
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const reason = data.error?.message || data.message || `${errorLabel}返回 ${upstream.status}`;
    throw new Error(reason);
  }
  aiStatusCache = { checkedAt: Date.now(), connected: true };
  return data;
}

// 用真实应用请求验证网络、Key 和应用 ID；结果短暂缓存，避免每次刷新重复计费。
async function isAiUpstreamReachable() {
  if (!API_KEY || !APP_ID) return false;
  if (Date.now() - aiStatusCache.checkedAt < 5 * 60 * 1000) return aiStatusCache.connected;
  try {
    await requestDashScope(
      `${DASHSCOPE_BASE_URL}/${encodeURIComponent(APP_ID)}/completion`,
      { input: { prompt: "请只回复OK" }, parameters: {}, debug: {} },
      "百炼应用"
    );
    return true;
  } catch (_) {
    aiStatusCache = { checkedAt: Date.now(), connected: false };
    return false;
  }
}

// ==================== 03. 纯文字问答：调用百炼应用 ====================
// sessionId 用来延续上下文；角色提示确保助手始终以“于见泥”自称。
async function askBailianApplication({ message, sessionId }) {
  const roleContext = "你在本网站中的名字是‘于见泥’，请始终使用这个名字自称，不要使用其他旧名称。你负责讲解封泥的封缄方式、历史价值、齐鲁文化和相关故事；对于不确定的考证要明确说明。";
  const input = { prompt: `${roleContext}\n\n用户问题：${message}` };
  if (sessionId && sessionId !== "web-guest") input.session_id = sessionId;

  const data = await requestDashScope(
    `${DASHSCOPE_BASE_URL}/${encodeURIComponent(APP_ID)}/completion`,
    { input, parameters: {}, debug: {} },
    "上游接口"
  );
  return {
    reply: data.output?.text || "百炼应用没有返回文本内容",
    sessionId: data.output?.session_id || sessionId,
    requestId: data.request_id || null,
    usage: data.usage || null,
    appId: APP_ID
  };
}

// ==================== 04. 图片问答：调用千问视觉模型 ====================
// 只要请求中包含图片，就走该函数；模型先描述可见事实，再谨慎给出释读候选。
async function askQwenVision({ message, images }) {
  const content = [
    ...images.map((image) => ({ type: "image_url", image_url: { url: image.dataUrl } })),
    {
      type: "text",
      text: message || "请观察上传的封泥图片，描述可见形态、印面、文字线条和保存状态，并谨慎给出可能的印文候选。"
    }
  ];

  const data = await requestDashScope(
    DASHSCOPE_COMPATIBLE_URL,
    {
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content: "你是‘于见泥’，齐鲁封泥数字文化平台的AI导览助手。你熟悉封泥的文书封缄功能、印章关系、古文字价值、官职制度价值、历史地理价值以及齐鲁封泥文化。分析图片时先描述可见事实，再给出候选释读和判断依据。不得把模糊、残缺或有争议的古文字识别写成定论，不得编造文物出处、年代和收藏信息。结尾提醒用户正式释读需要文博或古文字专家复核。"
        },
        { role: "user", content }
      ],
      temperature: 0.2
    },
    "视觉模型"
  );
  return {
    reply: data.choices?.[0]?.message?.content || "千问视觉模型没有返回文本内容",
    model: data.model || VISION_MODEL,
    usage: data.usage || null,
    mode: "vision"
  };
}

// ==================== 05. 路由入口 ====================
// 浏览器请求先在这里按“请求方法 + 路径”分流，未命中 API 的 GET 请求再交给静态文件服务。
const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") return sendJson(response, 204, {});

  // 前端启动时调用：只报告配置是否齐全，不会返回真实 API Key。
  if (request.method === "GET" && request.url === "/api/ai/status") {
    return sendJson(response, 200, {
      connected: await isAiUpstreamReachable(),
      configured: Boolean(API_KEY && APP_ID),
      verified: true,
      provider: "Bailian Application",
      appId: APP_ID ? `${APP_ID.slice(0, 6)}...` : "",
      supportsImages: true,
      visionModel: VISION_MODEL
    });
  }

  if (request.method === "GET" && request.url === "/api/health") {
    if (!isDatabaseConfigured()) return sendJson(response, 200, { server: "ok", database: "not-configured" });
    try {
      await query(dbPool, "SELECT 1 AS ok");
      return sendJson(response, 200, { server: "ok", database: "ok" });
    } catch (error) {
      return sendJson(response, 503, { server: "ok", database: "error", message: error.message });
    }
  }

  if (request.method === "GET" && request.url.startsWith("/api/data/")) {
    if (!isDatabaseConfigured()) return databaseUnavailable(response);
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (url.pathname === "/api/data/stats") return sendJson(response, 200, await getDatabaseStats());
      if (url.pathname === "/api/data/sites") return sendJson(response, 200, await getSites(url.searchParams.get("period") || "全部"));
      if (url.pathname === "/api/data/relics") return sendJson(response, 200, await getRelics(url.searchParams.get("keyword") || ""));
      if (url.pathname === "/api/data/courses") return sendJson(response, 200, await getCourses());
      if (url.pathname === "/api/data/creative-works") return sendJson(response, 200, await getCreativeWorks());
      const relicMatch = url.pathname.match(/^\/api\/data\/relics\/([^/]+)$/);
      if (relicMatch) {
        const [rows] = await query(dbPool, `
          SELECT id, name, inscription, period, location, category, tone, value, image_url AS imageUrl, summary
          FROM relics WHERE is_published = 1 AND id = ? LIMIT 1
        `, [relicMatch[1]]);
        return sendJson(response, 200, rows[0] || null);
      }
      return sendJson(response, 404, { error: "数据接口不存在" });
    } catch (error) {
      return sendJson(response, 500, { error: error.message || "数据库查询失败" });
    }
  }

  if (request.method === "GET" && request.url === "/api/quiz/start") {
    if (!isDatabaseConfigured()) return databaseUnavailable(response);
    try {
      return sendJson(response, 200, await startQuizRound());
    } catch (error) {
      return sendJson(response, 400, { error: error.message || "题目抽取失败" });
    }
  }

  if (request.method === "POST" && request.url === "/api/quiz/answer") {
    if (!isDatabaseConfigured()) return databaseUnavailable(response);
    try {
      const body = await readJson(request);
      const questionId = Number(body.questionId);
      const selectedAnswer = String(body.answer || "").trim().toUpperCase();
      if (!Number.isInteger(questionId)) return sendJson(response, 400, { error: "questionId 必须是整数" });
      if (!["A", "B", "C", "D"].includes(selectedAnswer)) return sendJson(response, 400, { error: "answer 必须是 A、B、C 或 D" });
      return sendJson(response, 200, await answerQuizQuestion(questionId, selectedAnswer));
    } catch (error) {
      return sendJson(response, 400, { error: error.message || "答案提交失败" });
    }
  }

  // AI 聊天主接口：有图片走视觉模型，没有图片走百炼应用。
  if (request.method === "POST" && request.url === "/api/ai/chat") {
    if (!API_KEY) return sendJson(response, 503, { error: "尚未设置 DASHSCOPE_API_KEY" });
    if (!APP_ID) return sendJson(response, 503, { error: "尚未设置 DASHSCOPE_APP_ID" });
    try {
      const body = await readJson(request);
      const message = String(body.message || "").trim();
      const images = body.images || [];
      validateImages(images);
      if (!message && images.length === 0) return sendJson(response, 400, { error: "请输入问题或上传图片" });
      const result = images.length
        ? await askQwenVision({ message, images })
        : await askBailianApplication({ message, sessionId: body.sessionId });
      return sendJson(response, 200, result);
    } catch (error) {
      return sendJson(response, 400, { error: error.message || "请求处理失败" });
    }
  }

  if (request.method === "GET") return serveStatic(request, response);
  return sendJson(response, 404, { error: "接口不存在" });
});

// ==================== 06. 启动服务 ====================
// 监听 0.0.0.0 才能兼容阿里云 FC；本地仍通过 http://127.0.0.1:端口 访问。
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Website and Qwen proxy listening on 0.0.0.0:${PORT}`);
  console.log(`Bailian application: ${APP_ID || "missing"}`);
  console.log(`Vision model: ${VISION_MODEL}`);
  console.log(API_KEY ? "DASHSCOPE_API_KEY is configured" : "DASHSCOPE_API_KEY is missing");
});
