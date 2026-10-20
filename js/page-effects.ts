const NiyunPageEffects = (function registerPageEffects() {
    "use strict";
    return {
        create(dependencies: EffectsDependencies) {
            const source1 = dependencies;
            const findElement = source1.findElement;
            const findElements = source1.findElements;
            const prefersReducedMotion = source1.prefersReducedMotion;
            const getSettings = source1.getSettings;
            const visualEffects = source1.visualEffects;
            const motionSettingRanges = source1.motionSettingRanges;
            function init() {
                const pageScrollTrack = (document.querySelector("#pageScrollTrack") as HTMLElement);
                const pageProgressBar = (document.querySelector("#pageProgressBar") as HTMLElement);
                let scrollTicking = false;
                const revealItems = (Array.from(document.querySelectorAll('[data-reveal]')) as HTMLElement[]);
                if ("IntersectionObserver" in window) {
                    const revealObserver = new IntersectionObserver(function updateRevealedSections(entries) {
                        const items2 = entries;
                        for (let index4 = 0; index4 < items2.length; index4++) {
                            {
                                const entry = items2[index4];
                                entry.target.classList.toggle("is-visible", entry.isIntersecting);
                            }
                        }
                    }, {
                        threshold: 0.06,
                        rootMargin: "-8% 0px -8% 0px",
                    });
                    const items7 = revealItems;
                    for (let index9 = 0; index9 < items7.length; index9++) {
                        {
                            const item = items7[index9];
                            revealObserver.observe(item);
                        }
                    }
                }
                else {
                    const items12 = revealItems;
                    for (let index14 = 0; index14 < items12.length; index14++) {
                        {
                            const item = items12[index14];
                            item.classList.add("is-visible");
                        }
                    }
                }
                const getPageScrollRange = function getPageScrollRange() {
                    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
                };
                const updatePageScrollPosition = function updatePageScrollPosition(percent) {
                    const clamped = Math.min(100, Math.max(0, percent));
                    window.scrollTo({ top: (getPageScrollRange() * clamped) / 100, behavior: "auto" });
                };
                const updateFromPointer = function updateFromPointer(event) {
                    if (!pageScrollTrack) {
                        return;
                    }
                    const bounds = pageScrollTrack.getBoundingClientRect();
                    let valueResult13;
                    if (bounds.width > 0) {
                        valueResult13 = ((event.clientX - bounds.left) / bounds.width) * 100;
                    }
                    else {
                        valueResult13 = 0;
                    }
                    updatePageScrollPosition(valueResult13);
                };
                if (pageScrollTrack) {
                    pageScrollTrack.addEventListener("pointerdown", function handlePointerdown(event) {
                        if (event.button !== 0) {
                            return;
                        }
                        pageScrollTrack.setPointerCapture(event.pointerId);
                        pageScrollTrack.classList.add("is-dragging");
                        document.documentElement.classList.add("is-page-scrubbing");
                        updateFromPointer(event);
                    });
                    pageScrollTrack.addEventListener("pointermove", function handlePointermove(event) {
                        if (pageScrollTrack.hasPointerCapture(event.pointerId)) {
                            updateFromPointer(event);
                        }
                    });
                    const stopDrag = function stopDrag(event) {
                        if (pageScrollTrack.hasPointerCapture(event.pointerId)) {
                            pageScrollTrack.releasePointerCapture(event.pointerId);
                        }
                        pageScrollTrack.classList.remove("is-dragging");
                        document.documentElement.classList.remove("is-page-scrubbing");
                    };
                    pageScrollTrack.addEventListener("pointerup", stopDrag);
                    pageScrollTrack.addEventListener("pointercancel", stopDrag);
                    pageScrollTrack.addEventListener("keydown", function handleKeydown(event) {
                        let valueResult15;
                        if (getPageScrollRange() > 0) {
                            valueResult15 = (window.scrollY / getPageScrollRange()) * 100;
                        }
                        else {
                            valueResult15 = 0;
                        }
                        const current = valueResult15;
                        const steps = {
                            ArrowLeft: -2,
                            ArrowDown: -2,
                            ArrowRight: 2,
                            ArrowUp: 2,
                            PageUp: -10,
                            PageDown: 10,
                        };
                        if (event.key === "Home" || event.key === "End") {
                            event.preventDefault();
                            let valueResult17;
                            if (event.key === "Home") {
                                valueResult17 = 0;
                            }
                            else {
                                valueResult17 = 100;
                            }
                            updatePageScrollPosition(valueResult17);
                        }
                        else {
                            if (Object.hasOwn(steps, event.key)) {
                                event.preventDefault();
                                updatePageScrollPosition(current + steps[event.key]);
                            }
                        }
                    });
                }
                window.addEventListener("scroll", function handleScroll() {
                    if (scrollTicking) {
                        return;
                    }
                    window.requestAnimationFrame(function renderScrollEffects() {
                        const scrollTop = window.scrollY;
                        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                        let valueResult19;
                        if (docHeight > 0) {
                            valueResult19 = (scrollTop / docHeight) * 100;
                        }
                        else {
                            valueResult19 = 0;
                        }
                        const percent = valueResult19;
                        if (pageProgressBar) {
                            const clamped = Math.min(100, Math.max(0, percent));
                            pageProgressBar.style.width = ("" + (clamped) + "%");
                            let valueResult21;
                            const value21 = pageScrollTrack;
                            if (value21 === null || value21 === undefined) {
                                valueResult21 = undefined;
                            }
                            else {
                                const value22 = value21.setAttribute;
                                valueResult21 = value22.call(value21, "aria-valuenow", String(Math.round(clamped)));
                            }
                            let valueResult23;
                            const value24 = pageScrollTrack;
                            if (value24 === null || value24 === undefined) {
                                valueResult23 = undefined;
                            }
                            else {
                                const value25 = value24.setAttribute;
                                let valueResult25;
                                if (clamped <= 0) {
                                    valueResult25 = "页面顶部";
                                }
                                else {
                                    let valueResult27;
                                    if (clamped >= 100) {
                                        valueResult27 = "页面底部";
                                    }
                                    else {
                                        valueResult27 = ("页面 " + (Math.round(clamped)) + "%");
                                    }
                                    valueResult25 = valueResult27;
                                }
                                valueResult23 = value25.call(value24, "aria-valuetext", valueResult25);
                            }
                        }
                        // 只在下一帧统一处理滚动，避免拖动页面时重复触发布局和绘制
                        if (!prefersReducedMotion()) {
                            const shift = Math.min(scrollTop, window.innerHeight) / window.innerHeight;
                            const settings = getSettings();
                            const items29 = (Array.from(document.querySelectorAll("[data-parallax]")) as HTMLElement[]);
                            for (let index31 = 0; index31 < items29.length; index31++) {
                                {
                                    const item = items29[index31];
                                    item.style.setProperty("--parallax-y", ("" + (shift * Number(item.dataset.parallax || 0) * (settings.motionIntensity / motionSettingRanges.pageMotion.max)) + "px"));
                                }
                            }
                        }
                        scrollTicking = false;
                    });
                    scrollTicking = true;
                }, { passive: true });
                window.dispatchEvent(new Event("scroll"));
                document.addEventListener("click", function handleClick(event) {
                    let valueResult33;
                    if (event.target instanceof Element) {
                        valueResult33 = ((event.target as HTMLElement).closest(".button, .filter-chip, .search-row button, .chat-form button, .scroll-story-controls button, .course-scroll-controls button, .quick-prompts button, .source-index-more") as HTMLElement);
                    }
                    else {
                        valueResult33 = null;
                    }
                    const target = valueResult33;
                    if (!target) {
                        return;
                    }
                    const rect = target.getBoundingClientRect();
                    const ripple = document.createElement("span");
                    ripple.className = "stamp-ripple";
                    const size = Math.max(rect.width, rect.height);
                    ripple.style.width = ripple.style.height = ("" + (size) + "px");
                    ripple.style.left = ("" + (event.clientX - rect.left - size / 2) + "px");
                    ripple.style.top = ("" + (event.clientY - rect.top - size / 2) + "px");
                    target.appendChild(ripple);
                    window.setTimeout(function () {
                        return ripple.remove();
                    }, visualEffects.rippleLifetime);
                });
                document.addEventListener("pointerdown", function handlePointerdown(event) {
                    let conditionValue37 = event.target instanceof Element;
                    if (conditionValue37) {
                        let valueResult35;
                        const value35 = ((event.target as HTMLElement).closest(".course-scroll-controls button") as HTMLButtonElement);
                        if (value35 === null || value35 === undefined) {
                            valueResult35 = undefined;
                        }
                        else {
                            const value36 = value35.classList;
                            const value37 = value36.add;
                            valueResult35 = value37.call(value36, "is-pressing");
                        }
                        conditionValue37 = valueResult35;
                    }
                    return (conditionValue37);
                });
                const items39 = ["pointerup", "pointercancel", "pointerleave"];
                for (let index41 = 0; index41 < items39.length; index41++) {
                    {
                        const name = items39[index41];
                        document.addEventListener(name, function (event) {
                            let conditionValue44 = event.target instanceof Element;
                            if (conditionValue44) {
                                let valueResult42;
                                const value43 = ((event.target as HTMLElement).closest(".course-scroll-controls button") as HTMLButtonElement);
                                if (value43 === null || value43 === undefined) {
                                    valueResult42 = undefined;
                                }
                                else {
                                    const value44 = value43.classList;
                                    const value45 = value44.remove;
                                    valueResult42 = value45.call(value44, "is-pressing");
                                }
                                conditionValue44 = valueResult42;
                            }
                            return conditionValue44;
                        });
                    }
                }
                if (window.matchMedia("(pointer: fine)").matches) {
                    const cardSelector = [
                        ".relic-card",
                        ".story-card",
                        ".knowledge-functions article",
                        ".story-details article",
                        ".course-list button",
                        ".source-findings article",
                        ".source-index article",
                    ].join(", ");
                    document.addEventListener("mousemove", function handleMousemove(event) {
                        let valueResult45;
                        if (event.target instanceof Element) {
                            valueResult45 = event.target.closest(cardSelector) as HTMLElement;
                        }
                        else {
                            valueResult45 = null;
                        }
                        const card = valueResult45;
                        if (!card) {
                            return;
                        }
                        const settings = getSettings();
                        if (settings.tiltDegrees === 0) {
                            card.style.transform = "";
                            return;
                        }
                        const rect = card.getBoundingClientRect();
                        const rotateX = ((event.clientY - rect.top - rect.height / 2) / (rect.height / 2)) *
                            -visualEffects.cardTiltDegrees;
                        const rotateY = ((event.clientX - rect.left - rect.width / 2) / (rect.width / 2)) *
                            visualEffects.cardTiltDegrees;
                        card.style.transform = ("perspective(" + (visualEffects.cardPerspective) + "px) rotateX(" + (rotateX.toFixed(2)) + "deg) rotateY(" + (rotateY.toFixed(2)) + "deg) translateY(-" + (visualEffects.cardLift) + "px)");
                    });
                    document.addEventListener("mouseout", function handleMouseout(event) {
                        let valueResult47;
                        if (event.target instanceof Element) {
                            valueResult47 = event.target.closest(cardSelector) as HTMLElement;
                        }
                        else {
                            valueResult47 = null;
                        }
                        const card = valueResult47;
                        if (card && (!(event.relatedTarget instanceof Node) || !card.contains(event.relatedTarget))) {
                            card.style.transform = "";
                        }
                    });
                }
                const canvas = (document.querySelector("#ambientCanvas") as HTMLCanvasElement);
                if (canvas) {
                    const context = canvas.getContext("2d");
                    let width = (canvas.width = window.innerWidth);
                    let height = (canvas.height = window.innerHeight);
                    window.addEventListener("resize", function handleResize() {
                        width = canvas.width = window.innerWidth;
                        height = canvas.height = window.innerHeight;
                    });
                    const particles = Array.from({ length: visualEffects.dustMaxParticles }, function () {
                        let valueResult49;
                        if (Math.random() < visualEffects.dustPrimaryRatio) {
                            valueResult49 = visualEffects.dustPrimaryColor;
                        }
                        else {
                            valueResult49 = visualEffects.dustAccentColor;
                        }
                        return ({
                            x: Math.random() * width,
                            y: Math.random() * height,
                            size: Math.random() * visualEffects.dustSizeRange + visualEffects.dustSizeMin,
                            speedX: (Math.random() - 0.5) * visualEffects.dustHorizontalSpeed,
                            speedY: Math.random() * visualEffects.dustVerticalSpeedRange + visualEffects.dustVerticalSpeedMin,
                            opacity: Math.random() * visualEffects.dustOpacityRange + visualEffects.dustOpacityMin,
                            color: valueResult49,
                        });
                    });
                    let frameId = 0;
                    let lastTime = 0;
                    let visible = true;
                    const animateDust = function animateDust(timestamp?) {
                        if (timestamp === undefined) {
                            timestamp = 0;
                        }
                        if (document.hidden || !visible) {
                            frameId = 0;
                            return;
                        }
                        if (timestamp - lastTime < visualEffects.dustFrameIntervalMs) {
                            frameId = requestAnimationFrame(animateDust);
                            return;
                        }
                        let valueResult51;
                        if (lastTime) {
                            valueResult51 = Math.min(2, Math.max(0, (timestamp - lastTime) / visualEffects.dustFrameIntervalMs));
                        }
                        else {
                            valueResult51 = 1;
                        }
                        const frameFactor = valueResult51;
                        lastTime = timestamp;
                        context.clearRect(0, 0, width, height);
                        const settings = getSettings();
                        for (let index = 0; index < Math.min(particles.length, settings.dustQuantity); index += 1) {
                            const particle = particles[index];
                            const speed = visualEffects.dustBaseSpeedScale * visualEffects.dustSpeedScale * frameFactor;
                            particle.x += particle.speedX * speed;
                            particle.y += particle.speedY * speed;
                            if (particle.y > height) {
                                particle.y = -5;
                                particle.x = Math.random() * width;
                            }
                            if (particle.x > width) {
                                particle.x = 0;
                            }
                            if (particle.x < 0) {
                                particle.x = width;
                            }
                            context.fillStyle = ("rgba(" + (particle.color) + ", " + (particle.opacity) + ")");
                            context.beginPath();
                            context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                            context.fill();
                        }
                        frameId = requestAnimationFrame(animateDust);
                    };
                    new IntersectionObserver(function updateDustVisibility(options52) {
                        const source53 = options52;
                        const entry = source53[0];
                        visible = entry.isIntersecting;
                        if (visible && !document.hidden && !frameId) {
                            frameId = requestAnimationFrame(animateDust);
                        }
                    }, { threshold: 0.01 }).observe(canvas);
                    document.addEventListener("visibilitychange", function handleVisibilitychange() {
                        if (document.hidden && frameId) {
                            cancelAnimationFrame(frameId);
                            frameId = 0;
                        }
                        else {
                            if (!document.hidden && visible && !frameId) {
                                frameId = requestAnimationFrame(animateDust);
                            }
                        }
                    });
                    frameId = requestAnimationFrame(animateDust);
                }
                // 浏览器负责懒加载；捕获 load 事件也能处理之后插入的课件图片
                document.addEventListener("load", function handleLoad(event) {
                    if (event.target instanceof HTMLImageElement) {
                        (event.target as HTMLElement).classList.add("loaded");
                    }
                }, true);
                const items54 = (Array.from(document.querySelectorAll('img[loading="lazy"]')) as HTMLImageElement[]);
                for (let index56 = 0; index56 < items54.length; index56++) {
                    {
                        const image = items54[index56];
                        if (image.complete) {
                            image.classList.add("loaded");
                        }
                    }
                }
                const heroVisualArea = (document.querySelector("#heroVisualArea") as HTMLElement);
                if (heroVisualArea) {
                    const mascotFigure = (document.querySelector("#heroMascotFigure") as HTMLElement);
                    const mascotSpeech = (document.querySelector("#heroMascotSpeech") as HTMLElement);
                    const compassOuter = (heroVisualArea.querySelector(".compass-outer-ring") as HTMLElement);
                    const greetings = [
                        "你好，我是印小灵。我们一起看看两千年前的封泥吧。",
                        "临淄、琅琊等地出土了不少封泥，我们可以从一块封泥讲起。",
                        "今天想了解哪一方齐鲁封泥？你可以到下面的 AI 导览中问我。",
                    ];
                    let greetingIndex = 0;
                    let frameId = null;
                    let targetX = 0;
                    let targetY = 0;
                    let currentX = 0;
                    let currentY = 0;
                    const updateParallax = function updateParallax() {
                        currentX += (targetX - currentX) * 0.1;
                        currentY += (targetY - currentY) * 0.1;
                        if (compassOuter) {
                            compassOuter.style.transform = ("translate3d(" + (currentX * -15) + "px, " + (currentY * -15) + "px, 0)");
                        }
                        if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.001) {
                            frameId = requestAnimationFrame(updateParallax);
                        }
                        else {
                            frameId = null;
                        }
                    };
                    heroVisualArea.addEventListener("mousemove", function handleMousemove(event) {
                        if (prefersReducedMotion()) {
                            return;
                        }
                        const rect = heroVisualArea.getBoundingClientRect();
                        targetX = (event.clientX - rect.left) / rect.width - 0.5;
                        targetY = (event.clientY - rect.top) / rect.height - 0.5;
                        if (!frameId) {
                            frameId = requestAnimationFrame(updateParallax);
                        }
                    });
                    heroVisualArea.addEventListener("mouseleave", function handleMouseleave() {
                        targetX = 0;
                        targetY = 0;
                        if (!frameId) {
                            frameId = requestAnimationFrame(updateParallax);
                        }
                    });
                    let valueResult57;
                    const value59 = mascotFigure;
                    if (value59 === null || value59 === undefined) {
                        valueResult57 = undefined;
                    }
                    else {
                        const value60 = value59.addEventListener;
                        valueResult57 = value60.call(value59, "click", function handleClick() {
                            if (!mascotSpeech) {
                                return;
                            }
                            greetingIndex = (greetingIndex + 1) % greetings.length;
                            const text = (mascotSpeech.querySelector("span") as HTMLElement);
                            if (text) {
                                text.textContent = greetings[greetingIndex];
                            }
                            mascotSpeech.style.opacity = "1";
                            mascotSpeech.style.transform = "translateY(0) scale(1)";
                        });
                    }
                }
            }
            return { init: init };
        },
    };
})();
window.NiyunPageEffects = NiyunPageEffects;
