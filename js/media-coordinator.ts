(function initializeMediaCoordinator() {
    let valueResult1;
    const value1 = window.MEDIA_CONFIG;
    if (value1 === null || value1 === undefined) {
        valueResult1 = undefined;
    }
    else {
        valueResult1 = value1.backgroundMusic;
    }
    const config: MusicConfig = valueResult1 || {};
    const storageKey = "niyun-background-music-settings";
    const defaultVolume = Math.min(1, Math.max(0, Number(config.defaultVolume) || 0.03));
    const audio = document.createElement("audio");
    const settingsInput = (document.querySelector("#backgroundMusicEnabled") as HTMLInputElement);
    const volumeInput = (document.querySelector("#backgroundMusicVolume") as HTMLInputElement);
    const volumeOutput = (document.querySelector("#backgroundMusicVolumeValue") as HTMLOutputElement);
    const musicButton = (document.querySelector("#toggleMusic") as HTMLButtonElement);
    const restartButton = (document.querySelector("#restartMusic") as HTMLButtonElement);
    const carouselButton = (document.querySelector("#toggleMusicCarousel") as HTMLButtonElement);
    const nextButton = (document.querySelector("#nextMusic") as HTMLButtonElement);
    let valueResult3;
    const items3 = [];
    const part4 = Array.from((document.querySelectorAll("[name=backgroundMusicTrack]") as NodeListOf<HTMLInputElement>));
    for (let index5 = 0; index5 < part4.length; index5++) {
        items3.push(part4[index5]);
    }
    valueResult3 = items3;
    const trackInputs = valueResult3;
    let valueResult5;
    let valueResult7;
    const items11 = (config.tracks || []);
    const result14 = [];
    for (let index13 = 0; index13 < items11.length; index13++) {
        let valueResult9;
        {
            const track = items11[index13];
            let valueResult11;
            const value15 = window.MediaSecurity;
            if (value15 === null || value15 === undefined) {
                valueResult11 = undefined;
            }
            else {
                const value16 = value15.resolve;
                valueResult11 = value16.call(value15, track.url);
            }
            valueResult9 = (Object.assign({}, track, { url: valueResult11 || "" }));
        }
        result14.push(valueResult9);
    }
    valueResult7 = result14;
    const items7 = valueResult7;
    const result10 = [];
    for (let index9 = 0; index9 < items7.length; index9++) {
        let valueResult13;
        {
            const track = items7[index9];
            valueResult13 = track.url;
        }
        if (valueResult13) {
            result10.push(items7[index9]);
        }
    }
    valueResult5 = result10;
    const tracks = valueResult5;
    const trackStorageKey = "niyun-background-music-track";
    const carouselStorageKey = "niyun-background-music-carousel";
    let valueResult15;
    let valueResult17;
    {
        let searchFinished18 = false;
        const items21 = tracks;
        for (let index23 = 0; !searchFinished18 && index23 < items21.length; index23++) {
            let valueResult19;
            {
                const track = items21[index23];
                valueResult19 = track.id === config.defaultTrackId;
            }
            if (valueResult19) {
                valueResult17 = true;
                searchFinished18 = true;
            }
        }
        if (!searchFinished18) {
            valueResult17 = false;
            searchFinished18 = true;
        }
        if (valueResult17) {
            valueResult15 = config.defaultTrackId;
        }
        else {
            let valueResult21;
            const value26 = tracks[0];
            if (value26 === null || value26 === undefined) {
                valueResult21 = undefined;
            }
            else {
                valueResult21 = value26.id;
            }
            valueResult15 = valueResult21 || "";
        }
    }
    const defaultTrackId = valueResult15;
    let settings = { enabled: config.defaultEnabled === true, volume: defaultVolume };
    let selectedTrackId = defaultTrackId;
    let carouselEnabled = config.defaultCarouselEnabled === true;
    let wasPlayingBeforeVideo = false;
    let activeVideos = 0;
    let fadeTimer = null;
    let pauseRequestId = 0;
    audio.loop = true;
    audio.preload = "none";
    audio.volume = defaultVolume;
    audio.title = config.title || "背景音乐";
    try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
        let valueResult23;
        if (Object.hasOwn(saved, "enabled")) {
            valueResult23 = saved.enabled === true;
        }
        else {
            valueResult23 = settings.enabled;
        }
        settings.enabled = valueResult23;
        let valueResult25;
        if (Number.isFinite(Number(saved.volume))) {
            valueResult25 = Math.min(1, Math.max(0, Number(saved.volume)));
        }
        else {
            valueResult25 = defaultVolume;
        }
        settings.volume = valueResult25;
    }
    catch (_) {
    }
    const savedTrackId = window.localStorage.getItem(trackStorageKey);
    let valueResult27;
    {
        let searchFinished28 = false;
        const items30 = tracks;
        for (let index32 = 0; !searchFinished28 && index32 < items30.length; index32++) {
            let valueResult29;
            {
                const track = items30[index32];
                valueResult29 = track.id === savedTrackId;
            }
            if (valueResult29) {
                valueResult27 = true;
                searchFinished28 = true;
            }
        }
        if (!searchFinished28) {
            valueResult27 = false;
            searchFinished28 = true;
        }
    }
    if (valueResult27) {
        selectedTrackId = savedTrackId;
    }
    const savedCarousel = window.localStorage.getItem(carouselStorageKey);
    if (savedCarousel !== null) {
        carouselEnabled = savedCarousel === "true";
    }
    function getSelectedTrack() {
        let valueResult31;
        {
            let searchFinished32 = false;
            const items35 = tracks;
            for (let index37 = 0; !searchFinished32 && index37 < items35.length; index37++) {
                let valueResult33;
                {
                    const track = items35[index37];
                    valueResult33 = track.id === selectedTrackId;
                }
                if (valueResult33) {
                    valueResult31 = items35[index37];
                    searchFinished32 = true;
                }
            }
            if (!searchFinished32) {
                valueResult31 = undefined;
                searchFinished32 = true;
            }
        }
        return valueResult31 || tracks[0] || null;
    }
    function getSelectedTrackVolume() {
        const track = getSelectedTrack();
        let valueResult35;
        let valueResult37;
        const value41 = track;
        if (value41 === null || value41 === undefined) {
            valueResult37 = undefined;
        }
        else {
            valueResult37 = value41.volumeScale;
        }
        if (Number.isFinite(Number(valueResult37))) {
            valueResult35 = Math.min(1, Math.max(0, Number(track.volumeScale)));
        }
        else {
            valueResult35 = 1;
        }
        const scale = valueResult35;
        return settings.volume * scale;
    }
    function applySelectedTrack() {
        const track = getSelectedTrack();
        audio.pause();
        audio.currentTime = 0;
        let valueResult39;
        const value43 = track;
        if (value43 === null || value43 === undefined) {
            valueResult39 = undefined;
        }
        else {
            valueResult39 = value43.url;
        }
        audio.src = valueResult39 || "";
        audio.volume = getSelectedTrackVolume();
        audio.loop = !carouselEnabled;
        let valueResult41;
        const value45 = track;
        if (value45 === null || value45 === undefined) {
            valueResult41 = undefined;
        }
        else {
            valueResult41 = value45.label;
        }
        audio.title = valueResult41 || config.title || "背景音乐";
        const items47 = trackInputs;
        for (let index49 = 0; index49 < items47.length; index49++) {
            {
                const input = items47[index49];
                let valueResult47;
                const value51 = track;
                if (value51 === null || value51 === undefined) {
                    valueResult47 = undefined;
                }
                else {
                    valueResult47 = value51.id;
                }
                input.checked = input.value === valueResult47;
            }
        }
    }
    function saveSettings() {
        window.localStorage.setItem(storageKey, JSON.stringify(settings));
    }
    // 导航栏和设置面板都能控制音乐，要一起更新，避免两处显示不同状态
    function syncControls() {
        if (settingsInput) {
            settingsInput.checked = settings.enabled;
        }
        const hasMusic = Boolean(getSelectedTrack());
        if (settingsInput) {
            settingsInput.disabled = !hasMusic;
        }
        if (volumeInput) {
            volumeInput.value = String(Math.round(settings.volume * 100));
        }
        if (volumeOutput) {
            volumeOutput.value = ("" + (Math.round(settings.volume * 100)) + "%");
        }
        if (musicButton) {
            const videoPaused = activeVideos > 0;
            musicButton.setAttribute("aria-pressed", String(settings.enabled));
            let valueResult49;
            if (videoPaused) {
                valueResult49 = "视频播放中，背景音乐已暂停";
            }
            else {
                let valueResult51;
                if (settings.enabled) {
                    valueResult51 = "关闭背景音乐";
                }
                else {
                    valueResult51 = "开启背景音乐";
                }
                valueResult49 = valueResult51;
            }
            musicButton.setAttribute("aria-label", valueResult49);
            let valueResult53;
            if (videoPaused) {
                valueResult53 = "视频播放中，背景音乐已暂停";
            }
            else {
                let valueResult55;
                if (settings.enabled) {
                    valueResult55 = "关闭背景音乐";
                }
                else {
                    valueResult55 = "开启背景音乐";
                }
                valueResult53 = valueResult55;
            }
            musicButton.title = valueResult53;
            musicButton.dataset.playing = String(settings.enabled && !audio.paused && !videoPaused);
            musicButton.dataset.videoPaused = String(videoPaused);
            musicButton.disabled = !hasMusic;
        }
        if (restartButton) {
            restartButton.disabled = !hasMusic;
        }
        if (nextButton) {
            nextButton.disabled = tracks.length < 2 || activeVideos > 0;
        }
        if (carouselButton) {
            const canCarousel = tracks.length > 1;
            carouselButton.disabled = !canCarousel;
            carouselButton.setAttribute("aria-pressed", String(carouselEnabled));
            let valueResult57;
            if (carouselEnabled) {
                valueResult57 = "关闭音乐轮播";
            }
            else {
                valueResult57 = "开启音乐轮播";
            }
            carouselButton.setAttribute("aria-label", valueResult57);
            let valueResult59;
            if (carouselEnabled) {
                valueResult59 = "关闭音乐轮播";
            }
            else {
                valueResult59 = "开启音乐轮播";
            }
            carouselButton.title = valueResult59;
            carouselButton.dataset.enabled = String(carouselEnabled);
        }
    }
    // 渐变调整音量，新渐变接管旧任务
    function fadeTo(target, duration?) {
        if (duration === undefined) {
            duration = 320;
        }
        if (fadeTimer) {
            window.clearInterval(fadeTimer);
        }
        const start = audio.volume;
        const began = performance.now();
        fadeTimer = window.setInterval(function advanceVolumeFade() {
            const progress = Math.min(1, (performance.now() - began) / duration);
            audio.volume = start + (target - start) * progress;
            if (progress >= 1) {
                window.clearInterval(fadeTimer);
                fadeTimer = null;
            }
        }, 30);
    }
    // 浏览器可能禁止未经点击就播放声音，因此要等待播放结果并处理失败
    async function playMusic() {
        if (!getSelectedTrack() || !settings.enabled || activeVideos > 0) {
            return false;
        }
        pauseRequestId += 1;
        try {
            audio.volume = Math.min(audio.volume, settings.volume);
            await audio.play();
            fadeTo(getSelectedTrackVolume());
            syncControls();
            return true;
        }
        catch (_) {
            // 浏览器可能暂时拦截自动播放，保留用户的开启偏好，等待首次交互后重试
            syncControls();
            return false;
        }
    }
    function pauseMusic() {
        const requestId = ++pauseRequestId;
        // 先暂停声音再归零音量；延迟同步只在没有新播放请求时生效
        audio.pause();
        fadeTo(0, 180);
        window.setTimeout(function syncCompletedPause() {
            if (requestId === pauseRequestId) {
                syncControls();
            }
        }, 190);
        syncControls();
    }
    async function restartMusic() {
        if (!getSelectedTrack() || activeVideos > 0) {
            return false;
        }
        audio.currentTime = 0;
        settings.enabled = true;
        saveSettings();
        syncControls();
        return playMusic();
    }
    // 视频开始时让背景音乐让位，避免两路声音同时播放
    function handleVideoPlay(event) {
        if (event.target === audio) {
            return;
        }
        if (!(event.target instanceof HTMLVideoElement)) {
            return;
        }
        activeVideos += 1;
        wasPlayingBeforeVideo = !audio.paused;
        pauseMusic();
        syncControls();
    }
    // 视频结束或暂停后，再根据用户原来的设置决定是否恢复背景音乐
    function handleVideoStop(event) {
        if (!(event.target instanceof HTMLVideoElement)) {
            return;
        }
        activeVideos = Math.max(0, activeVideos - 1);
        if (activeVideos === 0 && wasPlayingBeforeVideo) {
            wasPlayingBeforeVideo = false;
            playMusic();
        }
        syncControls();
    }
    function playNextTrack() {
        if (!carouselEnabled || tracks.length < 2) {
            return;
        }
        let valueResult61;
        {
            let searchFinished62 = false;
            const items60 = tracks;
            for (let index62 = 0; !searchFinished62 && index62 < items60.length; index62++) {
                let valueResult63;
                {
                    const track = items60[index62];
                    valueResult63 = track.id === selectedTrackId;
                }
                if (valueResult63) {
                    valueResult61 = index62;
                    searchFinished62 = true;
                }
            }
            if (!searchFinished62) {
                valueResult61 = -1;
                searchFinished62 = true;
            }
        }
        const currentIndex = valueResult61;
        selectedTrackId = tracks[(currentIndex + 1) % tracks.length].id;
        window.localStorage.setItem(trackStorageKey, selectedTrackId);
        applySelectedTrack();
        syncControls();
        if (settings.enabled && activeVideos === 0) {
            playMusic();
        }
    }
    function skipToNextTrack() {
        if (tracks.length < 2 || activeVideos > 0) {
            return;
        }
        let valueResult65;
        {
            let searchFinished66 = false;
            const items65 = tracks;
            for (let index67 = 0; !searchFinished66 && index67 < items65.length; index67++) {
                let valueResult67;
                {
                    const track = items65[index67];
                    valueResult67 = track.id === selectedTrackId;
                }
                if (valueResult67) {
                    valueResult65 = index67;
                    searchFinished66 = true;
                }
            }
            if (!searchFinished66) {
                valueResult65 = -1;
                searchFinished66 = true;
            }
        }
        const currentIndex = valueResult65;
        selectedTrackId = tracks[(currentIndex + 1) % tracks.length].id;
        window.localStorage.setItem(trackStorageKey, selectedTrackId);
        applySelectedTrack();
        syncControls();
        if (settings.enabled) {
            playMusic();
        }
    }
    document.addEventListener("play", handleVideoPlay, true);
    document.addEventListener("pause", handleVideoStop, true);
    document.addEventListener("ended", handleVideoStop, true);
    document.addEventListener("emptied", handleVideoStop, true);
    audio.addEventListener("ended", playNextTrack);
    // 用户已开启音乐时尝试自动播放；若浏览器拦截，则在用户第一次操作页面时重试
    function resumeAfterUserGesture(event) {
        let valueResult69;
        const value70 = (event.target as HTMLElement).closest;
        if (value70 === null || value70 === undefined) {
            valueResult69 = undefined;
        }
        else {
            valueResult69 = value70.call((event.target as HTMLElement), "#toggleMusic, #restartMusic, #toggleMusicCarousel, #nextMusic, #backgroundMusicEnabled, [name=backgroundMusicTrack], #backgroundMusicVolume");
        }
        if ((valueResult69 as HTMLInputElement)) {
            return;
        }
        if (!settings.enabled || activeVideos > 0 || !audio.paused) {
            return;
        }
        playMusic();
    }
    const items72 = ["pointerdown", "keydown", "touchstart"];
    for (let index74 = 0; index74 < items72.length; index74++) {
        {
            const eventName = items72[index74];
            document.addEventListener(eventName, resumeAfterUserGesture, { once: true, passive: true });
        }
    }
    function toggleMusic() {
        if (!getSelectedTrack() || activeVideos > 0) {
            return;
        }
        settings.enabled = !settings.enabled;
        saveSettings();
        if (settings.enabled) {
            playMusic();
        }
        else {
            wasPlayingBeforeVideo = false;
            pauseMusic();
        }
        syncControls();
    }
    let valueResult75;
    const value77 = musicButton;
    if (value77 === null || value77 === undefined) {
        valueResult75 = undefined;
    }
    else {
        const value78 = value77.addEventListener;
        valueResult75 = value78.call(value77, "click", function handleClick(event) {
            event.stopPropagation();
            toggleMusic();
        });
    }
    let valueResult77;
    const value80 = musicButton;
    if (value80 === null || value80 === undefined) {
        valueResult77 = undefined;
    }
    else {
        const value81 = value80.addEventListener;
        valueResult77 = value81.call(value80, "pointerdown", function handlePointerdown(event) {
            return event.stopPropagation();
        });
    }
    let valueResult79;
    const value83 = settingsInput;
    if (value83 === null || value83 === undefined) {
        valueResult79 = undefined;
    }
    else {
        const value84 = value83.addEventListener;
        valueResult79 = value84.call(value83, "change", function handleChange() {
            settings.enabled = settingsInput.checked;
            saveSettings();
            if (settings.enabled) {
                playMusic();
            }
            else {
                wasPlayingBeforeVideo = false;
                pauseMusic();
            }
        });
    }
    let valueResult81;
    const value86 = restartButton;
    if (value86 === null || value86 === undefined) {
        valueResult81 = undefined;
    }
    else {
        const value87 = value86.addEventListener;
        valueResult81 = value87.call(value86, "click", restartMusic);
    }
    function toggleCarousel() {
        if (tracks.length < 2) {
            return;
        }
        carouselEnabled = !carouselEnabled;
        window.localStorage.setItem(carouselStorageKey, String(carouselEnabled));
        audio.loop = !carouselEnabled;
        syncControls();
    }
    let valueResult83;
    const value89 = carouselButton;
    if (value89 === null || value89 === undefined) {
        valueResult83 = undefined;
    }
    else {
        const value90 = value89.addEventListener;
        valueResult83 = value90.call(value89, "click", function handleClick(event) {
            event.stopPropagation();
            toggleCarousel();
        });
    }
    let valueResult85;
    const value92 = carouselButton;
    if (value92 === null || value92 === undefined) {
        valueResult85 = undefined;
    }
    else {
        const value93 = value92.addEventListener;
        valueResult85 = value93.call(value92, "pointerdown", function handlePointerdown(event) {
            return event.stopPropagation();
        });
    }
    let valueResult87;
    const value95 = restartButton;
    if (value95 === null || value95 === undefined) {
        valueResult87 = undefined;
    }
    else {
        const value96 = value95.addEventListener;
        valueResult87 = value96.call(value95, "pointerdown", function handlePointerdown(event) {
            return event.stopPropagation();
        });
    }
    let valueResult89;
    const value98 = nextButton;
    if (value98 === null || value98 === undefined) {
        valueResult89 = undefined;
    }
    else {
        const value99 = value98.addEventListener;
        valueResult89 = value99.call(value98, "click", function handleClick(event) {
            event.stopPropagation();
            skipToNextTrack();
        });
    }
    let valueResult91;
    const value101 = nextButton;
    if (value101 === null || value101 === undefined) {
        valueResult91 = undefined;
    }
    else {
        const value102 = value101.addEventListener;
        valueResult91 = value102.call(value101, "pointerdown", function handlePointerdown(event) {
            return event.stopPropagation();
        });
    }
    const items104 = trackInputs;
    for (let index106 = 0; index106 < items104.length; index106++) {
        {
            const input = items104[index106];
            input.addEventListener("change", function handleChange() {
                const shouldResume = settings.enabled && !audio.paused;
                selectedTrackId = input.value;
                window.localStorage.setItem(trackStorageKey, selectedTrackId);
                applySelectedTrack();
                syncControls();
                if (shouldResume && activeVideos === 0) {
                    playMusic();
                }
            });
        }
    }
    let valueResult97;
    const value109 = volumeInput;
    if (value109 === null || value109 === undefined) {
        valueResult97 = undefined;
    }
    else {
        const value110 = value109.addEventListener;
        valueResult97 = value110.call(value109, "input", function handleInput() {
            settings.volume = Number(volumeInput.value) / 100;
            audio.volume = getSelectedTrackVolume();
            saveSettings();
            syncControls();
        });
    }
    window.addEventListener("ai-pet-settings-reset", syncControls);
    window.addEventListener("media-settings-reset", function handleMediaSettingsReset() {
        settings = { enabled: config.defaultEnabled === true, volume: defaultVolume };
        selectedTrackId = defaultTrackId;
        carouselEnabled = config.defaultCarouselEnabled === true;
        window.localStorage.setItem(trackStorageKey, selectedTrackId);
        window.localStorage.setItem(carouselStorageKey, "false");
        wasPlayingBeforeVideo = false;
        applySelectedTrack();
        saveSettings();
        pauseMusic();
        syncControls();
    });
    window.MediaCoordinator = Object.freeze({
        playMusic: playMusic,
        pauseMusic: pauseMusic,
        restartMusic: restartMusic,
        getAudio: function () {
            return audio;
        },
        hasMusic: function () {
            return Boolean(getSelectedTrack());
        },
    });
    applySelectedTrack();
    syncControls();
    if (settings.enabled) {
        playMusic();
    }
})();
