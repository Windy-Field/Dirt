const http = require("http");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const database = require("./server/db");

// 01. 服务配置
// 从服务端环境变量读取密钥
const PORT = Number(process.env.PORT || process.env.FC_SERVER_PORT || process.env.AI_SERVER_PORT || 3000);
const WEB_ROOT = __dirname;
const BUILD_ROOT = path.join(__dirname, "dist");
const API_KEY = process.env.DASHSCOPE_API_KEY || "";
const APP_ID = process.env.DASHSCOPE_APP_ID || "c786fc9824414081980b6aa3258bb787";
const VISION_MODEL = process.env.QWEN_VL_MODEL || "qwen-vl-plus";
const DASHSCOPE_BASE_URL = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/api/v1/apps";
const DASHSCOPE_COMPATIBLE_URL =
  process.env.DASHSCOPE_COMPATIBLE_URL ||
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = 28 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 2000;
const REQUEST_TIMEOUT = 70 * 1000;
const AI_RATE_LIMIT_WINDOW = 60 * 1000;
const AI_RATE_LIMIT_COUNT = 8;
const QUIZ_QUESTION_COUNT = 10;
const QUIZ_SCORE_PER_QUESTION = 10;

const dbPool = database.createPool();
let aiStatusCache = { checkedAt: 0, connected: false };
let aiStatusProbe = null;
const aiRateLimit = new Map();
// 成功状态可稳定复用；失败状态只短暂缓存，避免一次网络抖动造成持续误报
const AI_STATUS_SUCCESS_CACHE_MS = 5 * 60 * 1000;
const AI_STATUS_FAILURE_CACHE_MS = 15 * 1000;

// 02. 通用响应和静态网页服务
// 所有 API 都用这个函数返回 JSON，并附带跨域和安全响应头
function sendJson(response, status, data) {
  let requestOrigin = "";
  if (response.req && response.req.headers) {
    requestOrigin = response.req.headers.origin || "";
  }
  const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";
  let corsOrigin = "null";
  if (allowedOrigin === "*") corsOrigin = "*";
  else if (requestOrigin === allowedOrigin) corsOrigin = requestOrigin;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    // CSP 放行 Umami 脚本和统计请求，自建时同步替换域名
    "Content-Security-Policy":
      "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-eval' https://cloud.umami.is; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: https://cloud.umami.is;",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
  if (requestOrigin && corsOrigin !== "null") headers.Vary = "Origin";
  if (process.env.ENABLE_HSTS === "true")
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  response.writeHead(status, headers);
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
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

// 把 index.html、CSS、JavaScript 和图片发送给浏览器
// path.resolve + startsWith 检查用于阻止访问项目文件夹以外的文件
function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  let relativePath = requestPath.replace(/^\/+/, "");
  if (requestPath === "/") {
    relativePath = "index.html";
  }
  // 优先读取 dist，缺少时查找项目根目录
  const buildPath = path.resolve(BUILD_ROOT, relativePath);
  const sourcePath = path.resolve(WEB_ROOT, relativePath);
  let filePath = sourcePath;
  if (relativePath === "index.html" || fs.existsSync(buildPath)) {
    filePath = buildPath;
  }
  if (!filePath.startsWith(`${WEB_ROOT}${path.sep}`)) return sendJson(response, 403, { error: "禁止访问" });
  // 拒绝下载源码、配置和版本目录
  const blockedFile =
    /(^|[\\/])(?:\.env(?:\..*)?|\.git|server(?:[\\/]db)?\.js|package(?:-lock)?\.json|.*\.sql)$/i.test(
      relativePath,
    );
  if (blockedFile) return sendJson(response, 404, { error: "文件不存在" });

  fs.stat(filePath, function sendStaticFile(statError, stat) {
    if (statError || !stat.isFile()) return sendJson(response, 404, { error: "文件不存在" });
    // 用 Range 请求读取视频片段，支持拖动进度条
    // 这里兼容“从某字节开始”“指定起止字节”和“读取末尾若干字节”三种单段范围格式
    const rangeHeader = request.headers.range;
    let range = null;
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (match && (match[1] || match[2])) {
        if (!match[1]) {
          const suffixLength = Number(match[2]);
          if (Number.isSafeInteger(suffixLength) && suffixLength > 0) {
            range = { start: Math.max(0, stat.size - suffixLength), end: stat.size - 1 };
          }
        } else {
          const start = Number(match[1]);
          let requestedEnd = stat.size - 1;
          if (match[2]) {
            requestedEnd = Number(match[2]);
          }
          if (Number.isSafeInteger(start) && Number.isSafeInteger(requestedEnd) && start <= requestedEnd) {
            range = { start, end: Math.min(requestedEnd, stat.size - 1) };
          }
        }
      }
      // 范围格式不正确或起点超出文件末尾时，按 HTTP 规范告诉浏览器文件的真实总长度
      if (!range || range.start >= stat.size) {
        response.writeHead(416, {
          "Content-Range": `bytes */${stat.size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-cache",
        });
        response.end();
        return;
      }
    }
    const staticHeaders = {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Disposition": "inline",
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      // 静态页面也受 CSP 保护，因此这里要和上面的 API 响应保持同一份 Umami 域名许可
      "Content-Security-Policy":
        "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-eval' https://cloud.umami.is; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' https:; connect-src 'self' https: https://cloud.umami.is;",
      "Cache-Control": "no-cache",
    };
    if (range) {
      // 分段响应必须同时给出实际范围和长度，浏览器才能把这段数据放到正确的播放位置
      staticHeaders["Content-Range"] = `bytes ${range.start}-${range.end}/${stat.size}`;
      staticHeaders["Content-Length"] = String(range.end - range.start + 1);
    } else {
      staticHeaders["Content-Length"] = String(stat.size);
    }
    if (process.env.ENABLE_HSTS === "true")
      staticHeaders["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    // 有 Range 时只读取对应片段并返回 206；普通请求仍返回完整文件和 200
    let responseStatus = 200;
    if (range) {
      responseStatus = 206;
    }
    response.writeHead(responseStatus, staticHeaders);
    fs.createReadStream(filePath, range || undefined).pipe(response);
  });
}

// 读取 POST 请求中的 JSON，同时限制总大小，避免超大请求拖垮服务
function readJson(request) {
  return new Promise(function collectJsonBody(resolve, reject) {
    let size = 0;
    const chunks = [];
    request.on("data", function collectRequestChunk(chunk) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        const error = new Error("请求内容过大");
        error.errorCode = "AI_REQUEST_TOO_LARGE";
        error.httpStatus = 413;
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.setTimeout(REQUEST_TIMEOUT, function rejectTimedOutBody() {
      reject(new Error("请求超时"));
    });
    request.on("end", function parseCompletedBody() {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        const error = new Error("请求数据格式不正确");
        error.errorCode = "AI_INVALID_JSON";
        error.httpStatus = 400;
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

// 图片数量、类型、单张大小和 Data URL 格式必须同时符合要求
function validateImages(images) {
  if (!Array.isArray(images)) {
    const error = new Error("images 必须是数组");
    error.errorCode = "AI_INVALID_IMAGES";
    error.httpStatus = 400;
    throw error;
  }
  if (images.length > MAX_IMAGES) {
    const error = new Error(`一次最多上传 ${MAX_IMAGES} 张图片`);
    error.errorCode = "AI_TOO_MANY_IMAGES";
    error.httpStatus = 400;
    throw error;
  }
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
      const error = new Error(`${image.name || "文件"} 不是支持的图片格式`);
      error.errorCode = "AI_UNSUPPORTED_IMAGE_TYPE";
      error.httpStatus = 400;
      throw error;
    }
    const dataUrl = String(image.dataUrl || "");
    const encoded = dataUrl.match(/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!encoded) {
      const error = new Error("图片数据格式不正确");
      error.errorCode = "AI_INVALID_IMAGE_DATA";
      error.httpStatus = 400;
      throw error;
    }
    let paddingBytes = 0;
    if (encoded[1].endsWith("==")) {
      paddingBytes = 2;
    } else if (encoded[1].endsWith("=")) {
      paddingBytes = 1;
    }
    const actualBytes = Math.floor((encoded[1].length * 3) / 4) - paddingBytes;
    if (actualBytes > MAX_IMAGE_BYTES) {
      const error = new Error(`${image.name || "图片"} 超过 5MB`);
      error.errorCode = "AI_IMAGE_TOO_LARGE";
      error.httpStatus = 400;
      throw error;
    }
  }
}

// 只限制高成本 AI 请求，避免公开接口被脚本反复调用而消耗云端额度
function isAiRateLimited(request) {
  // 按连接地址限流
  const ip = String(request.socket.remoteAddress || "unknown");
  const now = Date.now();
  if (aiRateLimit.size > 10000) {
    const rateLimitEntries = Array.from(aiRateLimit.entries());
    for (let entryIndex = 0; entryIndex < rateLimitEntries.length; entryIndex += 1) {
      const entry = rateLimitEntries[entryIndex];
      const key = entry[0];
      const times = entry[1];
      let hasRecentTime = false;
      for (let index = 0; index < times.length; index += 1) {
        if (now - times[index] < AI_RATE_LIMIT_WINDOW) {
          hasRecentTime = true;
          break;
        }
      }
      if (!hasRecentTime) {
        aiRateLimit.delete(key);
      }
    }
  }
  const recordedTimes = aiRateLimit.get(ip) || [];
  const recent = [];
  for (let index = 0; index < recordedTimes.length; index += 1) {
    if (now - recordedTimes[index] < AI_RATE_LIMIT_WINDOW) {
      recent.push(recordedTimes[index]);
    }
  }
  if (recent.length >= AI_RATE_LIMIT_COUNT) {
    aiRateLimit.set(ip, recent);
    return true;
  }
  recent.push(now);
  aiRateLimit.set(ip, recent);
  return false;
}

// 记录服务端错误，向访客返回简短提示
function publicError(error, fallback = "请求处理失败") {
  // 详细错误只写入服务日志，避免把数据库地址或上游响应泄露给访客
  console.error(error);
  if (error && error.publicMessage) {
    return error.publicMessage;
  }
  return fallback;
}

// 把 AI 错误整理成前端可以显示的有限字段
function publicAiError(error, fallback = "AI 请求失败") {
  console.error(error);
  let message = fallback;
  let errorCode = "INTERNAL_ERROR";
  let upstreamCode = null;
  let requestId = null;
  if (error) {
    message = error.publicMessage || fallback;
    errorCode = error.errorCode || errorCode;
    upstreamCode = error.upstreamCode || null;
    requestId = error.requestId || null;
  }
  return {
    message: message,
    errorCode: errorCode,
    upstreamCode: upstreamCode,
    requestId: requestId,
  };
}

// 数据库未配置时，统一返回服务不可用提示
function databaseUnavailable(response) {
  return sendJson(response, 503, {
    error: "数据库尚未配置，请设置 DB_HOST、DB_NAME、DB_USER 和 DB_PASSWORD",
  });
}

// 一次查询取得首页的三项数量，避免分别请求数据库
async function getDatabaseStats() {
  const queryResult = await database.query(
    dbPool,
    `
    SELECT
      (SELECT COUNT(*) FROM relics WHERE is_published = 1) AS relics,
      (SELECT COUNT(*) FROM sites WHERE is_published = 1) AS sites,
      (SELECT COUNT(*) FROM courses WHERE is_published = 1) AS courses
  `,
  );
  const rows = queryResult[0];
  return rows[0];
}

// 列表字段可能存成 JSON 字符串，先转回数组，前端就能直接遍历
function mapSite(row) {
  const site = Object.assign({}, row);
  let tags = [];
  let seals = [];
  if (typeof row.tags === "string") {
    tags = JSON.parse(row.tags || "[]");
  } else if (row.tags) {
    tags = row.tags;
  }
  if (typeof row.seals === "string") {
    seals = JSON.parse(row.seals || "[]");
  } else if (row.seals) {
    seals = row.seals;
  }
  site.tags = tags;
  site.seals = seals;
  return site;
}

// 按行政体系查询已发布地点；“其他”表示排除三个主要体系
async function getSites(period = "全部") {
  const params = [];
  let sql = "SELECT * FROM sites WHERE is_published = 1";
  if (period && period !== "全部") {
    sql += " AND period LIKE ?";
    if (period === "其他") {
      params.push("%");
    } else {
      params.push(`%${period}%`);
    }
  }
  sql += " ORDER BY id";
  const queryResult = await database.query(dbPool, sql, params);
  const rows = queryResult[0];
  if (period === "其他") {
    const mainSystems = ["青州", "兖州", "徐州"];
    const otherSites = [];
    for (let siteIndex = 0; siteIndex < rows.length; siteIndex += 1) {
      const site = rows[siteIndex];
      let belongsToMainSystem = false;
      for (let nameIndex = 0; nameIndex < mainSystems.length; nameIndex += 1) {
        if (site.period.includes(mainSystems[nameIndex])) {
          belongsToMainSystem = true;
          break;
        }
      }
      if (!belongsToMainSystem) {
        otherSites.push(mapSite(site));
      }
    }
    return otherSites;
  }
  const mappedSites = [];
  for (let index = 0; index < rows.length; index += 1) {
    mappedSites.push(mapSite(rows[index]));
  }
  return mappedSites;
}

// 在多个字段中搜索关键词，使用参数绑定传入搜索值
async function getRelics(keyword = "") {
  const like = `%${keyword}%`;
  const queryResult = await database.query(
    dbPool,
    `
    SELECT id, name, inscription, period, location, category, tone, value, image_url AS imageUrl, summary
    FROM relics
    WHERE is_published = 1
      AND (? = '' OR CONCAT_WS(' ', name, inscription, period, location, category, value, summary) LIKE ?)
    ORDER BY id
  `,
    [keyword, like],
  );
  const rows = queryResult[0];
  return { items: rows, total: rows.length };
}

// 查询已发布课程，并返回前端需要的公开字段
async function getCourses() {
  const queryResult = await database.query(
    dbPool,
    "SELECT id, title, lesson, duration, description, video_url AS videoUrl, poster_url AS posterUrl FROM courses WHERE is_published = 1 ORDER BY lesson, id",
  );
  const rows = queryResult[0];
  return rows;
}

// 查询已发布文创作品，并按后台排序字段返回
async function getCreativeWorks() {
  const queryResult = await database.query(
    dbPool,
    "SELECT id, name, category, mark, description FROM creative_works WHERE is_published = 1 ORDER BY sort_order, id",
  );
  const rows = queryResult[0];
  return rows;
}

// 随机抽取最多十道已发布题目
async function startQuizRound() {
  const queryResult = await database.query(
    dbPool,
    `
    SELECT id, question_text AS question, option_a AS optionA, option_b AS optionB,
      option_c AS optionC, option_d AS optionD, difficulty
    FROM questions
    WHERE is_published = 1
    ORDER BY RAND()
    LIMIT ${QUIZ_QUESTION_COUNT}
  `,
  );
  const rows = queryResult[0];
  if (!rows.length) throw new Error("题库中没有已发布题目");
  return { questions: rows, total: rows.length, scorePerQuestion: QUIZ_SCORE_PER_QUESTION };
}

// 判断当前题目的答案，返回对错、解析和得分
async function answerQuizQuestion(questionId, selectedAnswer) {
  const queryResult = await database.query(
    dbPool,
    "SELECT correct_answer, explanation FROM questions WHERE id = ? AND is_published = 1 LIMIT 1",
    [questionId],
  );
  const rows = queryResult[0];
  if (!rows[0]) throw new Error("题目不存在或已停止发布");
  const correct = selectedAnswer === rows[0].correct_answer;
  let earnedScore = 0;
  if (correct) {
    earnedScore = QUIZ_SCORE_PER_QUESTION;
  }
  return {
    questionId,
    selectedAnswer,
    correct: correct,
    correctAnswer: rows[0].correct_answer,
    explanation: rows[0].explanation,
    earnedScore: earnedScore,
  };
}

// 两类模型请求共用鉴权、JSON 解析和错误处理，各模型函数只负责请求体与结果格式
async function requestDashScope(url, body, errorLabel) {
  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60 * 1000),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      error.errorCode = "AI_UPSTREAM_TIMEOUT";
      error.publicMessage = `${errorLabel}请求超时，请稍后重试`;
    } else {
      error.errorCode = "AI_UPSTREAM_NETWORK_ERROR";
      error.publicMessage = `${errorLabel}网络连接失败，请检查服务器网络或代理配置`;
    }
    throw error;
  }
  let data = {};
  try {
    data = await upstream.json();
  } catch (error) {
    data = {};
  }
  if (!upstream.ok) {
    let reason = `${errorLabel}返回 ${upstream.status}`;
    if (data.error && data.error.message) {
      reason = data.error.message;
    } else if (data.message) {
      reason = data.message;
    }
    const error = new Error(reason);
    error.publicMessage = reason;
    error.errorCode = `UPSTREAM_HTTP_${upstream.status}`;
    error.upstreamCode = null;
    if (data.code) {
      error.upstreamCode = data.code;
    } else if (data.error && data.error.code) {
      error.upstreamCode = data.error.code;
    }
    error.requestId = null;
    if (data.request_id) {
      error.requestId = data.request_id;
    } else if (data.requestId) {
      error.requestId = data.requestId;
    } else {
      error.requestId = upstream.headers.get("x-request-id") || null;
    }
    error.httpStatus = upstream.status;
    throw error;
  }
  aiStatusCache = { checkedAt: Date.now(), connected: true };
  return data;
}

// 调用百炼应用检查连通状态，并缓存结果
async function isAiUpstreamReachable() {
  if (!API_KEY || !APP_ID) return false;
  let cacheDuration = AI_STATUS_FAILURE_CACHE_MS;
  if (aiStatusCache.connected) {
    cacheDuration = AI_STATUS_SUCCESS_CACHE_MS;
  }
  if (Date.now() - aiStatusCache.checkedAt < cacheDuration) return aiStatusCache.connected;
  // FC 冷启动后可能同时收到多个页面探测，复用进行中的请求以免重复调用上游
  if (aiStatusProbe) return aiStatusProbe;
  aiStatusProbe = (async function probeBailianApplication() {
    try {
      await requestDashScope(
        `${DASHSCOPE_BASE_URL}/${encodeURIComponent(APP_ID)}/completion`,
        { input: { prompt: "请只回复OK" }, parameters: {}, debug: {} },
        "百炼应用",
      );
      return true;
    } catch (_) {
      aiStatusCache = { checkedAt: Date.now(), connected: false };
      return false;
    } finally {
      aiStatusProbe = null;
    }
  })();
  return aiStatusProbe;
}

// 03. 纯文字问答：调用百炼应用
// sessionId 用来延续上下文；角色提示确保助手始终以“印小灵”自称
function normalizeAiName(text) {
  return String(text || "").replaceAll("于见泥", "印小灵");
}

async function askBailianApplication(requestData) {
  const message = requestData.message;
  const sessionId = requestData.sessionId;
  const roleContext =
    "你在本网站中的名字是‘印小灵’，请始终使用这个名字自称，绝对不要使用‘于见泥’或任何其他旧名称。语言风格亲切、可爱、自然，像一只认真陪伴用户的小猫助手，可以偶尔使用轻松俏皮的表达，但不要句句卖萌，也不要影响信息准确性。你擅长讲解封泥的封缄方式、历史价值、齐鲁文化和相关故事，也可以自然回应用户的日常问题。尽量以通俗连贯的段落形式讲解，允许换行分段；对于不确定的考证要明确说明。";
  const input = { prompt: `${roleContext}\n\n用户问题：${message}` };
  if (sessionId && sessionId !== "web-guest") input.session_id = sessionId;

  const data = await requestDashScope(
    `${DASHSCOPE_BASE_URL}/${encodeURIComponent(APP_ID)}/completion`,
    { input, parameters: {}, debug: {} },
    "上游接口",
  );
  let replyText = "百炼应用没有返回文本内容";
  let returnedSessionId = sessionId;
  if (data.output && data.output.text) {
    replyText = data.output.text;
  }
  if (data.output && data.output.session_id) {
    returnedSessionId = data.output.session_id;
  }
  return {
    reply: normalizeAiName(replyText),
    sessionId: returnedSessionId,
    requestId: data.request_id || null,
    usage: data.usage || null,
    appId: APP_ID,
  };
}

// 04. 图片问答：调用千问视觉模型
// 只要请求中包含图片，就走该函数；模型先描述可见事实，再谨慎给出释读候选
async function askQwenVision(requestData) {
  const message = requestData.message;
  const images = requestData.images;
  const content = [];
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    content.push({
      type: "image_url",
      image_url: { url: image.dataUrl },
    });
  }
  let questionText = message;
  if (!questionText) {
    questionText = "请观察上传的封泥图片，描述可见形态、印面、文字线条和保存状态，并谨慎给出可能的印文候选。";
  }
  content.push({ type: "text", text: questionText });

  const data = await requestDashScope(
    DASHSCOPE_COMPATIBLE_URL,
    {
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content:
            "你是‘印小灵’，泥云智探·齐鲁封泥智慧人文平台中一只亲切可爱的小猫导览助手。请始终使用‘印小灵’自称，绝对不要使用‘于见泥’或任何其他旧名称。表达要自然、温柔、略带俏皮，但不能用卖萌掩盖专业判断。你熟悉封泥的文书封缄功能、印章关系、古文字价值、官职制度价值、历史地理价值以及齐鲁封泥文化。分析图片时先描述可见事实，再给出候选释读和判断依据。不得把模糊、残缺或有争议的古文字识别写成定论，不得编造文物出处、年代和收藏信息。结尾用亲切但明确的方式提醒用户，正式释读仍需要文博或古文字专家复核。",
        },
        { role: "user", content },
      ],
      temperature: 0.2,
    },
    "视觉模型",
  );
  let replyText = "千问视觉模型没有返回文本内容";
  if (
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
  ) {
    replyText = data.choices[0].message.content;
  }
  return {
    reply: normalizeAiName(replyText),
    model: data.model || VISION_MODEL,
    usage: data.usage || null,
    mode: "vision",
  };
}

// 05. 路由入口
// 浏览器请求先在这里按“请求方法 + 路径”分流，未命中 API 的 GET 请求再交给静态文件服务
const server = http.createServer(async function handleRequest(request, response) {
  if (request.method === "OPTIONS") return sendJson(response, 204, {});

  // 检查上游连通性，返回状态和脱敏配置
  if (request.method === "GET" && request.url === "/api/ai/status") {
    const connected = await isAiUpstreamReachable();
    let appId = "";
    if (APP_ID) {
      appId = `${APP_ID.slice(0, 6)}...`;
    }
    return sendJson(response, 200, {
      connected: connected,
      configured: Boolean(API_KEY && APP_ID),
      verified: true,
      provider: "Bailian Application",
      appId: appId,
      supportsImages: true,
      visionModel: VISION_MODEL,
    });
  }

  if (request.method === "GET" && request.url === "/api/health") {
    if (!database.isDatabaseConfigured()) {
      return sendJson(response, 200, { server: "ok", database: "not-configured" });
    }
    try {
      await database.query(dbPool, "SELECT 1 AS ok");
      return sendJson(response, 200, { server: "ok", database: "ok" });
    } catch (error) {
      return sendJson(response, 503, { server: "ok", database: "error", message: "数据库暂时不可用" });
    }
  }

  if (request.method === "GET" && request.url.startsWith("/api/data/")) {
    if (!database.isDatabaseConfigured()) return databaseUnavailable(response);
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (url.pathname === "/api/data/stats") return sendJson(response, 200, await getDatabaseStats());
      if (url.pathname === "/api/data/sites")
        return sendJson(response, 200, await getSites(url.searchParams.get("period") || "全部"));
      if (url.pathname === "/api/data/relics")
        return sendJson(response, 200, await getRelics(url.searchParams.get("keyword") || ""));
      if (url.pathname === "/api/data/courses") return sendJson(response, 200, await getCourses());
      if (url.pathname === "/api/data/creative-works")
        return sendJson(response, 200, await getCreativeWorks());
      const relicMatch = url.pathname.match(/^\/api\/data\/relics\/([^/]+)$/);
      if (relicMatch) {
        const queryResult = await database.query(
          dbPool,
          `
          SELECT id, name, inscription, period, location, category, tone, value, image_url AS imageUrl, summary
          FROM relics WHERE is_published = 1 AND id = ? LIMIT 1
        `,
          [relicMatch[1]],
        );
        const rows = queryResult[0];
        return sendJson(response, 200, rows[0] || null);
      }
      return sendJson(response, 404, { error: "数据接口不存在" });
    } catch (error) {
      return sendJson(response, 500, { error: publicError(error, "数据库查询失败") });
    }
  }

  if (request.method === "GET" && request.url === "/api/quiz/start") {
    if (!database.isDatabaseConfigured()) return databaseUnavailable(response);
    try {
      return sendJson(response, 200, await startQuizRound());
    } catch (error) {
      return sendJson(response, 400, { error: publicError(error, "题目抽取失败") });
    }
  }

  if (request.method === "POST" && request.url === "/api/quiz/answer") {
    if (!database.isDatabaseConfigured()) return databaseUnavailable(response);
    try {
      const body = await readJson(request);
      if (!body || typeof body !== "object" || Array.isArray(body))
        return sendJson(response, 400, { error: "请求数据格式不正确" });
      const questionId = Number(body.questionId);
      const selectedAnswer = String(body.answer || "")
        .trim()
        .toUpperCase();
      if (!Number.isInteger(questionId)) return sendJson(response, 400, { error: "questionId 必须是整数" });
      if (!["A", "B", "C", "D"].includes(selectedAnswer))
        return sendJson(response, 400, { error: "answer 必须是 A、B、C 或 D" });
      return sendJson(response, 200, await answerQuizQuestion(questionId, selectedAnswer));
    } catch (error) {
      return sendJson(response, 400, { error: publicError(error, "答案提交失败") });
    }
  }

  // AI 聊天主接口：有图片走视觉模型，没有图片走百炼应用
  if (request.method === "POST" && request.url === "/api/ai/chat") {
    if (!API_KEY)
      return sendJson(response, 503, {
        error: "尚未设置 DASHSCOPE_API_KEY",
        errorCode: "AI_CONFIG_MISSING_API_KEY",
      });
    if (!APP_ID)
      return sendJson(response, 503, {
        error: "尚未设置 DASHSCOPE_APP_ID",
        errorCode: "AI_CONFIG_MISSING_APP_ID",
      });
    if (isAiRateLimited(request))
      return sendJson(response, 429, { error: "请求过于频繁，请稍后再试", errorCode: "AI_RATE_LIMITED" });
    try {
      const body = await readJson(request);
      if (!body || typeof body !== "object" || Array.isArray(body))
        return sendJson(response, 400, { error: "请求数据格式不正确", errorCode: "AI_INVALID_REQUEST" });
      const message = String(body.message || "").trim();
      const images = body.images || [];
      if (message.length > MAX_MESSAGE_LENGTH)
        return sendJson(response, 400, {
          error: `问题不能超过 ${MAX_MESSAGE_LENGTH} 个字符`,
          errorCode: "AI_MESSAGE_TOO_LONG",
        });
      validateImages(images);
      if (!message && images.length === 0)
        return sendJson(response, 400, { error: "请输入问题或上传图片", errorCode: "AI_EMPTY_INPUT" });
      let result;
      if (images.length) {
        result = await askQwenVision({ message: message, images: images });
      } else {
        result = await askBailianApplication({ message: message, sessionId: body.sessionId });
      }
      return sendJson(response, 200, result);
    } catch (error) {
      const detail = publicAiError(error);
      let statusCode = 502;
      if (error.httpStatus && error.httpStatus >= 400 && error.httpStatus < 600) {
        statusCode = error.httpStatus;
      }
      return sendJson(
        response,
        statusCode,
        {
          error: detail.message,
          errorCode: detail.errorCode,
          upstreamCode: detail.upstreamCode,
          requestId: detail.requestId,
        },
      );
    }
  }

  if (request.method === "GET") return serveStatic(request, response);
  return sendJson(response, 404, { error: "接口不存在" });
});

// 06. 启动服务
// 监听 0.0.0.0 才能兼容阿里云 FC；本地仍通过 http://127.0.0.1:端口 访问
server.listen(PORT, "0.0.0.0", function reportServerStarted() {
  console.log(`Website and Qwen proxy listening on 0.0.0.0:${PORT}`);
  console.log(`Bailian application: ${APP_ID || "missing"}`);
  console.log(`Vision model: ${VISION_MODEL}`);
  if (API_KEY) {
    console.log("DASHSCOPE_API_KEY is configured");
  } else {
    console.log("DASHSCOPE_API_KEY is missing");
  }
});
// 防止异常客户端长期占用连接；AI 上游另有更短的超时控制
server.requestTimeout = REQUEST_TIMEOUT;
server.headersTimeout = 15 * 1000;
