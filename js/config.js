// 前端公开配置：这里只保存云端后端地址，绝对不要把 DASHSCOPE_API_KEY 写在这里。
// 在本地使用同一个 server.js 提供网页和 API 时，也可以暂时把地址改成空字符串 ""。
window.APP_CONFIG = {
  AI_API_BASE_URL: "https://fengni-digital-uzuaeovudo.cn-hangzhou.fcapp.run",
  AI_FALLBACK_API_BASE_URL: "http://127.0.0.1:3000",
  API_BASE_URL: "http://127.0.0.1:3000",
  USE_DATABASE: false, // 普通栏目继续使用本地展示数据
  USE_QUIZ_DATABASE: false
};
