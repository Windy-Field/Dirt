const NiyunSiteNavigation = (function registerSiteNavigation() {
    "use strict";
    return {
        create(options1: NavigationDependencies) {
            const source2 = options1;
            const findElement = source2.findElement;
            const findElements = source2.findElements;
            const prefersReducedMotion = source2.prefersReducedMotion;
            const interfaceConfig = source2.interfaceConfig;
            // 初始化栏目导航与选中状态
            function setMenuOpen(open: boolean) {
                const mainNav = (document.querySelector("#mainNav") as HTMLElement);
                const menuToggle = ((document.querySelector("#menuToggle") as HTMLElement) as HTMLButtonElement);
                let valueResult1;
                const value3 = mainNav;
                if (value3 === null || value3 === undefined) {
                    valueResult1 = undefined;
                }
                else {
                    const value4 = value3.classList;
                    const value5 = value4.toggle;
                    valueResult1 = value5.call(value4, "open", open);
                }
                let valueResult3;
                const value7 = menuToggle;
                if (value7 === null || value7 === undefined) {
                    valueResult3 = undefined;
                }
                else {
                    const value8 = value7.setAttribute;
                    valueResult3 = value8.call(value7, "aria-expanded", String(open));
                }
                let valueResult5;
                const value10 = menuToggle;
                if (value10 === null || value10 === undefined) {
                    valueResult5 = undefined;
                }
                else {
                    const value11 = value10.setAttribute;
                    let valueResult7;
                    if (open) {
                        valueResult7 = "关闭导航";
                    }
                    else {
                        valueResult7 = "打开导航";
                    }
                    valueResult5 = value11.call(value10, "aria-label", valueResult7);
                }
            }
            // 沿父容器累加位置，得到元素在整张网页中的实际高度
            function getLayoutTop(element: HTMLElement) {
                let top = 0;
                for (let current = element; current; current = current.offsetParent as HTMLElement) {
                    top += current.offsetTop;
                }
                return top;
            }
            // 跳转时给固定导航栏留出空间，再选中相应地图点位
            function navigateToMapIndex(siteId: number | string) {
                const mapToolbar = (document.querySelector("#map .map-toolbar") as HTMLElement);
                if (!mapToolbar) {
                    return;
                }
                const rootStyle = getComputedStyle(document.documentElement);
                const fontSize = Number.parseFloat(rootStyle.fontSize) || 16;
                let valueResult9;
                if (window.matchMedia("(max-width: 47.5rem)").matches) {
                    valueResult9 = "--layout-header-height-mobile";
                }
                else {
                    valueResult9 = "--layout-header-height";
                }
                const headerVariable = valueResult9;
                const headerHeight = Number.parseFloat(rootStyle.getPropertyValue(headerVariable)) * fontSize;
                let valueResult11;
                if (prefersReducedMotion()) {
                    valueResult11 = "auto";
                }
                else {
                    valueResult11 = "smooth";
                }
                window.scrollTo({
                    top: Math.max(0, getLayoutTop(mapToolbar) - headerHeight - 6.5 * fontSize),
                    behavior: valueResult11,
                });
                window.history.pushState(null, "", "#map");
                setMenuOpen(false);
                const marker = (document.querySelector(("[data-site-id=\"" + (siteId) + "\"]")) as HTMLElement);
                if (marker) {
                    window.setTimeout(function () {
                        return marker.click();
                    }, 400);
                }
            }
            function init() {
                const menuToggle = ((document.querySelector("#menuToggle") as HTMLElement) as HTMLButtonElement);
                const mainNav = (document.querySelector("#mainNav") as HTMLElement);
                let valueResult13;
                const value16 = menuToggle;
                if (value16 === null || value16 === undefined) {
                    valueResult13 = undefined;
                }
                else {
                    const value17 = value16.addEventListener;
                    valueResult13 = value17.call(value16, "click", function handleClick() {
                        return setMenuOpen(!mainNav.classList.contains("open"));
                    });
                }
                document.addEventListener("keydown", function handleKeydown(event) {
                    let conditionValue17 = event.key === "Escape";
                    if (conditionValue17) {
                        let valueResult15;
                        const value19 = mainNav;
                        if (value19 === null || value19 === undefined) {
                            valueResult15 = undefined;
                        }
                        else {
                            const value20 = value19.classList;
                            const value21 = value20.contains;
                            valueResult15 = value21.call(value20, "open");
                        }
                        conditionValue17 = valueResult15;
                    }
                    if (conditionValue17) {
                        setMenuOpen(false);
                        let valueResult18;
                        const value23 = menuToggle;
                        if (value23 === null || value23 === undefined) {
                            valueResult18 = undefined;
                        }
                        else {
                            const value24 = value23.focus;
                            valueResult18 = value24.call(value23);
                        }
                    }
                });
                const links = (Array.from(document.querySelectorAll("#mainNav a, .footer-links a, .hero-actions a, .scroll-cue")) as HTMLElement[]);
                const items26 = links;
                for (let index28 = 0; index28 < items26.length; index28++) {
                    {
                        const link = items26[index28];
                        link.addEventListener("click", function handleClick(event) {
                            const target = (document.querySelector(link.getAttribute("href")) as HTMLElement);
                            if (!target) {
                                return;
                            }
                            event.preventDefault();
                            setMenuOpen(false);
                            const offset = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
                            let valueResult24;
                            if (prefersReducedMotion()) {
                                valueResult24 = "auto";
                            }
                            else {
                                valueResult24 = "smooth";
                            }
                            window.scrollTo({
                                top: Math.max(0, getLayoutTop(target) - offset),
                                behavior: valueResult24,
                            });
                            history.pushState(null, "", link.getAttribute("href"));
                        });
                    }
                }
                const clock = ((document.querySelector("#headerClock") as HTMLElement) as HTMLTimeElement);
                const clockFormatter = new Intl.DateTimeFormat(interfaceConfig.clockLocale, interfaceConfig.clockFormat);
                function updateClock() {
                    if (!clock) {
                        return;
                    }
                    const now = new Date();
                    clock.dateTime = now.toISOString();
                    clock.textContent = clockFormatter.format(now);
                }
                updateClock();
                window.setInterval(updateClock, interfaceConfig.clockRefreshInterval);
                const navLinks = (Array.from(document.querySelectorAll("#mainNav a")) as HTMLAnchorElement[]);
                const setActiveNav = function setActiveNav(sectionId: string) {
                    let valueResult26;
                    const items32 = navLinks;
                    for (let index34 = 0; index34 < items32.length; index34++) {
                        {
                            const link = items32[index34];
                            link.classList.toggle("active", link.getAttribute("href") === ("#" + (sectionId)));
                        }
                    }
                    return valueResult26;
                };
                const observer = new IntersectionObserver(function updateActiveSection(entries) {
                    const items37 = entries;
                    for (let index39 = 0; index39 < items37.length; index39++) {
                        {
                            const entry = items37[index39];
                            if (entry.isIntersecting) {
                                setActiveNav(entry.target.id);
                            }
                        }
                    }
                }, { rootMargin: "-35% 0px -55%" });
                const items42 = (Array.from(document.querySelectorAll("main section[id]")) as HTMLElement[]);
                for (let index44 = 0; index44 < items42.length; index44++) {
                    {
                        const section = items42[index44];
                        observer.observe(section);
                    }
                }
                const hero = (document.querySelector(".hero") as HTMLElement);
                if (hero) {
                    new IntersectionObserver(function updateHeroNavigation(options47) {
                        const source48 = options47;
                        const entry = source48[0];
                        if (entry.isIntersecting) {
                            setActiveNav(hero.id);
                        }
                    }, { threshold: 0.55 }).observe(hero);
                }
                const reveal = new IntersectionObserver(function revealSections(entries) {
                    const items49 = entries;
                    for (let index51 = 0; index51 < items49.length; index51++) {
                        {
                            const entry = items49[index51];
                            const section = entry.target;
                            if (entry.isIntersecting) {
                                section.classList.add("is-visible");
                                // 保持已展示栏目可见，入场动画播放一次
                                reveal.unobserve(section);
                                undefined;
                            }
                            else {
                            }
                        }
                    }
                }, 
                // 提前 200px 开始入场，让快速下翻时内容尽量在进入视口前显现
                { rootMargin: "200px 0px", threshold: 0.01 });
                const items54 = (Array.from(document.querySelectorAll("[data-reveal]")) as HTMLElement[]);
                for (let index56 = 0; index56 < items54.length; index56++) {
                    {
                        const section = items54[index56];
                        reveal.observe(section);
                    }
                }
            }
            return { init: init, setMenuOpen: setMenuOpen, getLayoutTop: getLayoutTop, navigateToMapIndex: navigateToMapIndex };
        },
    };
})();
window.NiyunSiteNavigation = NiyunSiteNavigation;
