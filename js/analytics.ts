(function setupAnalytics() {
    const config = window.APP_CONFIG || {};
    const websiteId = String(config.UMAMI_WEBSITE_ID || "").trim();
    // 配置 Website ID 且通过 HTTP 访问时启用统计
    if (!websiteId || window.location.protocol === "file:") {
        return;
    }
    const scriptUrl = String(config.UMAMI_SCRIPT_URL || "https://cloud.umami.is/script.js").trim();
    let parsedUrl;
    try {
        parsedUrl = new URL(scriptUrl, window.location.href);
    }
    catch {
        // 地址无效时跳过统计
        return;
    }
    // 统计数据可能包含访问路径等信息，因此只允许通过加密的 HTTPS 连接发送
    if (parsedUrl.protocol !== "https:") {
        return;
    }
    // 按站点配置创建 Umami 脚本
    const script = document.createElement("script");
    script.defer = true;
    script.src = parsedUrl.href;
    script.dataset.websiteId = websiteId;
    // 遵循浏览器的“请勿跟踪”设置
    script.dataset.doNotTrack = "true";
    const domains = String(config.UMAMI_DOMAINS || "").trim();
    if (domains) {
        script.dataset.domains = domains;
    }
    document.head.appendChild(script);
}());
