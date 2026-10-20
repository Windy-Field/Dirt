(function initializeAiPet() {
    const config: PetConfig = window.AI_PET_CONFIG || {};
    const root = (document.querySelector("#aiPet") as HTMLElement);
    if (!root || config.enabled === false || !window.AiService) {
        return;
    }
    const storageKey = "niyun-ai-pet-enabled";
    const sessionKey = "niyun-yinxiaoling-ai-pet-session";
    const positionKey = "niyun-ai-pet-relative-position";
    const petButton = (root.querySelector("[data-pet-toggle]") as HTMLElement);
    const panel = (root.querySelector(".ai-pet-panel") as HTMLElement);
    const form = (root.querySelector(".ai-pet-form") as HTMLFormElement);
    const input = (root.querySelector(".ai-pet-input") as HTMLInputElement);
    const messages = (root.querySelector(".ai-pet-messages") as HTMLElement);
    const stage = (root.querySelector(".ai-pet-stage") as HTMLElement);
    let valueResult1;
    if (stage) {
        valueResult1 = Array.from((stage.querySelectorAll(".ai-pet-layer") as NodeListOf<HTMLImageElement>));
    }
    else {
        valueResult1 = [];
    }
    const layers = valueResult1;
    let currentLayerIndex = 0;
    const image = layers[0] || (root.querySelector(".ai-pet-image") as HTMLImageElement);
    const closeButton = (root.querySelector("[data-pet-close]") as HTMLElement);
    const clearButton = (root.querySelector("[data-pet-clear]") as HTMLElement);
    const greeting = (root.querySelector(".ai-pet-greeting") as HTMLElement);
    const stateText = (root.querySelector(".ai-pet-state") as HTMLElement);
    const greetingStorageKey = "niyun-ai-pet-dynamic-greeting";
    let sessionId = window.sessionStorage.getItem(sessionKey) || "";
    let moved = false;
    let hasCustomPosition = false;
    let customPositionRatio = { x: 1, y: 1 };
    let dragOffset = { x: 0, y: 0 };
    let pointerStart = { x: 0, y: 0 };
    let greetingTimer = null;
    let dynamicGreetingEnabled = false;
    let greetingIndex = 0;
    let imageContentBounds = { left: 0, top: 0, right: 1, bottom: 1 };
    let currentState = config.defaultState || "idle";
    let stateBeforeHover = currentState;
    let conversationInProgress = false;
    let pointerInside = false;
    let returnToIdleTimer = null;
    let conversationRevision = 0;
    function getPositionKey() {
        let valueResult3;
        if (window.matchMedia("(max-width: 47.5rem)").matches) {
            valueResult3 = "mobile";
        }
        else {
            valueResult3 = "desktop";
        }
        return ("" + (positionKey) + "-" + valueResult3);
    }
    const viewportMediaQuery = window.matchMedia("(max-width: 47.5rem)");
    let lastViewportKey = getPositionKey();
    const greetingSets = {
        morning: ["早呀，今天也要元气满满！", "小爪子已经准备好啦", "要一起看看古人的小秘密吗？"],
        afternoon: ["下午好呀，来歇一小会儿吧", "好奇的事就交给我吧", "要不要拆开一段封泥故事？"],
        evening: ["晚上好呀，今天过得怎么样？", "我还留着一盏小灯等你", "来听一小段齐鲁往事吧"],
        night: ["夜深啦，说话轻轻的", "再查一个小问题就休息吧", "困困也没关系，我还醒着呢"],
    };
    function preloadPetStates() {
        const states = config.states || {};
        const items3 = Object.values(states);
        for (let index5 = 0; index5 < items3.length; index5++) {
            {
                const src = items3[index5];
                if (!src) {
                    undefined;
                }
                else {
                    const img = new Image();
                    img.src = src;
                }
            }
        }
    }
    preloadPetStates();
    // 两张图片交替显示，先准备下一张再切换，减少角色状态变化时的闪白
    function switchTexture(nextSrc: string) {
        if (!nextSrc) {
            return;
        }
        if (layers.length < 2) {
            if (image) {
                image.src = nextSrc;
            }
            return;
        }
        const currentLayer = layers[currentLayerIndex];
        const nextLayerIndex = (currentLayerIndex + 1) % layers.length;
        const nextLayer = layers[nextLayerIndex];
        const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (currentLayer.getAttribute("data-applied-src") === nextSrc) {
            return;
        }
        nextLayer.setAttribute("data-applied-src", nextSrc);
        nextLayer.src = nextSrc;
        if (isReducedMotion) {
            const items8 = layers;
            for (let index10 = 0; index10 < items8.length; index10++) {
                {
                    const layer = items8[index10];
                    const layerIndex = index10;
                    if (layerIndex === nextLayerIndex) {
                        layer.classList.add("is-active");
                        layer.classList.remove("is-fading-out");
                    }
                    else {
                        layer.classList.remove("is-active");
                        layer.classList.remove("is-fading-out");
                    }
                }
            }
            currentLayerIndex = nextLayerIndex;
            return;
        }
        requestAnimationFrame(function crossfadePetTexture() {
            nextLayer.classList.remove("is-fading-out");
            nextLayer.classList.add("is-active");
            currentLayer.classList.remove("is-active");
            currentLayer.classList.add("is-fading-out");
            currentLayerIndex = nextLayerIndex;
        });
    }
    // 统一更新角色图片与状态文字，思考、回答等流程都从这里切换表情
    function setState(state: string, label?) {
        if (label === undefined) {
            label = "";
        }
        currentState = state;
        root.dataset.state = state;
        stateText.textContent =
            label ||
                {
                    idle: "来找我玩呀",
                    hover: "来找我玩呀",
                    listening: "小耳朵竖起来啦",
                    thinking: "让我抱着线索想一想",
                    answering: "答案马上端上来",
                    happy: "嘿嘿，帮上忙啦",
                    error: "小脑袋好像打了个结",
                }[state] ||
                "来找我玩呀";
        let valueResult13;
        const value13 = config.states;
        if (value13 === null || value13 === undefined) {
            valueResult13 = undefined;
        }
        else {
            valueResult13 = value13[state];
        }
        let conditionValue17 = valueResult13;
        if (!conditionValue17) {
            let valueResult15;
            const value15 = config.states;
            if (value15 === null || value15 === undefined) {
                valueResult15 = undefined;
            }
            else {
                valueResult15 = value15.idle;
            }
            conditionValue17 = valueResult15;
        }
        const targetSrc = conditionValue17 || "./assets/branding/idling.png";
        switchTexture(targetSrc);
        updateGreeting(state);
    }
    const items17 = layers;
    for (let index19 = 0; index19 < items17.length; index19++) {
        {
            const layer = items17[index19];
            layer.addEventListener("error", function handleError() {
                let valueResult22;
                const value21 = config.states;
                if (value21 === null || value21 === undefined) {
                    valueResult22 = undefined;
                }
                else {
                    valueResult22 = value21.idle;
                }
                const fallback = valueResult22 || "./assets/branding/idling.png";
                if (layer.src.endsWith(fallback)) {
                    return;
                }
                layer.src = fallback;
            });
        }
    }
    function updateGreeting(state?) {
        if (state === undefined) {
            state = "idle";
        }
        const hour = new Date().getHours();
        let valueResult24;
        if (hour < 6) {
            valueResult24 = "night";
        }
        else {
            let valueResult26;
            if (hour < 12) {
                valueResult26 = "morning";
            }
            else {
                let valueResult28;
                if (hour < 18) {
                    valueResult28 = "afternoon";
                }
                else {
                    let valueResult30;
                    if (hour < 23) {
                        valueResult30 = "evening";
                    }
                    else {
                        valueResult30 = "night";
                    }
                    valueResult28 = valueResult30;
                }
                valueResult26 = valueResult28;
            }
            valueResult24 = valueResult26;
        }
        const period = valueResult24;
        const stateLines = { thinking: "正在翻翻小册子", happy: "找到线索啦", error: "呀，线索绕成一团了" };
        if (stateLines[state]) {
            greeting.textContent = stateLines[state];
            return;
        }
        const options = greetingSets[period];
        greeting.textContent = options[greetingIndex % options.length];
        greetingIndex += 1;
    }
    function stopGreetingCycle() {
        if (greetingTimer) {
            window.clearTimeout(greetingTimer);
        }
        greetingTimer = null;
        root.classList.remove("has-greeting");
    }
    function startGreetingCycle(delay?) {
        if (delay === undefined) {
            delay = 0;
        }
        stopGreetingCycle();
        if (!dynamicGreetingEnabled) {
            return;
        }
        const timing = config.greetingTiming || {};
        const visibleMs = Math.max(1000, Number(timing.visibleMs) || 5000);
        const hiddenMs = Math.max(500, Number(timing.hiddenMs) || 3000);
        const initialDelayMs = Math.max(0, Number(timing.initialDelayMs) || 0);
        const showNextGreeting = function showNextGreeting() {
            if (!dynamicGreetingEnabled) {
                return;
            }
            updateGreeting(root.dataset.state || "idle");
            root.classList.add("has-greeting");
            greetingTimer = window.setTimeout(function hideGreetingBeforeNextCycle() {
                root.classList.remove("has-greeting");
                greetingTimer = window.setTimeout(showNextGreeting, hiddenMs);
            }, visibleMs);
        };
        greetingTimer = window.setTimeout(showNextGreeting, delay || initialDelayMs);
    }
    function clearMessages() {
        conversationRevision += 1;
        conversationInProgress = false;
        window.clearTimeout(returnToIdleTimer);
        returnToIdleTimer = null;
        sessionId = "";
        window.sessionStorage.removeItem(sessionKey);
        stateBeforeHover = "idle";
        setState("idle");
        messages.innerHTML = '<div class="ai-pet-message assistant">小黑板擦干净啦！我们重新聊封泥吧~</div>';
        messages.scrollTop = messages.scrollHeight;
        input.value = "";
        input.focus();
    }
    let closeTimer = null;
    function openPanel() {
        if (closeTimer) {
            window.clearTimeout(closeTimer);
        }
        stopGreetingCycle();
        root.classList.add("is-panel-open");
        panel.hidden = false;
        panel.classList.remove("is-closing");
        panel.classList.add("is-opening");
        const finishOpening = function finishOpening(event) {
            if (event.animationName !== "ai-pet-panel-in") {
                return;
            }
            panel.classList.remove("is-opening");
        };
        panel.addEventListener("animationend", finishOpening, { once: true });
        window.setTimeout(function () {
            return panel.classList.remove("is-opening");
        }, 900);
        petButton.setAttribute("aria-expanded", "true");
        input.focus();
    }
    function closePanel() {
        if (panel.hidden || panel.classList.contains("is-closing")) {
            return;
        }
        panel.classList.remove("is-opening");
        panel.classList.add("is-closing");
        petButton.setAttribute("aria-expanded", "false");
        const finishClosing = function finishClosing(event) {
            if (event.animationName !== "ai-pet-panel-out") {
                return;
            }
            panel.hidden = true;
            panel.classList.remove("is-closing");
            root.classList.remove("is-panel-open");
            startGreetingCycle();
            closeTimer = null;
        };
        panel.addEventListener("animationend", finishClosing, { once: true });
        let valueResult32;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            valueResult32 = 0;
        }
        else {
            valueResult32 = 400;
        }
        closeTimer = window.setTimeout(function finishClosingAfterTimeout() {
            panel.hidden = true;
            panel.classList.remove("is-closing");
            root.classList.remove("is-panel-open");
            startGreetingCycle();
            closeTimer = null;
        }, valueResult32);
    }
    function appendMessage(text: string, role: string) {
        const message = document.createElement("div");
        message.className = ("ai-pet-message " + (role));
        message.textContent = text;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
    }
    // 发送快捷对话，并在请求期间显示思考状态；结束后恢复可交互状态
    async function send(text: string) {
        const message = text.trim();
        if (!message) {
            return;
        }
        const requestRevision = ++conversationRevision;
        conversationInProgress = true;
        window.clearTimeout(returnToIdleTimer);
        appendMessage(message, "user");
        input.value = "";
        const pending = appendMessage("让我翻翻小册子呀……", "assistant pending");
        setState("thinking");
        try {
            const result = await window.AiService.chat({ message: message, sessionId: sessionId });
            if (requestRevision !== conversationRevision) {
                return;
            }
            pending.textContent = String(result.reply || "咦，答案刚刚躲起来了，再问我一次好吗？").replaceAll("于见泥", "印小灵");
            pending.classList.remove("pending");
            setState("happy");
            if (result.sessionId) {
                sessionId = result.sessionId;
                window.sessionStorage.setItem(sessionKey, sessionId);
            }
        }
        catch (error) {
            if (requestRevision !== conversationRevision) {
                return;
            }
            pending.textContent = ("呜，线索暂时没接上：" + (String(error.message || "请稍后再试一次").replaceAll("于见泥", "印小灵")));
            pending.classList.remove("pending");
            setState("error");
        }
        finally {
            if (requestRevision !== conversationRevision) {
                return;
            }
            conversationInProgress = false;
            if (pointerInside && !panel.hidden) {
                stateBeforeHover = "idle";
                setState("hover");
            }
            else {
                returnToIdleTimer = window.setTimeout(function () {
                    return setState("idle");
                }, 1800);
            }
        }
    }
    petButton.addEventListener("click", function handleClick(event) {
        if (moved) {
            event.preventDefault();
            moved = false;
            return;
        }
        let valueResult34;
        if (panel.hidden) {
            valueResult34 = openPanel();
        }
        else {
            valueResult34 = closePanel();
        }
    });
    petButton.addEventListener("pointerenter", function handlePointerenter() {
        pointerInside = true;
        window.clearTimeout(returnToIdleTimer);
        if (!conversationInProgress && currentState !== "hover") {
            stateBeforeHover = currentState;
            setState("hover");
        }
    });
    petButton.addEventListener("pointerleave", function handlePointerleave() {
        pointerInside = false;
        if (currentState === "hover") {
            setState(stateBeforeHover || "idle");
        }
    });
    closeButton.addEventListener("click", closePanel);
    clearButton.addEventListener("click", clearMessages);
    form.addEventListener("submit", function handleSubmit(event) {
        event.preventDefault();
        send(input.value);
    });
    const items30 = (root.querySelectorAll("[data-pet-prompt]") as NodeListOf<HTMLElement>);
    for (let index32 = 0; index32 < items30.length; index32++) {
        {
            const button = items30[index32];
            button.addEventListener("click", function handleClick() {
                return send(button.dataset.petPrompt);
            });
        }
    }
    if (config.allowDrag !== false) {
        const edgeSnapDistance = 32;
        petButton.addEventListener("pointerdown", function handlePointerdown(event) {
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            moved = false;
            const rect = root.getBoundingClientRect();
            dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
            pointerStart = { x: event.clientX, y: event.clientY };
            petButton.setPointerCapture(event.pointerId);
        });
        petButton.addEventListener("pointermove", function handlePointermove(event) {
            if (!petButton.hasPointerCapture(event.pointerId)) {
                return;
            }
            event.preventDefault();
            const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
            if (distance < 6) {
                return;
            }
            moved = true;
            const bounds = getDragBounds();
            const proposedLeft = event.clientX - dragOffset.x;
            const proposedTop = event.clientY - dragOffset.y;
            let valueResult40;
            if (event.clientX <= edgeSnapDistance) {
                valueResult40 = bounds.minLeft;
            }
            else {
                let valueResult42;
                if (event.clientX >= window.innerWidth - edgeSnapDistance) {
                    valueResult42 = bounds.maxLeft;
                }
                else {
                    valueResult42 = Math.max(bounds.minLeft, Math.min(bounds.maxLeft, proposedLeft));
                }
                valueResult40 = valueResult42;
            }
            const left = valueResult40;
            let valueResult44;
            if (event.clientY <= edgeSnapDistance) {
                valueResult44 = bounds.minTop;
            }
            else {
                let valueResult46;
                if (event.clientY >= window.innerHeight - edgeSnapDistance) {
                    valueResult46 = bounds.maxTop;
                }
                else {
                    valueResult46 = Math.max(bounds.minTop, Math.min(bounds.maxTop, proposedTop));
                }
                valueResult44 = valueResult46;
            }
            const top = valueResult44;
            hasCustomPosition = true;
            let valueResult48;
            if (bounds.maxLeft > bounds.minLeft) {
                valueResult48 = (left - bounds.minLeft) / (bounds.maxLeft - bounds.minLeft);
            }
            else {
                valueResult48 = 1;
            }
            let valueResult50;
            if (bounds.maxTop > bounds.minTop) {
                valueResult50 = (top - bounds.minTop) / (bounds.maxTop - bounds.minTop);
            }
            else {
                valueResult50 = 1;
            }
            customPositionRatio = {
                x: valueResult48,
                y: valueResult50,
            };
            window.localStorage.setItem(getPositionKey(), JSON.stringify(customPositionRatio));
            root.style.left = ("" + (left) + "px");
            root.style.top = ("" + (top) + "px");
            root.style.right = "auto";
            root.style.bottom = "auto";
        });
        petButton.addEventListener("dragstart", function handleDragstart(event) {
            return event.preventDefault();
        });
    }
    function resetToDefaultPosition() {
        hasCustomPosition = false;
        customPositionRatio = { x: 1, y: 1 };
        root.style.left = "";
        root.style.top = "";
        root.style.right = "";
        root.style.bottom = "";
    }
    // 窗口变小时修正保存的位置，避免角色留在屏幕外无法拖回来
    function adaptCustomPosition() {
        if (!hasCustomPosition) {
            resetToDefaultPosition();
            return;
        }
        const bounds = getDragBounds();
        root.style.right = "auto";
        root.style.bottom = "auto";
        root.style.left = ("" + (Math.round(bounds.minLeft + customPositionRatio.x * (bounds.maxLeft - bounds.minLeft))) + "px");
        root.style.top = ("" + (Math.round(bounds.minTop + customPositionRatio.y * (bounds.maxTop - bounds.minTop))) + "px");
    }
    function getDragBounds() {
        const imageWidth = root.offsetWidth;
        const imageHeight = root.offsetHeight;
        return {
            minLeft: -imageContentBounds.left * imageWidth,
            maxLeft: window.innerWidth - imageContentBounds.right * imageWidth,
            minTop: -imageContentBounds.top * imageHeight,
            maxTop: window.innerHeight - imageContentBounds.bottom * imageHeight,
        };
    }
    window.addEventListener("resize", adaptCustomPosition, { passive: true });
    let valueResult52;
    const value41 = window.visualViewport;
    if (value41 === null || value41 === undefined) {
        valueResult52 = undefined;
    }
    else {
        const value42 = value41.addEventListener;
        valueResult52 = value42.call(value41, "resize", adaptCustomPosition, { passive: true });
    }
    let valueResult54;
    const value44 = viewportMediaQuery.addEventListener;
    if (value44 === null || value44 === undefined) {
        valueResult54 = undefined;
    }
    else {
        valueResult54 = value44.call(viewportMediaQuery, "change", function handleChange() {
            const nextViewportKey = getPositionKey();
            if (nextViewportKey === lastViewportKey) {
                return;
            }
            lastViewportKey = nextViewportKey;
            try {
                const savedPosition = JSON.parse(window.localStorage.getItem(nextViewportKey) || "null");
                hasCustomPosition = Boolean(savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y));
                if (hasCustomPosition) {
                    customPositionRatio = {
                        x: Math.min(1, Math.max(0, savedPosition.x)),
                        y: Math.min(1, Math.max(0, savedPosition.y)),
                    };
                }
            }
            catch (_) {
                hasCustomPosition = false;
            }
            if (hasCustomPosition) {
                adaptCustomPosition();
            }
            else {
                resetToDefaultPosition();
            }
        });
    }
    if (typeof ResizeObserver === "function") {
        new ResizeObserver(adaptCustomPosition).observe(petButton);
    }
    const enabled = window.localStorage.getItem(storageKey) !== "false";
    dynamicGreetingEnabled =
        window.localStorage.getItem(greetingStorageKey) !== "false" && config.dynamicGreeting !== false;
    const enabledInput = (document.querySelector("#aiPetEnabled") as HTMLInputElement);
    const dynamicGreetingInput = (document.querySelector("#aiPetDynamicGreeting") as HTMLInputElement);
    if (enabledInput) {
        enabledInput.checked = enabled;
    }
    if (dynamicGreetingInput) {
        dynamicGreetingInput.checked = dynamicGreetingEnabled;
    }
    root.hidden = !enabled;
    try {
        const positionKeyForViewport = getPositionKey();
        const savedPosition = JSON.parse(window.localStorage.getItem(positionKeyForViewport) || "null");
        if (savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)) {
            customPositionRatio = {
                x: Math.min(1, Math.max(0, savedPosition.x)),
                y: Math.min(1, Math.max(0, savedPosition.y)),
            };
            hasCustomPosition = true;
            requestAnimationFrame(function restorePetPositionAfterLayout() {
                adaptCustomPosition();
                requestAnimationFrame(adaptCustomPosition);
            });
        }
    }
    catch (_) {
        hasCustomPosition = false;
    }
    image.alt = config.imageAlt || "印小灵封泥宠物";
    // 测量图片中角色的实际边界，用于贴边和拖动
    function measureImageContentBounds() {
        if (!image.naturalWidth || !image.naturalHeight) {
            return;
        }
        try {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            context.drawImage(image, 0, 0);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let minX = canvas.width;
            let minY = canvas.height;
            let maxX = -1;
            let maxY = -1;
            for (let y = 0; y < canvas.height; y += 2) {
                for (let x = 0; x < canvas.width; x += 2) {
                    if (pixels[(y * canvas.width + x) * 4 + 3] <= 8)
                        continue;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
            if (maxX >= minX && maxY >= minY) {
                imageContentBounds = {
                    left: minX / canvas.width,
                    top: minY / canvas.height,
                    right: (maxX + 1) / canvas.width,
                    bottom: (maxY + 1) / canvas.height,
                };
            }
        }
        catch (_) {
            imageContentBounds = { left: 0, top: 0, right: 1, bottom: 1 };
        }
        adaptCustomPosition();
    }
    image.addEventListener("load", measureImageContentBounds, { once: true });
    setState(currentState);
    startGreetingCycle();
    let valueResult56;
    const value46 = dynamicGreetingInput;
    if (value46 === null || value46 === undefined) {
        valueResult56 = undefined;
    }
    else {
        const value47 = value46.addEventListener;
        valueResult56 = value47.call(value46, "change", function handleChange(event) {
            const isEnabled = (event.target as HTMLInputElement).checked;
            dynamicGreetingEnabled = isEnabled;
            window.localStorage.setItem(greetingStorageKey, String(isEnabled));
            if (isEnabled) {
                startGreetingCycle();
            }
            else {
                stopGreetingCycle();
            }
        });
    }
    let valueResult58;
    const value49 = enabledInput;
    if (value49 === null || value49 === undefined) {
        valueResult58 = undefined;
    }
    else {
        const value50 = value49.addEventListener;
        valueResult58 = value50.call(value49, "change", function handleChange(event) {
            const isEnabled = (event.target as HTMLInputElement).checked;
            window.localStorage.setItem(storageKey, String(isEnabled));
            root.hidden = !isEnabled;
            if (isEnabled) {
                startGreetingCycle();
            }
            else {
                stopGreetingCycle();
            }
        });
    }
    window.addEventListener("ai-pet-settings-reset", function handleAiPetSettingsReset() {
        window.localStorage.setItem(storageKey, "true");
        window.localStorage.setItem(greetingStorageKey, "true");
        if (enabledInput) {
            enabledInput.checked = true;
        }
        if (dynamicGreetingInput) {
            dynamicGreetingInput.checked = true;
        }
        root.hidden = false;
        dynamicGreetingEnabled = true;
        startGreetingCycle();
    });
})();
