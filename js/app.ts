(function initializeWebsite() {
    // 01. 通用工具和页面状态
    // $ 查找一个元素，$$ 查找多个元素并转成数组，后面所有板块都会使用
    const findElement = function findElement(selector: string, scope?: ParentNode): HTMLElement {
        if (scope === undefined) {
            scope = document;
        }
        return scope.querySelector(selector) as HTMLElement;
    };
    const findElements = function findElements(selector: string, scope?: ParentNode): HTMLElement[] {
        if (scope === undefined) {
            scope = document;
        }
        return Array.from(scope.querySelectorAll(selector)) as HTMLElement[];
    };
    let visibleSites: Site[] = [];
    const aiSessionStorageKey = "niyun-yinxiaoling-ai-session";
    window.sessionStorage.removeItem("nimeng-ai-session");
    /*
     * 显示设置的范围、步长和默认值
     */
    // 读取旧键后，将设置迁移到当前存储键
    const settingsStorageKey = "niyun-display-settings";
    const legacySettingsStorageKeys = ["nimeng-display-settings", "niyun-settings"];
    const openingAnimationStorageKey = "niyun-opening-animation-enabled";
    const systemPrefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 导航时钟与弹窗动画：时间单位均为毫秒
    const interfaceConfig: InterfaceConfig = {
        clockLocale: "zh-CN",
        clockRefreshInterval: 1000,
        clockFormat: { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false },
    };
    // 地图点位使用 [经度, 纬度]，缺少区县坐标时使用城市坐标
    const mapCoordinates = {
        cities: {
            滨州: [117.97, 37.38],
            聊城: [115.98, 36.45],
            德州: [116.36, 37.45],
            东营: [118.67, 37.43],
            菏泽: [115.48, 35.23],
            淄博: [118.05, 36.81],
            济南: [117.12, 36.65],
            潍坊: [119.16, 36.71],
            临沂: [118.35, 35.1],
            烟台: [121.39, 37.52],
            青岛: [120.38, 36.07],
            济宁: [116.59, 35.41],
            泰安: [117.13, 36.19],
            日照: [119.52, 35.42],
            枣庄: [117.32, 34.81],
        },
        counties: {
            博兴: [118.13, 37.15],
            高唐: [116.23, 36.85],
            东阿: [116.25, 36.33],
            阳谷: [115.78, 36.12],
            邹平: [117.74, 36.88],
            高青: [117.83, 37.17],
            鄄城: [115.54, 35.56],
            乐陵: [117.23, 37.73],
            陵城: [116.58, 37.33],
            利津: [118.25, 37.49],
            广饶: [118.41, 37.05],
            周村: [117.87, 36.8],
            淄川: [117.97, 36.65],
            临淄: [118.31, 36.82],
            商河: [117.16, 37.31],
            章丘: [117.53, 36.71],
            莱芜: [117.68, 36.21],
            临朐: [118.54, 36.51],
            潍城: [119.1, 36.71],
            昌乐: [118.83, 36.7],
            寿光: [118.79, 36.86],
            安丘: [119.22, 36.48],
            郯城: [118.37, 34.61],
            昌邑: [119.4, 36.85],
            高密: [119.76, 36.38],
            诸城: [119.41, 35.99],
            沂水: [118.64, 35.79],
            沂南: [118.46, 35.55],
            兰陵: [117.95, 34.86],
            费: [117.98, 35.27],
            福山: [121.27, 37.5],
            龙口: [120.52, 37.65],
            莱州: [119.94, 37.18],
            牟平: [121.6, 37.39],
            即墨: [120.45, 36.39],
            市南: [120.4, 36.08],
            平度: [119.99, 36.78],
            邹城: [116.97, 35.4],
            东平: [116.33, 35.94],
            泰山: [117.13, 36.19],
            岱岳: [117.04, 36.19],
            宁阳: [116.8, 35.76],
            莒: [118.87, 35.59],
            武城: [116.07, 37.21],
            汶上: [116.49, 35.72],
        },
    };
    function readCssTime(variableName) {
        const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        let valueResult1;
        if (value.endsWith("ms")) {
            valueResult1 = Number.parseFloat(value);
        }
        else {
            valueResult1 = Number.parseFloat(value) * 1000;
        }
        return valueResult1;
    }
    function readCssValue(variableName) {
        return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    }
    // 从样式变量读取动画时长和曲线
    function runElementAnimation(element, keyframes, durationVariable, easingVariable) {
        if (!element) {
            return null;
        }
        const items2 = element.getAnimations();
        for (let index4 = 0; index4 < items2.length; index4++) {
            {
                const animation = items2[index4];
                animation.cancel();
            }
        }
        let valueResult7;
        if (systemPrefersReducedMotion) {
            valueResult7 = 1;
        }
        else {
            valueResult7 = readCssTime(durationVariable);
        }
        const duration = valueResult7;
        return element.animate(keyframes, {
            duration: duration,
            easing: readCssValue(easingVariable),
            fill: "both",
        });
    }
    const motionSettingRanges = {
        pageMotion: { min: 0, max: 100, step: 10, defaultValue: 60, unit: "%" },
        cardTilt: { min: 0, max: 6, step: 0.5, defaultValue: 4, unit: "°" },
        backgroundDust: { min: 0, max: 64, step: 4, defaultValue: 16, unit: "粒" },
        backgroundDustSpeed: { min: 0, max: 200, step: 5, defaultValue: 100, initialValue: 25, unit: "%" },
    };
    // 将设置值换算为页面动效参数
    const motionSettingEffects = {
        cardLiftMax: 5,
    };
    let valueResult9;
    if (systemPrefersReducedMotion) {
        valueResult9 = motionSettingRanges.pageMotion.min;
    }
    else {
        valueResult9 = motionSettingRanges.pageMotion.defaultValue;
    }
    let valueResult11;
    if (systemPrefersReducedMotion) {
        valueResult11 = motionSettingRanges.cardTilt.min;
    }
    else {
        valueResult11 = motionSettingRanges.cardTilt.defaultValue;
    }
    let valueResult13;
    if (systemPrefersReducedMotion) {
        valueResult13 = motionSettingRanges.backgroundDust.min;
    }
    else {
        valueResult13 = motionSettingRanges.backgroundDust.defaultValue;
    }
    let valueResult15;
    if (systemPrefersReducedMotion) {
        valueResult15 = motionSettingRanges.backgroundDustSpeed.min;
    }
    else {
        valueResult15 = motionSettingRanges.backgroundDustSpeed.defaultValue;
    }
    const defaultSettings = {
        themeMode: "auto",
        motionIntensity: valueResult9,
        tiltDegrees: valueResult11,
        dustQuantity: valueResult13,
        dustSpeed: valueResult15,
    };
    let userSettings = Object.assign({}, defaultSettings);
    let settingsNeedMigration = false;
    try {
        const currentSettings = window.localStorage.getItem(settingsStorageKey);
        let valueResult17;
        {
            let searchFinished18 = false;
            let valueResult19;
            const items16 = legacySettingsStorageKeys;
            const result19 = [];
            for (let index18 = 0; index18 < items16.length; index18++) {
                let valueResult21;
                {
                    const key = items16[index18];
                    valueResult21 = window.localStorage.getItem(key);
                }
                result19.push(valueResult21);
            }
            valueResult19 = result19;
            const items12 = valueResult19;
            for (let index14 = 0; !searchFinished18 && index14 < items12.length; index14++) {
                if (Boolean(items12[index14])) {
                    valueResult17 = items12[index14];
                    searchFinished18 = true;
                }
            }
            if (!searchFinished18) {
                valueResult17 = undefined;
                searchFinished18 = true;
            }
        }
        const legacySettings = valueResult17;
        const savedSettings = JSON.parse(currentSettings || legacySettings || "{}");
        if (!currentSettings && legacySettings) {
            settingsNeedMigration = true;
        }
        // 新增速度设置首次使用时从 25% 开始；“恢复默认”仍回到 100%
        if (savedSettings.dustSpeed === undefined) {
            let valueResult23;
            if (systemPrefersReducedMotion) {
                valueResult23 = motionSettingRanges.backgroundDustSpeed.min;
            }
            else {
                valueResult23 = motionSettingRanges.backgroundDustSpeed.initialValue;
            }
            savedSettings.dustSpeed = valueResult23;
            settingsNeedMigration = true;
        }
        // 兼容旧版“微尘强度 0～100%”：按比例迁移为“微尘数量 0～32 粒”
        if (savedSettings.dustQuantity === undefined && savedSettings.dustIntensity !== undefined) {
            savedSettings.dustQuantity =
                Math.round(((Number(savedSettings.dustIntensity) / 100) * motionSettingRanges.backgroundDust.max) /
                    motionSettingRanges.backgroundDust.step) * motionSettingRanges.backgroundDust.step;
            settingsNeedMigration = true;
        }
        delete savedSettings.dustIntensity;
        userSettings = Object.assign({}, defaultSettings, savedSettings);
    }
    catch (_) {
        let valueResult25;
        if (systemPrefersReducedMotion) {
            valueResult25 = motionSettingRanges.backgroundDustSpeed.min;
        }
        else {
            valueResult25 = motionSettingRanges.backgroundDustSpeed.initialValue;
        }
        userSettings = Object.assign({}, defaultSettings, { dustSpeed: valueResult25 });
    }
    /* 必须由 JavaScript 计算的动态视觉参数；CSS 外观参数统一放在 tokens.css */
    const visualEffects = {
        rippleLifetime: 600, // 点击波纹保留时间（毫秒）
        searchFocusDelay: 700, // 平滑滚动后移动焦点的等待时间（毫秒）
        searchHighlightLifetime: 1900, // 搜索目标描边保留时间（毫秒）
        cardTiltDegrees: motionSettingRanges.cardTilt.defaultValue, // 运行时由“卡片倾斜角度”设置更新
        cardPerspective: 800, // 卡片 3D 透视距离
        cardLift: Math.min(motionSettingEffects.cardLiftMax, motionSettingRanges.cardTilt.defaultValue), // 随倾斜角度联动
        dustSpeedScale: motionSettingRanges.backgroundDustSpeed.defaultValue / 100, // 运行时由“背景微尘速度”设置更新
        dustMaxParticles: motionSettingRanges.backgroundDust.max, // 粒子池数量，单位：粒
        dustSizeMin: 0.8, // 微尘最小半径
        dustSizeRange: 2.2, // 微尘半径随机增量
        dustBaseSpeedScale: 2.5, // 将当前基准速度提升为原来的 2.5 倍
        dustHorizontalSpeed: 0.35, // 微尘水平漂移速度
        dustVerticalSpeedMin: 0.15, // 微尘最小下落速度
        dustVerticalSpeedRange: 0.4, // 微尘下落速度随机增量
        dustOpacityMin: 0.15, // 单粒微尘最低透明度
        dustOpacityRange: 0.45, // 单粒微尘透明度随机增量
        dustPrimaryColor: "168, 51, 42", // 主要朱砂色 RGB
        dustAccentColor: "212, 175, 55", // 少量金色 RGB
        dustPrimaryRatio: 0.6, // 朱砂微尘占比
        dustFrameIntervalMs: 32, // 微尘绘制间隔，约 31 FPS；页面装饰不需要 60 FPS
    };
    const escapeHtml = function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, function (char) {
            return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char];
        });
    };
    // 数据库中的地址只能用于图片或视频，拒绝 javascript: 等危险协议
    const safeResourceUrl = function safeResourceUrl(value) {
        let valueResult27;
        const value24 = window.MediaSecurity;
        if (value24 === null || value24 === undefined) {
            valueResult27 = undefined;
        }
        else {
            const value25 = value24.resolve;
            valueResult27 = value25.call(value24, value);
        }
        return valueResult27 || "";
    };
    // Logo 使用可选图片；配置为空或图片加载失败时保留当前“泥”字印章
    function applyBrandLogo() {
        let valueResult29;
        const value27 = window.MEDIA_CONFIG;
        if (value27 === null || value27 === undefined) {
            valueResult29 = undefined;
        }
        else {
            valueResult29 = value27.brandLogo;
        }
        const logoUrl = safeResourceUrl(valueResult29);
        if (!logoUrl) {
            return;
        }
        const items29 = (Array.from(document.querySelectorAll(".brand-logo-image")) as HTMLImageElement[]);
        for (let index31 = 0; index31 < items29.length; index31++) {
            {
                const image = items29[index31];
                image.src = logoUrl;
                image.hidden = false;
                image.addEventListener("error", function handleError() {
                    image.hidden = true;
                    const fallback = (image.parentElement.querySelector(".brand-logo-fallback") as HTMLElement);
                    if (fallback) {
                        fallback.hidden = false;
                    }
                }, { once: true });
                const fallback = (image.parentElement.querySelector(".brand-logo-fallback") as HTMLElement);
                if (fallback) {
                    fallback.hidden = true;
                }
            }
        }
    }
    applyBrandLogo();
    const prefersReducedMotion = function prefersReducedMotion() {
        return systemPrefersReducedMotion || Number(userSettings.motionIntensity) === 0;
    };
    const clampNumber = function clampNumber(value, min, max, fallback) {
        const number = Number(value);
        let valueResult35;
        if (Number.isFinite(number)) {
            valueResult35 = Math.min(max, Math.max(min, number));
        }
        else {
            valueResult35 = fallback;
        }
        return valueResult35;
    };
    const themeSettingOptions = {
        light: "light",
        dark: "dark",
        auto: "auto",
    };
    // 使用 theme-bootstrap.ts 设置的昼夜分界时间
    const themeSchedule = window.NIYUN_THEME_SCHEDULE || { lightStartHour: 6, lightEndHour: 18 };
    let automaticThemeTimer = null;
    function isAutomaticLightTime(date?) {
        if (date === undefined) {
            date = new Date();
        }
        const hour = date.getHours();
        return hour >= themeSchedule.lightStartHour && hour < themeSchedule.lightEndHour;
    }
    function resolveEffectiveTheme(mode) {
        if (mode === "dark") {
            return "dark";
        }
        if (mode === "light") {
            return "light";
        }
        let valueResult37;
        if (isAutomaticLightTime()) {
            valueResult37 = "light";
        }
        else {
            valueResult37 = "dark";
        }
        return valueResult37;
    }
    // 在下一个昼夜分界时更新主题
    function scheduleAutomaticThemeUpdate() {
        if (automaticThemeTimer) {
            window.clearTimeout(automaticThemeTimer);
        }
        automaticThemeTimer = null;
        if (userSettings.themeMode !== "auto") {
            return;
        }
        const now = new Date();
        const nextBoundary = new Date(now);
        if (now.getHours() < themeSchedule.lightStartHour) {
            nextBoundary.setHours(themeSchedule.lightStartHour, 0, 0, 0);
        }
        else {
            if (now.getHours() < themeSchedule.lightEndHour) {
                nextBoundary.setHours(themeSchedule.lightEndHour, 0, 0, 0);
            }
            else {
                nextBoundary.setDate(nextBoundary.getDate() + 1);
                nextBoundary.setHours(themeSchedule.lightStartHour, 0, 0, 0);
            }
        }
        automaticThemeTimer = window.setTimeout(function () {
            return applyDisplaySettings(false);
        }, Math.max(1000, nextBoundary.getTime() - now.getTime() + 100));
    }
    // 浏览器里保存的设置可能来自旧版本，先补默认值并限制数值范围
    function normalizeSettings(settings) {
        let valueResult39;
        if (Object.hasOwn(themeSettingOptions, settings.themeMode)) {
            valueResult39 = settings.themeMode;
        }
        else {
            valueResult39 = defaultSettings.themeMode;
        }
        return {
            themeMode: valueResult39,
            motionIntensity: clampNumber(settings.motionIntensity, motionSettingRanges.pageMotion.min, motionSettingRanges.pageMotion.max, defaultSettings.motionIntensity),
            tiltDegrees: clampNumber(settings.tiltDegrees, motionSettingRanges.cardTilt.min, motionSettingRanges.cardTilt.max, defaultSettings.tiltDegrees),
            dustQuantity: clampNumber(settings.dustQuantity, motionSettingRanges.backgroundDust.min, motionSettingRanges.backgroundDust.max, defaultSettings.dustQuantity),
            dustSpeed: clampNumber(settings.dustSpeed, motionSettingRanges.backgroundDustSpeed.min, motionSettingRanges.backgroundDustSpeed.max, defaultSettings.dustSpeed),
        };
    }
    // 把设置应用到页面；初始化时可以不重复保存，用户修改时再写入本地存储
    function applyDisplaySettings(save?) {
        if (save === undefined) {
            save = true;
        }
        userSettings = normalizeSettings(userSettings);
        const root = document.documentElement;
        const motionScale = userSettings.motionIntensity / motionSettingRanges.pageMotion.max;
        const effectiveTheme = resolveEffectiveTheme(userSettings.themeMode);
        root.dataset.theme = effectiveTheme;
        root.dataset.themeMode = userSettings.themeMode;
        root.style.colorScheme = effectiveTheme;
        root.dataset.motion = String(userSettings.motionIntensity);
        root.style.setProperty("--user-motion-scale", String(motionScale));
        scheduleAutomaticThemeUpdate();
        visualEffects.cardTiltDegrees = userSettings.tiltDegrees;
        let valueResult41;
        if (userSettings.tiltDegrees) {
            valueResult41 = Math.min(motionSettingEffects.cardLiftMax, userSettings.tiltDegrees);
        }
        else {
            valueResult41 = 0;
        }
        visualEffects.cardLift = valueResult41;
        visualEffects.dustSpeedScale = userSettings.dustSpeed / 100;
        if (save) {
            window.localStorage.setItem(settingsStorageKey, JSON.stringify(userSettings));
        }
    }
    // 从休眠或后台返回时立即校正，避免错过 06:00 / 18:00 的定时切换
    document.addEventListener("visibilitychange", function handleVisibilitychange() {
        if (!document.hidden && userSettings.themeMode === "auto") {
            applyDisplaySettings(false);
        }
    });
    userSettings = normalizeSettings(userSettings);
    applyDisplaySettings(false);
    if (settingsNeedMigration) {
        window.localStorage.setItem(settingsStorageKey, JSON.stringify(userSettings));
    }
    const items38 = legacySettingsStorageKeys;
    for (let index40 = 0; index40 < items38.length; index40++) {
        {
            const key = items38[index40];
            window.localStorage.removeItem(key);
        }
    }
    const getKnowledge = function getKnowledge() {
        return window.SEAL_KNOWLEDGE || window.PPT_KNOWLEDGE;
    };
    const getSiteSearchValues = function getSiteSearchValues(site) {
        let valueResult47;
        const items43 = [];
        items43.push(site.city);
        items43.push(site.name);
        items43.push(site.period);
        items43.push(site.admin);
        items43.push(site.note);
        const part44 = Array.from((site.tags || []));
        for (let index45 = 0; index45 < part44.length; index45++) {
            items43.push(part44[index45]);
        }
        const part46 = Array.from(site.seals);
        for (let index47 = 0; index47 < part46.length; index47++) {
            items43.push(part46[index47]);
        }
        valueResult47 = items43;
        return valueResult47;
    };
    const findKnowledgeSites = function findKnowledgeSites(keyword?) {
        if (keyword === undefined) {
            keyword = "";
        }
        const query = keyword.trim().toLowerCase();
        let valueResult49;
        const value49 = getKnowledge();
        if (value49 === null || value49 === undefined) {
            valueResult49 = undefined;
        }
        else {
            valueResult49 = value49.sites;
        }
        const sites = valueResult49 || [];
        let valueResult51;
        if (query) {
            let valueResult53;
            const items52 = sites;
            const result55 = [];
            for (let index54 = 0; index54 < items52.length; index54++) {
                let valueResult55;
                {
                    const site = items52[index54];
                    let valueResult57;
                    {
                        let searchFinished58 = false;
                        const items56 = getSiteSearchValues(site);
                        for (let index58 = 0; !searchFinished58 && index58 < items56.length; index58++) {
                            let valueResult59;
                            {
                                const value = items56[index58];
                                valueResult59 = String(value).toLowerCase().includes(query);
                            }
                            if (valueResult59) {
                                valueResult57 = true;
                                searchFinished58 = true;
                            }
                        }
                        if (!searchFinished58) {
                            valueResult57 = false;
                            searchFinished58 = true;
                        }
                        valueResult55 = valueResult57;
                    }
                }
                if (valueResult55) {
                    result55.push(items52[index54]);
                }
            }
            valueResult53 = result55;
            valueResult51 = valueResult53;
        }
        else {
            valueResult51 = sites;
        }
        return valueResult51;
    };
    // AI 回复会包含少量 Markdown。先转义 HTML，再只开放常用格式，避免插入恶意标签
    function renderInlineMarkdown(text) {
        return escapeHtml(text)
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/__([^_]+)__/g, "<strong>$1</strong>")
            .replace(/\*([^*]+)\*/g, "<em>$1</em>");
    }
    // 将聊天文本转换为标题、列表和链接
    function renderMarkdown(markdown) {
        const source = String(markdown || "").replace(/\r\n?/g, "\n");
        const codeBlocks = [];
        const protectedSource = source.replace(/```(?:[\w-]+)?\n?([\s\S]*?)```/g, function protectCodeBlock(_, code) {
            const token = ("@@CODE_BLOCK_" + (codeBlocks.length) + "@@");
            codeBlocks.push(("<pre><code>" + (escapeHtml(code.trim())) + "</code></pre>"));
            return token;
        });
        const output = [];
        let listType = "";
        function closeList() {
            if (listType) {
                output.push(("</" + (listType) + ">"));
            }
            listType = "";
        }
        const items62 = protectedSource.split("\n");
        for (let index64 = 0; index64 < items62.length; index64++) {
            let valueResult63;
            {
                const line = items62[index64];
                const trimmed = line.trim();
                const unordered = trimmed.match(/^[-*+]\s+(.+)/);
                const ordered = trimmed.match(/^\d+[.)]\s+(.+)/);
                const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
                if (unordered || ordered) {
                    let valueResult65;
                    {
                        if (unordered) {
                            valueResult65 = "ul";
                        }
                        else {
                            valueResult65 = "ol";
                        }
                        const nextType = valueResult65;
                        if (listType !== nextType) {
                            closeList();
                            output.push(("<" + (nextType) + ">"));
                            listType = nextType;
                        }
                        output.push(("<li>" + (renderInlineMarkdown((unordered || ordered)[1])) + "</li>"));
                        valueResult63 = undefined;
                    }
                }
                else {
                    closeList();
                    if (!trimmed) {
                        valueResult63 = undefined;
                    }
                    else {
                        if (/^@@CODE_BLOCK_\d+@@$/.test(trimmed)) {
                            output.push(trimmed);
                        }
                        else {
                            if (heading) {
                                output.push(("<h" + (heading[1].length) + ">" + (renderInlineMarkdown(heading[2])) + "</h" + (heading[1].length) + ">"));
                            }
                            else {
                                output.push(("<p>" + (renderInlineMarkdown(trimmed)) + "</p>"));
                            }
                        }
                    }
                }
            }
        }
        closeList();
        return output.join("").replace(/@@CODE_BLOCK_(\d+)@@/g, function (_, index) {
            return codeBlocks[Number(index)] || "";
        });
    }
    // 页面右下角的短提示，2.6 秒后自动隐藏
    let toastTimer = 0;
    function showToast(message: string) {
        const toast = (document.querySelector("#toast") as HTMLElement);
        toast.textContent = message;
        toast.classList.add("show");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            return toast.classList.remove("show");
        }, 2600);
    }
    // 02. 藏品、地图、课程和文创内容渲染
    // 有实物图时显示图片；没有图片时根据印文生成简单的数字复原图
    function createRelicVisual(item) {
        const imageUrl = safeResourceUrl(item.imageUrl);
        if (imageUrl) {
            return ("<div class=\"relic-visual has-image\" aria-label=\"" + (escapeHtml(item.name)) + "实物资料图\"><img src=\"" + (escapeHtml(imageUrl)) + "\" alt=\"" + (escapeHtml(item.name)) + "\"><span class=\"relic-code\">" + (escapeHtml(item.id)) + "</span></div>");
        }
        let valueResult67;
        const items68 = [];
        const part69 = Array.from(String(item.inscription || ""));
        for (let index70 = 0; index70 < part69.length; index70++) {
            items68.push(part69[index70]);
        }
        valueResult67 = items68;
        const chars = valueResult67.slice(0, 4);
        while (chars.length < 4)
            chars.push("印");
        let valueResult69;
        const items72 = chars;
        const result75 = [];
        for (let index74 = 0; index74 < items72.length; index74++) {
            let valueResult71;
            {
                const char = items72[index74];
                valueResult71 = ("<span>" + (escapeHtml(char)) + "</span>");
            }
            result75.push(valueResult71);
        }
        valueResult69 = result75;
        return ("<div class=\"relic-visual " + (escapeHtml(item.tone)) + "\" aria-label=\"" + (escapeHtml(item.name)) + "数字复原图\"><div class=\"relic-disc\"><div class=\"mini-inscription\">" + (valueResult69.join("")) + "</div></div><span class=\"relic-code\">" + (escapeHtml(item.id)) + "</span></div>");
    }
    // 根据藏品数据生成卡片，空列表显示提示
    function renderRelics(items) {
        let valueResult73;
        if (items.length) {
            let valueResult75;
            const items78 = items;
            const result81 = [];
            for (let index80 = 0; index80 < items78.length; index80++) {
                let valueResult77;
                {
                    const item = items78[index80];
                    let valueResult79;
                    {
                        if (item.id === "NMX-001") {
                            valueResult79 = "在图录中定位";
                        }
                        else {
                            valueResult79 = "打开完整图录";
                        }
                        const archiveLabel = valueResult79;
                        valueResult77 = ("<article class=\"relic-card\" data-relic-card=\"" + (escapeHtml(item.id)) + "\" tabindex=\"-1\">" + (createRelicVisual(item)) + "<div class=\"relic-info\"><div><span>" + (escapeHtml(item.period)) + "</span><span>" + (escapeHtml(item.value)) + "</span></div><h3>" + (escapeHtml(item.name)) + "</h3><p>" + (escapeHtml(item.summary)) + "</p><button type=\"button\" data-relic-id=\"" + (escapeHtml(item.id)) + "\">" + (archiveLabel) + " <span>→</span></button></div></article>");
                    }
                }
                result81.push(valueResult77);
            }
            valueResult75 = result81;
            valueResult73 = valueResult75.join("");
        }
        else {
            valueResult73 = '<div class="empty-state"><strong>暂未找到相关封泥</strong><p>换一个名称、年代或地点试试。</p></div>';
        }
        (document.querySelector("#collectionGrid") as HTMLElement).innerHTML = valueResult73;
    }
    const relicArchiveLinks = {
        "NMX-001": { query: "临淄守印", siteId: 114 },
        "NMX-002": { query: "墓印篆" },
        "NMX-003": { query: "仓府" },
        "NMX-004": { query: "齐北船丞" },
    };
    // 点击地图点位后，更新右侧的地点介绍和资料数量
    function updateSitePanel(site, index?) {
        if (index === undefined) {
            index = 0;
        }
        (document.querySelector("#siteNumber") as HTMLElement).textContent = String(index + 1).padStart(2, "0");
        (document.querySelector("#siteCity") as HTMLElement).textContent = site.city;
        (document.querySelector("#siteName") as HTMLElement).textContent = site.name;
        const description = (document.querySelector("#siteDescription") as HTMLElement);
        description.textContent = site.description;
        // 说明区域独立滚动；切换地点时回到开头，避免继承上一地点的滚动位置
        description.scrollTop = 0;
        (document.querySelector("#sitePeriod") as HTMLElement).textContent = site.period;
        (document.querySelector("#siteCount") as HTMLElement).textContent = ("" + (site.count) + " 条");
    }
    // 生成当前筛选下的地图点位，并同步默认选中地点与立体地图
    function renderSites(sites) {
        visibleSites = sites;
        const root = (document.querySelector("#mapMarkers") as HTMLElement);
        let valueResult81;
        const value84 = window.SHANDONG_TERRAIN;
        if (value84 === null || value84 === undefined) {
            valueResult81 = undefined;
        }
        else {
            valueResult81 = value84.bounds;
        }
        const bounds = valueResult81 || {
            west: 114.8102646639,
            east: 122.706,
            north: 38.3997238086,
            south: 34.3786,
        };
        let valueResult83;
        const items86 = sites;
        const result89 = [];
        for (let index88 = 0; index88 < items86.length; index88++) {
            let valueResult85;
            {
                const site = items86[index88];
                const index = index88;
                const city = String(site.city || "").split(" · ")[0];
                let valueResult87;
                {
                    const value90 = String(site.city || "")
                        .split(" · ")[1];
                    if (value90 === null || value90 === undefined) {
                        valueResult87 = undefined;
                    }
                    else {
                        const value91 = value90.replace;
                        valueResult87 = value91.call(value90, /[县市区]$/, "");
                    }
                    const county = valueResult87;
                    // 优先使用县级经纬度，缺少时读取 site.x 和 site.y
                    const coordinate = mapCoordinates.counties[county] || mapCoordinates.cities[city];
                    let valueResult89;
                    {
                        if (coordinate) {
                            valueResult89 = ((coordinate[0] - bounds.west) / (bounds.east - bounds.west)) * 100;
                        }
                        else {
                            valueResult89 = Number(site.x) || 0;
                        }
                        const x = valueResult89;
                        let valueResult91;
                        {
                            if (coordinate) {
                                valueResult91 = ((bounds.north - coordinate[1]) / (bounds.north - bounds.south)) * 100;
                            }
                            else {
                                valueResult91 = Number(site.y) || 0;
                            }
                            const y = valueResult91;
                            const safeX = Math.min(100, Math.max(0, x));
                            const safeY = Math.min(100, Math.max(0, y));
                            let valueResult93;
                            {
                                if (county) {
                                    valueResult93 = ("" + (city) + "·" + (county));
                                }
                                else {
                                    valueResult93 = city;
                                }
                                const label = valueResult93;
                                let valueResult95;
                                if (index === 0) {
                                    valueResult95 = " active";
                                }
                                else {
                                    valueResult95 = "";
                                }
                                valueResult85 = ("<button class=\"map-marker" + valueResult95 + "\" type=\"button\" style=\"left:" + (safeX) + "%;top:" + (safeY) + "%\" data-terrain-x=\"" + (safeX) + "\" data-terrain-y=\"" + (safeY) + "\" data-site-id=\"" + (escapeHtml(site.id)) + "\" aria-label=\"查看" + (escapeHtml(label)) + "\"><i></i><span>" + (escapeHtml(label)) + "</span></button>");
                            }
                        }
                    }
                }
            }
            result89.push(valueResult85);
        }
        valueResult83 = result89;
        root.innerHTML = valueResult83.join("");
        if (sites.length) {
            updateSitePanel(sites[0]);
        }
    }
    // 将 ppt-knowledge.ts 中的研究发现写入页面
    function renderSourceFindings() {
        const knowledge = getKnowledge();
        if (!knowledge || !knowledge.findings) {
            return;
        }
        let valueResult97;
        const items98 = knowledge.findings;
        const result101 = [];
        for (let index100 = 0; index100 < items98.length; index100++) {
            let valueResult99;
            {
                const item = items98[index100];
                const index = index100;
                valueResult99 = ("<article><span class=\"card-index\">" + (String(index + 1).padStart(2, "0")) + "</span><h3>" + (escapeHtml(item.title)) + "</h3><p>" + (escapeHtml(item.text)) + "</p></article>");
            }
            result101.push(valueResult99);
        }
        valueResult97 = result101;
        (document.querySelector("#sourceFindings") as HTMLElement).innerHTML = valueResult97.join("");
    }
    // 将补充史料嵌入对应的区县卡片
    function supplementaryList(items) {
        if (!Array.isArray(items) || !items.length) {
            return "";
        }
        let valueResult101;
        const items103 = items;
        const result106 = [];
        for (let index105 = 0; index105 < items103.length; index105++) {
            let valueResult103;
            {
                const item = items103[index105];
                valueResult103 = ("<li>" + (escapeHtml(item)) + "</li>");
            }
            result106.push(valueResult103);
        }
        valueResult101 = result106;
        return ("<ul>" + (valueResult101.join("")) + "</ul>");
    }
    function getSupplementarySource(site) {
        let valueResult105;
        {
            let searchFinished106 = false;
            let valueResult107;
            const value112 = window.SUPPLEMENTARY_SOURCES;
            if (value112 === null || value112 === undefined) {
                valueResult107 = undefined;
            }
            else {
                valueResult107 = value112.entries;
            }
            const items108 = (valueResult107 || []);
            for (let index110 = 0; !searchFinished106 && index110 < items108.length; index110++) {
                let valueResult109;
                {
                    const entry = items108[index110];
                    valueResult109 = Number(entry.mapSiteId) === Number(site.id);
                }
                if (valueResult109) {
                    valueResult105 = items108[index110];
                    searchFinished106 = true;
                }
            }
            if (!searchFinished106) {
                valueResult105 = undefined;
                searchFinished106 = true;
            }
        }
        return valueResult105;
    }
    function sourceCardSupplementImageTemplate(image, index) {
        const imageUrl = safeResourceUrl(image.src);
        if (!imageUrl) {
            return "";
        }
        return ("<figure class=\"source-card-supplement-figure\">\n      <img src=\"" + (escapeHtml(imageUrl)) + "\" alt=\"" + (escapeHtml(image.alt || "补充史料图片")) + "\" decoding=\"async\">\n      <figcaption>" + (escapeHtml(image.kind || "史料图")) + " " + (String(index + 1).padStart(2, "0")) + " · " + (escapeHtml(image.caption || "")) + "</figcaption>\n    </figure>");
    }
    function sourceCardSupplementDebateTemplate(items) {
        if (!Array.isArray(items) || !items.length) {
            return "";
        }
        let valueResult111;
        const items115 = items;
        const result118 = [];
        for (let index117 = 0; index117 < items115.length; index117++) {
            let valueResult113;
            {
                const item = items115[index117];
                valueResult113 = ("<p><b>" + (escapeHtml(item.label)) + "</b>" + (escapeHtml(item.text)) + "</p>");
            }
            result118.push(valueResult113);
        }
        valueResult111 = result118;
        return ("<div class=\"source-card-supplement-debate\" aria-label=\"两种学术观点\">\n      <strong>学术争议：两说并存</strong>\n      <div>" + (valueResult111.join("")) + "</div>\n    </div>");
    }
    function sourceCardSupplementTemplate(entry) {
        let valueResult115;
        if (Array.isArray(entry.images)) {
            valueResult115 = entry.images;
        }
        else {
            valueResult115 = [];
        }
        const images = valueResult115;
        let valueResult117;
        if (entry.debate) {
            valueResult117 = " is-debated";
        }
        else {
            valueResult117 = "";
        }
        let valueResult119;
        if (images.length) {
            let valueResult121;
            if (images.length === 1) {
                valueResult121 = " is-single";
            }
            else {
                valueResult121 = "";
            }
            let valueResult123;
            const items124 = images;
            const result127 = [];
            for (let index126 = 0; index126 < items124.length; index126++) {
                result127.push(sourceCardSupplementImageTemplate(items124[index126], index126));
            }
            valueResult123 = result127;
            valueResult119 = ("<div class=\"source-card-supplement-gallery" + valueResult121 + "\">" + (valueResult123.join("")) + "</div>");
        }
        else {
            valueResult119 = "";
        }
        return ("<section class=\"source-card-supplement" + valueResult117 + "\" aria-label=\"补充史料：" + (escapeHtml(entry.title)) + "\">\n      <div class=\"source-card-supplement-heading\"><span class=\"source-card-supplement-label\">补充史料</span><span class=\"source-card-supplement-category\">" + (escapeHtml(entry.category)) + "</span></div>\n      <h4 class=\"source-card-supplement-title\">" + (escapeHtml(entry.title)) + "</h4>\n      <p class=\"source-card-supplement-lead\">" + (escapeHtml(entry.lead)) + "</p>\n      " + valueResult119 + "\n      <aside class=\"source-card-supplement-insight\"><span>关键认识</span><p>" + (escapeHtml(entry.insight)) + "</p></aside>\n      " + (sourceCardSupplementDebateTemplate(entry.debate)) + "\n      <details class=\"source-card-supplement-details\">\n        <summary>展开考古证据、传世文献与出处</summary>\n        <div class=\"source-card-supplement-details-content\">\n          <div class=\"source-card-supplement-detail-grid\">\n            <section><h5>考古证据</h5>" + (supplementaryList(entry.archaeology)) + "</section>\n            <section><h5>传世文献与研究</h5>" + (supplementaryList(entry.transmittedSources)) + "</section>\n          </div>\n          <div class=\"source-card-supplement-references\"><h5>史料出处</h5>" + (supplementaryList(entry.references)) + "</div>\n          <p class=\"source-card-supplement-caution\"><strong>谨慎说明：</strong>" + (escapeHtml(entry.caution)) + "</p>\n        </div>\n      </details>\n    </section>");
    }
    function sourceCardTemplate(site) {
        let valueResult125;
        if (Array.isArray(site.seals)) {
            valueResult125 = site.seals;
        }
        else {
            valueResult125 = [];
        }
        const seals = valueResult125;
        const supplement = getSupplementarySource(site);
        let valueResult127;
        if (supplement) {
            valueResult127 = "has-supplement";
        }
        else {
            valueResult127 = "";
        }
        let valueResult129;
        if (seals.length > 3) {
            valueResult129 = (" 等 " + (site.count) + " 条");
        }
        else {
            valueResult129 = "";
        }
        let valueResult131;
        if (supplement) {
            valueResult131 = sourceCardSupplementTemplate(supplement);
        }
        else {
            valueResult131 = "";
        }
        return ("<article class=\"" + valueResult127 + "\" data-source-card=\"" + (site.id) + "\" tabindex=\"-1\">\n      <div class=\"source-card-heading\"><span>" + (escapeHtml(site.city)) + "</span><strong>" + (escapeHtml(seals.slice(0, 3).join(" · "))) + valueResult129 + "</strong></div>\n      <p class=\"source-card-meta\">" + (escapeHtml(site.period)) + "<br>" + (escapeHtml(site.admin)) + "</p>\n      " + valueResult131 + "\n      <a class=\"source-card-map-link\" href=\"#map\" data-source-site=\"" + (site.id) + "\">在地图查看 <b aria-hidden=\"true\">→</b></a>\n    </article>");
    }
    function renderSourceCards(root, items) {
        let valueResult133;
        if (items.length) {
            let valueResult135;
            const items134 = items;
            const result137 = [];
            for (let index136 = 0; index136 < items134.length; index136++) {
                result137.push(sourceCardTemplate(items134[index136]));
            }
            valueResult135 = result137;
            valueResult133 = valueResult135.join("");
        }
        else {
            valueResult133 = '<p class="source-empty">没有匹配资料，请尝试现代区县、古地名、印文或郡国名称。</p>';
        }
        root.innerHTML = valueResult133;
        cacheSourceSupplementHeights(root);
    }
    // 提前记录折叠内容的高度，展开动画时就能知道应该长到多高
    function cacheSourceSupplementHeights(root) {
        if (!root) {
            return;
        }
        const items139 = (root.querySelectorAll(".source-card-supplement-details") as NodeListOf<HTMLDetailsElement>);
        for (let index141 = 0; index141 < items139.length; index141++) {
            {
                const details = items139[index141];
                if (details.open) {
                    undefined;
                }
                else {
                    details.open = true;
                    details.dataset.openHeight = String(details.scrollHeight);
                    details.open = false;
                }
            }
        }
    }
    // 原生 details 会直接跳开，这里先播放高度变化，再确定最终展开状态
    async function animateSourceSupplementDetails(details, shouldOpen) {
        const summary = (details.querySelector(":scope > summary") as HTMLElement);
        const content = (details.querySelector(":scope > .source-card-supplement-details-content") as HTMLElement);
        if (!summary || !content || details.classList.contains("is-animating")) {
            return;
        }
        if (prefersReducedMotion()) {
            details.open = shouldOpen;
            return;
        }
        const startHeight = details.getBoundingClientRect().height;
        let valueResult141;
        if (shouldOpen) {
            valueResult141 = Math.min(260, Math.max(200, readCssTime("--dur-short")));
        }
        else {
            valueResult141 = Math.min(280, Math.max(240, readCssTime("--dur-short")));
        }
        const duration = valueResult141;
        let valueResult143;
        if (shouldOpen) {
            valueResult143 = duration;
        }
        else {
            valueResult143 = 360;
        }
        const contentDuration = valueResult143;
        let valueResult145;
        if (shouldOpen) {
            valueResult145 = duration;
        }
        else {
            valueResult145 = 230;
        }
        const heightDuration = valueResult145;
        const heightDelay = 0;
        const easing = readCssValue("--ease-out");
        details.classList.add("is-animating");
        details.style.height = ("" + (startHeight) + "px");
        let valueResult147;
        if (shouldOpen) {
            valueResult147 = "0";
        }
        else {
            valueResult147 = "1";
        }
        // 先隐藏内容，再展开 details，防止首帧闪现
        content.style.opacity = valueResult147;
        if (shouldOpen) {
            details.open = true;
        }
        let valueResult149;
        if (shouldOpen) {
            valueResult149 = Number(details.dataset.openHeight) || details.scrollHeight;
        }
        else {
            valueResult149 = summary.getBoundingClientRect().height;
        }
        // 使用渲染时保存的高度播放展开动画
        const endHeight = valueResult149;
        const heightAnimation = details.animate([{ height: ("" + (startHeight) + "px") }, { height: ("" + (endHeight) + "px") }], {
            duration: heightDuration,
            delay: heightDelay,
            easing: easing,
            fill: "both",
        });
        let valueResult151;
        if (shouldOpen) {
            valueResult151 = [{ opacity: 0 }, { opacity: 1 }];
        }
        else {
            valueResult151 = [{ opacity: 1 }, { opacity: 0 }];
        }
        const contentAnimation = content.animate(valueResult151, { duration: contentDuration, easing: easing, fill: "both" });
        try {
            await Promise.all([heightAnimation.finished, contentAnimation.finished]);
        }
        catch (_) {
            return;
        }
        finally {
            if (!shouldOpen) {
                details.open = false;
            }
            heightAnimation.cancel();
            contentAnimation.cancel();
            content.style.removeProperty("opacity");
            details.style.removeProperty("height");
            details.classList.remove("is-animating");
        }
    }
    // 页面只展示三处精选；完整筛选结果只在弹窗中渲染，数量文案跟随数据变化
    function renderSourcePreview() {
        let valueResult153;
        const value150 = getKnowledge();
        if (value150 === null || value150 === undefined) {
            valueResult153 = undefined;
        }
        else {
            valueResult153 = value150.sites;
        }
        const sites = valueResult153 || [];
        const featuredIds = [120, 129, 138];
        let valueResult155;
        let valueResult157;
        const items156 = featuredIds;
        const result159 = [];
        for (let index158 = 0; index158 < items156.length; index158++) {
            let valueResult159;
            {
                const id = items156[index158];
                let valueResult161;
                {
                    let searchFinished162 = false;
                    const items160 = sites;
                    for (let index162 = 0; !searchFinished162 && index162 < items160.length; index162++) {
                        let valueResult163;
                        {
                            const site = items160[index162];
                            valueResult163 = Number(site.id) === id;
                        }
                        if (valueResult163) {
                            valueResult161 = items160[index162];
                            searchFinished162 = true;
                        }
                    }
                    if (!searchFinished162) {
                        valueResult161 = undefined;
                        searchFinished162 = true;
                    }
                    valueResult159 = valueResult161;
                }
            }
            result159.push(valueResult159);
        }
        valueResult157 = result159;
        const items152 = valueResult157;
        const result155 = [];
        for (let index154 = 0; index154 < items152.length; index154++) {
            if (Boolean(items152[index154])) {
                result155.push(items152[index154]);
            }
        }
        valueResult155 = result155;
        const featuredSites = valueResult155;
        let valueResult165;
        if (featuredSites.length) {
            valueResult165 = featuredSites;
        }
        else {
            valueResult165 = sites.slice(0, 3);
        }
        const previewSites = valueResult165;
        renderSourceCards((document.querySelector("#sourceIndex") as HTMLElement), previewSites);
        const remaining = Math.max(0, sites.length - previewSites.length);
        const moreLabel = (document.querySelector("#sourceIndexMoreLabel") as HTMLElement);
        if (moreLabel) {
            let valueResult167;
            if (remaining) {
                valueResult167 = ("查看其余 " + (remaining) + " 处");
            }
            else {
                valueResult167 = "查看完整图录";
            }
            moreLabel.textContent = valueResult167;
        }
    }
    // 搜索词为空时显示完整图录，否则只保留匹配条目并更新结果数量
    function renderSourceDialogIndex(keyword?) {
        if (keyword === undefined) {
            keyword = "";
        }
        const query = keyword.trim().toLowerCase();
        const items = findKnowledgeSites(query);
        renderSourceCards((document.querySelector("#sourceDialogIndex") as HTMLElement), items);
        (document.querySelector("#clearSourceDialogSearch") as HTMLButtonElement).hidden = !query;
        let valueResult169;
        if (query) {
            valueResult169 = ("找到 " + (items.length) + " 处匹配资料");
        }
        else {
            valueResult169 = ("显示全部 " + (items.length) + " 处区县资料");
        }
        (document.querySelector("#sourceDialogFeedback") as HTMLElement).textContent = valueResult169;
    }
    let openingLoaderController = null;
    // 页面启动顺序：并行取数据，分批生成栏目，AI 在后台连接，最后结束开屏
    async function init() {
        openingLoaderController = window.NiyunOpeningLoader.create({ findElement: findElement });
        openingLoaderController.start();
        const source170 = await Promise.all([
            ApiService.getStats(),
            ApiService.getMapConfig(),
            ApiService.getSites(),
            ApiService.getRelics(),
            ApiService.getCourses(),
        ]);
        const stats = source170[0];
        const mapConfig = source170[1];
        const sites = source170[2];
        const relics = source170[3];
        const courseItems = source170[4];
        (document.querySelector("#statRelics") as HTMLElement).textContent = String(stats.relics);
        (document.querySelector("#statSites") as HTMLElement).textContent = String(stats.sites);
        (document.querySelector("#statCourses") as HTMLElement).textContent = String(stats.courses);
        if (mapConfig.imageUrl) {
            const image = (document.querySelector("#mapSourceImage") as HTMLImageElement);
            image.src = mapConfig.imageUrl;
            image.hidden = false;
            (document.querySelector("#shandongMap") as HTMLElement).classList.add("has-source-image");
        }
        renderSites(sites);
        await openingLoaderController.yieldToBrowser();
        renderRelics(relics.items);
        await openingLoaderController.yieldToBrowser();
        const courseBrowser = window.NiyunCourseBrowser.create({
            findElement: findElement,
            findElements: findElements,
            escapeHtml: escapeHtml,
            safeResourceUrl: safeResourceUrl,
            prefersReducedMotion: prefersReducedMotion,
            mediaConfig: window.MEDIA_CONFIG,
        });
        // 准备课件的同时渲染其他栏目
        const initialCourseReady = courseBrowser.renderCourses(courseItems);
        courseBrowser.initCourseScroll();
        await openingLoaderController.yieldToBrowser();
        renderSourceFindings();
        renderSourcePreview();
        window.NiyunScrollStory.create({ findElement: findElement, findElements: findElements, escapeHtml: escapeHtml, prefersReducedMotion: prefersReducedMotion }).init();
        // 在后台检查 AI 连接
        AiService.getStatus()
            .then(function (status) {
            return aiChatController.renderStatus(status);
        })
            .catch(function handleInitialAiStatusFailure() {
            aiChatController.renderStatus({ connected: false });
        });
        // 结束开屏前，再确认最先展示的课件已完成准备流程
        await initialCourseReady;
        openingLoaderController.finish(true);
    }
    const sourceDialog = (document.querySelector("#sourceDialog") as HTMLDialogElement);
    let valueResult171;
    const value171 = sourceDialog;
    if (value171 === null || value171 === undefined) {
        valueResult171 = undefined;
    }
    else {
        const value172 = value171.querySelector;
        valueResult171 = value172.call(value171, ".source-dialog-panel");
    }
    const sourceDialogPanel = (valueResult171 as HTMLElement);
    const sourceDialogSearch = (document.querySelector("#sourceDialogSearch") as HTMLInputElement);
    const clearSourceDialogSearch = (document.querySelector("#clearSourceDialogSearch") as HTMLButtonElement);
    // 搜索、图录和设置弹窗共用的基础进出场动画
    function openModalAnimation(panel) {
        return runElementAnimation(panel, [
            {
                opacity: 0,
                transform: ("translateY(" + (readCssValue("--motion-search-travel-y")) + ") scale(" + (readCssValue("--motion-search-scale-from")) + ")"),
            },
            { opacity: 1, transform: "translateY(0) scale(1)" },
        ], "--motion-search-enter", "--ease-out");
    }
    function closeModalAnimation(panel) {
        return runElementAnimation(panel, [
            { opacity: 1, transform: "translateY(0) scale(1)" },
            {
                opacity: 0,
                transform: ("translateY(" + (readCssValue("--motion-search-travel-y")) + ") scale(" + (readCssValue("--motion-search-scale-from")) + ")"),
            },
        ], "--motion-search-exit", "--ease-in-out");
    }
    let siteNavigationController = null;
    let sourceArchiveController = null;
    const getSettings = function getSettings() {
        return Object.assign({}, userSettings);
    };
    const updateSetting = function updateSetting(name, value) {
        if (name) {
            userSettings[name] = value;
        }
    };
    const resetSettings = function resetSettings() {
        userSettings = Object.assign({}, defaultSettings);
    };
    const displaySettingsController = window.NiyunDisplaySettings.create({
        findElement: findElement,
        getSettings: getSettings,
        updateSetting: updateSetting,
        resetSettings: resetSettings,
        defaults: defaultSettings,
        ranges: motionSettingRanges,
        openingKey: openingAnimationStorageKey,
        reducedMotion: systemPrefersReducedMotion,
        applySettings: function () {
            return applyDisplaySettings();
        },
        showToast: showToast,
        dispatchReset: function dispatchMediaSettingsReset() {
            window.dispatchEvent(new CustomEvent("media-settings-reset"));
            window.dispatchEvent(new CustomEvent("ai-pet-settings-reset"));
        },
    });
    displaySettingsController.init();
    siteNavigationController = window.NiyunSiteNavigation.create({
        findElement: findElement,
        findElements: findElements,
        prefersReducedMotion: prefersReducedMotion,
        interfaceConfig: interfaceConfig,
    });
    siteNavigationController.init();
    sourceArchiveController = window.NiyunSourceArchive.create({
        findElement: findElement,
        sourceDialog: sourceDialog,
        sourceDialogPanel: sourceDialogPanel,
        sourceDialogSearch: sourceDialogSearch,
        clearSourceDialogSearch: clearSourceDialogSearch,
        renderSourceDialogIndex: renderSourceDialogIndex,
        cacheSourceSupplementHeights: cacheSourceSupplementHeights,
        animateSourceSupplementDetails: animateSourceSupplementDetails,
        getRelicArchiveLink: function (relicId) {
            return relicArchiveLinks[relicId] || {};
        },
        prefersReducedMotion: prefersReducedMotion,
        openModalAnimation: openModalAnimation,
        closeModalAnimation: closeModalAnimation,
        showToast: showToast,
        getVisibleSites: function () {
            return visibleSites;
        },
        navigateToMapIndex: function (siteId) {
            return siteNavigationController.navigateToMapIndex(siteId);
        },
        setMenuOpen: function (open) {
            return siteNavigationController.setMenuOpen(open);
        },
    });
    sourceArchiveController.init();
    const mapBrowserController = window.NiyunMapBrowser.create({
        findElement: findElement,
        findElements: findElements,
        apiService: ApiService,
        getVisibleSites: function () {
            return visibleSites;
        },
        renderSites: renderSites,
        updateSitePanel: updateSitePanel,
        openCurrentSiteArchive: function (siteId) {
            return sourceArchiveController.openSite(siteId);
        },
    });
    mapBrowserController.init();
    // 08. 通用点击提示和藏品详情
    function revealRelicCard(relicId) {
        const target = (document.querySelector(("[data-relic-card=\"" + (CSS.escape(String(relicId))) + "\"]")) as HTMLElement);
        if (!target) {
            return;
        }
        revealTarget(target);
        window.history.pushState(null, "", "#collection");
    }
    const items174 = (Array.from(document.querySelectorAll("[data-artifact-relic-id]")) as HTMLElement[]);
    for (let index176 = 0; index176 < items174.length; index176++) {
        {
            const artifact = items174[index176];
            artifact.addEventListener("keydown", function handleKeydown(event) {
                if (event.key !== "Enter" && event.key !== " ") {
                    return;
                }
                event.preventDefault();
                revealRelicCard(artifact.dataset.artifactRelicId);
            });
        }
    }
    document.addEventListener("click", async function handleClick(event) {
        const artifact = ((event.target as HTMLElement).closest("[data-artifact-relic-id]") as HTMLElement);
        if (artifact) {
            revealRelicCard(artifact.dataset.artifactRelicId);
            return;
        }
        const notice = ((event.target as HTMLElement).closest("[data-notice]") as HTMLElement);
        if (notice) {
            showToast(notice.dataset.notice);
        }
        const detail = ((event.target as HTMLElement).closest("[data-relic-id]") as HTMLElement);
        if (detail) {
            event.preventDefault();
            await sourceArchiveController.openRelic(detail.dataset.relicId);
        }
    });
    // 搜索和图鉴定位共用同一套滚动、描边与焦点反馈
    function revealTarget(target) {
        if (!target) {
            return;
        }
        const reduceMotion = prefersReducedMotion();
        let valueResult177;
        if (reduceMotion) {
            valueResult177 = "auto";
        }
        else {
            valueResult177 = "smooth";
        }
        target.scrollIntoView({ behavior: valueResult177, block: "center" });
        target.classList.remove("search-target");
        window.requestAnimationFrame(function () {
            return target.classList.add("search-target");
        });
        let valueResult179;
        if (reduceMotion) {
            valueResult179 = 0;
        }
        else {
            valueResult179 = visualEffects.searchFocusDelay;
        }
        window.setTimeout(function () {
            return target.focus({ preventScroll: true });
        }, valueResult179);
        window.setTimeout(function () {
            return target.classList.remove("search-target");
        }, visualEffects.searchHighlightLifetime);
    }
    const searchDialogController = window.NiyunSearchDialog.create({
        findElement: findElement,
        escapeHtml: escapeHtml,
        prefersReducedMotion: prefersReducedMotion,
        renderSourceDialogIndex: renderSourceDialogIndex,
        sourceDialog: sourceDialog,
        sourceDialogPanel: sourceDialogPanel,
        openModalAnimation: openModalAnimation,
        closeModalAnimation: closeModalAnimation,
        findKnowledgeSites: findKnowledgeSites,
        revealTarget: revealTarget,
        showToast: showToast,
        apiService: ApiService,
    });
    searchDialogController.init();
    const aiChatController = window.NiyunAiChat.create({
        findElement: findElement,
        findElements: findElements,
        escapeHtml: escapeHtml,
        renderMarkdown: renderMarkdown,
        showToast: showToast,
        aiService: AiService,
        sessionStorageKey: aiSessionStorageKey,
    });
    aiChatController.init();
    window.NiyunPageEffects.create({
        findElement: findElement,
        findElements: findElements,
        prefersReducedMotion: prefersReducedMotion,
        getSettings: getSettings,
        visualEffects: visualEffects,
        motionSettingRanges: motionSettingRanges,
    }).init();
    init().catch(function handleWebsiteInitializationFailure() {
        let valueResult181;
        const value181 = openingLoaderController;
        if (value181 === null || value181 === undefined) {
            valueResult181 = undefined;
        }
        else {
            const value182 = value181.finish;
            valueResult181 = value182.call(value181, false);
        }
        showToast("部分页面资料加载失败，请稍后重试");
    });
})();
