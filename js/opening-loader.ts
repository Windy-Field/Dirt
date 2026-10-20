const NiyunOpeningLoader = (function registerOpeningLoader() {
    "use strict";
    return {
        create(options1: {
            findElement(selector: string): HTMLElement;
        }) {
            const source2 = options1;
            const findElement = source2.findElement;
            // 页面准备完成后，app.ts 调用 finish() 结束开屏
            const config = {
                // 知识短句的轮换间隔，单位为毫秒
                didYouKnowIntervalMs: 3800,
                didYouKnowFadeMs: 220,
                stages: [
                    { text: "正在辨识战国秦汉封泥……", progress: 15 },
                    { text: "封缄受力，封泥渐生细纹……", progress: 38 },
                    { text: "卷轴晃动，封泥将裂……", progress: 54 },
                    { text: "展厅已开启，欢迎进入泥云智探", progress: 100 },
                ],
                stageIntervalMs: 750,
                preBreakHoldMs: 1400,
                completedHoldMs: 900,
                removeDelayMs: 1100,
                // 单张图片最多等待 30 秒；超时会标记失败并使用页面已有占位内容
                resourceReadyTimeoutMs: 30000,
                initialProgress: 8,
                progressEase: 0.12,
                progressStopThreshold: 0.2,
                particleFrameIntervalMs: 16,
                debrisLifetimeMs: 750,
                debrisCount: { finalBurst: 84, mobileBurst: 48 },
                mobileBreakpoint: 640,
                earlyExpandHalfWidth: { mobile: 110, desktop: 160 },
                earlyExpandRatio: 0.35,
                finalWidthRatio: { mobile: 0.86, desktop: 0.78 },
                finalExtraWidth: 96,
                contentRevealRatio: 0.4,
            };
            const didYouKnowFacts = [
                "封泥不是印章，而是印章按在湿泥上留下的痕迹。",
                "古人寄公文时，要先捆绳、糊泥，再按上官印。",
                "封泥也被称为“简牍之锁”，相当于公文的一次性封条。",
                "山东临淄是封泥大户，单区就有 54 个印文品类。",
                "史书不写麋圈、橘官，封泥替它们留了名。",
                "秦印规整，汉印圆润，封泥记录了篆书的演变。",
                "绳痕、指纹和裂纹记录了封泥两千多年的经历。",
                "“临淄守印”相当于古代公文的防伪标签。",
                "昌乐东圈汉墓集中出土了 85 枚“菑川后府”封泥。",
                "秦封泥常见田字格，西汉早期也曾短暂沿用界格。",
                "“观阳丞印”说明诸侯王国之下仍设有县级官署。",
            ];
            const loader = (document.querySelector("#openingLoader") as HTMLElement);
            const animationEnabled = window.localStorage.getItem("niyun-opening-animation-enabled") !== "false";
            const status = (document.querySelector("#openingLoaderStatus") as HTMLElement);
            const progressBar = (document.querySelector("#openingLoaderProgress") as HTMLElement);
            const progressPercent = (document.querySelector("#openingProgressPercent") as HTMLElement);
            const rollerLeft = (document.querySelector("#scrollRollerLeft") as HTMLElement);
            const rollerRight = (document.querySelector("#scrollRollerRight") as HTMLElement);
            const paperContainer = (document.querySelector("#scrollPaperContainer") as HTMLElement);
            let valueResult1;
            const value3 = paperContainer;
            if (value3 === null || value3 === undefined) {
                valueResult1 = undefined;
            }
            else {
                const value4 = value3.querySelector;
                valueResult1 = value4.call(value3, ".scroll-paper");
            }
            const paper = (valueResult1 as HTMLElement);
            const content = (document.querySelector("#scrollContent") as HTMLElement);
            const cord = (document.querySelector("#scrollCord") as HTMLElement);
            const seal = (document.querySelector("#claySealEntity") as HTMLElement);
            const cracks = (document.querySelector("#sealCracksSvg") as HTMLElement);
            let crackPaths = [];
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const particleCanvas = (document.querySelector("#sealParticlesCanvas") as HTMLCanvasElement);
            // 保存四块碎片，飞行轨迹由 releaseFragments 计算
            const fragments = [
                (document.querySelector("#fragNW") as HTMLElement),
                (document.querySelector("#fragNE") as HTMLElement),
                (document.querySelector("#fragSW") as HTMLElement),
                (document.querySelector("#fragSE") as HTMLElement),
            ];
            const didYouKnowText = (document.querySelector("#openingDidYouKnowText") as HTMLElement);
            let particles = [];
            let didYouKnowIndex = -1;
            let didYouKnowTimer = null;
            let didYouKnowSwitchTimer = null;
            let particleFrame = null;
            let lastParticleFrame = 0;
            let particleEngine = null;
            let currentProgress = 0;
            let targetProgress = config.initialProgress;
            let progressFrame = null;
            let stageIndex = 0;
            let intervalTimer = null;
            let fallbackTimer = null;
            let removeTimer = null;
            let cachedPaperWidth = null;
            let particlesPlayed = false;
            let pageReadyPromise = null;
            let finishPromise = null;
            let fragmentsStarted = false;
            // 先画裂纹，再复制完整印面作为碎块；各副本的 SVG 编号必须不同，避免引用串台
            function prepareFracture() {
                let valueResult3;
                const value6 = seal;
                if (value6 === null || value6 === undefined) {
                    valueResult3 = undefined;
                }
                else {
                    const value7 = value6.querySelector;
                    valueResult3 = value7.call(value6, ".clay-seal-svg");
                }
                const svg = (valueResult3 as SVGSVGElement);
                if (!svg || !cracks) {
                    return;
                }
                const ns = "http://www.w3.org/2000/svg";
                const lines = [
                    "M98 100 L94 86 L101 73 L96 61 L102 49 L98 35 L100 10",
                    "M98 100 L114 94 L123 100 L137 91 L147 95 L161 86 L191 80",
                    "M98 100 L104 114 L98 128 L105 139 L100 153 L108 168 L103 194",
                    "M98 100 L84 108 L73 102 L61 111 L49 106 L35 115 L8 119",
                    "M101 73 L116 65 L120 48 L137 34",
                    "M147 95 L154 111 L172 123 L178 143",
                    "M105 139 L85 147 L77 165 L57 178",
                    "M61 111 L54 91 L37 80 L29 59",
                ];
                const clip = document.createElementNS(ns, "clipPath");
                clip.id = "sealFractureClip";
                const outline = svg.querySelector(".clay-base").cloneNode(true) as SVGPathElement;
                outline.removeAttribute("class");
                outline.setAttribute("fill", "white");
                clip.append(outline);
                svg.querySelector("defs").append(clip);
                cracks.setAttribute("clip-path", "url(#sealFractureClip)");
                cracks.replaceChildren();
                const items9 = lines;
                for (let index11 = 0; index11 < items9.length; index11++) {
                    {
                        const d = items9[index11];
                        const index = index11;
                        const highlightValues = [true, false];
                        for (let highlightIndex = 0; highlightIndex < highlightValues.length; highlightIndex += 1) {
                            const highlight = highlightValues[highlightIndex];
                            const path = document.createElementNS(ns, "path");
                            path.setAttribute("d", d);
                            path.setAttribute("fill", "none");
                            let valueResult9;
                            if (highlight) {
                                valueResult9 = "#d58d66";
                            }
                            else {
                                valueResult9 = "#35150e";
                            }
                            path.setAttribute("stroke", valueResult9);
                            let valueResult11;
                            if (index < 4) {
                                let valueResult13;
                                if (highlight) {
                                    valueResult13 = "5.2";
                                }
                                else {
                                    valueResult13 = "3.2";
                                }
                                valueResult11 = valueResult13;
                            }
                            else {
                                let valueResult15;
                                if (highlight) {
                                    valueResult15 = "2.8";
                                }
                                else {
                                    valueResult15 = "1.6";
                                }
                                valueResult11 = valueResult15;
                            }
                            path.setAttribute("stroke-width", valueResult11);
                            path.setAttribute("stroke-linejoin", "round");
                            let valueResult17;
                            if (highlight) {
                                valueResult17 = "crack-highlight";
                            }
                            else {
                                valueResult17 = "crack-path";
                            }
                            path.setAttribute("class", valueResult17);
                            path.setAttribute("pathLength", "180");
                            path.dataset.branch = String(index);
                            if (highlight) {
                                path.setAttribute("opacity", ".7");
                            }
                            cracks.append(path);
                        }
                    }
                }
                crackPaths = Array.from(cracks.querySelectorAll("path"));
                const items19 = fragments;
                for (let index21 = 0; index21 < items19.length; index21++) {
                    {
                        const fragment = items19[index21];
                        const index = index21;
                        if (!fragment) {
                            undefined;
                        }
                        else {
                            const copy = svg.cloneNode(true) as SVGSVGElement;
                            {
                                const items23 = (copy.querySelectorAll("script, .seal-cracks-group") as NodeListOf<HTMLElement>);
                                for (let index25 = 0; index25 < items23.length; index25++) {
                                    {
                                        const node = items23[index25];
                                        node.remove();
                                    }
                                }
                                const ids = new Map();
                                const items28 = (copy.querySelectorAll("[id]") as NodeListOf<HTMLElement>);
                                for (let index30 = 0; index30 < items28.length; index30++) {
                                    {
                                        const node = items28[index30];
                                        const old = node.id;
                                        ids.set(old, ("" + (old) + "-fragment-" + (index)));
                                        node.id = ids.get(old);
                                    }
                                }
                                const items33 = (copy.querySelectorAll("*") as NodeListOf<HTMLElement>);
                                for (let index35 = 0; index35 < items33.length; index35++) {
                                    {
                                        const node = items33[index35];
                                        const attributes = (function copyItems40() {
                                            const items37 = [];
                                            const part38 = Array.from(node.attributes);
                                            for (let index39 = 0; index39 < part38.length; index39++) {
                                                items37.push(part38[index39]);
                                            }
                                            return items37;
                                        })();
                                        for (let attributeIndex = 0; attributeIndex < attributes.length; attributeIndex += 1) {
                                            const attr = attributes[attributeIndex];
                                            let value = attr.value;
                                            const items41 = Array.from(ids.entries());
                                            for (let index43 = 0; index43 < items41.length; index43++) {
                                                {
                                                    const next = items41[index43][1];
                                                    const old = items41[index43][0];
                                                    value = value.replaceAll(("url(#" + (old) + ")"), ("url(#" + (next) + ")"));
                                                }
                                            }
                                            if (value !== attr.value) {
                                                node.setAttribute(attr.name, value);
                                            }
                                        }
                                    }
                                }
                                fragment.replaceChildren(copy);
                                // 将碎片移到封泥外层，独立播放下落动画
                                seal.parentElement.append(fragment);
                            }
                        }
                    }
                }
            }
            // 建立泥屑画布。按屏幕像素密度放大画布，让高分屏上的碎屑也清晰
            function initParticles() {
                if (!particleCanvas) {
                    return null;
                }
                const context = particleCanvas.getContext("2d");
                if (!context) {
                    return null;
                }
                const width = Math.min(800, window.innerWidth);
                const height = 640;
                const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
                particleCanvas.width = Math.round(width * pixelRatio);
                particleCanvas.height = Math.round(height * pixelRatio);
                particleCanvas.style.width = ("" + (width) + "px");
                particleCanvas.style.height = ("" + (height) + "px");
                context.scale(pixelRatio, pixelRatio);
                const centerX = width / 2;
                const centerY = height / 2;
                function wake() {
                    if (!particleFrame) {
                        particleFrame = requestAnimationFrame(render);
                    }
                }
                // 给每粒泥屑一个出发位置、速度和转速，之后按经过的时间计算运动
                function createDebris(count?, burst?) {
                    if (burst === undefined) {
                        burst = false;
                    }
                    if (count === undefined) {
                        count = 5;
                    }
                    if (reducedMotion) {
                        return;
                    }
                    const bornAt = performance.now();
                    for (let index = 0; index < count; index += 1) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 10 + Math.random() * 45;
                        let valueResult39;
                        if (burst) {
                            valueResult39 = 5 + Math.random() * 10;
                        }
                        else {
                            valueResult39 = 0.6 + Math.random() * 2.2;
                        }
                        const speed = valueResult39 * Math.min(1, width / 640);
                        const fine = index % 3 !== 0;
                        let valueResult41;
                        if (burst) {
                            valueResult41 = 3;
                        }
                        else {
                            valueResult41 = 0;
                        }
                        let valueResult43;
                        if (fine) {
                            valueResult43 = 0.12;
                        }
                        else {
                            valueResult43 = 0.24;
                        }
                        let valueResult45;
                        if (fine) {
                            valueResult45 = 1 + Math.random() * 2;
                        }
                        else {
                            valueResult45 = 3 + Math.random() * 6;
                        }
                        let valueResult47;
                        if (Math.random() > 0.4) {
                            valueResult47 = "#8c3323";
                        }
                        else {
                            let valueResult49;
                            if (Math.random() > 0.5) {
                                valueResult49 = "#ba5d45";
                            }
                            else {
                                valueResult49 = "#4a180e";
                            }
                            valueResult47 = valueResult49;
                        }
                        particles.push({
                            x: centerX + Math.cos(angle) * distance,
                            y: centerY + Math.sin(angle) * distance,
                            vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.2,
                            vy: Math.sin(angle) * speed - valueResult41,
                            gravity: valueResult43,
                            size: valueResult45,
                            rotation: Math.random() * Math.PI * 2,
                            vRot: (Math.random() - 0.5) * 0.25,
                            color: valueResult47,
                            bornAt: bornAt,
                            alpha: 1,
                        });
                    }
                    wake();
                }
                // 只在有泥屑时绘制；按时间而非帧数计算，避免不同刷新率下快慢不一
                function render(timestamp?) {
                    if (timestamp === undefined) {
                        timestamp = 0;
                    }
                    if (!particles.length) {
                        particleFrame = null;
                        return;
                    }
                    if (timestamp - lastParticleFrame < config.particleFrameIntervalMs) {
                        particleFrame = requestAnimationFrame(render);
                        return;
                    }
                    lastParticleFrame = timestamp;
                    context.clearRect(0, 0, width, height);
                    for (let index = particles.length - 1; index >= 0; index -= 1) {
                        const particle = particles[index];
                        const age = Math.max(0, timestamp - particle.bornAt);
                        const frames = age / (1000 / 60);
                        particle.alpha = 1 - Math.max(0, (age / config.debrisLifetimeMs - 0.55) / 0.45);
                        if (age >= config.debrisLifetimeMs) {
                            particles.splice(index, 1);
                            continue;
                        }
                        context.save();
                        context.translate(particle.x + particle.vx * frames, particle.y + particle.vy * frames + 0.5 * particle.gravity * frames * frames);
                        context.rotate(particle.rotation + particle.vRot * frames);
                        context.globalAlpha = Math.max(0, particle.alpha);
                        context.fillStyle = particle.color;
                        context.beginPath();
                        context.moveTo(-particle.size, -particle.size * 0.8);
                        context.lineTo(particle.size * 1.1, -particle.size * 0.6);
                        context.lineTo(particle.size * 0.8, particle.size * 0.9);
                        context.lineTo(-particle.size * 0.9, particle.size * 0.7);
                        context.closePath();
                        context.fill();
                        context.restore();
                    }
                    particleFrame = requestAnimationFrame(render);
                }
                return { createDebris: createDebris };
            }
            // 大碎块沿抛物线飞散，并在 0.75 秒内渐隐；减少动态效果时不播放飞散
            function releaseFragments() {
                if (reducedMotion) {
                    return;
                }
                let valueResult51;
                if (window.innerWidth < config.mobileBreakpoint) {
                    valueResult51 = 0.6;
                }
                else {
                    valueResult51 = 1;
                }
                const spread = valueResult51;
                const velocities = [
                    [-290, -290, -110],
                    [310, -320, 125],
                    [-240, 40, -90],
                    [260, 65, 140],
                ];
                const items55 = fragments;
                for (let index57 = 0; index57 < items55.length; index57++) {
                    {
                        const fragment = items55[index57];
                        const index = index57;
                        if (!fragment) {
                            undefined;
                        }
                        else {
                            const source59 = velocities[index];
                            const vx = source59[0];
                            const vy = source59[1];
                            const spin = source59[2];
                            // 按抛物线公式生成关键帧，交给浏览器播放
                            const keyframes = Array.from({ length: 61 }, function (_, frame) {
                                const offset = frame / 60;
                                const time = (offset * config.debrisLifetimeMs) / 1000;
                                const x = vx * spread * time;
                                const y = vy * time + 0.5 * 1000 * time * time;
                                return {
                                    offset: offset,
                                    transform: ("translate(" + (x) + "px, " + (y) + "px) rotate(" + (spin * time) + "deg)"),
                                    opacity: 1 - Math.max(0, (offset - 0.55) / 0.45),
                                };
                            });
                            fragment.animate(keyframes, {
                                duration: config.debrisLifetimeMs,
                                easing: "linear",
                                fill: "forwards",
                            });
                        }
                    }
                }
            }
            // 开屏等待期间轮换知识短句，计时器会在退场时清理
            function startDidYouKnow() {
                if (!didYouKnowText || !didYouKnowFacts.length) {
                    return;
                }
                didYouKnowIndex = Math.floor(Math.random() * didYouKnowFacts.length);
                setDidYouKnowText(didYouKnowFacts[didYouKnowIndex], true);
                didYouKnowTimer = window.setInterval(function rotateKnowledgeFact() {
                    didYouKnowIndex = nextDidYouKnowIndex();
                    setDidYouKnowText(didYouKnowFacts[didYouKnowIndex]);
                }, config.didYouKnowIntervalMs);
            }
            // 随机选下一句，但不连续显示同一句
            function nextDidYouKnowIndex() {
                if (didYouKnowFacts.length < 2) {
                    return 0;
                }
                let nextIndex = didYouKnowIndex;
                while (nextIndex === didYouKnowIndex) {
                    nextIndex = Math.floor(Math.random() * didYouKnowFacts.length);
                }
                return nextIndex;
            }
            function setDidYouKnowText(text, immediate?) {
                if (immediate === undefined) {
                    immediate = false;
                }
                if (!didYouKnowText) {
                    return;
                }
                if (immediate) {
                    didYouKnowText.textContent = text;
                    didYouKnowText.classList.remove("is-switching");
                    return;
                }
                if (didYouKnowSwitchTimer) {
                    window.clearTimeout(didYouKnowSwitchTimer);
                }
                didYouKnowText.classList.add("is-switching");
                didYouKnowSwitchTimer = window.setTimeout(function replaceKnowledgeFact() {
                    didYouKnowText.textContent = text;
                    didYouKnowText.classList.remove("is-switching");
                    didYouKnowSwitchTimer = null;
                }, config.didYouKnowFadeMs);
            }
            function stopDidYouKnow() {
                if (didYouKnowTimer) {
                    window.clearInterval(didYouKnowTimer);
                }
                if (didYouKnowSwitchTimer) {
                    window.clearTimeout(didYouKnowSwitchTimer);
                }
                didYouKnowTimer = null;
                didYouKnowSwitchTimer = null;
                let valueResult57;
                const value61 = didYouKnowText;
                if (value61 === null || value61 === undefined) {
                    valueResult57 = undefined;
                }
                else {
                    const value62 = value61.classList;
                    const value63 = value62.remove;
                    valueResult57 = value63.call(value62, "is-switching");
                }
            }
            // 开屏结束前，等待页面当前已经生成的图片完成加载或明确失败
            function waitForPageReady() {
                if (pageReadyPromise) {
                    return pageReadyPromise;
                }
                let valueResult59;
                const items65 = [];
                const part66 = Array.from((document.querySelectorAll("#openingLoader img, main img") as NodeListOf<HTMLImageElement>));
                for (let index67 = 0; index67 < part66.length; index67++) {
                    items65.push(part66[index67]);
                }
                valueResult59 = items65;
                const images = valueResult59;
                function prepareImage(image: HTMLImageElement): Promise<void> {
                    if (!image.getAttribute("src") || image.hidden) {
                        return Promise.resolve();
                    }
                    image.loading = "eager";
                    image.classList.remove("load-timeout");
                    return new Promise<void>(function waitForImage(resolve) {
                        let settled = false;
                        const timer = window.setTimeout(function markImageTimeout() {
                            if (settled) {
                                return;
                            }
                            settled = true;
                            image.classList.add("load-timeout");
                            resolve();
                        }, config.resourceReadyTimeoutMs);
                        const finish = function finishImage(success: boolean) {
                            if (settled) {
                                return;
                            }
                            settled = true;
                            window.clearTimeout(timer);
                            if (success && image.naturalWidth > 0) {
                                image.classList.add("loaded");
                            }
                            else {
                                image.classList.add("load-timeout");
                            }
                            resolve();
                        };
                        image.addEventListener("load", function () {
                            return finish(true);
                        }, { once: true });
                        image.addEventListener("error", function () {
                            return finish(false);
                        }, { once: true });
                        if (image.complete) {
                            finish(image.naturalWidth > 0);
                        }
                    });
                }
                let valueResult61;
                const items69 = images;
                const result72 = [];
                for (let index71 = 0; index71 < items69.length; index71++) {
                    result72.push(prepareImage(items69[index71]));
                }
                valueResult61 = result72;
                const imageReady = Promise.all(valueResult61);
                pageReadyPromise = Promise.all([imageReady, document.fonts.ready]).then(function allowFinalPaint() {
                    // 留出两个绘制帧，让刚准备好的图片有机会显示后再继续退场
                    return new Promise(function waitForPaint(resolve) {
                        window.requestAnimationFrame(function nextFrame() {
                            window.requestAnimationFrame(resolve);
                        });
                    });
                });
                return pageReadyPromise;
            }
            // 将进度分为受力、开裂、碎裂和展卷几个阶段，统一控制各部分的显示
            function updateVisuals(value) {
                if (!loader) {
                    return;
                }
                const progress = Math.max(0, Math.min(100, value));
                if (status) {
                    let visualStage = config.stages[0];
                    if (progress >= 99.5) {
                        visualStage = config.stages[3];
                    }
                    else {
                        if (progress >= 45) {
                            visualStage = config.stages[2];
                        }
                        else {
                            if (progress >= 25) {
                                visualStage = config.stages[1];
                            }
                        }
                    }
                    status.textContent = visualStage.text;
                }
                if (progressBar) {
                    progressBar.style.width = ("" + (progress) + "%");
                }
                if (progressPercent) {
                    progressPercent.textContent = ("" + (Math.round(progress)) + "%");
                }
                if (cord) {
                    cord.classList.toggle("cord-snapped", progress >= 55);
                }
                if (progress >= 80 && particleEngine && !particlesPlayed) {
                    let valueResult63;
                    if (window.innerWidth < config.mobileBreakpoint) {
                        valueResult63 = config.debrisCount.mobileBurst;
                    }
                    else {
                        valueResult63 = config.debrisCount.finalBurst;
                    }
                    particleEngine.createDebris(valueResult63, true);
                    particlesPlayed = true;
                }
                if (progress < 25) {
                    if (paperContainer) {
                        paperContainer.style.width = "0px";
                    }
                    if (rollerLeft) {
                        rollerLeft.style.transform = "translateX(0px)";
                    }
                    if (rollerRight) {
                        rollerRight.style.transform = "translateX(0px)";
                    }
                    if (cracks) {
                        cracks.style.opacity = "0";
                    }
                    if (seal) {
                        seal.classList.remove("shaking");
                    }
                }
                else {
                    if (progress < 55) {
                        const crackRatio = (progress - 25) / 30;
                        if (cracks) {
                            cracks.style.opacity = ("" + (Math.min(1, crackRatio * 1.4)));
                            const items75 = crackPaths;
                            for (let index77 = 0; index77 < items75.length; index77++) {
                                {
                                    const path = items75[index77];
                                    const branch = Number(path.dataset.branch);
                                    let valueResult69;
                                    {
                                        if (branch < 4) {
                                            valueResult69 = branch * 0.1;
                                        }
                                        else {
                                            valueResult69 = 0.5 + (branch - 4) * 0.08;
                                        }
                                        const growth = Math.max(0, Math.min(1, crackRatio * 1.6 - valueResult69));
                                        path.style.strokeDashoffset = ("" + (180 * (1 - growth)));
                                    }
                                }
                            }
                        }
                        let valueResult71;
                        const value81 = seal;
                        if (value81 === null || value81 === undefined) {
                            valueResult71 = undefined;
                        }
                        else {
                            const value82 = value81.classList;
                            const value83 = value82.add;
                            valueResult71 = value83.call(value82, "shaking");
                        }
                    }
                    else {
                        if (progress < 80) {
                            const expandRatio = (progress - 55) / 25;
                            if (cracks) {
                                cracks.style.opacity = "1";
                            }
                            const items85 = crackPaths;
                            for (let index87 = 0; index87 < items85.length; index87++) {
                                {
                                    const path = items85[index87];
                                    path.style.strokeDashoffset = "0";
                                }
                            }
                            if (seal) {
                                seal.classList.add("shaking");
                                seal.classList.add("is-straining");
                                seal.style.transform = "none";
                            }
                            let valueResult77;
                            if (window.innerWidth < config.mobileBreakpoint) {
                                valueResult77 = config.earlyExpandHalfWidth.mobile;
                            }
                            else {
                                valueResult77 = config.earlyExpandHalfWidth.desktop;
                            }
                            const maxHalfWidth = valueResult77;
                            const currentHalf = maxHalfWidth * expandRatio * config.earlyExpandRatio;
                            if (paperContainer) {
                                paperContainer.style.width = ("" + (currentHalf * 2) + "px");
                            }
                            if (rollerLeft) {
                                rollerLeft.style.transform = ("translateX(-" + (currentHalf) + "px)");
                            }
                            if (rollerRight) {
                                rollerRight.style.transform = ("translateX(" + (currentHalf) + "px)");
                            }
                        }
                        else {
                            const openRatio = (progress - 80) / 20;
                            if (seal) {
                                seal.classList.remove("shaking", "is-straining");
                                seal.style.opacity = "0";
                                seal.style.transform = "none";
                            }
                            if (!fragmentsStarted) {
                                releaseFragments();
                                fragmentsStarted = true;
                            }
                            if (!cachedPaperWidth && paper) {
                                cachedPaperWidth = paper.getBoundingClientRect().width || 704;
                            }
                            const paperWidth = cachedPaperWidth || 704;
                            let valueResult79;
                            if (window.innerWidth < config.mobileBreakpoint) {
                                valueResult79 = config.finalWidthRatio.mobile;
                            }
                            else {
                                valueResult79 = config.finalWidthRatio.desktop;
                            }
                            const widthRatio = valueResult79;
                            const targetFullWidth = Math.min(Math.max(window.innerWidth * widthRatio, paperWidth), paperWidth + config.finalExtraWidth);
                            const currentWidth = targetFullWidth * 0.35 + targetFullWidth * 0.65 * openRatio;
                            if (paperContainer) {
                                paperContainer.style.width = ("" + (currentWidth) + "px");
                            }
                            if (rollerLeft) {
                                rollerLeft.style.transform = ("translateX(-" + (currentWidth / 2) + "px)");
                            }
                            if (rollerRight) {
                                rollerRight.style.transform = ("translateX(" + (currentWidth / 2) + "px)");
                            }
                            if (openRatio > config.contentRevealRatio) {
                                let valueResult81;
                                const value92 = content;
                                if (value92 === null || value92 === undefined) {
                                    valueResult81 = undefined;
                                }
                                else {
                                    const value93 = value92.classList;
                                    const value94 = value93.add;
                                    valueResult81 = value94.call(value93, "is-visible");
                                }
                            }
                        }
                    }
                }
            }
            // 每帧向目标进度靠近一点，避免进度条突然跳到下一阶段
            function tickProgress() {
                if (!loader) {
                    return;
                }
                if (Math.abs(targetProgress - currentProgress) > config.progressStopThreshold) {
                    currentProgress += (targetProgress - currentProgress) * config.progressEase;
                    updateVisuals(currentProgress);
                }
                if (Math.abs(targetProgress - currentProgress) > config.progressStopThreshold || particles.length) {
                    progressFrame = requestAnimationFrame(tickProgress);
                }
                else {
                    progressFrame = null;
                }
            }
            function wakeProgress() {
                if (!progressFrame) {
                    progressFrame = requestAnimationFrame(tickProgress);
                }
            }
            // 启动开屏，关闭动画或加载超时时移除遮罩
            function start() {
                if (!loader) {
                    return;
                }
                if (!animationEnabled) {
                    loader.remove();
                    return;
                }
                let valueResult83;
                const value96 = window.NiyunSealGlyphs;
                if (value96 === null || value96 === undefined) {
                    valueResult83 = undefined;
                }
                else {
                    const value97 = value96.render;
                    valueResult83 = value97.call(value96, (loader.querySelector(".seal-inscription") as SVGGElement));
                }
                // 数据请求结束后，继续等待页面图片就绪
                fallbackTimer = null;
                particleEngine = initParticles();
                prepareFracture();
                wakeProgress();
                startDidYouKnow();
                stageIndex = 0;
                particlesPlayed = false;
                fragmentsStarted = false;
                status.textContent = config.stages[stageIndex].text;
                targetProgress = config.stages[stageIndex].progress;
                intervalTimer = window.setInterval(function advanceOpeningStage() {
                    if (stageIndex < config.stages.length - 2) {
                        stageIndex += 1;
                        targetProgress = config.stages[stageIndex].progress;
                        wakeProgress();
                    }
                }, config.stageIntervalMs);
            }
            // 资料就绪后播完碎裂和展卷，再清理动画帧并移除遮罩
            async function finishWhenReady(success) {
                let valueResult85;
                const value99 = loader;
                if (value99 === null || value99 === undefined) {
                    valueResult85 = undefined;
                }
                else {
                    valueResult85 = value99.isConnected;
                }
                if (!valueResult85 || loader.classList.contains("is-closing")) {
                    return;
                }
                if (fallbackTimer) {
                    window.clearTimeout(fallbackTimer);
                }
                await waitForPageReady();
                if (!cachedPaperWidth && paper) {
                    cachedPaperWidth = paper.getBoundingClientRect().width || 704;
                }
                // 等裂纹阶段播放完成后再退场
                await new Promise<void>(function waitForCracks(resolve) {
                    // 进度取整后判断阶段是否完成
                    function checkCrackProgress() {
                        if (!loader.isConnected || currentProgress >= 53.5) {
                            resolve();
                            return;
                        }
                        window.requestAnimationFrame(checkCrackProgress);
                    }
                    checkCrackProgress();
                });
                if (intervalTimer) {
                    window.clearInterval(intervalTimer);
                }
                if (config.preBreakHoldMs > 0) {
                    await new Promise(function (resolve) {
                        return window.setTimeout(resolve, config.preBreakHoldMs);
                    });
                }
                let valueResult87;
                const value101 = loader;
                if (value101 === null || value101 === undefined) {
                    valueResult87 = undefined;
                }
                else {
                    valueResult87 = value101.isConnected;
                }
                if (!valueResult87 || loader.classList.contains("is-closing")) {
                    return;
                }
                stageIndex = config.stages.length - 1;
                if (!success) {
                    status.textContent = "展厅已打开，部分资料稍后加载";
                }
                targetProgress = 100;
                wakeProgress();
                await new Promise<void>(function waitForFinalProgress(resolve) {
                    const startedAt = performance.now();
                    const waitForProgress = function waitForProgress(timestamp) {
                        let valueResult89;
                        const value103 = loader;
                        if (value103 === null || value103 === undefined) {
                            valueResult89 = undefined;
                        }
                        else {
                            valueResult89 = value103.isConnected;
                        }
                        if (!valueResult89 || currentProgress >= 99.5) {
                            return resolve();
                        }
                        if (timestamp - startedAt > 1800) {
                            currentProgress = 100;
                            updateVisuals(100);
                            return resolve();
                        }
                        window.requestAnimationFrame(waitForProgress);
                    };
                    window.requestAnimationFrame(waitForProgress);
                });
                await new Promise(function (resolve) {
                    return window.setTimeout(resolve, config.completedHoldMs);
                });
                let valueResult91;
                const value105 = loader;
                if (value105 === null || value105 === undefined) {
                    valueResult91 = undefined;
                }
                else {
                    valueResult91 = value105.isConnected;
                }
                if (!valueResult91 || loader.classList.contains("is-closing")) {
                    return;
                }
                stopDidYouKnow();
                loader.classList.add("is-closing");
                removeTimer = window.setTimeout(function disposeOpeningLayer() {
                    if (particleFrame) {
                        cancelAnimationFrame(particleFrame);
                    }
                    if (progressFrame) {
                        cancelAnimationFrame(progressFrame);
                    }
                    loader.remove();
                    removeTimer = null;
                }, config.removeDelayMs);
            }
            // 正常完成和加载超时共用一次退场流程
            function finish(success?) {
                if (success === undefined) {
                    success = true;
                }
                let valueResult93;
                const value107 = loader;
                if (value107 === null || value107 === undefined) {
                    valueResult93 = undefined;
                }
                else {
                    valueResult93 = value107.isConnected;
                }
                if (!valueResult93 || loader.classList.contains("is-closing")) {
                    return;
                }
                if (finishPromise) {
                    return finishPromise;
                }
                finishPromise = finishWhenReady(success);
                return finishPromise;
            }
            // 暂时让出执行时间，让浏览器先画一帧，避免连续生成内容时卡住动画
            function yieldToBrowser() {
                return new Promise<void>(function scheduleBrowserYield(resolve) {
                    let conditionValue97 = "scheduler" in window;
                    if (conditionValue97) {
                        let valueResult95;
                        const value109 = window.scheduler;
                        if (value109 === null || value109 === undefined) {
                            valueResult95 = undefined;
                        }
                        else {
                            valueResult95 = value109.postTask;
                        }
                        conditionValue97 = typeof valueResult95 === "function";
                    }
                    if (conditionValue97) {
                        window.scheduler.postTask(resolve, { priority: "user-visible" });
                        return;
                    }
                    window.requestAnimationFrame(function () {
                        return window.setTimeout(resolve, 0);
                    });
                });
            }
            return { start: start, finish: finish, yieldToBrowser: yieldToBrowser };
        },
    };
})();
window.NiyunOpeningLoader = NiyunOpeningLoader;
