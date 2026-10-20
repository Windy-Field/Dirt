/*
 * 山东 3D 地貌配置
 * 高度图来自山东省 30 米 DEM
 * 数据来源与授权情况见 assets/terrain/README.md
 */
window.SHANDONG_TERRAIN = {
    dataMode: "real-dem-preview",
    heightDataUrl: "./assets/terrain/shandong-heightmap.png",
    maskDataUrl: "./assets/terrain/shandong-mask.png",
    bounds: { west: 114.8102646639, east: 122.706, north: 38.3997238086, south: 34.3786 },
    attribution: "山东省 DEM 30 米 · 轻量高度图 · 非测绘测量工具",
    terrain: {
        baseDepth: 0.34,
        // 放大真实 DEM 的相对高差，让正上方视角仍能看出山地起伏
        reliefScale: 0.9,
        heightExaggeration: 1.35,
    }
};
