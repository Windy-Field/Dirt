(function () {
  // 云端优先、本地兜底；真实 Key 始终只保存在对应后端。
  const API_BASE_URLS = [...new Set([
    window.APP_CONFIG?.AI_API_BASE_URL,
    window.APP_CONFIG?.AI_FALLBACK_API_BASE_URL
  ].filter(Boolean).map((url) => String(url).replace(/\/$/, "")))];
  let activeBaseUrl = "";

  function notifyStatus(status) {
    window.dispatchEvent(new CustomEvent("ai-status-change", { detail: status }));
  }

  // 浏览器不能直接把 File 对象放进 JSON，所以先转成后端可读取的 Data URL。
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result
      });
      reader.onerror = () => reject(new Error(`无法读取图片：${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  window.AiService = {
    // 页面启动时调用状态接口，用来显示“AI助手已连接/未连接”。
    async getStatus() {
      let latestStatus = null;
      for (const baseUrl of API_BASE_URLS) {
        try {
          const response = await fetch(`${baseUrl}/api/ai/status`);
          const status = response.ok ? await response.json() : null;
          if (status) latestStatus = status;
          // 兼容尚未返回 verified 字段的旧版后端；真正请求失败时，chat() 仍会显示具体错误。
          if (status?.connected && (status.verified === true || status.verified === undefined)) {
            activeBaseUrl = baseUrl;
            notifyStatus(status);
            return status;
          }
        } catch (_) {
          // 当前候选不可用时继续尝试下一后端。
        }
      }
      activeBaseUrl = "";
      const status = latestStatus || { connected: false, configured: false, appId: "" };
      notifyStatus({ ...status, connected: false });
      return status;
    },

    // 把文字、图片和会话编号统一交给后端；后端再决定调用文字模型还是视觉模型。
    async chat({ message, images = [], sessionId = "guest" }) {
      const encodedImages = await Promise.all(images.map(fileToDataUrl));
      const candidates = [...new Set([activeBaseUrl, ...API_BASE_URLS].filter(Boolean))];
      let lastError = "AI服务暂时不可用";
      for (const baseUrl of candidates) {
        try {
          const response = await fetch(`${baseUrl}/api/ai/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, sessionId, images: encodedImages })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            lastError = response.status === 403
              ? "百炼鉴权失败（403），请确认 API Key 与应用 ID 属于同一阿里云账号，并已获得应用调用权限"
              : result.error || `AI后端返回 ${response.status}`;
            continue;
          }
          activeBaseUrl = baseUrl;
          notifyStatus({ connected: true, configured: true, verified: true });
          return result;
        } catch (error) {
          lastError = error.message || lastError;
        }
      }
      throw new Error(lastError === "fetch failed" ? "AI网络连接失败，请检查本机代理，或使用已部署的云端后端" : lastError);
    }
  };
}());
