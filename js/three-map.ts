(function initializeTerrain() {
    const mapRoot = (document.querySelector("#shandongMap") as HTMLElement);
    if (mapRoot && window.THREE && window.SHANDONG_TERRAIN) {
        mapRoot.dataset.mapMode = mapRoot.dataset.mapMode || "terrain";
        const canvas = (mapRoot.querySelector("#shandongTerrainCanvas") as HTMLCanvasElement);
        const status = (mapRoot.querySelector("#mapTerrainStatus") as HTMLElement);
        const rotationInput = (mapRoot.querySelector("#mapRotation") as HTMLInputElement);
        const rotationOutput = (mapRoot.querySelector("#mapRotationValue") as HTMLOutputElement);
        const config = window.SHANDONG_TERRAIN;
        // ==================== 地图可配置项 ====================
        // 日常调整视角、缩放和网格精度时只修改这里，不必进入渲染逻辑。
        const MAP_VIEW = {
            terrainWidth: 18,
            // 高度图为 768 x 392；使用半分辨率网格，细节更清楚且浏览器负担可控。
            gridColumns: 768 / 2,
            gridRows: 392 / 2,
            defaultDistance: 18.5,
            // 最大放大比例：5 表示地图最多放大到默认大小的 5 倍。
            maxZoomFactor: 5,
            maxDistance: 22,
            minDistance: 0,
            wheelSpeed: 0.012,
            pinchSpeed: 0.025,
            panSpeed: 1,
            // 只允许向上抬升视角；弧度制，不会左右转向。
            maxElevation: 1.2,
            maxPanX: 7,
            maxPanY: 4,
            viewportPadding: 1.16,
            fitScreenPadding: 0.82,
            boundaryHeightOffset: 0.006,
            boundaryColor: 0xe6d4b5,
        };
        MAP_VIEW.minDistance = MAP_VIEW.defaultDistance / MAP_VIEW.maxZoomFactor;
        try {
            const scene = new THREE.Scene();
            // 正射相机没有透视缩短，更接近标准 2D 地图的观察方式。
            const camera = new THREE.OrthographicCamera(-9, 9, 6, -6, 0.1, 100);
            const renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            // 地图只需要柔和地形明暗，不启用实时阴影，避免出现灰色投影层。
            renderer.shadowMap.enabled = false;
            renderer.setClearColor(0x000000, 0);
            // 地图没有自动动画；只在相机、窗口或点位发生变化时请求一帧，避免离屏时持续占用 GPU。
            let mapVisible = true;
            let mapRenderFrame = 0;
            let markersNeedProjection = true;
            const requestMapRender = function requestMapRender() {
                if (!mapVisible || mapRenderFrame) {
                    return;
                }
                mapRenderFrame = window.requestAnimationFrame(function renderRequestedMapFrame() {
                    mapRenderFrame = 0;
                    if (!mapVisible) {
                        return;
                    }
                    if (markersNeedProjection) {
                        projectMarkers();
                        markersNeedProjection = false;
                    }
                    renderer.render(scene, camera);
                });
            };
            // 点位 DOM、平面图尺寸和地图容器可能在不同帧准备好。
            // 连续请求两帧可避开首次布局尚未稳定时得到的旧尺寸，不需要恢复持续渲染循环。
            const invalidateMarkerProjection = function invalidateMarkerProjection() {
                markersNeedProjection = true;
                requestMapRender();
                window.requestAnimationFrame(function reprojectAfterLayout() {
                    markersNeedProjection = true;
                    requestMapRender();
                });
            };
            window.addEventListener("shandong-map-mode-change", function handleShandongMapModeChange(event) {
                let valueResult1;
                let valueResult3;
                const value2 = event.detail;
                if (value2 === null || value2 === undefined) {
                    valueResult3 = undefined;
                }
                else {
                    valueResult3 = value2.mode;
                }
                if (valueResult3 === "flat") {
                    valueResult1 = "flat";
                }
                else {
                    valueResult1 = "terrain";
                }
                mapRoot.dataset.mapMode = valueResult1;
                invalidateMarkerProjection();
            });
            scene.add(new THREE.HemisphereLight(0xe8dfca, 0x18302b, 2.4));
            const sun = new THREE.DirectionalLight(0xffe4bd, 4.8);
            sun.position.set(-5, -3, 10);
            scene.add(sun);
            const coastLight = new THREE.DirectionalLight(0x8db9aa, 2.1);
            coastLight.position.set(8, 5, 4);
            scene.add(coastLight);
            const isFilePage = window.location.protocol === "file:";
            // 保持原始 DEM 的经纬度比例，避免把山东省纵向拉长。
            const terrainWidth = MAP_VIEW.terrainWidth;
            const terrainHeightDimension = (terrainWidth * (config.bounds.north - config.bounds.south)) /
                (config.bounds.east - config.bounds.west);
            const geometry = new THREE.PlaneGeometry(terrainWidth, terrainHeightDimension, MAP_VIEW.gridColumns - 1, MAP_VIEW.gridRows - 1);
            const material = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                vertexColors: true,
                roughness: 0.72,
                metalness: 0.02,
                clearcoat: 0.08,
                clearcoatRoughness: 0.82,
                side: THREE.DoubleSide,
                transparent: true,
                alphaTest: 0.5,
            });
            let heightSamples = null;
            let maskSamples = null;
            let maskTexture = null;
            let heightWidth = 0;
            let heightHeight = 0;
            // 只把公开的本地灰度高度图读入内存，不在浏览器中加载原始 GeoTIFF。
            // 读取表示地面高低的灰度图及省界遮罩；本地双击模式使用内嵌数据。
            function loadHeightMap() {
                const inline = window.SHANDONG_TERRAIN_INLINE;
                if (isFilePage && inline) {
                    heightWidth = inline.width;
                    heightHeight = inline.height;
                    heightSamples = Uint8Array.from(atob(inline.heightBase64), function (char) {
                        return char.charCodeAt(0);
                    });
                    maskSamples = Uint8Array.from(atob(inline.maskBase64), function (char) {
                        return char.charCodeAt(0);
                    });
                    const rgbaMask = new Uint8Array(maskSamples.length * 4);
                    for (let index = 0; index < maskSamples.length; index += 1) {
                        const value = maskSamples[index];
                        rgbaMask[index * 4] = value;
                        rgbaMask[index * 4 + 1] = value;
                        rgbaMask[index * 4 + 2] = value;
                        rgbaMask[index * 4 + 3] = value;
                    }
                    maskTexture = new THREE.DataTexture(rgbaMask, heightWidth, heightHeight, THREE.RGBAFormat, THREE.UnsignedByteType);
                    maskTexture.colorSpace = THREE.NoColorSpace;
                    // DataTexture 默认不翻转 Y；高度数组和普通图片都按“北到南”读取，必须统一方向。
                    maskTexture.flipY = true;
                    maskTexture.minFilter = THREE.NearestFilter;
                    maskTexture.magFilter = THREE.NearestFilter;
                    maskTexture.generateMipmaps = false;
                    maskTexture.needsUpdate = true;
                    material.alphaMap = maskTexture;
                    material.needsUpdate = true;
                    applyHeightMap();
                    mapRoot.dataset.terrainBoundary = "dem-mask-inline";
                    status.textContent = config.attribution;
                    return;
                }
                if (!config.heightDataUrl) {
                    mapRoot.dataset.terrainData = "fallback";
                    return;
                }
                const image = new Image();
                image.onload = function readLoadedHeightMap() {
                    const heightCanvas = document.createElement("canvas");
                    heightCanvas.width = image.naturalWidth;
                    heightCanvas.height = image.naturalHeight;
                    const context = heightCanvas.getContext("2d", { willReadFrequently: true });
                    context.drawImage(image, 0, 0);
                    let pixels;
                    try {
                        pixels = context.getImageData(0, 0, image.naturalWidth, image.naturalHeight).data;
                    }
                    catch (_) {
                        heightSamples = null;
                        status.textContent = "高度图读取受浏览器安全限制 · 请使用 node server.js";
                        return;
                    }
                    heightWidth = image.naturalWidth;
                    heightHeight = image.naturalHeight;
                    heightSamples = new Uint8Array(heightWidth * heightHeight);
                    for (let index = 0; index < heightSamples.length; index += 1)
                        heightSamples[index] = pixels[index * 4];
                    applyHeightMap();
                };
                image.onerror = function handleHeightMapError() {
                    heightSamples = null;
                };
                image.src = config.heightDataUrl;
                if (isFilePage) {
                    return;
                }
                const maskImage = new Image();
                maskImage.onload = function readLoadedProvinceMask() {
                    // 读取掩膜像素，供高度采样使用；可见边界由 alphaMap 负责裁剪。
                    const maskCanvas = document.createElement("canvas");
                    maskCanvas.width = maskImage.naturalWidth;
                    maskCanvas.height = maskImage.naturalHeight;
                    const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
                    maskContext.drawImage(maskImage, 0, 0);
                    const maskPixels = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
                    heightWidth = heightWidth || maskCanvas.width;
                    heightHeight = heightHeight || maskCanvas.height;
                    maskSamples = new Uint8Array(maskCanvas.width * maskCanvas.height);
                    for (let index = 0; index < maskSamples.length; index += 1)
                        maskSamples[index] = maskPixels[index * 4];
                    maskTexture = new THREE.Texture(maskImage);
                    maskTexture.colorSpace = THREE.NoColorSpace;
                    maskTexture.minFilter = THREE.NearestFilter;
                    maskTexture.magFilter = THREE.NearestFilter;
                    maskTexture.generateMipmaps = false;
                    maskTexture.needsUpdate = true;
                    material.alphaMap = maskTexture;
                    material.transparent = true;
                    material.alphaTest = 0.5;
                    material.needsUpdate = true;
                    applyHeightMap();
                    mapRoot.dataset.terrainBoundary = "dem-mask";
                };
                maskImage.src = config.maskDataUrl;
            }
            // 把地图上的相对位置换成图片像素，取出该位置的高度值。
            function sampleHeight(percentX, percentY) {
                if (!heightSamples) {
                    return null;
                }
                const x = Math.min(heightWidth - 1, Math.max(0, Math.round((percentX / 100) * (heightWidth - 1))));
                const y = Math.min(heightHeight - 1, Math.max(0, Math.round((percentY / 100) * (heightHeight - 1))));
                return heightSamples[y * heightWidth + x] / 255;
            }
            // 从遮罩图判断当前位置是否属于省内，避免省外也长出地形。
            function sampleMask(percentX, percentY) {
                if (!maskSamples) {
                    return 255;
                }
                const x = Math.min(heightWidth - 1, Math.max(0, Math.round((percentX / 100) * (heightWidth - 1))));
                const y = Math.min(heightHeight - 1, Math.max(0, Math.round((percentY / 100) * (heightHeight - 1))));
                return maskSamples[y * heightWidth + x];
            }
            // 按高度图调整网格顶点，并重新计算表面方向，让光照能表现山地起伏。
            function applyHeightMap() {
                if (!heightSamples) {
                    return;
                }
                const sampledHeights = new Float32Array(position.count);
                const validVertices = new Uint8Array(position.count);
                for (let index = 0; index < position.count; index += 1) {
                    const percentX = ((position.getX(index) + terrainWidth / 2) / terrainWidth) * 100;
                    const percentY = ((terrainHeightDimension / 2 - position.getY(index)) / terrainHeightDimension) * 100;
                    const value = sampleHeight(percentX, percentY);
                    const maskValue = sampleMask(percentX, percentY);
                    let valueResult5;
                    if (value === null) {
                        valueResult5 = config.terrain.baseDepth + 0.12;
                    }
                    else {
                        valueResult5 = config.terrain.baseDepth +
                            value * config.terrain.reliefScale * config.terrain.heightExaggeration +
                            0.12;
                    }
                    const height = valueResult5;
                    sampledHeights[index] = height;
                    let valueResult7;
                    if (!maskSamples || maskValue >= 128) {
                        valueResult7 = 1;
                    }
                    else {
                        valueResult7 = 0;
                    }
                    validVertices[index] = valueResult7;
                }
                // 省外像元仍需有连续高度，否则透明边界下会暴露出陡直的 DEM 断面。
                if (maskSamples) {
                    const columns = MAP_VIEW.gridColumns;
                    const rows = Math.floor(position.count / columns);
                    for (let index = 0; index < position.count; index += 1) {
                        if (validVertices[index])
                            continue;
                        const column = index % columns;
                        const row = Math.floor(index / columns);
                        let replacement = sampledHeights[index];
                        for (let radius = 1; radius < Math.max(columns, rows); radius += 1) {
                            let found = false;
                            for (let offset = -radius; offset <= radius && !found; offset += 1) {
                                const candidates = [
                                    [column + offset, row - radius],
                                    [column + offset, row + radius],
                                    [column - radius, row + offset],
                                    [column + radius, row + offset],
                                ];
                                for (let pointIndex = 0; pointIndex < candidates.length; pointIndex += 1) {
                                    const candidate = candidates[pointIndex];
                                    const candidateColumn = candidate[0];
                                    const candidateRow = candidate[1];
                                    if (candidateColumn < 0 ||
                                        candidateColumn >= columns ||
                                        candidateRow < 0 ||
                                        candidateRow >= rows)
                                        continue;
                                    const candidateVertexIndex = candidateRow * columns + candidateColumn;
                                    if (validVertices[candidateVertexIndex]) {
                                        replacement = sampledHeights[candidateVertexIndex];
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            if (found)
                                break;
                        }
                        sampledHeights[index] = replacement;
                    }
                }
                for (let index = 0; index < position.count; index += 1) {
                    position.setZ(index, sampledHeights[index]);
                }
                carveRiverChannels();
                // CPU 改顶点不会自动上传 GPU；漏掉此标记会让覆盖物悬在旧平面上。
                position.needsUpdate = true;
                geometry.computeVertexNormals();
                geometry.computeBoundingSphere();
                drawAdministrativeBoundaries();
                invalidateMarkerProjection();
                mapRoot.dataset.terrainData = "dem";
            }
            // 高度图加载前先用平面占位，加载完成后由 applyHeightMap 覆盖。
            const position = geometry.getAttribute("position");
            const terrainColors = position.clone();
            geometry.setAttribute("color", terrainColors);
            for (let index = 0; index < position.count; index += 1) {
                position.setZ(index, 0.02);
                terrainColors.setXYZ(index, 0.091, 0.184, 0.147);
            }
            geometry.computeVertexNormals();
            // Huang 为黄河；源数据 Yi 走向存疑，沂河改用明确标注的参考图补绘。
            function getDisplayedRivers() {
                const publicRiverNames = new Set(["Huang"]);
                const referenceRiverNames = new Set(["沂河", "大汶河", "徒骇河", "小清河", "潍河", "大沽河", "京杭运河（山东段示意）"]);
                let valueResult9;
                const items6 = [];
                let valueResult11;
                const items9 = (window.SHANDONG_RIVERS || []);
                const result12 = [];
                for (let index11 = 0; index11 < items9.length; index11++) {
                    let valueResult13;
                    {
                        const river = items9[index11];
                        valueResult13 = publicRiverNames.has(river.name);
                    }
                    if (valueResult13) {
                        result12.push(items9[index11]);
                    }
                }
                valueResult11 = result12;
                const part7 = Array.from(valueResult11);
                for (let index8 = 0; index8 < part7.length; index8++) {
                    items6.push(part7[index8]);
                }
                let valueResult15;
                const items16 = (window.SHANDONG_REFERENCE_RIVERS || []);
                const result19 = [];
                for (let index18 = 0; index18 < items16.length; index18++) {
                    let valueResult17;
                    {
                        const river = items16[index18];
                        valueResult17 = referenceRiverNames.has(river.name);
                    }
                    if (valueResult17) {
                        result19.push(items16[index18]);
                    }
                }
                valueResult15 = result19;
                const part14 = Array.from(valueResult15);
                for (let index15 = 0; index15 < part14.length; index15++) {
                    items6.push(part14[index15]);
                }
                valueResult9 = items6;
                return valueResult9;
            }
            // 先把经纬度折线转成模型线段，距离计算不再关心数据源格式。
            function createRiverSegments() {
                const segments = [];
                const rivers = getDisplayedRivers();
                let valueResult19;
                const items22 = rivers;
                const result25 = [];
                for (let index24 = 0; index24 < items22.length; index24++) {
                    let valueResult21;
                    {
                        const river = items22[index24];
                        valueResult21 = river.name;
                    }
                    result25.push(valueResult21);
                }
                valueResult19 = result25;
                mapRoot.dataset.displayedRivers = valueResult19.join(",");
                const items27 = rivers;
                for (let index29 = 0; index29 < items27.length; index29++) {
                    {
                        const river = items27[index29];
                        const coordinates = extendRiverMouth(river);
                        let valueResult27;
                        const items31 = coordinates;
                        const result34 = [];
                        for (let index33 = 0; index33 < items31.length; index33++) {
                            let valueResult29;
                            {
                                const options35 = items31[index33];
                                const source36 = options35;
                                const longitude = source36[0];
                                const latitude = source36[1];
                                valueResult29 = [
                                    (longitude - config.bounds.west) / (config.bounds.east - config.bounds.west) * terrainWidth - terrainWidth / 2,
                                    terrainHeightDimension / 2 - (config.bounds.north - latitude) / (config.bounds.north - config.bounds.south) * terrainHeightDimension,
                                ];
                            }
                            result34.push(valueResult29);
                        }
                        {
                            valueResult27 = result34;
                            const points = valueResult27;
                            for (let index = 1; index < points.length; index++)
                                segments.push([points[index - 1], points[index]]);
                        }
                    }
                }
                return segments;
            }
            // 仅补绘数据明确标出的入海末端；上限为 0.25 度，找不到海岸就保留原端点。
            function extendRiverMouth(river) {
                const points = river.coordinates;
                if (!river.extendEndToCoast || !maskSamples || points.length < 2) {
                    return points;
                }
                const end = points[points.length - 1];
                const previous = points[points.length - 2];
                const dx = end[0] - previous[0];
                const dy = end[1] - previous[1];
                const length = Math.hypot(dx, dy);
                if (!length) {
                    return points;
                }
                function isLand(options39: number[]) {
                    const source40 = options39;
                    const longitude = source40[0];
                    const latitude = source40[1];
                    const x = (longitude - config.bounds.west) / (config.bounds.east - config.bounds.west) * 100;
                    const y = (config.bounds.north - latitude) / (config.bounds.north - config.bounds.south) * 100;
                    return x >= 0 && x <= 100 && y >= 0 && y <= 100 && sampleMask(x, y) >= 128;
                }
                if (!isLand(end)) {
                    return points;
                }
                for (let distance = 0.002; distance <= 0.25; distance += 0.002) {
                    const next = [end[0] + dx / length * distance, end[1] + dy / length * distance];
                    // 补到第一个海面像元，显示仍由 alphaMap 裁在省界上，不跨海连接岛屿。
                    if (!isLand(next)) {
                        let valueResult31;
                        const items41 = [];
                        const part42 = Array.from(points);
                        for (let index43 = 0; index43 < part42.length; index43++) {
                            items41.push(part42[index43]);
                        }
                        items41.push(next);
                        valueResult31 = items41;
                        return valueResult31;
                    }
                }
                return points;
            }
            function distanceToRiverSegment(x, y, start, end) {
                const dx = end[0] - start[0];
                const dy = end[1] - start[1];
                const lengthSquared = dx * dx + dy * dy;
                let valueResult33;
                if (lengthSquared) {
                    valueResult33 = THREE.MathUtils.clamp(((x - start[0]) * dx + (y - start[1]) * dy) / lengthSquared, 0, 1);
                }
                else {
                    valueResult33 = 0;
                }
                // 投影限制在线段内；重复坐标退化为点，避免除以零。
                const projection = valueResult33;
                return Math.hypot(x - start[0] - projection * dx, y - start[1] - projection * dy);
            }
            function carveRiverChannels() {
                const segments = createRiverSegments();
                let valueResult35;
                const items46 = [];
                const part47 = Array.from((window.SHANDONG_LAKES || []));
                for (let index48 = 0; index48 < part47.length; index48++) {
                    items46.push(part47[index48]);
                }
                const part49 = Array.from((window.SHANDONG_REFERENCE_LAKES || []));
                for (let index50 = 0; index50 < part49.length; index50++) {
                    items46.push(part49[index50]);
                }
                valueResult35 = items46;
                // 公开单湖与参考图补绘合并判断水面，重叠处只开挖一次。
                const lakes = valueResult35;
                // 半径为 0.85 个网格间距，不是实测河宽；每次都在新采样的 DEM 上开槽。
                const radius = terrainWidth / (MAP_VIEW.gridColumns - 1) * 0.85;
                const distances = new Float64Array(position.count).fill(radius);
                const columns = MAP_VIEW.gridColumns;
                const rows = MAP_VIEW.gridRows;
                const cellWidth = terrainWidth / (columns - 1);
                const cellHeight = terrainHeightDimension / (rows - 1);
                // 只遍历线段包围盒内的顶点，避免每个顶点扫描整个省的水系。
                for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
                    const segment = segments[segmentIndex];
                    const start = segment[0];
                    const end = segment[1];
                    const left = Math.max(0, Math.floor((Math.min(start[0], end[0]) - radius + terrainWidth / 2) / cellWidth));
                    const right = Math.min(columns - 1, Math.ceil((Math.max(start[0], end[0]) + radius + terrainWidth / 2) / cellWidth));
                    const top = Math.max(0, Math.floor((terrainHeightDimension / 2 - Math.max(start[1], end[1]) - radius) / cellHeight));
                    const bottom = Math.min(rows - 1, Math.ceil((terrainHeightDimension / 2 - Math.min(start[1], end[1]) + radius) / cellHeight));
                    for (let row = top; row <= bottom; row++) {
                        for (let column = left; column <= right; column++) {
                            const index = row * columns + column;
                            distances[index] = Math.min(distances[index], distanceToRiverSegment(position.getX(index), position.getY(index), start, end));
                        }
                    }
                }
                let carved = 0;
                let lakeVertices = 0;
                for (let index = 0; index < position.count; index++) {
                    const longitude = config.bounds.west + (position.getX(index) + terrainWidth / 2) / terrainWidth * (config.bounds.east - config.bounds.west);
                    const latitude = config.bounds.north - (terrainHeightDimension / 2 - position.getY(index)) / terrainHeightDimension * (config.bounds.north - config.bounds.south);
                    let valueResult37;
                    {
                        let searchFinished38 = false;
                        const items52 = lakes;
                        for (let index54 = 0; !searchFinished38 && index54 < items52.length; index54++) {
                            let valueResult39;
                            {
                                const lake = items52[index54];
                                {
                                    let conditionValue45 = isPointInLakeRing(longitude, latitude, lake.rings[0]);
                                    if (conditionValue45) {
                                        let valueResult41;
                                        {
                                            let searchFinished42 = false;
                                            const items56 = lake.rings.slice(1);
                                            for (let index58 = 0; !searchFinished42 && index58 < items56.length; index58++) {
                                                let valueResult43;
                                                {
                                                    const ring = items56[index58];
                                                    valueResult43 = isPointInLakeRing(longitude, latitude, ring);
                                                }
                                                if (valueResult43) {
                                                    valueResult41 = true;
                                                    searchFinished42 = true;
                                                }
                                            }
                                            if (!searchFinished42) {
                                                valueResult41 = false;
                                                searchFinished42 = true;
                                            }
                                        }
                                        conditionValue45 = !valueResult41;
                                    }
                                    valueResult39 = conditionValue45;
                                }
                            }
                            if (valueResult39) {
                                valueResult37 = true;
                                searchFinished38 = true;
                            }
                        }
                        if (!searchFinished38) {
                            valueResult37 = false;
                            searchFinished38 = true;
                        }
                    }
                    const inLake = valueResult37;
                    let valueResult46;
                    if (inLake) {
                        valueResult46 = 1;
                    }
                    else {
                        valueResult46 = 1 - distances[index] / radius;
                    }
                    // 湖面按多边形填满，内环保留岛屿；与河槽重叠时只开挖一次。
                    const amount = valueResult46;
                    if (inLake) {
                        lakeVertices++;
                    }
                    position.setZ(index, position.getZ(index) - amount * 0.055);
                    terrainColors.setXYZ(index, 0.091 + amount * (0.025 - 0.091), 0.184 + amount * (0.32 - 0.184), 0.147 + amount * (0.48 - 0.147));
                    if (amount > 0) {
                        carved++;
                    }
                }
                terrainColors.needsUpdate = true;
                mapRoot.dataset.riverVertices = String(carved);
                mapRoot.dataset.lakeVertices = String(lakeVertices);
                let valueResult48;
                const items63 = getDisplayedRivers();
                const result66 = [];
                for (let index65 = 0; index65 < items63.length; index65++) {
                    let valueResult50;
                    {
                        const river = items63[index65];
                        valueResult50 = river.source === "reference-sketch";
                    }
                    if (valueResult50) {
                        result66.push(items63[index65]);
                    }
                }
                valueResult48 = result66;
                mapRoot.dataset.referenceRivers = String(valueResult48.length);
            }
            // 水平射线奇偶规则，只判断水面归属，不推算真实水深。
            function isPointInLakeRing(x, y, ring) {
                let inside = false;
                for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
                    const source68 = ring[index];
                    const ax = source68[0];
                    const ay = source68[1];
                    const source69 = ring[previous];
                    const bx = source69[0];
                    const by = source69[1];
                    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) {
                        inside = !inside;
                    }
                }
                return inside;
            }
            const terrain = new THREE.Mesh(geometry, material);
            terrain.castShadow = false;
            terrain.receiveShadow = false;
            // 默认与标准 2D 地图一致：北朝上、东朝右，不额外旋转或倾斜。
            terrain.position.y = 0.12;
            scene.add(terrain);
            const boundaryMaterial = new THREE.LineBasicMaterial({
                color: MAP_VIEW.boundaryColor,
                transparent: true,
                opacity: 0.72,
                depthTest: true,
                depthWrite: false,
            });
            const administrativeBoundaries = new THREE.Group();
            administrativeBoundaries.name = "山东省地级市边界";
            terrain.add(administrativeBoundaries);
            let boundaryFitPoints = [];
            function isInsideProvince(percentX, percentY) {
                if (!maskSamples) {
                    return true;
                }
                // 外轮廓已由共享边筛选排除，不再内缩省界，否则市界会提前断开。
                return percentX >= 0 && percentX <= 100 && percentY >= 0 && percentY <= 100 &&
                    sampleMask(percentX, percentY) >= 128;
            }
            // 将经纬度转换为模型坐标，边界线还要贴近当地地形高度。
            function createBoundaryPoint(longitude, latitude) {
                const percentX = ((longitude - config.bounds.west) / (config.bounds.east - config.bounds.west)) * 100;
                const percentY = ((config.bounds.north - latitude) / (config.bounds.north - config.bounds.south)) * 100;
                if (!isInsideProvince(percentX, percentY)) {
                    return null;
                }
                return new THREE.Vector3((percentX / 100) * terrainWidth - terrainWidth / 2, terrainHeightDimension / 2 - (percentY / 100) * terrainHeightDimension, terrainHeight(percentX, percentY) + MAP_VIEW.boundaryHeightOffset);
            }
            // 在线段跨过遮罩时二分查找陆地侧交点，避免丢掉最后一个网格间距。
            function findBoundaryCoastPoint(inside, outside) {
                let land = inside;
                let sea = outside;
                for (let iteration = 0; iteration < 18; iteration++) {
                    const middle = [(land[0] + sea[0]) / 2, (land[1] + sea[1]) / 2];
                    if (createBoundaryPoint(middle[0], middle[1])) {
                        land = middle;
                    }
                    else {
                        sea = middle;
                    }
                }
                return createBoundaryPoint(land[0], land[1]);
            }
            // 沿网格边和对角线切分：每段位于同一三角面内，插值高度才能全程贴地。
            function splitBoundaryEdge(start, end) {
                const columns = MAP_VIEW.gridColumns - 1;
                const rows = MAP_VIEW.gridRows - 1;
                const gridPoint = function (options70) {
                    const source71 = options70;
                    const longitude = source71[0];
                    const latitude = source71[1];
                    return [
                        (longitude - config.bounds.west) / (config.bounds.east - config.bounds.west) * columns,
                        (config.bounds.north - latitude) / (config.bounds.north - config.bounds.south) * rows,
                    ];
                };
                const source72 = gridPoint(start);
                const x0 = source72[0];
                const y0 = source72[1];
                const source73 = gridPoint(end);
                const x1 = source73[0];
                const y1 = source73[1];
                const fractions = [0, 1];
                const fractionRanges = [[x0, x1], [y0, y1], [x0 + y0, x1 + y1]];
                for (let rangeIndex = 0; rangeIndex < fractionRanges.length; rangeIndex += 1) {
                    const range = fractionRanges[rangeIndex];
                    const a = range[0];
                    const b = range[1];
                    if (Math.abs(b - a) < 1e-10)
                        continue;
                    for (let edge = Math.floor(Math.min(a, b)) + 1; edge < Math.max(a, b); edge++) {
                        fractions.push((edge - a) / (b - a));
                    }
                }
                let valueResult52;
                let valueResult54;
                const items78 = [];
                const part79 = Array.from(new Set(fractions));
                for (let index80 = 0; index80 < part79.length; index80++) {
                    items78.push(part79[index80]);
                }
                valueResult54 = items78;
                const items74 = valueResult54.sort(function (a, b) {
                    return a - b;
                });
                const result77 = [];
                for (let index76 = 0; index76 < items74.length; index76++) {
                    let valueResult56;
                    {
                        const t = items74[index76];
                        valueResult56 = [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
                    }
                    result77.push(valueResult56);
                }
                valueResult52 = result77;
                return valueResult52;
            }
            // 端点排序让正向和反向线段使用同一个键；保留源坐标精度，不做模糊吸附。
            function edgeKey(start, end) {
                return [start.join(','), end.join(',')].sort().join('|');
            }
            function createExcludedBoundaryEdges() {
                // DataV 东营/滨州的独立四边形共同边：行政含义待核实，暂不作为市界展示。
                // 精确排除已报告的四条边，不按面积过滤，避免隐藏其他真实飞地或闭合边界。
                const unverifiedRectangle = [
                    [118.40779, 38.026212], [118.419951, 38.025503],
                    [118.419319, 38.053119], [118.410001, 38.053277], [118.40779, 38.026212],
                ];
                let valueResult58;
                const items83 = unverifiedRectangle.slice(1);
                const result86 = [];
                for (let index85 = 0; index85 < items83.length; index85++) {
                    let valueResult60;
                    {
                        const point = items83[index85];
                        const index = index85;
                        valueResult60 = edgeKey(unverifiedRectangle[index], point);
                    }
                    result86.push(valueResult60);
                }
                valueResult58 = result86;
                return new Set(valueResult58);
            }
            function collectBoundaryOwners(prefectures) {
                const edgeOwners = new Map();
                const items88 = prefectures;
                for (let index90 = 0; index90 < items88.length; index90++) {
                    {
                        const prefecture = items88[index90];
                        const items92 = prefecture.rings;
                        for (let index94 = 0; index94 < items92.length; index94++) {
                            {
                                const ring = items92[index94];
                                for (let index = 1; index < ring.length; index++) {
                                    const key = edgeKey(ring[index - 1], ring[index]);
                                    if (!edgeOwners.has(key)) {
                                        edgeOwners.set(key, new Set());
                                    }
                                    edgeOwners.get(key).add(prefecture.name);
                                }
                            }
                        }
                    }
                }
                return edgeOwners;
            }
            // 顺序：清理旧显存 -> 统计共享边 -> 排除/去重 -> 切分贴地 -> 更新全貌视野。
            function drawAdministrativeBoundaries() {
                if (!heightSamples || !Array.isArray(window.SHANDONG_PREFECTURES)) {
                    return;
                }
                const items98 = administrativeBoundaries.children;
                for (let index100 = 0; index100 < items98.length; index100++) {
                    {
                        const line = items98[index100];
                        if (line instanceof THREE.Line) {
                            line.geometry.dispose();
                        }
                    }
                }
                administrativeBoundaries.clear();
                boundaryFitPoints = [];
                const edgeOwners = collectBoundaryOwners(window.SHANDONG_PREFECTURES);
                const excludedEdges = createExcludedBoundaryEdges();
                const drawnEdges = new Set();
                const items103 = window.SHANDONG_PREFECTURES;
                for (let index105 = 0; index105 < items103.length; index105++) {
                    {
                        const prefecture = items103[index105];
                        const items107 = prefecture.rings;
                        for (let index109 = 0; index109 < items107.length; index109++) {
                            {
                                const ring = items107[index109];
                                let segment = [];
                                let previousCoordinate = null;
                                let previousInside = false;
                                const flushSegment = function flushSegment() {
                                    if (segment.length < 2) {
                                        segment = [];
                                        return;
                                    }
                                    for (let segmentIndex = 0; segmentIndex < segment.length; segmentIndex += 1) {
                                        boundaryFitPoints.push(segment[segmentIndex]);
                                    }
                                    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(segment), boundaryMaterial);
                                    line.userData.prefecture = prefecture.name;
                                    line.renderOrder = 10;
                                    administrativeBoundaries.add(line);
                                    segment = [];
                                };
                                for (let index = 1; index < ring.length; index++) {
                                    const key = edgeKey(ring[index - 1], ring[index]);
                                    if (excludedEdges.has(key) || edgeOwners.get(key).size < 2 || drawnEdges.has(key)) {
                                        // 被跳过的边必须断开，不能让其前后端点被自动连成新的直线。
                                        flushSegment();
                                        previousCoordinate = null;
                                        continue;
                                    }
                                    drawnEdges.add(key);
                                    const points = splitBoundaryEdge(ring[index - 1], ring[index]);
                                    const items111 = points;
                                    for (let index113 = 0; index113 < items111.length; index113++) {
                                        {
                                            const options115 = items111[index113];
                                            const pointIndex = index113;
                                            const source116 = options115;
                                            const longitude = source116[0];
                                            const latitude = source116[1];
                                            if (segment.length && pointIndex === 0) {
                                                undefined;
                                            }
                                            else {
                                                const point = createBoundaryPoint(longitude, latitude);
                                                const coordinate = [longitude, latitude];
                                                if (previousCoordinate && Boolean(point) !== previousInside) {
                                                    let valueResult86;
                                                    if (point) {
                                                        valueResult86 = findBoundaryCoastPoint(coordinate, previousCoordinate);
                                                    }
                                                    else {
                                                        valueResult86 = findBoundaryCoastPoint(previousCoordinate, coordinate);
                                                    }
                                                    const coast = valueResult86;
                                                    if (coast) {
                                                        segment.push(coast);
                                                    }
                                                }
                                                if (point) {
                                                    segment.push(point);
                                                }
                                                else {
                                                    flushSegment();
                                                }
                                                previousCoordinate = coordinate;
                                                previousInside = Boolean(point);
                                            }
                                        }
                                    }
                                }
                                flushSegment();
                            }
                        }
                    }
                }
                mapRoot.dataset.administrativeBoundaries = String(administrativeBoundaries.children.length);
                fitFullView();
            }
            const cameraTarget = new THREE.Vector3(0, 0, 0);
            // 默认拉远，保证完整山东轮廓不会被视口裁掉。
            let cameraDistance = MAP_VIEW.defaultDistance;
            let fitZoom = 1;
            // 默认正上方；抬升角只由右侧滑条控制。
            let cameraElevation = 0;
            let isDragging = false;
            let lastPointer = { x: 0, y: 0 };
            const activePointers = new Map();
            let pinchDistance = 0;
            let suppressGestureClick = false;
            // 根据旋转、缩放和拖动状态摆放相机，再让点位跟随新视角。
            function updateCamera() {
                cameraElevation = THREE.MathUtils.clamp(cameraElevation, 0, MAP_VIEW.maxElevation);
                // 正角度滑条对应视觉上的“向上抬升”，因此相机沿 Y 轴负方向移动。
                const horizontal = Math.cos(cameraElevation) * cameraDistance;
                camera.position.set(cameraTarget.x, cameraTarget.y - Math.sin(cameraElevation) * cameraDistance, cameraTarget.z + horizontal);
                camera.zoom = (fitZoom * MAP_VIEW.defaultDistance) / cameraDistance;
                camera.lookAt(cameraTarget);
                camera.updateProjectionMatrix();
                // fitFullView 会在同一事件中立即投影坐标，不能等下一帧渲染再更新矩阵。
                camera.updateMatrixWorld(true);
                // 将状态写在地图元素上，便于测试和排查，不包含任何用户数据。
                mapRoot.dataset.cameraElevation = cameraElevation.toFixed(4);
                mapRoot.dataset.cameraDistance = cameraDistance.toFixed(2);
                mapRoot.dataset.cameraTargetX = cameraTarget.x.toFixed(3);
                mapRoot.dataset.cameraTargetY = cameraTarget.y.toFixed(3);
                mapRoot.dataset.cameraTargetZ = cameraTarget.z.toFixed(3);
                const elevationDegrees = Math.round(THREE.MathUtils.radToDeg(cameraElevation));
                if (rotationInput && Number(rotationInput.value) !== elevationDegrees) {
                    rotationInput.value = String(elevationDegrees);
                }
                if (rotationOutput) {
                    rotationOutput.textContent = ("" + (elevationDegrees) + "°");
                }
                markersNeedProjection = true;
                requestMapRender();
            }
            updateCamera();
            function resize() {
                const rect = mapRoot.getBoundingClientRect();
                if (!rect.width || !rect.height) {
                    return;
                }
                renderer.setSize(rect.width, rect.height, false);
                const aspect = rect.width / rect.height;
                // 根据容器比例自动留出边距，窄屏也必须默认显示山东全貌。
                const viewWidth = Math.max(terrainWidth * MAP_VIEW.viewportPadding, terrainHeightDimension * MAP_VIEW.viewportPadding * aspect);
                const viewHeight = viewWidth / aspect;
                camera.left = -viewWidth / 2;
                camera.right = viewWidth / 2;
                camera.top = viewHeight / 2;
                camera.bottom = -viewHeight / 2;
                camera.updateProjectionMatrix();
                fitFullView();
                invalidateMarkerProjection();
            }
            // 计算能容纳整张地图的视野，初始化或复位时不把省界裁掉。
            function fitFullView() {
                // 用默认地图距离计算“全貌基准”，不要把用户当前缩放状态混进 fitZoom。
                // 这样浏览器缩放或窗口尺寸变化后，用户仍能继续使用原来的地图缩放级别。
                const userDistance = cameraDistance;
                cameraDistance = MAP_VIEW.defaultDistance;
                fitZoom = 1;
                updateCamera();
                terrain.updateMatrixWorld(true);
                const maxTerrainHeight = config.terrain.baseDepth + config.terrain.reliefScale * config.terrain.heightExaggeration + 0.12;
                const corners = [];
                const items121 = [-1, 1];
                for (let index123 = 0; index123 < items121.length; index123++) {
                    {
                        const x = items121[index123];
                        let valueResult92;
                        const items125 = [-1, 1];
                        for (let index127 = 0; index127 < items125.length; index127++) {
                            {
                                const y = items125[index127];
                                let valueResult96;
                                const items129 = [0, maxTerrainHeight];
                                for (let index131 = 0; index131 < items129.length; index131++) {
                                    {
                                        const z = items129[index131];
                                        const point = new THREE.Vector3((x * terrainWidth) / 2, (y * terrainHeightDimension) / 2, z);
                                        terrain.localToWorld(point);
                                        corners.push(point.project(camera));
                                    }
                                }
                                valueResult96;
                            }
                        }
                        valueResult92;
                    }
                }
                const items136 = boundaryFitPoints;
                for (let index138 = 0; index138 < items136.length; index138++) {
                    {
                        const localPoint = items136[index138];
                        const point = localPoint.clone();
                        terrain.localToWorld(point);
                        corners.push(point.project(camera));
                    }
                }
                let valueResult104;
                const items141 = corners;
                let result144 = 0.01;
                for (let index143 = 0; index143 < items141.length; index143++) {
                    let valueResult106;
                    {
                        const max = result144;
                        const point = items141[index143];
                        valueResult106 = Math.max(max, Math.abs(point.x));
                    }
                    result144 = valueResult106;
                }
                valueResult104 = result144;
                const maxProjectedX = valueResult104;
                let valueResult108;
                const items146 = corners;
                let result149 = 0.01;
                for (let index148 = 0; index148 < items146.length; index148++) {
                    let valueResult110;
                    {
                        const max = result149;
                        const point = items146[index148];
                        valueResult110 = Math.max(max, Math.abs(point.y));
                    }
                    result149 = valueResult110;
                }
                valueResult108 = result149;
                const maxProjectedY = valueResult108;
                const fitFactor = Math.min(MAP_VIEW.fitScreenPadding / maxProjectedX, MAP_VIEW.fitScreenPadding / maxProjectedY, 1);
                fitZoom = Math.max(0.25, fitFactor);
                cameraDistance = userDistance;
                updateCamera();
                mapRoot.dataset.fitZoom = fitZoom.toFixed(4);
                requestMapRender();
            }
            function terrainHeight(percentX, percentY) {
                // 与 PlaneGeometry 的三角剖分一致，包含省界附近修补过的顶点。
                const columns = MAP_VIEW.gridColumns;
                const rows = MAP_VIEW.gridRows;
                const x = THREE.MathUtils.clamp(percentX / 100, 0, 1) * (columns - 1);
                const y = THREE.MathUtils.clamp(percentY / 100, 0, 1) * (rows - 1);
                const column = Math.min(Math.floor(x), columns - 2);
                const row = Math.min(Math.floor(y), rows - 2);
                const u = x - column;
                const v = y - row;
                const a = row * columns + column;
                const topLeft = position.getZ(a);
                const topRight = position.getZ(a + 1);
                const bottomLeft = position.getZ(a + columns);
                const bottomRight = position.getZ(a + columns + 1);
                let valueResult112;
                if (u + v <= 1) {
                    valueResult112 = topLeft + u * (topRight - topLeft) + v * (bottomLeft - topLeft);
                }
                else {
                    valueResult112 = bottomRight + (1 - u) * (bottomLeft - bottomRight) + (1 - v) * (topRight - bottomRight);
                }
                return valueResult112;
            }
            // 点位与地形共享同一组百分比坐标，旋转或缩放时重新投影到屏幕。
            // 点位按钮属于网页，不属于 3D 模型；这里把地图坐标投影到屏幕位置。
            function projectMarkers() {
                const rect = mapRoot.getBoundingClientRect();
                if (mapRoot.dataset.mapMode === "flat") {
                    const flatImage = (mapRoot.querySelector("#shandongFlatMapImage") as HTMLImageElement);
                    let valueResult114;
                    const value152 = flatImage;
                    if (value152 === null || value152 === undefined) {
                        valueResult114 = undefined;
                    }
                    else {
                        valueResult114 = value152.naturalWidth;
                    }
                    let conditionValue118 = valueResult114;
                    if (conditionValue118) {
                        let valueResult116;
                        const value154 = flatImage;
                        if (value154 === null || value154 === undefined) {
                            valueResult116 = undefined;
                        }
                        else {
                            valueResult116 = value154.naturalHeight;
                        }
                        conditionValue118 = valueResult116;
                    }
                    if (conditionValue118) {
                        const imageRatio = flatImage.naturalWidth / flatImage.naturalHeight;
                        const displayWidth = Math.min(rect.width, rect.height * imageRatio);
                        const displayHeight = displayWidth / imageRatio;
                        const imageLeft = (rect.width - displayWidth) / 2;
                        const imageTop = (rect.height - displayHeight) / 2;
                        // 图片左侧保留了队伍署名，按山东轮廓的实际边界校准点位投影。
                        // 这个范围只用于简化平面图；3D 版仍直接使用 DEM 的经纬度范围。
                        const flatMapBounds = { left: 0.177, right: 0.966, top: 0.099, bottom: 0.911 };
                        const items156 = (mapRoot.querySelectorAll(".map-marker") as NodeListOf<HTMLElement>);
                        for (let index158 = 0; index158 < items156.length; index158++) {
                            {
                                const marker = items156[index158];
                                const percentX = Number(marker.dataset.terrainX) / 100;
                                const percentY = Number(marker.dataset.terrainY) / 100;
                                if (!Number.isFinite(percentX) || !Number.isFinite(percentY)) {
                                    undefined;
                                }
                                else {
                                    const imageX = flatMapBounds.left + percentX * (flatMapBounds.right - flatMapBounds.left);
                                    const imageY = flatMapBounds.top + percentY * (flatMapBounds.bottom - flatMapBounds.top);
                                    marker.style.left = ("" + (((imageLeft + imageX * displayWidth) / rect.width) * 100) + "%");
                                    marker.style.top = ("" + (((imageTop + imageY * displayHeight) / rect.height) * 100) + "%");
                                    marker.style.visibility = "visible";
                                    marker.style.zIndex = "5";
                                }
                            }
                        }
                        return;
                    }
                }
                const items161 = (mapRoot.querySelectorAll(".map-marker") as NodeListOf<HTMLElement>);
                for (let index163 = 0; index163 < items161.length; index163++) {
                    {
                        const marker = items161[index163];
                        const percentX = Number(marker.dataset.terrainX);
                        const percentY = Number(marker.dataset.terrainY);
                        if (!Number.isFinite(percentX) || !Number.isFinite(percentY)) {
                            undefined;
                        }
                        else {
                            const point = new THREE.Vector3((percentX / 100) * terrainWidth - terrainWidth / 2, terrainHeightDimension / 2 - (percentY / 100) * terrainHeightDimension, terrainHeight(percentX, percentY));
                            terrain.localToWorld(point);
                            point.project(camera);
                            const visible = point.z > -1 &&
                                point.z < 1 &&
                                point.x > -1.15 &&
                                point.x < 1.15 &&
                                point.y > -1.15 &&
                                point.y < 1.15;
                            marker.style.left = ("" + ((point.x + 1) * 50) + "%");
                            marker.style.top = ("" + ((1 - point.y) * 50) + "%");
                            let valueResult127;
                            if (visible) {
                                valueResult127 = "visible";
                            }
                            else {
                                valueResult127 = "hidden";
                            }
                            marker.style.visibility = valueResult127;
                            marker.style.zIndex = String(Math.round(5 + (1 - point.z) * 10));
                        }
                    }
                }
            }
            mapRoot.addEventListener("pointerdown", function handlePointerdown(event) {
                // 新的一次按下（包括控件）不应继承上一次拖动的点击抑制。
                if (activePointers.size === 0) {
                    suppressGestureClick = false;
                }
                const interactive = ((event.target as HTMLElement).closest("button, input, .map-legend, .map-terrain-status, .map-rotation-control") as HTMLElement);
                if (interactive && !(event.pointerType === "touch" && interactive.matches(".map-marker"))) {
                    return;
                }
                if (event.pointerType === "mouse" && event.button !== 0) {
                    return;
                }
                activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
                if (activePointers.size === 2) {
                    const items167 = Array.from(activePointers.entries());
                    for (let index169 = 0; index169 < items167.length; index169++) {
                        {
                            const _ = items167[index169][1];
                            const id = items167[index169][0];
                            mapRoot.setPointerCapture(id);
                        }
                    }
                    let valueResult133;
                    const items172 = [];
                    const part173 = Array.from(activePointers.values());
                    for (let index174 = 0; index174 < part173.length; index174++) {
                        items172.push(part173[index174]);
                    }
                    valueResult133 = items172;
                    const source176 = valueResult133;
                    const first = source176[0];
                    const second = source176[1];
                    pinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
                    suppressGestureClick = true;
                    isDragging = false;
                    mapRoot.classList.remove("is-dragging");
                    return;
                }
                isDragging = true;
                lastPointer = { x: event.clientX, y: event.clientY };
                if (!interactive) {
                    mapRoot.setPointerCapture(event.pointerId);
                }
                mapRoot.classList.add("is-dragging");
            });
            mapRoot.addEventListener("pointermove", function handlePointermove(event) {
                if (!activePointers.has(event.pointerId)) {
                    return;
                }
                activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
                if (activePointers.size === 2) {
                    let valueResult135;
                    const items177 = [];
                    const part178 = Array.from(activePointers.values());
                    for (let index179 = 0; index179 < part178.length; index179++) {
                        items177.push(part178[index179]);
                    }
                    valueResult135 = items177;
                    const source181 = valueResult135;
                    const first = source181[0];
                    const second = source181[1];
                    const nextDistance = Math.hypot(first.x - second.x, first.y - second.y);
                    if (pinchDistance) {
                        cameraDistance = THREE.MathUtils.clamp(cameraDistance - (nextDistance - pinchDistance) * MAP_VIEW.pinchSpeed, MAP_VIEW.minDistance, MAP_VIEW.maxDistance);
                    }
                    pinchDistance = nextDistance;
                    updateCamera();
                    return;
                }
                if (!isDragging) {
                    return;
                }
                const deltaX = event.clientX - lastPointer.x;
                const deltaY = event.clientY - lastPointer.y;
                if (Math.hypot(deltaX, deltaY) > 3) {
                    suppressGestureClick = true;
                }
                const rect = mapRoot.getBoundingClientRect();
                const worldPerPixelX = (camera.right - camera.left) / (camera.zoom * rect.width);
                const worldPerPixelY = (camera.top - camera.bottom) / (camera.zoom * rect.height);
                // 相机和目标一起沿屏幕平移方向移动，保持相对姿态不变。
                const elements = camera.matrixWorld.elements;
                const screenRight = new THREE.Vector3(elements[0], elements[1], elements[2]);
                const screenUp = new THREE.Vector3(elements[4], elements[5], elements[6]);
                const pan = screenRight
                    .multiplyScalar(-deltaX * worldPerPixelX * MAP_VIEW.panSpeed)
                    .add(screenUp.multiplyScalar(deltaY * worldPerPixelY * MAP_VIEW.panSpeed));
                const nextTarget = cameraTarget.clone().add(pan);
                nextTarget.x = THREE.MathUtils.clamp(nextTarget.x, -MAP_VIEW.maxPanX, MAP_VIEW.maxPanX);
                nextTarget.y = THREE.MathUtils.clamp(nextTarget.y, -MAP_VIEW.maxPanY, MAP_VIEW.maxPanY);
                cameraTarget.copy(nextTarget);
                lastPointer = { x: event.clientX, y: event.clientY };
                updateCamera();
            });
            function stopDragging(event) {
                let valueResult137;
                const value182 = event;
                if (value182 === null || value182 === undefined) {
                    valueResult137 = undefined;
                }
                else {
                    valueResult137 = value182.pointerId;
                }
                if (!activePointers.has(valueResult137)) {
                    return;
                }
                let valueResult139;
                const value184 = event;
                if (value184 === null || value184 === undefined) {
                    valueResult139 = undefined;
                }
                else {
                    valueResult139 = value184.pointerId;
                }
                if (valueResult139 !== undefined) {
                    activePointers.delete(event.pointerId);
                }
                if (activePointers.size < 2) {
                    pinchDistance = 0;
                }
                isDragging = activePointers.size === 1;
                if (isDragging) {
                    lastPointer = activePointers.values().next().value;
                }
                mapRoot.classList.toggle("is-dragging", isDragging);
                let valueResult141;
                const value186 = event;
                if (value186 === null || value186 === undefined) {
                    valueResult141 = undefined;
                }
                else {
                    valueResult141 = value186.pointerId;
                }
                if (valueResult141 !== undefined && mapRoot.hasPointerCapture(event.pointerId)) {
                    mapRoot.releasePointerCapture(event.pointerId);
                }
            }
            mapRoot.addEventListener("pointerup", stopDragging);
            mapRoot.addEventListener("pointercancel", stopDragging);
            mapRoot.addEventListener("lostpointercapture", stopDragging);
            mapRoot.addEventListener("click", function suppressClickAfterMapGesture(event) {
                if (suppressGestureClick && event.detail !== 0) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
            }, true);
            mapRoot.addEventListener("wheel", function handleWheel(event) {
                event.preventDefault();
                cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * MAP_VIEW.wheelSpeed, MAP_VIEW.minDistance, MAP_VIEW.maxDistance);
                updateCamera();
            }, { passive: false });
            function resetMapView() {
                cameraDistance = MAP_VIEW.defaultDistance;
                cameraElevation = 0;
                cameraTarget.set(0, 0, 0);
                fitFullView();
            }
            mapRoot.addEventListener("dblclick", resetMapView);
            if (rotationInput) {
                const maxElevationDegrees = Math.round(THREE.MathUtils.radToDeg(MAP_VIEW.maxElevation));
                rotationInput.min = "0";
                rotationInput.max = String(maxElevationDegrees);
                rotationInput.addEventListener("input", function handleInput() {
                    cameraElevation = THREE.MathUtils.degToRad(Number(rotationInput.value));
                    fitFullView();
                });
            }
            mapRoot.addEventListener("click", function handleClick(event) {
                if (((event.target as HTMLElement).closest("[data-map-reset]") as HTMLElement)) {
                    resetMapView();
                }
            });
            new ResizeObserver(resize).observe(mapRoot);
            const markerRoot = (mapRoot.querySelector("#mapMarkers") as HTMLElement);
            if (markerRoot) {
                // 筛选条件变化时 map-browser.js 会重建点位；监听子节点变化后重新投影新元素。
                new MutationObserver(invalidateMarkerProjection).observe(markerRoot, { childList: true });
            }
            const flatMapImage = (mapRoot.querySelector("#shandongFlatMapImage") as HTMLImageElement);
            if (flatMapImage) {
                if (flatMapImage.complete) {
                    invalidateMarkerProjection();
                }
                else {
                    flatMapImage.addEventListener("load", invalidateMarkerProjection, { once: true });
                }
            }
            const mapVisibilityObserver = new IntersectionObserver(function updateMapVisibility(options188) {
                const source189 = options188;
                const entry = source189[0];
                mapVisible = entry.isIntersecting;
                if (mapVisible) {
                    invalidateMarkerProjection();
                }
            }, { threshold: 0.01 });
            mapVisibilityObserver.observe(mapRoot);
            document.addEventListener("visibilitychange", function handleVisibilitychange() {
                if (document.hidden && mapRenderFrame) {
                    cancelAnimationFrame(mapRenderFrame);
                    mapRenderFrame = 0;
                }
                else {
                    if (!document.hidden) {
                        requestMapRender();
                    }
                }
            });
            resize();
            mapRoot.classList.add("has-three-terrain");
            status.textContent = config.attribution;
            loadHeightMap();
            requestMapRender();
        }
        catch (error) {
            console.warn("山东地貌初始化失败，已回退到平面地图。", error);
            status.textContent = "平面地图模式";
        }
    }
})();
