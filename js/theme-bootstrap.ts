(function restoreInitialTheme() {
    "use strict";
    // 这段脚本必须在主题样式表之前同步执行，确保浏览器第一次绘制就是保存的主题
    const schedule = Object.freeze({ lightStartHour: 6, lightEndHour: 18 });
    const storageKeys = ["niyun-display-settings", "nimeng-display-settings", "niyun-settings"];
    const supportedModes = new Set(["light", "dark", "auto"]);
    const root = document.documentElement;
    window.NIYUN_THEME_SCHEDULE = schedule;
    try {
        let valueResult1;
        {
            let searchFinished2 = false;
            let valueResult3;
            const items5 = storageKeys;
            const result8 = [];
            for (let index7 = 0; index7 < items5.length; index7++) {
                let valueResult5;
                {
                    const key = items5[index7];
                    valueResult5 = localStorage.getItem(key);
                }
                result8.push(valueResult5);
            }
            valueResult3 = result8;
            const items1 = valueResult3;
            for (let index3 = 0; !searchFinished2 && index3 < items1.length; index3++) {
                if (Boolean(items1[index3])) {
                    valueResult1 = items1[index3];
                    searchFinished2 = true;
                }
            }
            if (!searchFinished2) {
                valueResult1 = undefined;
                searchFinished2 = true;
            }
        }
        const savedValue = valueResult1 || "{}";
        const savedSettings = JSON.parse(savedValue);
        let valueResult7;
        if (supportedModes.has(savedSettings.themeMode)) {
            valueResult7 = savedSettings.themeMode;
        }
        else {
            valueResult7 = "auto";
        }
        const themeMode = valueResult7;
        const currentHour = new Date().getHours();
        const usesLightThemeNow = currentHour >= schedule.lightStartHour && currentHour < schedule.lightEndHour;
        let valueResult9;
        if (themeMode === "dark" || (themeMode === "auto" && !usesLightThemeNow)) {
            valueResult9 = "dark";
        }
        else {
            valueResult9 = "light";
        }
        const theme = valueResult9;
        root.dataset.theme = theme;
        root.dataset.themeMode = themeMode;
        root.style.colorScheme = theme;
        if (localStorage.getItem("niyun-opening-animation-enabled") === "false") {
            root.classList.add("skip-opening-loader");
        }
    }
    catch (_) {
        const currentHour = new Date().getHours();
        let valueResult11;
        if (currentHour >= schedule.lightStartHour && currentHour < schedule.lightEndHour) {
            valueResult11 = "light";
        }
        else {
            valueResult11 = "dark";
        }
        const theme = valueResult11;
        root.dataset.theme = theme;
        root.dataset.themeMode = "auto";
        root.style.colorScheme = theme;
    }
})();
