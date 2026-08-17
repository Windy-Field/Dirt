(function () {
  // 从 config.js 读取云端后端地址。这里不直接调用百炼，避免把 API Key 暴露给浏览器。
  const API_BASE_URL = String(window.APP_CONFIG?.AI_API_BASE_URL || "").replace(/\/$/, "");
  const API_URL = `${API_BASE_URL}/api/ai/chat`;

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
      try {
        const response = await fetch(`${API_BASE_URL}/api/ai/status`);
        if (!response.ok) return { connected: false, appId: "" };
        return response.json();
      } catch {
        return { connected: false, appId: "" };
      }
    },

    // 把文字、图片和会话编号统一交给后端；后端再决定调用文字模型还是视觉模型。
    async chat({ message, images = [], sessionId = "guest" }) {
      const encodedImages = await Promise.all(images.map(fileToDataUrl));
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId, images: encodedImages })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "千问服务暂时不可用，请确认本地AI服务已经启动");
      }
      return result;
    }
  };
}());
