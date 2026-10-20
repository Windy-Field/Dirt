// 同域部署时地址留空，密钥配置在服务端
// 本地前后端分开运行时，可暂时将下面三个地址改为 "http://127.0.0.1:3000"
window.APP_CONFIG = {
    AI_API_BASE_URL: "",
    AI_FALLBACK_API_BASE_URL: "",
    API_BASE_URL: "",
    USE_DATABASE: false, // 普通栏目继续使用本地展示数据
    USE_QUIZ_DATABASE: false,
    // Website ID 从 Umami 的“网站设置”复制，留空关闭统计
    UMAMI_WEBSITE_ID: "e6968404-1549-48e2-ad4a-f529a957112d",
    // 使用 Umami Cloud 时保持默认地址；自建 Umami 时改成自己服务器上的 script.js 地址
    UMAMI_SCRIPT_URL: "https://cloud.umami.is/script.js",
    // 可选：只统计这些正式域名。多个域名用英文逗号分隔，可防止测试站访问混入报表
    UMAMI_DOMAINS: "niyunzhitan.cn,www.niyunzhitan.cn",
};
