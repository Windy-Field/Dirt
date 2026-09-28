(function initializeCursorDebris() {
    "use strict";
    // ==================== 鼠标尾迹配置 ====================
    // 尺寸和距离为 CSS 像素，时间为毫秒，角度为度，透明度为 0～1。
    const settings = {
        interval: 16, // 两次生成的最小间隔；越大越稀疏
        lifetime: 750, // 单粒持续时间
        maxParticles: 120, // 同时存在的粒子上限
        particlesPerStep: 4, // 每次生成数量
        sizeMin: 6, // 最小尺寸
        sizeRange: 2, // 随机尺寸增量，即默认尺寸为 6～8
        colors: ["#ad4030", "#d47850", "#e4ad76"],
        sidewaysRange: 18, // 左右散开总范围，即 -9～9
        fallMin: 12, // 最小下落距离
        fallRange: 15, // 随机下落距离增量
        initialRotationRange: 180, // 初始随机角度范围
        middleRotation: 35, // 中间帧增加的角度
        finalRotation: 100, // 最后一帧增加的角度
        middleSidewaysRatio: 0.5, // 中间帧横移占最终横移的比例
        lift: 2, // 中间帧向上抬升距离
        initialOpacity: 1,
        middleOpacity: 0.85,
        middleOffset: 0.35, // 中间帧位于整个动画的 35%
        minTravel: 4, // 鼠标至少移动多远才生成
        maxInterpolationDistance: 80, // 超过此距离时不补画整条移动轨迹
        offsetX: -2, // 生成点相对鼠标的偏移
        offsetY: 4,
        jitterRange: 4, // 生成点随机抖动总范围，即 -2～2
    };
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileViewport = window.matchMedia("(max-width: 47.5rem)");
    const storageKey = "niyun-cursor-trail";
    const defaults = { enabled: true, size: settings.sizeMin, density: settings.particlesPerStep };
    let preferences = Object.assign({}, defaults);
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
        preferences.enabled = saved.enabled !== false;
        preferences.size = clampPreference(saved.size, 2, 8, defaults.size);
        preferences.density = clampPreference(saved.density, 1, 4, defaults.density);
    }
    catch (_) { /* 存储不可用或损坏时沿用默认值。 */ }
    const enabledInput = (document.querySelector("#cursorTrailEnabled") as HTMLInputElement);
    const sizeInput = (document.querySelector("#cursorTrailSize") as HTMLInputElement);
    const densityInput = (document.querySelector("#cursorTrailDensity") as HTMLInputElement);
    const particles = new Map<HTMLElement, Animation>();
    let lastEmission = 0;
    let previousPoint: {
        x: number;
        y: number;
    } | null = null;
    function clampPreference(value: number, min: number, max: number, fallback: number) {
        let valueResult1;
        if (Number.isFinite(value)) {
            valueResult1 = Math.round(Math.min(max, Math.max(min, value)));
        }
        else {
            valueResult1 = fallback;
        }
        return valueResult1;
    }
    function isLocked() {
        return !finePointer.matches || mobileViewport.matches || reducedMotion.matches ||
            navigator.maxTouchPoints > 0 || document.documentElement.dataset.motion === "0";
    }
    function syncTrailControls() {
        const locked = isLocked();
        if (enabledInput) {
            enabledInput.disabled = locked;
            enabledInput.checked = !locked && preferences.enabled;
        }
        const rangeInputs = [sizeInput, densityInput];
        for (let inputIndex = 0; inputIndex < rangeInputs.length; inputIndex += 1) {
            const input = rangeInputs[inputIndex];
            if (input) {
                input.disabled = locked || !preferences.enabled;
            }
        }
        if (sizeInput) {
            sizeInput.value = String(preferences.size);
        }
        if (densityInput) {
            densityInput.value = String(preferences.density);
        }
        const sizeOutput = (document.querySelector("#cursorTrailSizeValue") as HTMLOutputElement);
        const densityOutput = (document.querySelector("#cursorTrailDensityValue") as HTMLOutputElement);
        if (sizeOutput) {
            sizeOutput.textContent = ("" + (preferences.size) + "～" + (preferences.size + settings.sizeRange) + " px");
        }
        if (densityOutput) {
            densityOutput.textContent = ("" + (preferences.density) + " 粒/次");
        }
        const note = (document.querySelector("#cursorTrailLockNote") as HTMLElement);
        if (note) {
            note.hidden = !locked;
        }
        if (locked || !preferences.enabled) {
            clearTrail();
        }
    }
    function saveTrailControls() {
        if (isLocked()) {
            syncTrailControls();
            return;
        }
        let valueResult3;
        let valueResult5;
        {
            const value3 = enabledInput;
            if (value3 === null || value3 === undefined) {
                valueResult5 = undefined;
            }
            else {
                valueResult5 = value3.checked;
            }
            const value = valueResult5;
            if (value === null || value === undefined) {
                valueResult3 = preferences.enabled;
            }
            else {
                valueResult3 = value;
            }
        }
        let valueResult7;
        const value5 = sizeInput;
        if (value5 === null || value5 === undefined) {
            valueResult7 = undefined;
        }
        else {
            valueResult7 = value5.value;
        }
        let valueResult9;
        const value7 = densityInput;
        if (value7 === null || value7 === undefined) {
            valueResult9 = undefined;
        }
        else {
            valueResult9 = value7.value;
        }
        preferences = {
            enabled: valueResult3,
            size: clampPreference(Number(valueResult7), 2, 8, preferences.size),
            density: clampPreference(Number(valueResult9), 1, 4, preferences.density),
        };
        try {
            localStorage.setItem(storageKey, JSON.stringify(preferences));
        }
        catch (_) { /* 仍允许本次页面调整。 */ }
        syncTrailControls();
    }
    function isEnabled() {
        return preferences.enabled && !isLocked() && !document.hidden;
    }
    function removeParticle(particle: HTMLElement) {
        const animation = particles.get(particle);
        particles.delete(particle);
        if (animation) {
            animation.cancel();
        }
        particle.remove();
    }
    function clearTrail() {
        const particleList = Array.from(particles.keys());
        for (let particleIndex = 0; particleIndex < particleList.length; particleIndex += 1) {
            removeParticle(particleList[particleIndex]);
        }
        previousPoint = null;
    }
    function emitParticle(x: number, y: number) {
        if (particles.size >= settings.maxParticles) {
            removeParticle(particles.keys().next().value);
        }
        const particle = document.createElement("span");
        particle.className = "cursor-clay-debris";
        particle.setAttribute("aria-hidden", "true");
        const size = preferences.size + Math.random() * settings.sizeRange;
        particle.style.width = ("" + (size) + "px");
        particle.style.height = ("" + (size) + "px");
        particle.style.backgroundColor = settings.colors[Math.floor(Math.random() * settings.colors.length)];
        document.body.appendChild(particle);
        const sideways = (Math.random() - 0.5) * settings.sidewaysRange;
        const fall = settings.fallMin + Math.random() * settings.fallRange;
        const rotation = Math.random() * settings.initialRotationRange;
        // 固定轨迹只动画 transform/opacity；先微微飞散，再下落淡出。
        const animation = particle.animate([
            { transform: ("translate3d(" + (x) + "px, " + (y) + "px, 0) rotate(" + (rotation) + "deg)"), opacity: settings.initialOpacity },
            { transform: ("translate3d(" + (x + sideways * settings.middleSidewaysRatio) + "px, " + (y - settings.lift) + "px, 0) rotate(" + (rotation + settings.middleRotation) + "deg)"), opacity: settings.middleOpacity, offset: settings.middleOffset },
            { transform: ("translate3d(" + (x + sideways) + "px, " + (y + fall) + "px, 0) rotate(" + (rotation + settings.finalRotation) + "deg)"), opacity: 0 },
        ], { duration: settings.lifetime, easing: "linear" });
        particles.set(particle, animation);
        animation.onfinish = function finishDebris() { removeParticle(particle); };
    }
    document.addEventListener("pointermove", function handleCursorMovement(event) {
        if (!isEnabled() || event.pointerType !== "mouse" || event.buttons ||
            ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable], dialog") as HTMLDialogElement)) {
            clearTrail();
            return;
        }
        const now = performance.now();
        const point = { x: event.clientX, y: event.clientY };
        if (!previousPoint) {
            previousPoint = point;
            return;
        }
        if (now - lastEmission < settings.interval ||
            Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y) < settings.minTravel) {
            return;
        }
        lastEmission = now;
        // 在前后采样点之间补粒子，快速移动也不会只留下孤立点；限制跨度避免跨屏长线。
        const distance = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
        let valueResult11;
        if (distance <= settings.maxInterpolationDistance) {
            valueResult11 = previousPoint;
        }
        else {
            valueResult11 = point;
        }
        const start = valueResult11;
        for (let index = 0; index < preferences.density; index++) {
            const fraction = (index + 1) / preferences.density;
            emitParticle(start.x + (point.x - start.x) * fraction + settings.offsetX + (Math.random() - 0.5) * settings.jitterRange, start.y + (point.y - start.y) * fraction + settings.offsetY + (Math.random() - 0.5) * settings.jitterRange);
        }
        previousPoint = point;
    }, { passive: true });
    // 退出窗口、切到后台或关闭动态效果时立即清理，不保留定时循环。
    document.documentElement.addEventListener("pointerleave", clearTrail);
    document.addEventListener("pointerdown", clearTrail, { passive: true });
    window.addEventListener("blur", clearTrail);
    document.addEventListener("visibilitychange", clearTrail);
    finePointer.addEventListener("change", syncTrailControls);
    reducedMotion.addEventListener("change", syncTrailControls);
    mobileViewport.addEventListener("change", syncTrailControls);
    new MutationObserver(function handleMotionSetting() {
        syncTrailControls();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    const controlInputs = [enabledInput, sizeInput, densityInput];
    for (let inputIndex = 0; inputIndex < controlInputs.length; inputIndex += 1) {
        const input = controlInputs[inputIndex];
        let valueResult13;
        const value10 = input;
        if (value10 === null || value10 === undefined) {
            valueResult13 = undefined;
        }
        else {
            const value11 = value10.addEventListener;
            valueResult13 = value11.call(value10, "input", saveTrailControls);
        }
    }
    window.addEventListener("media-settings-reset", function resetTrailPreferences() {
        preferences = Object.assign({}, defaults);
        try {
            localStorage.removeItem(storageKey);
        }
        catch (_) { /* 默认值仍立即生效。 */ }
        syncTrailControls();
    });
    syncTrailControls();
})();
