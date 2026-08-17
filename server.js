const http = require("http");
const fs = require("fs");
const path = require("path");

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
  return data;
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
      connected: Boolean(API_KEY && APP_ID),
      provider: "Bailian Application",
      appId: APP_ID ? `${APP_ID.slice(0, 6)}...` : "",
      supportsImages: true,
      visionModel: VISION_MODEL
    });
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
