const NiyunSourceArchive = (function registerSourceArchive() {
    "use strict";
    return {
        create(dependencies: ArchiveDependencies) {
            const source1 = dependencies;
            const findElement = source1.findElement;
            const sourceDialog = source1.sourceDialog;
            const sourceDialogPanel = source1.sourceDialogPanel;
            const sourceDialogSearch = source1.sourceDialogSearch;
            const clearSourceDialogSearch = source1.clearSourceDialogSearch;
            const renderSourceDialogIndex = source1.renderSourceDialogIndex;
            const cacheSourceSupplementHeights = source1.cacheSourceSupplementHeights;
            const animateSourceSupplementDetails = source1.animateSourceSupplementDetails;
            const getRelicArchiveLink = source1.getRelicArchiveLink;
            const prefersReducedMotion = source1.prefersReducedMotion;
            const openModalAnimation = source1.openModalAnimation;
            const closeModalAnimation = source1.closeModalAnimation;
            const showToast = source1.showToast;
            const getVisibleSites = source1.getVisibleSites;
            const navigateToMapIndex = source1.navigateToMapIndex;
            // 所有图录入口共用这个流程：筛选内容、打开窗口，再聚焦搜索框
            function openArchive(query?) {
                if (query === undefined) {
                    query = "";
                }
                renderSourceDialogIndex(query);
                sourceDialogSearch.value = query;
                sourceDialog.classList.remove("is-closing");
                sourceDialog.showModal();
                openModalAnimation(sourceDialogPanel);
                sourceDialogSearch.focus();
            }
            async function close() {
                let valueResult1;
                const value2 = sourceDialog;
                if (value2 === null || value2 === undefined) {
                    valueResult1 = undefined;
                }
                else {
                    valueResult1 = value2.open;
                }
                if (!valueResult1 || sourceDialog.classList.contains("is-closing")) {
                    return;
                }
                sourceDialog.classList.add("is-closing");
                const animation = closeModalAnimation(sourceDialogPanel);
                if (animation) {
                    try {
                        await animation.finished;
                    }
                    catch (_) {
                        return;
                    }
                }
                sourceDialog.classList.remove("is-closing");
                sourceDialog.close();
            }
            // 等弹窗排版完成后定位卡片，否则滚动位置可能算不准
            function focusCard(siteId: number, message?) {
                if (message === undefined) {
                    message = "";
                }
                window.setTimeout(function focusArchiveCardAfterLayout() {
                    const target = (document.querySelector(("#sourceDialogIndex [data-source-card=\"" + (siteId) + "\"]")) as HTMLElement);
                    let valueResult3;
                    const value4 = target;
                    if (value4 === null || value4 === undefined) {
                        valueResult3 = undefined;
                    }
                    else {
                        const value5 = value4.classList;
                        const value6 = value5.add;
                        valueResult3 = value6.call(value5, "search-target");
                    }
                    let valueResult5;
                    const value8 = target;
                    if (value8 === null || value8 === undefined) {
                        valueResult5 = undefined;
                    }
                    else {
                        const value9 = value8.scrollIntoView;
                        let valueResult7;
                        if (prefersReducedMotion()) {
                            valueResult7 = "auto";
                        }
                        else {
                            valueResult7 = "smooth";
                        }
                        valueResult5 = value9.call(value8, { behavior: valueResult7, block: "center" });
                    }
                    if (message) {
                        showToast(message);
                    }
                    let valueResult9;
                    const value12 = sourceDialogSearch;
                    if (value12 === null || value12 === undefined) {
                        valueResult9 = undefined;
                    }
                    else {
                        const value13 = value12.focus;
                        valueResult9 = value13.call(value12);
                    }
                }, 80);
            }
            function openSite(siteId: number) {
                let valueResult11;
                {
                    let searchFinished12 = false;
                    const items15 = getVisibleSites();
                    for (let index17 = 0; !searchFinished12 && index17 < items15.length; index17++) {
                        let valueResult13;
                        {
                            const item = items15[index17];
                            valueResult13 = Number(item.id) === Number(siteId);
                        }
                        if (valueResult13) {
                            valueResult11 = items15[index17];
                            searchFinished12 = true;
                        }
                    }
                    if (!searchFinished12) {
                        valueResult11 = undefined;
                        searchFinished12 = true;
                    }
                }
                const site = valueResult11;
                if (!site) {
                    return;
                }
                const county = String(site.city || "").split(" · ")[1] || String(site.city || "");
                openArchive(county);
                focusCard(site.id, ("已定位图录：" + (site.city) + " · " + (site.seals[0])));
            }
            function openRelic(relicId: string) {
                const link = getRelicArchiveLink(relicId) || {};
                openArchive(link.query || "");
                if (link.siteId) {
                    focusCard(link.siteId);
                }
                else {
                    window.setTimeout(function reportMissingArchiveMatch() {
                        let valueResult15;
                        if (link.query) {
                            valueResult15 = ("完整图录中暂未找到“" + (link.query) + "”同名条目");
                        }
                        else {
                            valueResult15 = "完整图录已打开";
                        }
                        const message = valueResult15;
                        showToast(message);
                        sourceDialogSearch.focus();
                    }, 80);
                }
            }
            function navigateToMap(event: MouseEvent) {
                const link = ((event.target as HTMLElement).closest("[data-source-site]") as HTMLElement);
                if (!link) {
                    return;
                }
                event.preventDefault();
                navigateToMapIndex(link.dataset.sourceSite);
                close();
            }
            function init() {
                let valueResult17;
                const value21 = (document.querySelector("#sourceIndex") as HTMLElement);
                if (value21 === null || value21 === undefined) {
                    valueResult17 = undefined;
                }
                else {
                    const value22 = value21.addEventListener;
                    valueResult17 = value22.call(value21, "click", navigateToMap);
                }
                let valueResult19;
                const value24 = (document.querySelector("#sourceDialogIndex") as HTMLElement);
                if (value24 === null || value24 === undefined) {
                    valueResult19 = undefined;
                }
                else {
                    const value25 = value24.addEventListener;
                    valueResult19 = value25.call(value24, "click", navigateToMap);
                }
                const handleDetails = function handleDetails(event: MouseEvent) {
                    const summary = ((event.target as HTMLElement).closest(".source-card-supplement-details > summary") as HTMLElement);
                    if (!summary) {
                        return;
                    }
                    event.preventDefault();
                    const details = summary.parentElement as HTMLDetailsElement;
                    animateSourceSupplementDetails(details, !details.open);
                };
                let valueResult21;
                const value27 = (document.querySelector("#sourceIndex") as HTMLElement);
                if (value27 === null || value27 === undefined) {
                    valueResult21 = undefined;
                }
                else {
                    const value28 = value27.addEventListener;
                    valueResult21 = value28.call(value27, "click", handleDetails);
                }
                let valueResult23;
                const value30 = (document.querySelector("#sourceDialogIndex") as HTMLElement);
                if (value30 === null || value30 === undefined) {
                    valueResult23 = undefined;
                }
                else {
                    const value31 = value30.addEventListener;
                    valueResult23 = value31.call(value30, "click", handleDetails);
                }
                let valueResult25;
                const value33 = (document.querySelector("#openSourceIndex") as HTMLButtonElement);
                if (value33 === null || value33 === undefined) {
                    valueResult25 = undefined;
                }
                else {
                    const value34 = value33.addEventListener;
                    valueResult25 = value34.call(value33, "click", function handleClick() {
                        return openArchive();
                    });
                }
                let valueResult27;
                const value36 = (document.querySelector("#closeSourceIndex") as HTMLButtonElement);
                if (value36 === null || value36 === undefined) {
                    valueResult27 = undefined;
                }
                else {
                    const value37 = value36.addEventListener;
                    valueResult27 = value37.call(value36, "click", close);
                }
                let valueResult29;
                const value39 = sourceDialog;
                if (value39 === null || value39 === undefined) {
                    valueResult29 = undefined;
                }
                else {
                    const value40 = value39.addEventListener;
                    valueResult29 = value40.call(value39, "click", function handleClick(event) {
                        if (event.target === sourceDialog) {
                            close();
                        }
                    });
                }
                let valueResult31;
                const value42 = sourceDialog;
                if (value42 === null || value42 === undefined) {
                    valueResult31 = undefined;
                }
                else {
                    const value43 = value42.addEventListener;
                    valueResult31 = value43.call(value42, "cancel", function handleCancel(event) {
                        event.preventDefault();
                        close();
                    });
                }
                let valueResult33;
                const value45 = sourceDialogSearch;
                if (value45 === null || value45 === undefined) {
                    valueResult33 = undefined;
                }
                else {
                    const value46 = value45.addEventListener;
                    valueResult33 = value46.call(value45, "input", function handleInput(event) {
                        return renderSourceDialogIndex((event.target as HTMLInputElement).value);
                    });
                }
                let valueResult35;
                const value48 = clearSourceDialogSearch;
                if (value48 === null || value48 === undefined) {
                    valueResult35 = undefined;
                }
                else {
                    const value49 = value48.addEventListener;
                    valueResult35 = value49.call(value48, "click", function handleClick() {
                        sourceDialogSearch.value = "";
                        renderSourceDialogIndex();
                    });
                }
                window.addEventListener("resize", function handleResize() {
                    cacheSourceSupplementHeights((document.querySelector("#sourceIndex") as HTMLElement));
                    cacheSourceSupplementHeights((document.querySelector("#sourceDialogIndex") as HTMLElement));
                });
            }
            return { init: init, close: close, openSite: openSite, openRelic: openRelic };
        },
    };
})();
window.NiyunSourceArchive = NiyunSourceArchive;
