const NiyunCourseBrowser = (function registerCourseBrowser() {
    "use strict";
    // 通过 window 注册课程模块，支持双击网页预览
    return {
        create(dependencies: CourseDependencies) {
            const source1 = dependencies;
            const findElement = source1.findElement;
            const findElements = source1.findElements;
            const escapeHtml = source1.escapeHtml;
            const safeResourceUrl = source1.safeResourceUrl;
            const prefersReducedMotion = source1.prefersReducedMotion;
            const mediaConfig = source1.mediaConfig;
            let courses: Course[] = [];
            let activeCourse: Course | null = null;
            let activeCourseSlideIndex = 0;
            const courseSlideMarkupCache = new Map<string, string>();
            const courseSlideCache = new Map<string, DocumentFragment>();
            const imageReadyCache = new WeakMap<HTMLImageElement, Promise<void>>();
            let requestedCourseId = "";
            let courseRenderRequest = 0;
            let courseSlideRequest = 0;
            // 有可用地址才显示下载入口，避免出现点了没有反应的按钮
            function configureCourseLink(link: HTMLAnchorElement, value: string, options?: {
                downloadName?: string;
                openInNewTab?: boolean;
            }) {
                if (options === undefined) {
                    options = {};
                }
                if (!link) {
                    return;
                }
                const resourceUrl = safeResourceUrl(value);
                link.hidden = !resourceUrl;
                if (!resourceUrl) {
                    link.removeAttribute("href");
                    return;
                }
                link.href = resourceUrl;
                if (options.downloadName) {
                    link.setAttribute("download", options.downloadName);
                }
                else {
                    link.removeAttribute("download");
                }
                if (options.openInNewTab) {
                    link.target = "_blank";
                    link.rel = "noopener";
                }
                else {
                    link.removeAttribute("target");
                    link.removeAttribute("rel");
                }
            }
            // 把配置中的教案和回顾视频接到页面上，资源地址集中在配置文件维护
            function configureCoursePackLinks() {
                let valueResult1;
                const value2 = mediaConfig;
                if (value2 === null || value2 === undefined) {
                    valueResult1 = undefined;
                }
                else {
                    valueResult1 = value2.coursePack;
                }
                const pack: CoursePack = valueResult1 || {};
                configureCourseLink((document.querySelector("#courseGuideLink") as HTMLAnchorElement), pack.guideUrl, {
                    downloadName: pack.guideFileName || "封泥教案与学习单.docx",
                });
                const recapVideo = (document.querySelector("#courseRecapVideo") as HTMLVideoElement);
                const recapVideoUrl = safeResourceUrl(pack.recapVideoUrl);
                const recapPosterUrl = safeResourceUrl(pack.recapPosterUrl);
                const recapError = (document.querySelector("#courseRecapError") as HTMLElement);
                if (recapVideo) {
                    if (recapPosterUrl) {
                        recapVideo.poster = recapPosterUrl;
                    }
                    else {
                        recapVideo.removeAttribute("poster");
                    }
                    recapVideo.onerror = function showRecapError() {
                        if (recapError) {
                            recapError.hidden = false;
                        }
                    };
                    recapVideo.onloadedmetadata = function clearRecapError() {
                        if (recapError) {
                            recapError.hidden = true;
                        }
                    };
                }
                if (recapVideo && recapVideoUrl) {
                    if (recapVideo.src !== recapVideoUrl) {
                        recapVideo.src = recapVideoUrl;
                    }
                    recapVideo.hidden = false;
                }
                else {
                    if (recapVideo) {
                        recapVideo.hidden = true;
                        recapVideo.removeAttribute("src");
                    }
                }
            }
            function courseLessonLabel(course: Course) {
                let valueResult3;
                const value4 = course;
                if (value4 === null || value4 === undefined) {
                    valueResult3 = undefined;
                }
                else {
                    valueResult3 = value4.lesson;
                }
                const lesson = Number(valueResult3) || 1;
                const numeral = ["一", "二", "三"][lesson - 1] || String(lesson);
                return ("第" + (numeral) + "课时");
            }
            function courseSlideCount(course?) {
                if (course === undefined) {
                    course = activeCourse;
                }
                let valueResult5;
                const value6 = course;
                if (value6 === null || value6 === undefined) {
                    valueResult5 = undefined;
                }
                else {
                    valueResult5 = value6.slideCount;
                }
                return Math.max(0, Number(valueResult5) || 0);
            }
            // 记录每页在横向课卷中的位置，翻页时就能准确停在页首
            function courseSlideAnchors(viewport?) {
                if (viewport === undefined) {
                    viewport = (document.querySelector("#courseSlideViewport") as HTMLElement);
                }
                if (!viewport) {
                    return [];
                }
                const viewportRect = viewport.getBoundingClientRect();
                let valueResult7;
                const items8 = (Array.from((document.querySelector("#courseSlideTrack") as HTMLElement).querySelectorAll(".course-slide")) as HTMLElement[]);
                const result11 = [];
                for (let index10 = 0; index10 < items8.length; index10++) {
                    let valueResult9;
                    {
                        const panel = items8[index10];
                        const panelRect = panel.getBoundingClientRect();
                        valueResult9 = panelRect.left - viewportRect.left + viewport.scrollLeft;
                    }
                    result11.push(valueResult9);
                }
                valueResult7 = result11;
                return valueResult7;
            }
            // 桌面端让右侧课时列表与课件等高，手机端则交给内容自然撑开
            function syncCourseLessonPanelHeight() {
                const panel = (document.querySelector(".course-lesson-panel") as HTMLElement);
                const content = (document.querySelector("#courseScroll") as HTMLElement);
                if (!panel || !content) {
                    return;
                }
                if (window.matchMedia("(max-width: 47.5rem)").matches) {
                    panel.style.removeProperty("min-height");
                    return;
                }
                panel.style.minHeight = ("" + (Math.ceil(content.getBoundingClientRect().height)) + "px");
            }
            function waitForSlideImage(image: HTMLImageElement): Promise<void> {
                if (!image) {
                    return Promise.resolve();
                }
                if (imageReadyCache.has(image)) {
                    return imageReadyCache.get(image);
                }
                image.loading = "eager";
                // 同一张图片只解码一次；失败后允许下次切换重试
                const ready = image.decode().then(function markReady() {
                    image.classList.add("loaded");
                }, function allowRetry() {
                    imageReadyCache.delete(image);
                });
                imageReadyCache.set(image, ready);
                return ready;
            }
            function getCourseSlides(course: Course): DocumentFragment {
                if (courseSlideCache.has(course.id)) {
                    return courseSlideCache.get(course.id);
                }
                const container = document.createElement("div");
                container.innerHTML = getCourseSlideMarkup(course);
                const fragment = document.createDocumentFragment();
                while (container.firstChild) {
                    fragment.appendChild(container.firstChild);
                }
                courseSlideCache.set(course.id, fragment);
                return fragment;
            }
            function prepareCourseCovers() {
                for (let index = 0; index < courses.length; index++) {
                    const course = courses[index];
                    if (course.id === requestedCourseId) {
                        continue;
                    }
                    const fragment = getCourseSlides(course);
                    const image = fragment.querySelector("img");
                    if (image) {
                        waitForSlideImage(image);
                    }
                }
            }
            // 先准备要看的这一页，再预加载下一页，兼顾首次加载和连续翻页
            async function prepareCourseSlide(index: number) {
                const panels = (Array.from((document.querySelector("#courseSlideTrack") as HTMLElement).querySelectorAll(".course-slide")) as HTMLElement[]);
                let valueResult11;
                const value13 = panels[index];
                if (value13 === null || value13 === undefined) {
                    valueResult11 = undefined;
                }
                else {
                    const value14 = value13.querySelector;
                    valueResult11 = value14.call(value13, "img");
                }
                await waitForSlideImage((valueResult11 as HTMLImageElement));
                let valueResult13;
                const value16 = panels[index + 1];
                if (value16 === null || value16 === undefined) {
                    valueResult13 = undefined;
                }
                else {
                    const value17 = value16.querySelector;
                    valueResult13 = value17.call(value16, "img");
                }
                const nextImage = (valueResult13 as HTMLImageElement);
                if (nextImage) {
                    nextImage.loading = "eager";
                }
            }
            // 翻到指定页，并同步页码和按钮；请求编号保证快速操作时以最后一次为准
            async function updateCourseSlideState(index: number, behavior?: ScrollBehavior) {
                if (behavior === undefined) {
                    behavior = "smooth";
                }
                const count = courseSlideCount();
                if (!count || !activeCourse) {
                    return;
                }
                const nextIndex = Math.max(0, Math.min(index, count - 1));
                const requestId = ++courseSlideRequest;
                await prepareCourseSlide(nextIndex);
                // 用户快速切换课件时，旧课件的图片可能晚一步加载；只接受最后一次请求的结果
                if (requestId !== courseSlideRequest || !activeCourse) {
                    return;
                }
                activeCourseSlideIndex = nextIndex;
                const panels = (Array.from((document.querySelector("#courseSlideTrack") as HTMLElement).querySelectorAll(".course-slide")) as HTMLElement[]);
                const items19 = panels;
                for (let index21 = 0; index21 < items19.length; index21++) {
                    {
                        const panel = items19[index21];
                        const panelIndex = index21;
                        panel.toggleAttribute("data-current", panelIndex === activeCourseSlideIndex);
                    }
                }
                const viewport = (document.querySelector("#courseSlideViewport") as HTMLElement);
                const targetLeft = courseSlideAnchors(viewport)[activeCourseSlideIndex];
                if (viewport && Number.isFinite(targetLeft)) {
                    let valueResult19;
                    if (prefersReducedMotion()) {
                        valueResult19 = "auto";
                    }
                    else {
                        valueResult19 = behavior;
                    }
                    viewport.scrollTo({ left: targetLeft, behavior: valueResult19 });
                }
                (document.querySelector("#courseSlideStatus") as HTMLElement).innerHTML = ("<span>" + (escapeHtml(courseLessonLabel(activeCourse))) + "</span><b>" + (String(activeCourseSlideIndex + 1).padStart(2, "0")) + " / " + (String(count).padStart(2, "0")) + "</b>");
                (document.querySelector("#courseSlidePrev") as HTMLButtonElement).disabled = activeCourseSlideIndex === 0;
                (document.querySelector("#courseSlideNext") as HTMLButtonElement).disabled = activeCourseSlideIndex === count - 1;
            }
            // 生成本课的图片页面并缓存 HTML；远处的页面暂不急着下载
            function getCourseSlideMarkup(course: Course) {
                const count = Number(course.slideCount) || 0;
                const basePath = String(course.slideBasePath || "").replace(/\/$/, "");
                if (courseSlideMarkupCache.has(course.id)) {
                    return courseSlideMarkupCache.get(course.id);
                }
                let valueResult21;
                if (count && basePath) {
                    valueResult21 = Array.from({ length: count }, function (_, index) {
                        const number = String(index + 1).padStart(2, "0");
                        const source = safeResourceUrl(("" + (basePath) + "/slide-" + (number) + ".webp"));
                        let valueResult23;
                        if (index < 2) {
                            valueResult23 = "eager";
                        }
                        else {
                            valueResult23 = "lazy";
                        }
                        return ("<figure class=\"course-slide\" data-course-slide=\"" + (index) + "\"><img src=\"" + (escapeHtml(source)) + "\" alt=\"" + (escapeHtml(courseLessonLabel(course))) + "课件第 " + (index + 1) + " 页\" loading=\"" + valueResult23 + "\" decoding=\"async\" draggable=\"false\"></figure>");
                    }).join("");
                }
                else {
                    valueResult21 = '<div class="empty-state"><strong>课件预览暂不可用</strong><p>请点击下方按钮打开原始 PDF。</p></div>';
                }
                const markup = valueResult21;
                courseSlideMarkupCache.set(course.id, markup);
                return markup;
            }
            // 新课件首图准备好后再换掉旧内容，减少切换时的空白
            async function renderCourseSlides(course: Course) {
                const track = (document.querySelector("#courseSlideTrack") as HTMLElement);
                const viewport = (document.querySelector("#courseSlideViewport") as HTMLElement);
                if (!track || !viewport) {
                    return;
                }
                const requestId = ++courseRenderRequest;
                courseSlideRequest += 1;
                // 缓存每课的节点和图片，供再次切换时使用
                const staging = getCourseSlides(course);
                const firstImage = (staging.querySelector(".course-slide img") as HTMLImageElement);
                await waitForSlideImage(firstImage);
                if (requestId !== courseRenderRequest) {
                    return;
                }
                if (activeCourse) {
                    const previousSlides = courseSlideCache.get(activeCourse.id);
                    while (track.firstChild) {
                        previousSlides.appendChild(track.firstChild);
                    }
                }
                activeCourse = course;
                activeCourseSlideIndex = 0;
                track.replaceChildren(staging);
                viewport.style.setProperty("--course-slide-width", ("" + (viewport.clientWidth) + "px"));
                viewport.scrollTo({ left: 0, behavior: "auto" });
                (document.querySelector("#courseSlideProgress") as HTMLElement).style.transform = "scaleX(0)";
                let valueResult25;
                const value27 = (document.querySelector("#courseSlideProgressTrack") as HTMLElement);
                if (value27 === null || value27 === undefined) {
                    valueResult25 = undefined;
                }
                else {
                    const value28 = value27.setAttribute;
                    valueResult25 = value28.call(value27, "aria-valuenow", "0");
                }
                await updateCourseSlideState(0, "auto");
                window.requestAnimationFrame(function () {
                    return viewport.scrollTo({ left: 0, behavior: "auto" });
                });
            }
            // 切换课时的统一入口：更新介绍、选中按钮、下载链接和课件
            function selectCourse(id: string, options?: {
                scrollToContent?: boolean;
            }) {
                if (options === undefined) {
                    options = {};
                }
                let valueResult27;
                {
                    let searchFinished28 = false;
                    const items30 = courses;
                    for (let index32 = 0; !searchFinished28 && index32 < items30.length; index32++) {
                        let valueResult29;
                        {
                            const item = items30[index32];
                            valueResult29 = item.id === id;
                        }
                        if (valueResult29) {
                            valueResult27 = items30[index32];
                            searchFinished28 = true;
                        }
                    }
                    if (!searchFinished28) {
                        valueResult27 = undefined;
                        searchFinished28 = true;
                    }
                }
                const course = valueResult27 || courses[0];
                if (!course) {
                    return;
                }
                if (requestedCourseId === course.id) {
                    return;
                }
                requestedCourseId = course.id;
                (document.querySelector("#courseMeta") as HTMLElement).textContent = ("第 " + (course.lesson) + " 课 · " + (course.duration));
                const lessonProgress = (document.querySelector("#courseLessonProgress") as HTMLElement);
                if (lessonProgress) {
                    lessonProgress.textContent = ("" + (String(course.lesson).padStart(2, "0")) + " / " + (String(courses.length || 3).padStart(2, "0")));
                }
                (document.querySelector("#courseScrollTitle") as HTMLElement).textContent = course.title;
                (document.querySelector("#courseDescription") as HTMLElement).textContent = course.description;
                const items35 = (Array.from(document.querySelectorAll("[data-course-id]")) as HTMLElement[]);
                for (let index37 = 0; index37 < items35.length; index37++) {
                    {
                        const button = items35[index37];
                        const active = button.dataset.courseId === course.id;
                        button.classList.toggle("active", active);
                        if (active) {
                            button.classList.remove("is-switching");
                            window.requestAnimationFrame(function () {
                                return button.classList.add("is-switching");
                            });
                            window.setTimeout(function () {
                                return button.classList.remove("is-switching");
                            }, 240);
                        }
                        button.setAttribute("aria-selected", String(active));
                        let valueResult35;
                        if (active) {
                            valueResult35 = 0;
                        }
                        else {
                            valueResult35 = -1;
                        }
                        button.tabIndex = valueResult35;
                    }
                }
                const resourceLink = (document.querySelector("#courseResourceLink") as HTMLAnchorElement);
                const isPdf = String(course.resourceType || "").toUpperCase() === "PDF";
                let valueResult37;
                if (isPdf) {
                    valueResult37 = "打开原始 PDF";
                }
                else {
                    valueResult37 = "下载原始 PPTX";
                }
                resourceLink.textContent = valueResult37;
                let valueResult39;
                if (isPdf) {
                    valueResult39 = "";
                }
                else {
                    valueResult39 = course.resourceFileName;
                }
                configureCourseLink(resourceLink, course.resourceUrl, {
                    downloadName: valueResult39,
                    openInNewTab: isPdf,
                });
                // 返回课件准备任务，供调用方等待加载完成
                const slidesReady = renderCourseSlides(course);
                if (options.scrollToContent && window.matchMedia("(max-width: 47.5rem)").matches) {
                    window.requestAnimationFrame(function revealSelectedCourse() {
                        let valueResult41;
                        const value43 = (document.querySelector("#courseScroll") as HTMLElement);
                        if (value43 === null || value43 === undefined) {
                            valueResult41 = undefined;
                        }
                        else {
                            const value44 = value43.scrollIntoView;
                            let valueResult43;
                            if (prefersReducedMotion()) {
                                valueResult43 = "auto";
                            }
                            else {
                                valueResult43 = "smooth";
                            }
                            valueResult41 = value44.call(value43, {
                                behavior: valueResult43,
                                block: "start",
                            });
                        }
                    });
                }
                return slidesReady;
            }
            // 首次拿到课程列表后，生成课时按钮并默认打开第一课
            async function renderCourses(items: Course[]) {
                courses = items;
                let valueResult45;
                const items47 = items;
                const result50 = [];
                for (let index49 = 0; index49 < items47.length; index49++) {
                    let valueResult47;
                    {
                        const course = items47[index49];
                        const index = index49;
                        let valueResult49;
                        {
                            if (Number(course.lesson) === 3) {
                                valueResult49 = "手绘实践";
                            }
                            else {
                                valueResult49 = course.title.split("：")[0];
                            }
                            const label = valueResult49;
                            let valueResult51;
                            if (index === 0) {
                                valueResult51 = 0;
                            }
                            else {
                                valueResult51 = -1;
                            }
                            valueResult47 = ("<button type=\"button\" role=\"tab\" aria-selected=\"" + (index === 0) + "\" aria-controls=\"courseSlideViewport\" data-course-id=\"" + (escapeHtml(course.id)) + "\" tabindex=\"" + valueResult51 + "\"><span class=\"card-index\">0" + (Number(course.lesson) || 0) + "</span><strong>" + (escapeHtml(label)) + "</strong><small>" + (escapeHtml(course.duration)) + "</small></button>");
                        }
                    }
                    result50.push(valueResult47);
                }
                valueResult45 = result50;
                (document.querySelector("#courseLessonTabs") as HTMLElement).innerHTML = valueResult45.join("");
                configureCoursePackLinks();
                let valueResult53;
                const value54 = items[0];
                if (value54 === null || value54 === undefined) {
                    valueResult53 = undefined;
                }
                else {
                    valueResult53 = value54.id;
                }
                // 第一课准备完成后才结束初始化，让开屏能准确判断课件是否就绪
                await selectCourse(valueResult53);
                syncCourseLessonPanelHeight();
                // 首课显示后预加载其他课的首页
                window.setTimeout(prepareCourseCovers, 0);
            }
            // 将鼠标拖动、滚轮、键盘和进度条接到同一套课件翻页逻辑上
            function initCourseScroll() {
                const viewport = (document.querySelector("#courseSlideViewport") as HTMLElement);
                const progressTrack = (document.querySelector("#courseSlideProgressTrack") as HTMLElement);
                const tabs = (document.querySelector("#courseLessonTabs") as HTMLElement);
                if (!viewport || !progressTrack || !tabs) {
                    return;
                }
                let dragging = false;
                let dragStart = 0;
                let scrollStart = 0;
                // 用户也能手动拖动课卷，所以页码要根据实际滚动位置更新
                function syncCourseSlideFromScroll() {
                    const panels = (Array.from((document.querySelector("#courseSlideTrack") as HTMLElement).querySelectorAll(".course-slide")) as HTMLElement[]);
                    if (!panels.length) {
                        return;
                    }
                    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
                    let valueResult55;
                    if (maxScroll > 0) {
                        valueResult55 = viewport.scrollLeft / maxScroll;
                    }
                    else {
                        valueResult55 = 0;
                    }
                    const scrollRatio = valueResult55;
                    const percent = Math.min(100, Math.max(0, scrollRatio * 100));
                    (document.querySelector("#courseSlideProgress") as HTMLElement).style.transform = ("scaleX(" + (scrollRatio) + ")");
                    progressTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
                    progressTrack.setAttribute("aria-valuetext", ("课件浏览位置 " + (Math.round(percent)) + "%"));
                    const anchors = courseSlideAnchors(viewport);
                    let valueResult57;
                    {
                        let searchFinished58 = false;
                        const items57 = anchors;
                        for (let index59 = 0; !searchFinished58 && index59 < items57.length; index59++) {
                            let valueResult59;
                            {
                                const anchor = items57[index59];
                                valueResult59 = Math.abs(anchor - viewport.scrollLeft) <= 2;
                            }
                            if (valueResult59) {
                                valueResult57 = index59;
                                searchFinished58 = true;
                            }
                        }
                        if (!searchFinished58) {
                            valueResult57 = -1;
                            searchFinished58 = true;
                        }
                    }
                    const nextIndex = valueResult57;
                    const count = panels.length;
                    if (nextIndex < 0) {
                        activeCourseSlideIndex = -1;
                        const items62 = panels;
                        for (let index64 = 0; index64 < items62.length; index64++) {
                            {
                                const panel = items62[index64];
                                panel.removeAttribute("data-current");
                            }
                        }
                        (document.querySelector("#courseSlideStatus") as HTMLElement).innerHTML = ("<span>" + (escapeHtml(courseLessonLabel(activeCourse))) + "</span><b>-- / " + (String(count).padStart(2, "0")) + "</b>");
                        (document.querySelector("#courseSlidePrev") as HTMLButtonElement).disabled = viewport.scrollLeft <= 1;
                        (document.querySelector("#courseSlideNext") as HTMLButtonElement).disabled = viewport.scrollLeft >= maxScroll - 1;
                        return;
                    }
                    if (nextIndex === activeCourseSlideIndex) {
                        return;
                    }
                    activeCourseSlideIndex = nextIndex;
                    const items67 = panels;
                    for (let index69 = 0; index69 < items67.length; index69++) {
                        {
                            const panel = items67[index69];
                            const panelIndex = index69;
                            panel.toggleAttribute("data-current", panelIndex === nextIndex);
                        }
                    }
                    (document.querySelector("#courseSlideStatus") as HTMLElement).innerHTML = ("<span>" + (escapeHtml(courseLessonLabel(activeCourse))) + "</span><b>" + (String(nextIndex + 1).padStart(2, "0")) + " / " + (String(count).padStart(2, "0")) + "</b>");
                    (document.querySelector("#courseSlidePrev") as HTMLButtonElement).disabled = nextIndex === 0;
                    (document.querySelector("#courseSlideNext") as HTMLButtonElement).disabled = nextIndex === count - 1;
                }
                function setCourseScrollPercent(percent: number) {
                    const clamped = Math.min(100, Math.max(0, percent));
                    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
                    viewport.scrollLeft = (maxScroll * clamped) / 100;
                }
                function setCourseScrollFromPointer(event: PointerEvent) {
                    const bounds = progressTrack.getBoundingClientRect();
                    let valueResult69;
                    if (bounds.width > 0) {
                        valueResult69 = ((event.clientX - bounds.left) / bounds.width) * 100;
                    }
                    else {
                        valueResult69 = 0;
                    }
                    const percent = valueResult69;
                    setCourseScrollPercent(percent);
                }
                function moveToCourseAnchor(direction: number) {
                    const anchors = courseSlideAnchors(viewport);
                    const current = viewport.scrollLeft;
                    const tolerance = 4;
                    let targetIndex = -1;
                    if (direction > 0) {
                        let valueResult71;
                        {
                            let searchFinished72 = false;
                            const items73 = anchors;
                            for (let index75 = 0; !searchFinished72 && index75 < items73.length; index75++) {
                                let valueResult73;
                                {
                                    const anchor = items73[index75];
                                    valueResult73 = anchor > current + tolerance;
                                }
                                if (valueResult73) {
                                    valueResult71 = index75;
                                    searchFinished72 = true;
                                }
                            }
                            if (!searchFinished72) {
                                valueResult71 = -1;
                                searchFinished72 = true;
                            }
                        }
                        targetIndex = valueResult71;
                    }
                    else {
                        for (let index = anchors.length - 1; index >= 0; index -= 1) {
                            if (anchors[index] < current - tolerance) {
                                targetIndex = index;
                                break;
                            }
                        }
                    }
                    if (targetIndex >= 0) {
                        updateCourseSlideState(targetIndex);
                    }
                }
                tabs.addEventListener("click", function handleClick(event) {
                    const button = ((event.target as HTMLElement).closest("[data-course-id]") as HTMLElement);
                    if (button) {
                        selectCourse(button.dataset.courseId, { scrollToContent: true });
                    }
                });
                tabs.addEventListener("keydown", function handleKeydown(event) {
                    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
                        return;
                    }
                    event.preventDefault();
                    const tabButtons = (Array.from(tabs.querySelectorAll("[data-course-id]")) as HTMLElement[]);
                    let valueResult75;
                    {
                        let searchFinished76 = false;
                        const items78 = tabButtons;
                        for (let index80 = 0; !searchFinished76 && index80 < items78.length; index80++) {
                            let valueResult77;
                            {
                                const button = items78[index80];
                                valueResult77 = button.getAttribute("aria-selected") === "true";
                            }
                            if (valueResult77) {
                                valueResult75 = index80;
                                searchFinished76 = true;
                            }
                        }
                        if (!searchFinished76) {
                            valueResult75 = -1;
                            searchFinished76 = true;
                        }
                    }
                    const current = valueResult75;
                    let valueResult79;
                    if (event.key === "ArrowRight") {
                        valueResult79 = 1;
                    }
                    else {
                        valueResult79 = -1;
                    }
                    const next = (current + valueResult79 + tabButtons.length) % tabButtons.length;
                    tabButtons[next].focus();
                    selectCourse(tabButtons[next].dataset.courseId, { scrollToContent: true });
                });
                (document.querySelector("#courseSlidePrev") as HTMLButtonElement).addEventListener("click", function handleClick() {
                    return moveToCourseAnchor(-1);
                });
                (document.querySelector("#courseSlideNext") as HTMLButtonElement).addEventListener("click", function handleClick() {
                    return moveToCourseAnchor(1);
                });
                viewport.addEventListener("keydown", function handleKeydown(event) {
                    if (event.key === "ArrowLeft") {
                        event.preventDefault();
                        moveToCourseAnchor(-1);
                    }
                    if (event.key === "ArrowRight") {
                        event.preventDefault();
                        moveToCourseAnchor(1);
                    }
                    if (event.key === "Home") {
                        event.preventDefault();
                        updateCourseSlideState(0);
                    }
                    if (event.key === "End") {
                        event.preventDefault();
                        updateCourseSlideState(courseSlideCount() - 1);
                    }
                });
                viewport.addEventListener("scroll", syncCourseSlideFromScroll, { passive: true });
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
                progressTrack.addEventListener("pointerdown", function handlePointerdown(event) {
                    if (event.button !== 0) {
                        return;
                    }
                    progressTrack.setPointerCapture(event.pointerId);
                    progressTrack.classList.add("is-dragging");
                    setCourseScrollFromPointer(event);
                });
                progressTrack.addEventListener("pointermove", function handlePointermove(event) {
                    if (progressTrack.hasPointerCapture(event.pointerId)) {
                        setCourseScrollFromPointer(event);
                    }
                });
                const stopProgressDrag = function stopProgressDrag(event) {
                    if (progressTrack.hasPointerCapture(event.pointerId)) {
                        progressTrack.releasePointerCapture(event.pointerId);
                    }
                    progressTrack.classList.remove("is-dragging");
                };
                progressTrack.addEventListener("pointerup", stopProgressDrag);
                progressTrack.addEventListener("pointercancel", stopProgressDrag);
                progressTrack.addEventListener("keydown", function handleKeydown(event) {
                    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
                    let valueResult81;
                    if (maxScroll > 0) {
                        valueResult81 = (viewport.scrollLeft / maxScroll) * 100;
                    }
                    else {
                        valueResult81 = 0;
                    }
                    const currentPercent = valueResult81;
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
                        let valueResult83;
                        if (event.key === "Home") {
                            valueResult83 = 0;
                        }
                        else {
                            valueResult83 = 100;
                        }
                        setCourseScrollPercent(valueResult83);
                    }
                    else {
                        if (Object.hasOwn(steps, event.key)) {
                            event.preventDefault();
                            setCourseScrollPercent(currentPercent + steps[event.key]);
                        }
                    }
                });
                window.addEventListener("resize", function handleResize() {
                    const oldMaxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
                    let valueResult85;
                    if (oldMaxScroll > 0) {
                        valueResult85 = viewport.scrollLeft / oldMaxScroll;
                    }
                    else {
                        valueResult85 = 0;
                    }
                    const oldRatio = valueResult85;
                    viewport.style.setProperty("--course-slide-width", ("" + (viewport.clientWidth) + "px"));
                    window.requestAnimationFrame(function () {
                        return setCourseScrollPercent(oldRatio * 100);
                    });
                    syncCourseLessonPanelHeight();
                });
            }
            return { renderCourses: renderCourses, initCourseScroll: initCourseScroll };
        },
    };
})();
window.NiyunCourseBrowser = NiyunCourseBrowser;
