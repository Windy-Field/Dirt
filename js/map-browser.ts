const NiyunMapBrowser = (function registerMapBrowser() {
    "use strict";
    return {
        create(options1: MapDependencies) {
            const source2 = options1;
            const findElement = source2.findElement;
            const findElements = source2.findElements;
            const apiService = source2.apiService;
            const getVisibleSites = source2.getVisibleSites;
            const renderSites = source2.renderSites;
            const updateSitePanel = source2.updateSitePanel;
            const openCurrentSiteArchive = source2.openCurrentSiteArchive;
            // 筛选和选中地图点位，并连接图录入口
            let filterRequest = 0;
            async function filterSites(period: string) {
                const requestId = ++filterRequest;
                const root = (document.querySelector("#shandongMap") as HTMLElement);
                let valueResult1;
                const value3 = root;
                if (value3 === null || value3 === undefined) {
                    valueResult1 = undefined;
                }
                else {
                    const value4 = value3.setAttribute;
                    valueResult1 = value4.call(value3, "aria-busy", "true");
                }
                try {
                    const sites = await apiService.getSites(period);
                    // 快速连点时只展示最后一次筛选，避免旧结果覆盖新结果
                    if (requestId !== filterRequest) {
                        return;
                    }
                    const items6 = (Array.from(document.querySelectorAll("[data-period]")) as HTMLElement[]);
                    for (let index8 = 0; index8 < items6.length; index8++) {
                        {
                            const button = items6[index8];
                            button.classList.toggle("active", button.dataset.period === period);
                        }
                    }
                    renderSites(sites);
                }
                catch (error) {
                    if (requestId === filterRequest) {
                        const status = (document.querySelector("#mapTerrainStatus") as HTMLElement);
                        if (status) {
                            status.textContent = error.message || "地图资料加载失败，请重试";
                        }
                    }
                }
                finally {
                    if (requestId === filterRequest) {
                        let valueResult7;
                        const value11 = root;
                        if (value11 === null || value11 === undefined) {
                            valueResult7 = undefined;
                        }
                        else {
                            const value12 = value11.setAttribute;
                            valueResult7 = value12.call(value11, "aria-busy", "false");
                        }
                    }
                }
            }
            // 切换地图显示模式，保留当前筛选
            function setMapMode(mode: string) {
                const root = (document.querySelector("#shandongMap") as HTMLElement);
                if (!root || !mode) {
                    return;
                }
                root.dataset.mapMode = mode;
                const items14 = (Array.from(document.querySelectorAll("[data-map-mode]")) as HTMLElement[]);
                for (let index16 = 0; index16 < items14.length; index16++) {
                    {
                        const button = items14[index16];
                        const active = button.dataset.mapMode === mode;
                        button.classList.toggle("active", active);
                        button.setAttribute("aria-pressed", String(active));
                    }
                }
                window.dispatchEvent(new CustomEvent("shandong-map-mode-change", { detail: { mode: mode } }));
            }
            function init() {
                const items19 = (Array.from(document.querySelectorAll("[data-period]")) as HTMLElement[]);
                for (let index21 = 0; index21 < items19.length; index21++) {
                    {
                        const button = items19[index21];
                        button.addEventListener("click", function handleClick() {
                            return filterSites(button.dataset.period);
                        });
                    }
                }
                const items24 = (Array.from(document.querySelectorAll("[data-map-mode]")) as HTMLElement[]);
                for (let index26 = 0; index26 < items24.length; index26++) {
                    {
                        const button = items24[index26];
                        button.addEventListener("click", function handleClick() {
                            return setMapMode(button.dataset.mapMode);
                        });
                    }
                }
                let valueResult21;
                const value29 = (document.querySelector("#mapMarkers") as HTMLElement);
                if (value29 === null || value29 === undefined) {
                    valueResult21 = undefined;
                }
                else {
                    const value30 = value29.addEventListener;
                    valueResult21 = value30.call(value29, "click", function handleClick(event) {
                        const marker = (event.target as HTMLElement).closest<HTMLElement>(".map-marker");
                        if (!marker) {
                            return;
                        }
                        const items31 = (Array.from((event.currentTarget as HTMLElement).querySelectorAll(".map-marker")) as HTMLElement[]);
                        for (let index33 = 0; index33 < items31.length; index33++) {
                            {
                                const item = items31[index33];
                                item.classList.toggle("active", item === marker);
                            }
                        }
                        const sites = getVisibleSites();
                        let valueResult27;
                        {
                            let searchFinished28 = false;
                            const items36 = sites;
                            for (let index38 = 0; !searchFinished28 && index38 < items36.length; index38++) {
                                let valueResult29;
                                {
                                    const site = items36[index38];
                                    valueResult29 = site.id === Number(marker.dataset.siteId);
                                }
                                if (valueResult29) {
                                    valueResult27 = index38;
                                    searchFinished28 = true;
                                }
                            }
                            if (!searchFinished28) {
                                valueResult27 = -1;
                                searchFinished28 = true;
                            }
                        }
                        const index = valueResult27;
                        if (index >= 0) {
                            updateSitePanel(sites[index], index);
                        }
                    });
                }
                let valueResult31;
                const value42 = ((document.querySelector("#openCurrentSiteArchive") as HTMLElement) as HTMLButtonElement);
                if (value42 === null || value42 === undefined) {
                    valueResult31 = undefined;
                }
                else {
                    const value43 = value42.addEventListener;
                    valueResult31 = value43.call(value42, "click", function handleClick() {
                        let valueResult33;
                        const value44 = (document.querySelector("#mapMarkers .map-marker.active") as HTMLElement);
                        if (value44 === null || value44 === undefined) {
                            valueResult33 = undefined;
                        }
                        else {
                            const value45 = value44.dataset;
                            valueResult33 = value45.siteId;
                        }
                        const id = Number(valueResult33);
                        if (!id) {
                            return;
                        }
                        openCurrentSiteArchive(id);
                    });
                }
            }
            return { init: init };
        },
    };
})();
window.NiyunMapBrowser = NiyunMapBrowser;
