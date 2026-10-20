const NiyunScrollStory = (function registerScrollStory() {
    "use strict";
    return {
        create(dependencies: PageHelpers) {
            const source1 = dependencies;
            const findElement = source1.findElement;
            const findElements = source1.findElements;
            const escapeHtml = source1.escapeHtml;
            const prefersReducedMotion = source1.prefersReducedMotion;
            function init() {
                const viewport = (document.querySelector("#scrollViewport") as HTMLElement);
                if (!viewport) {
                    return;
                }
                const track = (document.querySelector("#scrollTrack") as HTMLElement);
                const panels = (Array.from(viewport.querySelectorAll(".scroll-panel")) as HTMLElement[]);
                const previous = (document.querySelector("#scrollPrev") as HTMLButtonElement);
                const next = (document.querySelector("#scrollNext") as HTMLButtonElement);
                const progress = (document.querySelector("#scrollProgress") as HTMLElement);
                const status = (document.querySelector("#scrollStatus") as HTMLElement);
                const items2 = (Array.from(viewport.querySelectorAll("[data-scroll-image]")) as HTMLElement[]);
                for (let index4 = 0; index4 < items2.length; index4++) {
                    {
                        const illustration = items2[index4];
                        let valueResult5;
                        {
                            const value6 = illustration.dataset.scrollImage;
                            if (value6 === null || value6 === undefined) {
                                valueResult5 = undefined;
                            }
                            else {
                                const value7 = value6.trim;
                                valueResult5 = value7.call(value6);
                            }
                            const imagePath = valueResult5;
                            if (!imagePath) {
                                undefined;
                            }
                            else {
                                const image = document.createElement("img");
                                image.className = "scroll-custom-image";
                                image.alt = illustration.getAttribute("aria-label") || "数字手卷配图";
                                image.draggable = false;
                                // 手卷图片属于首个可见内容，开屏结束前必须完成加载或明确失败
                                image.loading = "eager";
                                image.decoding = "async";
                                image.src = imagePath;
                                image.addEventListener("load", function handleLoad() {
                                    image.classList.add("loaded");
                                    illustration.classList.add("has-custom-image");
                                }, { once: true });
                                image.addEventListener("error", function handleError() {
                                    return image.remove();
                                }, { once: true });
                                illustration.prepend(image);
                            }
                        }
                    }
                }
                let dragging = false;
                let dragStart = 0;
                let scrollStart = 0;
                let chapterStops: number[] = [];
                // 重新记录各幕的位置，窗口大小改变后翻页仍能准确停靠
                function refreshChapterStops() {
                    const firstPanel = panels[0];
                    const lastPanel = panels[panels.length - 1];
                    track.style.paddingInlineStart = ("" + (Math.max(0, (viewport.clientWidth - firstPanel.offsetWidth) / 2)) + "px");
                    track.style.paddingInlineEnd = ("" + (Math.max(0, (viewport.clientWidth - lastPanel.offsetWidth) / 2)) + "px");
                    const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
                    const viewportRect = viewport.getBoundingClientRect();
                    let valueResult7;
                    const items10 = panels;
                    const result13 = [];
                    for (let index12 = 0; index12 < items10.length; index12++) {
                        let valueResult9;
                        {
                            const panel = items10[index12];
                            const panelRect = panel.getBoundingClientRect();
                            const panelStart = panelRect.left - viewportRect.left + viewport.scrollLeft;
                            const centered = panelStart - (viewport.clientWidth - panelRect.width) / 2;
                            valueResult9 = Math.max(0, Math.min(centered, max));
                        }
                        result13.push(valueResult9);
                    }
                    valueResult7 = result13;
                    chapterStops = valueResult7;
                }
                // 根据滚动位置同步章节和进度
                function updateStory() {
                    const max = Math.max(1, viewport.scrollWidth - viewport.clientWidth);
                    const ratio = Math.min(1, viewport.scrollLeft / max);
                    progress.style.transform = ("scaleX(" + (Math.max(0.02, ratio)) + ")");
                    const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
                    let valueResult11;
                    const items15 = panels;
                    let result18 = 0;
                    for (let index17 = 0; index17 < items15.length; index17++) {
                        let valueResult13;
                        {
                            const closest = result18;
                            const panel = items15[index17];
                            const index = index17;
                            const panelCenter = panel.offsetLeft + panel.offsetWidth / 2;
                            const closestCenter = panels[closest].offsetLeft + panels[closest].offsetWidth / 2;
                            let valueResult15;
                            if (Math.abs(panelCenter - viewportCenter) < Math.abs(closestCenter - viewportCenter)) {
                                valueResult15 = index;
                            }
                            else {
                                valueResult15 = closest;
                            }
                            valueResult13 = valueResult15;
                        }
                        result18 = valueResult13;
                    }
                    valueResult11 = result18;
                    const activeIndex = valueResult11;
                    status.innerHTML = ("<span>" + (escapeHtml(panels[activeIndex].dataset.scrollTitle || "展卷")) + "</span><b>" + (String(activeIndex + 1).padStart(2, "0")) + " / " + (String(panels.length).padStart(2, "0")) + "</b>");
                    const items21 = panels;
                    for (let index23 = 0; index23 < items21.length; index23++) {
                        {
                            const panel = items21[index23];
                            const index = index23;
                            panel.toggleAttribute("data-current", index === activeIndex);
                        }
                    }
                    previous.disabled = viewport.scrollLeft <= 1;
                    next.disabled = viewport.scrollLeft >= max - 1;
                }
                function moveToChapter(direction: number) {
                    const tolerance = 4;
                    const current = viewport.scrollLeft;
                    let valueResult21;
                    if (direction > 0) {
                        let valueResult23;
                        {
                            let searchFinished24 = false;
                            const items27 = chapterStops;
                            for (let index29 = 0; !searchFinished24 && index29 < items27.length; index29++) {
                                let valueResult25;
                                {
                                    const stop = items27[index29];
                                    valueResult25 = stop > current + tolerance;
                                }
                                if (valueResult25) {
                                    valueResult23 = items27[index29];
                                    searchFinished24 = true;
                                }
                            }
                            if (!searchFinished24) {
                                valueResult23 = undefined;
                                searchFinished24 = true;
                            }
                            valueResult21 = valueResult23;
                        }
                    }
                    else {
                        let valueResult27;
                        {
                            let searchFinished28 = false;
                            let valueResult29;
                            const items36 = [];
                            const part37 = Array.from(chapterStops);
                            for (let index38 = 0; index38 < part37.length; index38++) {
                                items36.push(part37[index38]);
                            }
                            valueResult29 = items36;
                            const items32 = valueResult29.reverse();
                            for (let index34 = 0; !searchFinished28 && index34 < items32.length; index34++) {
                                let valueResult31;
                                {
                                    const stop = items32[index34];
                                    valueResult31 = stop < current - tolerance;
                                }
                                if (valueResult31) {
                                    valueResult27 = items32[index34];
                                    searchFinished28 = true;
                                }
                            }
                            if (!searchFinished28) {
                                valueResult27 = undefined;
                                searchFinished28 = true;
                            }
                            valueResult21 = valueResult27;
                        }
                    }
                    const target = valueResult21;
                    if (target !== undefined) {
                        let valueResult33;
                        if (prefersReducedMotion()) {
                            valueResult33 = "auto";
                        }
                        else {
                            valueResult33 = "smooth";
                        }
                        viewport.scrollTo({ left: target, behavior: valueResult33 });
                    }
                }
                function moveToEdge(edge: string) {
                    let valueResult35;
                    if (edge === "start") {
                        valueResult35 = 0;
                    }
                    else {
                        valueResult35 = viewport.scrollWidth;
                    }
                    let valueResult37;
                    if (prefersReducedMotion()) {
                        valueResult37 = "auto";
                    }
                    else {
                        valueResult37 = "smooth";
                    }
                    viewport.scrollTo({
                        left: valueResult35,
                        behavior: valueResult37,
                    });
                }
                previous.addEventListener("click", function handleClick() {
                    return moveToChapter(-1);
                });
                next.addEventListener("click", function handleClick() {
                    return moveToChapter(1);
                });
                viewport.addEventListener("scroll", updateStory, { passive: true });
                viewport.addEventListener("keydown", function handleKeydown(event) {
                    if (event.key === "ArrowLeft") {
                        event.preventDefault();
                        moveToChapter(-1);
                    }
                    if (event.key === "ArrowRight") {
                        event.preventDefault();
                        moveToChapter(1);
                    }
                    if (event.key === "Home") {
                        event.preventDefault();
                        moveToEdge("start");
                    }
                    if (event.key === "End") {
                        event.preventDefault();
                        moveToEdge("end");
                    }
                });
                viewport.addEventListener("wheel", function handleWheel(event) {
                    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
                        return;
                    }
                    const atStart = viewport.scrollLeft <= 0 && event.deltaY < 0;
                    const atEnd = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1 && event.deltaY > 0;
                    if (atStart || atEnd) {
                        return;
                    }
                    event.preventDefault();
                    viewport.scrollLeft += event.deltaY;
                }, { passive: false });
                viewport.addEventListener("pointerdown", function handlePointerdown(event) {
                    if (event.pointerType === "touch") {
                        return;
                    }
                    dragging = true;
                    dragStart = event.clientX;
                    scrollStart = viewport.scrollLeft;
                    viewport.setPointerCapture(event.pointerId);
                    viewport.classList.add("is-dragging");
                });
                viewport.addEventListener("pointermove", function handlePointermove(event) {
                    if (dragging) {
                        viewport.scrollLeft = scrollStart - (event.clientX - dragStart);
                    }
                });
                viewport.addEventListener("pointerup", function handlePointerup(event) {
                    dragging = false;
                    viewport.releasePointerCapture(event.pointerId);
                    viewport.classList.remove("is-dragging");
                });
                viewport.addEventListener("pointercancel", function handlePointercancel() {
                    dragging = false;
                    viewport.classList.remove("is-dragging");
                });
                window.addEventListener("resize", function handleResize() {
                    refreshChapterStops();
                    updateStory();
                });
                refreshChapterStops();
                updateStory();
            }
            return { init: init };
        },
    };
})();
window.NiyunScrollStory = NiyunScrollStory;
