interface AiImageData {
    name: string;
    type: string;
    size: number;
    dataUrl: string;
}
(function initializeAiService() {
    let valueResult1;
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
        valueResult1 = window.location.origin;
    }
    else {
        valueResult1 = "";
    }
    // 依次尝试主后端和备用后端
    // 地址为空时使用同源后端，支持通过 server.js 同时托管网页和 AI API
    // 双击页面时使用本地 HTTP 服务
    const sameOriginBaseUrl = valueResult1;
    let valueResult3;
    if (window.location.protocol === "file:") {
        valueResult3 = "http://127.0.0.1:3000";
    }
    else {
        valueResult3 = "";
    }
    const localServerBaseUrl = valueResult3;
    let valueResult5;
    const items3 = [];
    let valueResult7;
    let valueResult9;
    let valueResult11;
    const value14 = window.APP_CONFIG;
    if (value14 === null || value14 === undefined) {
        valueResult11 = undefined;
    }
    else {
        valueResult11 = value14.AI_API_BASE_URL;
    }
    let valueResult13;
    const value16 = window.APP_CONFIG;
    if (value16 === null || value16 === undefined) {
        valueResult13 = undefined;
    }
    else {
        valueResult13 = value16.AI_FALLBACK_API_BASE_URL;
    }
    const items10 = [
        valueResult11,
        valueResult13,
        sameOriginBaseUrl,
        localServerBaseUrl,
    ];
    const result13 = [];
    for (let index12 = 0; index12 < items10.length; index12++) {
        if (Boolean(items10[index12])) {
            result13.push(items10[index12]);
        }
    }
    valueResult9 = result13;
    const items6 = valueResult9;
    const result9 = [];
    for (let index8 = 0; index8 < items6.length; index8++) {
        let valueResult15;
        {
            const url = items6[index8];
            valueResult15 = String(url).replace(/\/$/, "");
        }
        result9.push(valueResult15);
    }
    valueResult7 = result9;
    const part4 = Array.from(new Set(valueResult7));
    for (let index5 = 0; index5 < part4.length; index5++) {
        items3.push(part4[index5]);
    }
    valueResult5 = items3;
    const API_BASE_URLS = valueResult5;
    let activeBaseUrl = "";
    // 保存最近一次配置状态，超时后仍可用于提示
    let lastKnownStatus: AiStatus | null = null;
    // connected: true 表示成功，false 表示失败，null 表示探测未取得结论
    // configured 表示后端配置是否齐全
    function notifyStatus(status: AiStatus): void {
        lastKnownStatus = status;
        window.dispatchEvent(new CustomEvent("ai-status-change", { detail: status }));
    }
    // 将图片转成 Data URL，随 JSON 发送给后端
    function fileToDataUrl(file: File): Promise<AiImageData> {
        return new Promise(function readImageAsDataUrl(resolve, reject) {
            const reader = new FileReader();
            reader.onload = function handleImageRead() {
                if (typeof reader.result !== "string") {
                    reject(new Error("无法读取图片数据"));
                    return;
                }
                resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: reader.result,
                });
            };
            reader.onerror = function handleImageReadError() {
                reject(new Error(("无法读取图片：" + (file.name))));
            };
            reader.readAsDataURL(file);
        });
    }
    window.AiService = {
        // 页面启动时调用状态接口，用来显示“AI助手已连接/未连接”
        async getStatus(): Promise<AiStatus> {
            let latestStatus: AiStatus | null = null;
            let latestBaseUrl = "";
            for (let baseUrlIndex = 0; baseUrlIndex < API_BASE_URLS.length; baseUrlIndex += 1) {
                const baseUrl = API_BASE_URLS[baseUrlIndex];
                try {
                    const response = await fetch(("" + (baseUrl) + "/api/ai/status"), { signal: AbortSignal.timeout(10000) });
                    let valueResult17;
                    if (response.ok) {
                        valueResult17 = await response.json();
                    }
                    else {
                        valueResult17 = null;
                    }
                    const status: AiStatus | null = valueResult17;
                    if (status) {
                        latestStatus = status;
                        latestBaseUrl = baseUrl;
                    }
                    let valueResult19;
                    const value22 = status;
                    if (value22 === null || value22 === undefined) {
                        valueResult19 = undefined;
                    }
                    else {
                        valueResult19 = value22.connected;
                    }
                    // 兼容旧版后端缺少 verified 字段的响应
                    if (valueResult19 && (status.verified === true || status.verified === undefined)) {
                        activeBaseUrl = baseUrl;
                        notifyStatus(status);
                        return status;
                    }
                }
                catch (_) {
                }
            }
            if (latestStatus) {
                let valueResult21;
                if (latestStatus.configured === false) {
                    valueResult21 = "";
                }
                else {
                    valueResult21 = latestBaseUrl;
                }
                // 保留已配置的后端作为聊天候选，成功后更新连接状态
                activeBaseUrl = valueResult21;
                const status = Object.assign({}, latestStatus, { checking: false });
                notifyStatus(status);
                return status;
            }
            activeBaseUrl = "";
            let valueResult23;
            let valueResult25;
            {
                const value26 = lastKnownStatus;
                if (value26 === null || value26 === undefined) {
                    valueResult25 = undefined;
                }
                else {
                    valueResult25 = value26.configured;
                }
                const value = valueResult25;
                if (value === null || value === undefined) {
                    valueResult23 = null;
                }
                else {
                    valueResult23 = value;
                }
            }
            // 状态请求超时时显示待确认
            const unknownStatus = {
                connected: null,
                configured: valueResult23,
                verified: false,
                checking: true,
            };
            notifyStatus(unknownStatus);
            return unknownStatus;
        },
        // 把文字、图片和会话编号统一交给后端；后端再决定调用文字模型还是视觉模型
        async chat(options28: AiRequest): Promise<AiReply> {
            const source29 = options28;
            const message = source29.message;
            const images = (function readDefault30() {
                const value = source29.images;
                if (value === undefined) {
                    return [];
                }
                return value;
            })();
            const sessionId = (function readDefault31() {
                const value = source29.sessionId;
                if (value === undefined) {
                    return "guest";
                }
                return value;
            })();
            let valueResult27;
            const items32 = images;
            const result35 = [];
            for (let index34 = 0; index34 < items32.length; index34++) {
                result35.push(fileToDataUrl(items32[index34]));
            }
            valueResult27 = result35;
            const encodedImages = await Promise.all(valueResult27);
            let valueResult29;
            const items37 = [];
            let valueResult31;
            let valueResult33;
            const items44 = [];
            items44.push(activeBaseUrl);
            const part45 = Array.from(API_BASE_URLS);
            for (let index46 = 0; index46 < part45.length; index46++) {
                items44.push(part45[index46]);
            }
            valueResult33 = items44;
            const items40 = valueResult33;
            const result43 = [];
            for (let index42 = 0; index42 < items40.length; index42++) {
                if (Boolean(items40[index42])) {
                    result43.push(items40[index42]);
                }
            }
            valueResult31 = result43;
            const part38 = Array.from(new Set(valueResult31));
            for (let index39 = 0; index39 < part38.length; index39++) {
                items37.push(part38[index39]);
            }
            valueResult29 = items37;
            const candidates = valueResult29;
            let valueResult35;
            if (API_BASE_URLS.length) {
                valueResult35 = "印小灵暂时没接上线，请稍后再试一次";
            }
            else {
                valueResult35 = "AI 后端地址未配置（错误码：AI_BACKEND_NOT_CONFIGURED）。请通过 npm start 启动 server.js，或在 js/config.js 配置 AI_API_BASE_URL";
            }
            let lastError = valueResult35;
            for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
                const baseUrl = candidates[candidateIndex];
                try {
                    const response = await fetch(("" + (baseUrl) + "/api/ai/chat"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ message: message, sessionId: sessionId, images: encodedImages }),
                    });
                    const result: AiReply = await response.json().catch(function () {
                        return ({});
                    });
                    if (!response.ok) {
                        const code = result.errorCode || ("HTTP_" + (response.status));
                        let valueResult37;
                        if (result.upstreamCode) {
                            valueResult37 = ("，上游码：" + (result.upstreamCode));
                        }
                        else {
                            valueResult37 = "";
                        }
                        const upstream = valueResult37;
                        let valueResult39;
                        if (result.requestId) {
                            valueResult39 = ("，请求ID：" + (result.requestId));
                        }
                        else {
                            valueResult39 = "";
                        }
                        const requestId = valueResult39;
                        let valueResult41;
                        if (response.status === 401 || response.status === 403) {
                            valueResult41 = "请确认 API Key、应用 ID 和账号权限配置";
                        }
                        else {
                            let valueResult43;
                            if (response.status === 429) {
                                valueResult43 = "请稍后再试";
                            }
                            else {
                                valueResult43 = "请检查服务端日志或稍后重试";
                            }
                            valueResult41 = valueResult43;
                        }
                        const advice = valueResult41;
                        lastError = ("" + (result.error || ("AI 后端返回 HTTP " + (response.status))) + "（错误码：" + (code) + (upstream) + (requestId) + "）。" + (advice));
                        continue;
                    }
                    activeBaseUrl = baseUrl;
                    notifyStatus({ connected: true, configured: true, verified: true });
                    return result;
                }
                catch (error) {
                    lastError = ("AI 网络请求失败（错误码：AI_NETWORK_ERROR）。" + (error.message || "请检查网络连接或服务端状态"));
                }
            }
            let valueResult45;
            let valueResult47;
            {
                const value56 = lastKnownStatus;
                if (value56 === null || value56 === undefined) {
                    valueResult47 = undefined;
                }
                else {
                    valueResult47 = value56.configured;
                }
                const value = valueResult47;
                if (value === null || value === undefined) {
                    valueResult45 = true;
                }
                else {
                    valueResult45 = value;
                }
            }
            // 聊天请求失败后更新状态提示
            notifyStatus({
                connected: false,
                configured: valueResult45,
                verified: false,
                checking: false,
            });
            let valueResult49;
            if (lastError === "fetch failed") {
                valueResult49 = "AI 网络连接失败（错误码：AI_NETWORK_ERROR）。请检查本机代理，或使用已部署的云端后端";
            }
            else {
                valueResult49 = lastError;
            }
            throw new Error(valueResult49);
        },
    };
})();
