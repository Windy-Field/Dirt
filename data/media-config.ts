/*
 * 课程、音乐和牌具贴图配置
 * 本地资源使用 ./assets/ 路径，外部资源使用 HTTPS 并登记域名
 */
window.MEDIA_CONFIG = {
    /*
     * defaultTrackId 对应 tracks 中的 id，defaultVolume 范围为 0～1
     * volumeScale 是单曲音量系数，0.6 表示总音量的 60%
     */
    backgroundMusic: {
        title: "泥云智探背景音乐",
        defaultTrackId: "lane", // 默认曲目：古巷
        defaultVolume: 0.06, // 默认音量：6%
        defaultEnabled: false, // 默认关闭，用户可通过导航栏或设置开启
        defaultCarouselEnabled: false, // 默认关闭轮播，开启后按 tracks 顺序播放全部歌曲
        tracks: [
            { id: "lane", label: "lane", volumeScale: 1, url: "./assets/media/music/lane.mp3" },
            { id: "amazingGrace", label: "amazingGrace", volumeScale: 1, url: "./assets/media/music/amazingGrace.mp3" },
            { id: "eternal", label: "eternal", volumeScale: 0.6, url: "./assets/media/music/eternal.mp3" }
        ]
    },
    brandLogo: "",
    // 允许加载的外部媒体域名
    allowedExternalHosts: [
    ],
    // 课程 ID 与本地数据或数据库记录一致
    courses: {
        "COURSE-01": {
            videoUrl: "",
            posterUrl: "",
            resourceUrl: "./assets/courses/第一课时.pdf",
            resourceType: "PDF",
            resourceName: "第一课时教学课件 PDF",
            resourceFileName: "第一课时.pdf",
            slideBasePath: "./assets/courses/course-slides/course-01",
            slideCount: 24
        },
        "COURSE-02": {
            videoUrl: "",
            posterUrl: "",
            resourceUrl: "./assets/courses/第二课时 ppt.pdf",
            resourceType: "PDF",
            resourceName: "第二课时教学课件 PDF",
            resourceFileName: "第二课时 ppt.pdf",
            slideBasePath: "./assets/courses/course-slides/course-02",
            slideCount: 31
        },
        "COURSE-03": {
            videoUrl: "",
            posterUrl: "",
            resourceUrl: "./assets/courses/第三课时（1）.pdf",
            resourceType: "PDF",
            resourceName: "第三课时教学课件",
            resourceFileName: "第三课时（1）.pdf",
            slideBasePath: "./assets/courses/course-slides/course-03",
            slideCount: 22
        }
    },
    coursePack: {
        guideUrl: "./assets/courses/教案+学习单(2).docx",
        guideFileName: "封泥教案+学习单.docx",
        recapVideoUrl: "./assets/courses/course-recap.mp4",
        recapPosterUrl: "./assets/courses/course-recap-poster.jpg"
    },
    // 牌具贴图路径
    textures: {
        pokerSpadeKFront: "./assets/textures/poker/front/k.jpg",
        pokerDiamondJFront: "./assets/textures/poker/front/j.jpg",
        pokerDefaultBack: "./assets/textures/poker/back/default.png",
        mahjongWan1Front: "./assets/textures/mahjong/front/wan-1.png",
        mahjongEastFront: "./assets/textures/mahjong/front/east.png",
        mahjongDefaultBack: "./assets/textures/mahjong/back/default.jpg"
    }
};
// 所有媒体模块共用这一道地址校验，避免 javascript:、HTTP 明文或未授权外站资源
window.MediaSecurity = {
    resolve(value) {
        const source = String(value || "").trim();
        if (!source) {
            return "";
        }
        try {
            const url = new URL(source, window.location.href);
            if (url.origin === window.location.origin && ["http:", "https:", "file:"].includes(url.protocol)) {
                return url.href;
            }
            const allowedHosts = new Set(window.MEDIA_CONFIG.allowedExternalHosts || []);
            let valueResultmediaconfig1;
            if (url.protocol === "https:" && allowedHosts.has(url.hostname)) {
                valueResultmediaconfig1 = url.href;
            }
            else {
                valueResultmediaconfig1 = "";
            }
            return valueResultmediaconfig1;
        }
        catch (_) {
            return "";
        }
    }
};
