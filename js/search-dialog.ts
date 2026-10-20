const NiyunSearchDialog = (function registerSearchDialog() {
    "use strict";
    return {
        create(dependencies: SearchDependencies) {
            const source1 = dependencies;
            const findElement = source1.findElement;
            const escapeHtml = source1.escapeHtml;
            const prefersReducedMotion = source1.prefersReducedMotion;
            const renderSourceDialogIndex = source1.renderSourceDialogIndex;
            const sourceDialog = source1.sourceDialog;
            const sourceDialogPanel = source1.sourceDialogPanel;
            const openModalAnimation = source1.openModalAnimation;
            const closeModalAnimation = source1.closeModalAnimation;
            const findKnowledgeSites = source1.findKnowledgeSites;
            const revealTarget = source1.revealTarget;
            const showToast = source1.showToast;
            const apiService = source1.apiService;
            const dialog = (document.querySelector("#searchDialog") as HTMLDialogElement);
            const input = (document.querySelector("#searchInput") as HTMLInputElement);
            const results = (document.querySelector("#searchResults") as HTMLElement);
            const clearButton = (document.querySelector("#clearSearch") as HTMLButtonElement);
            const initialMessage = "<p>输入关键词以检索封泥藏品、古地名与调研档案。</p>";
            let searchRequest = 0;
            function updateClearButton() {
                let valueResult1;
                const value2 = input;
                if (value2 === null || value2 === undefined) {
                    valueResult1 = undefined;
                }
                else {
                    const value3 = value2.value;
                    const value4 = value3.trim;
                    valueResult1 = value4.call(value3);
                }
                const hasValue = Boolean(valueResult1);
                if (clearButton) {
                    clearButton.hidden = !hasValue;
                }
            }
            function openAnimation() {
                let valueResult3;
                const value6 = dialog;
                if (value6 === null || value6 === undefined) {
                    valueResult3 = undefined;
                }
                else {
                    const value7 = value6.querySelector;
                    valueResult3 = value7.call(value6, ".search-box");
                }
                const panel = (valueResult3 as HTMLElement);
                if (!panel) {
                    return;
                }
                const items9 = panel.getAnimations();
                for (let index11 = 0; index11 < items9.length; index11++) {
                    {
                        const animation = items9[index11];
                        animation.cancel();
                    }
                }
                let valueResult9;
                if (prefersReducedMotion()) {
                    valueResult9 = 1;
                }
                else {
                    valueResult9 = 280;
                }
                panel.animate([
                    { opacity: 0, transform: "translateY(10px) scale(.98)" },
                    { opacity: 1, transform: "translateY(0) scale(1)" },
                ], { duration: valueResult9, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
            }
            function closeAnimation() {
                let valueResult11;
                const value15 = dialog;
                if (value15 === null || value15 === undefined) {
                    valueResult11 = undefined;
                }
                else {
                    const value16 = value15.querySelector;
                    valueResult11 = value16.call(value15, ".search-box");
                }
                const panel = (valueResult11 as HTMLElement);
                if (!panel || prefersReducedMotion()) {
                    return null;
                }
                return panel.animate([
                    { opacity: 1, transform: "translateY(0) scale(1)" },
                    { opacity: 0, transform: "translateY(8px) scale(.98)" },
                ], { duration: 180, easing: "ease-in", fill: "both" });
            }
            // 关闭动画完成后再关闭弹窗，取消动画时保留弹窗
            async function close() {
                let valueResult13;
                const value18 = dialog;
                if (value18 === null || value18 === undefined) {
                    valueResult13 = undefined;
                }
                else {
                    valueResult13 = value18.open;
                }
                if (!valueResult13 || dialog.classList.contains("is-closing")) {
                    return;
                }
                dialog.classList.add("is-closing");
                const animation = closeAnimation();
                if (animation) {
                    try {
                        await animation.finished;
                    }
                    catch (_) {
                        return;
                    }
                }
                dialog.classList.remove("is-closing");
                dialog.close();
            }
            // 搜索藏品和区县图录，按请求编号筛选最新结果
            async function search() {
                if (!input || !results) {
                    return;
                }
                const requestId = ++searchRequest;
                const keyword = input.value.trim();
                if (!keyword) {
                    results.innerHTML = initialMessage;
                    input.focus();
                    return;
                }
                results.innerHTML = "<p>正在检索封泥档案……</p>";
                let response;
                try {
                    response = await apiService.getRelics({ keyword: keyword });
                }
                catch (error) {
                    if (requestId === searchRequest) {
                        results.textContent = error.message || "搜索失败，请稍后重试";
                    }
                    return;
                }
                // 丢弃早先发起的搜索结果
                if (requestId !== searchRequest) {
                    return;
                }
                const query = keyword.toLowerCase();
                const sourceMatches = findKnowledgeSites(query);
                const total = response.total + sourceMatches.length;
                let valueResult15;
                if (response.items.length) {
                    let valueResult17;
                    const items21 = response.items;
                    const result24 = [];
                    for (let index23 = 0; index23 < items21.length; index23++) {
                        let valueResult19;
                        {
                            const item = items21[index23];
                            valueResult19 = ("<button type=\"button\" data-search-id=\"" + (item.id) + "\"><strong>" + (escapeHtml(item.name)) + "</strong><span>" + (escapeHtml(item.period)) + " · " + (escapeHtml(item.location)) + "</span></button>");
                        }
                        result24.push(valueResult19);
                    }
                    valueResult17 = result24;
                    valueResult15 = ("<div class=\"search-result-group\"><h3>代表藏品 <span>" + (response.total) + "</span></h3>" + (valueResult17.join("")) + "</div>");
                }
                else {
                    valueResult15 = "";
                }
                const relicGroup = valueResult15;
                let valueResult21;
                if (sourceMatches.length) {
                    let valueResult23;
                    const items27 = sourceMatches;
                    const result30 = [];
                    for (let index29 = 0; index29 < items27.length; index29++) {
                        let valueResult25;
                        {
                            const site = items27[index29];
                            let valueResult27;
                            const items31 = site.seals;
                            const result34 = [];
                            for (let index33 = 0; index33 < items31.length; index33++) {
                                let valueResult29;
                                {
                                    const seal = items31[index33];
                                    valueResult29 = seal.toLowerCase().includes(query);
                                }
                                if (valueResult29) {
                                    result34.push(items31[index33]);
                                }
                            }
                            {
                                valueResult27 = result34;
                                const matchedSeals = valueResult27;
                                let valueResult31;
                                {
                                    if (matchedSeals.length) {
                                        valueResult31 = matchedSeals.slice(0, 2).join(" · ");
                                    }
                                    else {
                                        valueResult31 = ("" + (site.period) + " · " + (site.admin));
                                    }
                                    const detail = valueResult31;
                                    valueResult25 = ("<button type=\"button\" data-search-site-id=\"" + (site.id) + "\"><strong>" + (escapeHtml(site.city)) + " · " + (escapeHtml(site.name)) + "</strong><span>" + (escapeHtml(detail)) + "</span></button>");
                                }
                            }
                        }
                        result30.push(valueResult25);
                    }
                    valueResult23 = result30;
                    valueResult21 = ("<div class=\"search-result-group\"><h3>45区县金石图录 <span>" + (sourceMatches.length) + "</span></h3>" + (valueResult23.join("")) + "</div>");
                }
                else {
                    valueResult21 = "";
                }
                const sourceGroup = valueResult21;
                let valueResult33;
                if (total) {
                    valueResult33 = ("<p class=\"search-count\">共找到 " + (total) + " 条相关档案，点击即可前往对应位置。</p>" + (relicGroup) + (sourceGroup));
                }
                else {
                    valueResult33 = ("<p>没有找到“" + (escapeHtml(keyword)) + "”，可以尝试“临淄”“守印”或“仓府”。</p>");
                }
                results.innerHTML = valueResult33;
            }
            function open() {
                if (!dialog) {
                    return;
                }
                dialog.classList.remove("is-closing");
                dialog.showModal();
                openAnimation();
                updateClearButton();
                let valueResult35;
                const value39 = input;
                if (value39 === null || value39 === undefined) {
                    valueResult35 = undefined;
                }
                else {
                    const value40 = value39.focus;
                    valueResult35 = value40.call(value39);
                }
            }
            function init() {
                let valueResult37;
                const value42 = (document.querySelector("#openSearch") as HTMLButtonElement);
                if (value42 === null || value42 === undefined) {
                    valueResult37 = undefined;
                }
                else {
                    const value43 = value42.addEventListener;
                    valueResult37 = value43.call(value42, "click", open);
                }
                let valueResult39;
                const value45 = (document.querySelector("#closeSearch") as HTMLButtonElement);
                if (value45 === null || value45 === undefined) {
                    valueResult39 = undefined;
                }
                else {
                    const value46 = value45.addEventListener;
                    valueResult39 = value46.call(value45, "click", close);
                }
                let valueResult41;
                const value48 = dialog;
                if (value48 === null || value48 === undefined) {
                    valueResult41 = undefined;
                }
                else {
                    const value49 = value48.addEventListener;
                    valueResult41 = value49.call(value48, "click", function handleClick(event) {
                        if (event.target === dialog) {
                            close();
                        }
                    });
                }
                let valueResult43;
                const value51 = dialog;
                if (value51 === null || value51 === undefined) {
                    valueResult43 = undefined;
                }
                else {
                    const value52 = value51.addEventListener;
                    valueResult43 = value52.call(value51, "cancel", function handleCancel(event) {
                        event.preventDefault();
                        close();
                    });
                }
                let valueResult45;
                const value54 = dialog;
                if (value54 === null || value54 === undefined) {
                    valueResult45 = undefined;
                }
                else {
                    const value55 = value54.addEventListener;
                    valueResult45 = value55.call(value54, "keydown", function handleKeydown(event) {
                        if (event.key === "Escape") {
                            event.preventDefault();
                            close();
                        }
                    });
                }
                let valueResult47;
                const value57 = dialog;
                if (value57 === null || value57 === undefined) {
                    valueResult47 = undefined;
                }
                else {
                    const value58 = value57.addEventListener;
                    valueResult47 = value58.call(value57, "close", function handleClose() {
                        let valueResult49;
                        const value59 = (document.querySelector("#openSearch") as HTMLButtonElement);
                        if (value59 === null || value59 === undefined) {
                            valueResult49 = undefined;
                        }
                        else {
                            const value60 = value59.focus;
                            valueResult49 = value60.call(value59);
                        }
                        return valueResult49;
                    });
                }
                let valueResult51;
                const value63 = input;
                if (value63 === null || value63 === undefined) {
                    valueResult51 = undefined;
                }
                else {
                    const value64 = value63.addEventListener;
                    valueResult51 = value64.call(value63, "input", updateClearButton);
                }
                let valueResult53;
                const value66 = (document.querySelector("#clearSearch") as HTMLButtonElement);
                if (value66 === null || value66 === undefined) {
                    valueResult53 = undefined;
                }
                else {
                    const value67 = value66.addEventListener;
                    valueResult53 = value67.call(value66, "click", function handleClick() {
                        searchRequest += 1;
                        input.value = "";
                        results.innerHTML = initialMessage;
                        updateClearButton();
                        input.focus();
                    });
                }
                let valueResult55;
                const value69 = (document.querySelector("#searchForm") as HTMLFormElement);
                if (value69 === null || value69 === undefined) {
                    valueResult55 = undefined;
                }
                else {
                    const value70 = value69.addEventListener;
                    valueResult55 = value70.call(value69, "submit", function handleSubmit(event) {
                        event.preventDefault();
                        search();
                    });
                }
                let valueResult57;
                const value72 = results;
                if (value72 === null || value72 === undefined) {
                    valueResult57 = undefined;
                }
                else {
                    const value73 = value72.addEventListener;
                    valueResult57 = value73.call(value72, "click", async function handleClick(event) {
                        const resultButton = ((event.target as HTMLElement).closest("[data-search-id], [data-search-site-id]") as HTMLElement);
                        if (!resultButton) {
                            return;
                        }
                        if (resultButton.dataset.searchId) {
                            const relic = await apiService.getRelicById(resultButton.dataset.searchId);
                            close();
                            window.setTimeout(function revealRelicSearchResult() {
                                const target = (document.querySelector(("[data-relic-card=\"" + (resultButton.dataset.searchId) + "\"]")) as HTMLElement);
                                if (!target) {
                                    let valueResult59;
                                    const value74 = (document.querySelector("#collection") as HTMLElement);
                                    if (value74 === null || value74 === undefined) {
                                        valueResult59 = undefined;
                                    }
                                    else {
                                        const value75 = value74.scrollIntoView;
                                        valueResult59 = value75.call(value74);
                                    }
                                    return valueResult59;
                                }
                                revealTarget(target);
                                if (relic) {
                                    showToast(("已定位：" + (relic.name) + " · " + (relic.location)));
                                }
                            }, 80);
                            return;
                        }
                        let valueResult61;
                        {
                            let searchFinished62 = false;
                            const items77 = findKnowledgeSites("");
                            for (let index79 = 0; !searchFinished62 && index79 < items77.length; index79++) {
                                let valueResult63;
                                {
                                    const item = items77[index79];
                                    valueResult63 = item.id === Number(resultButton.dataset.searchSiteId);
                                }
                                if (valueResult63) {
                                    valueResult61 = items77[index79];
                                    searchFinished62 = true;
                                }
                            }
                            if (!searchFinished62) {
                                valueResult61 = undefined;
                                searchFinished62 = true;
                            }
                        }
                        const site = valueResult61;
                        if (!site) {
                            return;
                        }
                        close();
                        renderSourceDialogIndex(site.city);
                        sourceDialog.classList.remove("is-closing");
                        sourceDialog.showModal();
                        openModalAnimation(sourceDialogPanel);
                        window.setTimeout(function revealSiteSearchResult() {
                            const targetCard = (document.querySelector(("#sourceDialogIndex [data-source-card=\"" + (site.id) + "\"]")) as HTMLElement);
                            let valueResult65;
                            const value82 = targetCard;
                            if (value82 === null || value82 === undefined) {
                                valueResult65 = undefined;
                            }
                            else {
                                const value83 = value82.classList;
                                const value84 = value83.add;
                                valueResult65 = value84.call(value83, "search-target");
                            }
                            let valueResult67;
                            const value86 = targetCard;
                            if (value86 === null || value86 === undefined) {
                                valueResult67 = undefined;
                            }
                            else {
                                const value87 = value86.scrollIntoView;
                                let valueResult69;
                                if (prefersReducedMotion()) {
                                    valueResult69 = "auto";
                                }
                                else {
                                    valueResult69 = "smooth";
                                }
                                valueResult67 = value87.call(value86, {
                                    behavior: valueResult69,
                                    block: "center",
                                });
                            }
                            showToast(("已定位图录：" + (site.city) + " · " + (site.seals[0])));
                        }, 80);
                    });
                }
            }
            return { init: init };
        },
    };
})();
window.NiyunSearchDialog = NiyunSearchDialog;
