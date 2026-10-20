(function initializeShowcase() {
    const root = (document.querySelector("#product3dShowcase") as HTMLElement);
    /*
     *  3D 展厅交互参数
     * 单位：角度使用弧度，相机距离使用 Three.js 场景单位，速度为每秒弧度
     */
    const showcaseSettings = {
        defaultAutoRotate: false,
        initialRotationX: 0,
        initialRotationY: 0,
        cameraPositionY: 0,
        pokerCameraDistance: 11.5,
        mahjongCameraDistance: 10.5,
        cameraMinDistance: 7,
        cameraMaxDistance: 16,
        dragRotateX: 0.009,
        dragRotateY: 0.012,
        wheelZoomSpeed: 0.008,
        autoRotateSpeed: 0.32,
        rotationSmoothing: 0.09,
    };
    if (root && window.SEAL_3D_PRODUCTS) {
        const config = window.SEAL_3D_PRODUCTS;
        const canvas = (root.querySelector("#product3dCanvas") as HTMLCanvasElement);
        const viewport = (root.querySelector(".product-3d-viewport") as HTMLElement);
        const status = (root.querySelector("#product3dStatus") as HTMLElement);
        const title = (root.querySelector("#product3dTitle") as HTMLElement);
        const subtitle = (root.querySelector("#product3dSubtitle") as HTMLElement);
        const description = (root.querySelector("#product3dDescription") as HTMLElement);
        const counter = (root.querySelector("#product3dCounter") as HTMLElement);
        const autoRotateButton = (root.querySelector("#product3dAutoRotate") as HTMLButtonElement);
        const flipButton = (root.querySelector("#product3dFlip") as HTMLButtonElement);
        const resetButton = (root.querySelector("#product3dReset") as HTMLButtonElement);
        const fullscreenButton = (root.querySelector("#product3dFullscreen") as HTMLButtonElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = false;
        renderer.setClearColor(0x000000, 0);
        scene.add(new THREE.HemisphereLight(0xf5ead8, 0x1f302b, 2.35));
        const keyLight = new THREE.DirectionalLight(0xfff1d6, 4.5);
        keyLight.position.set(5, 7, 7);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x9dbeb2, 2.2);
        rimLight.position.set(-5, 2, -4);
        scene.add(rimLight);
        const modelRoot = new THREE.Group();
        scene.add(modelRoot);
        let mode = "mahjong";
        let itemIndex = 0;
        let model = null;
        let autoRotate = showcaseSettings.defaultAutoRotate;
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        let targetRotation = { x: showcaseSettings.initialRotationX, y: showcaseSettings.initialRotationY };
        let flipped = false;
        let loadRevision = 0;
        let showcaseVisible = true;
        let animationFrameId = 0;
        const textureLoader = new THREE.TextureLoader();
        // 在中心点周围画圆角矩形，后面把它加厚就得到扑克牌的实体
        function roundedRectShape(width, height, radius) {
            const x = -width / 2;
            const y = -height / 2;
            const shape = new THREE.Shape();
            shape.moveTo(x + radius, y);
            shape.lineTo(x + width - radius, y);
            shape.quadraticCurveTo(x + width, y, x + width, y + radius);
            shape.lineTo(x + width, y + height - radius);
            shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            shape.lineTo(x + radius, y + height);
            shape.quadraticCurveTo(x, y + height, x, y + height - radius);
            shape.lineTo(x, y + radius);
            shape.quadraticCurveTo(x, y, x + radius, y);
            return shape;
        }
        // 生成带牌名的备用牌面，供贴图加载失败时使用
        function makePlaceholderTexture(item, type, face) {
            let valueResult1;
            if (type === "poker") {
                valueResult1 = { width: 750, height: 1050 };
            }
            else {
                valueResult1 = { width: 768, height: 1024 };
            }
            const size = valueResult1;
            const surface = document.createElement("canvas");
            surface.width = size.width;
            surface.height = size.height;
            const ctx = surface.getContext("2d");
            const dark = face === "back" || face === "side";
            let valueResult3;
            if (dark) {
                valueResult3 = "#243b34";
            }
            else {
                valueResult3 = "#eee8dc";
            }
            ctx.fillStyle = valueResult3;
            ctx.fillRect(0, 0, size.width, size.height);
            let valueResult5;
            if (dark) {
                valueResult5 = "#b43b31";
            }
            else {
                valueResult5 = "#9f3028";
            }
            ctx.strokeStyle = valueResult5;
            ctx.lineWidth = Math.round(size.width * 0.018);
            ctx.strokeRect(size.width * 0.06, size.height * 0.045, size.width * 0.88, size.height * 0.91);
            ctx.setLineDash([18, 12]);
            ctx.lineWidth = 3;
            ctx.strokeRect(size.width * 0.09, size.height * 0.07, size.width * 0.82, size.height * 0.86);
            ctx.setLineDash([]);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            let valueResult7;
            if (dark) {
                valueResult7 = "#ede1cf";
            }
            else {
                valueResult7 = "#3a302b";
            }
            ctx.fillStyle = valueResult7;
            ctx.font = ("700 " + (Math.round(size.width * 0.17)) + "px serif");
            let valueResult9;
            if (face === "front") {
                valueResult9 = item.code;
            }
            else {
                valueResult9 = "泥云智探";
            }
            ctx.fillText(valueResult9, size.width / 2, size.height * 0.38);
            let valueResult11;
            if (dark) {
                valueResult11 = "#d5ad74";
            }
            else {
                valueResult11 = "#a5322a";
            }
            ctx.fillStyle = valueResult11;
            ctx.font = ("700 " + (Math.round(size.width * 0.09)) + "px serif");
            let valueResult13;
            if (face === "front") {
                valueResult13 = item.title;
            }
            else {
                valueResult13 = "齐鲁封泥牌具";
            }
            ctx.fillText(valueResult13, size.width / 2, size.height * 0.57);
            const texture = new THREE.CanvasTexture(surface);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            return texture;
        }
        // 麻将侧边没有单独的图片，用画布生成木纹和边框
        function makeMahjongEdgeTexture(direction?) {
            if (direction === undefined) {
                direction = "vertical";
            }
            const surface = document.createElement("canvas");
            surface.width = 512;
            surface.height = 512;
            const ctx = surface.getContext("2d");
            let valueResult15;
            if (direction === "vertical") {
                valueResult15 = surface.width;
            }
            else {
                valueResult15 = 0;
            }
            let valueResult17;
            if (direction === "vertical") {
                valueResult17 = 0;
            }
            else {
                valueResult17 = surface.height;
            }
            const base = ctx.createLinearGradient(0, 0, valueResult15, valueResult17);
            base.addColorStop(0, "#d7d7c5");
            base.addColorStop(0.18, "#eee9da");
            base.addColorStop(0.5, "#f5efe2");
            base.addColorStop(0.82, "#e7e3d4");
            base.addColorStop(1, "#c7cbc0");
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, surface.width, surface.height);
            // 绘制侧面的木纹与纸纤维
            ctx.lineWidth = 1;
            for (let index = 0; index < 34; index += 1) {
                const offset = 18 + index * 15;
                const bend = Math.sin(index * 1.7) * 8;
                ctx.beginPath();
                if (direction === "vertical") {
                    ctx.moveTo(offset, 0);
                    ctx.bezierCurveTo(offset + bend, 150, offset - bend, 350, offset + bend * 0.4, 512);
                }
                else {
                    ctx.moveTo(0, offset);
                    ctx.bezierCurveTo(150, offset + bend, 350, offset - bend, 512, offset + bend * 0.4);
                }
                let valueResult19;
                if (index % 3 === 0) {
                    valueResult19 = "rgba(91, 111, 119, 0.12)";
                }
                else {
                    valueResult19 = "rgba(145, 111, 82, 0.08)";
                }
                ctx.strokeStyle = valueResult19;
                ctx.stroke();
            }
            ctx.strokeStyle = "#657b84";
            ctx.lineWidth = 16;
            ctx.strokeRect(12, 12, 488, 488);
            ctx.strokeStyle = "rgba(101, 123, 132, 0.58)";
            ctx.lineWidth = 3;
            ctx.strokeRect(34, 34, 444, 444);
            ctx.save();
            ctx.translate(256, 256);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = "rgba(185, 74, 50, 0.1)";
            ctx.strokeStyle = "rgba(185, 74, 50, 0.58)";
            ctx.lineWidth = 5;
            ctx.fillRect(-62, -62, 124, 124);
            ctx.strokeRect(-62, -62, 124, 124);
            ctx.strokeStyle = "rgba(101, 123, 132, 0.7)";
            ctx.lineWidth = 3;
            ctx.strokeRect(-43, -43, 86, 86);
            ctx.restore();
            const texture = new THREE.CanvasTexture(surface);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            return texture;
        }
        // 双击网页时读内嵌图片，网站模式读安全地址；两种方式失败都返回备用牌面
        async function loadTexture(path, fallback) {
            if (window.location.protocol === "file:") {
                let valueResult21;
                const value11 = window.SEAL_INLINE_TEXTURES;
                if (value11 === null || value11 === undefined) {
                    valueResult21 = undefined;
                }
                else {
                    valueResult21 = value11[path];
                }
                const inlineSource = valueResult21;
                if (!inlineSource) {
                    return fallback;
                }
                try {
                    const image = await new Promise<HTMLImageElement>(function decodeInlineTexture(resolve, reject) {
                        const localImage = new Image();
                        localImage.addEventListener("load", function handleLoad() {
                            return resolve(localImage);
                        }, { once: true });
                        localImage.addEventListener("error", reject, { once: true });
                        localImage.src = inlineSource;
                    });
                    const texture = new THREE.Texture(image);
                    texture.needsUpdate = true;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
                    return texture;
                }
                catch (_) {
                    return fallback;
                }
            }
            let valueResult23;
            const value13 = window.MediaSecurity;
            if (value13 === null || value13 === undefined) {
                valueResult23 = undefined;
            }
            else {
                const value14 = value13.resolve;
                valueResult23 = value14.call(value13, path);
            }
            const safePath = valueResult23 || "";
            if (!safePath) {
                return fallback;
            }
            try {
                const texture = await textureLoader.loadAsync(safePath);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
                return texture;
            }
            catch (_) {
                return fallback;
            }
        }
        // 换牌时释放旧模型的几何体、材质和贴图
        function disposeModel() {
            while (modelRoot.children.length) {
                const child = modelRoot.children.pop();
                child.traverse(function disposeObjectResources(object) {
                    if (!(object instanceof THREE.Mesh)) {
                        return;
                    }
                    object.geometry.dispose();
                    let valueResult25;
                    if (Array.isArray(object.material)) {
                        valueResult25 = object.material;
                    }
                    else {
                        valueResult25 = [object.material];
                    }
                    const materials = valueResult25;
                    let valueResult29;
                    const items21 = materials;
                    const result24 = [];
                    for (let index23 = 0; index23 < items21.length; index23++) {
                        if (Boolean(items21[index23])) {
                            result24.push(items21[index23]);
                        }
                    }
                    valueResult29 = result24;
                    const items17 = valueResult29;
                    for (let index19 = 0; index19 < items17.length; index19++) {
                        {
                            const material = items17[index19];
                            let valueResult33;
                            const value26 = material.map;
                            if (value26 === null || value26 === undefined) {
                                valueResult33 = undefined;
                            }
                            else {
                                const value27 = value26.dispose;
                                valueResult33 = value27.call(value26);
                            }
                            let valueResult35;
                            const value29 = material.dispose;
                            if (value29 === null || value29 === undefined) {
                                valueResult35 = undefined;
                            }
                            else {
                                valueResult35 = value29.call(material);
                            }
                        }
                    }
                });
            }
        }
        // 把图片贴在牌的正面或背面，稍微离开实体表面以免两层画面闪烁
        function makeFace(width, height, depth, texture, back?) {
            if (back === undefined) {
                back = false;
            }
            // 标准平面自带 0～1 UV，Photoshop 导出的整张贴图可以无损铺满
            const geometry = new THREE.PlaneGeometry(width * 0.94, height * 0.94);
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.58,
                metalness: 0.02,
                polygonOffset: true,
                polygonOffsetFactor: -1,
            });
            const mesh = new THREE.Mesh(geometry, material);
            const faceOffset = depth / 2 + 0.04;
            let valueResult37;
            if (back) {
                valueResult37 = -faceOffset;
            }
            else {
                valueResult37 = faceOffset;
            }
            mesh.position.z = valueResult37;
            if (back) {
                mesh.rotation.y = Math.PI;
            }
            return mesh;
        }
        // 将薄的圆角牌身与正反两张牌面组合成一张扑克牌
        function buildPoker(item, textures) {
            const size = config.poker.model;
            const group = new THREE.Group();
            const body = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRectShape(size.width, size.height, size.radius), {
                depth: size.depth,
                bevelEnabled: true,
                bevelSegments: 4,
                steps: 1,
                bevelSize: 0.035,
                bevelThickness: 0.025,
                curveSegments: 14,
            }), new THREE.MeshStandardMaterial({ color: 0xe9e1d3, roughness: 0.74, metalness: 0 }));
            body.geometry.center();
            group.add(body, makeFace(size.width, size.height, size.depth, textures.front), makeFace(size.width, size.height, size.depth, textures.back, true));
            return group;
        }
        // 麻将由较厚的牌身、侧边纹理和正反牌面组成
        function buildMahjong(item, textures) {
            const size = config.mahjong.model;
            const group = new THREE.Group();
            const sideMaterial = new THREE.MeshPhysicalMaterial({
                map: textures.side,
                color: 0xffffff,
                roughness: 0.38,
                metalness: 0,
                clearcoat: 0.24,
                clearcoatRoughness: 0.56,
            });
            const capMaterial = new THREE.MeshPhysicalMaterial({
                map: textures.cap,
                color: 0xffffff,
                roughness: 0.38,
                metalness: 0,
                clearcoat: 0.24,
                clearcoatRoughness: 0.56,
            });
            const bodyMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xe9e5d8,
                roughness: 0.32,
                metalness: 0,
                clearcoat: 0.28,
                clearcoatRoughness: 0.52,
            });
            const body = new THREE.Mesh(new THREE.BoxGeometry(size.width, size.height, size.depth, 6, 8, 5), [
                sideMaterial,
                sideMaterial,
                capMaterial,
                capMaterial,
                bodyMaterial,
                bodyMaterial,
            ]);
            group.add(body);
            const front = makeFace(size.width, size.height, size.depth, textures.front);
            const back = makeFace(size.width, size.height, size.depth, textures.back, true);
            group.add(front, back);
            return group;
        }
        // 加载当前选中的牌；编号用来识别过期请求，防止连续切换后显示上一张
        async function loadCurrentItem() {
            const revision = ++loadRevision;
            const collection = config[mode];
            const item = collection.items[itemIndex];
            status.textContent = "正在加载牌具…";
            title.textContent = item.title;
            subtitle.textContent = item.subtitle;
            description.textContent = item.description;
            counter.textContent = ("" + (String(itemIndex + 1).padStart(2, "0")) + " / " + (String(collection.items.length).padStart(2, "0")));
            const frontFallback = makePlaceholderTexture(item, mode, "front");
            const backFallback = makePlaceholderTexture(item, mode, "back");
            let valueResult39;
            if (mode === "mahjong") {
                valueResult39 = makeMahjongEdgeTexture("vertical");
            }
            else {
                valueResult39 = makePlaceholderTexture(item, mode, "side");
            }
            const sideFallback = valueResult39;
            let valueResult41;
            if (mode === "mahjong") {
                valueResult41 = makeMahjongEdgeTexture("horizontal");
            }
            else {
                valueResult41 = sideFallback;
            }
            const capFallback = valueResult41;
            const source35 = await Promise.all([
                loadTexture(item.front, frontFallback),
                loadTexture(item.back, backFallback),
                Promise.resolve(sideFallback),
            ]);
            const front = source35[0];
            const back = source35[1];
            const side = source35[2];
            if (revision !== loadRevision) {
                return;
            }
            disposeModel();
            let valueResult43;
            if (mode === "poker") {
                valueResult43 = buildPoker(item, { front: front, back: back, side: side });
            }
            else {
                valueResult43 = buildMahjong(item, { front: front, back: back, side: side, cap: capFallback });
            }
            model = valueResult43;
            model.rotation.set(targetRotation.x, targetRotation.y, 0);
            modelRoot.add(model);
            flipped = false;
            status.textContent = "拖动旋转 · 滚轮缩放 · 双击翻面";
            updateButtons();
        }
        // 根据实际状态更新按钮文字和选中标记，让按钮与模型保持一致
        function updateButtons() {
            autoRotateButton.setAttribute("aria-pressed", String(autoRotate));
            let valueResult45;
            if (autoRotate) {
                valueResult45 = "暂停旋转";
            }
            else {
                valueResult45 = "自动旋转";
            }
            autoRotateButton.textContent = valueResult45;
            let valueResult47;
            if (flipped) {
                valueResult47 = "查看正面";
            }
            else {
                valueResult47 = "翻到背面";
            }
            flipButton.textContent = valueResult47;
            const items39 = (root.querySelectorAll("[data-product-mode]") as NodeListOf<HTMLElement>);
            for (let index41 = 0; index41 < items39.length; index41++) {
                {
                    const button = items39[index41];
                    const active = button.dataset.productMode === mode;
                    button.classList.toggle("active", active);
                    button.setAttribute("aria-pressed", String(active));
                }
            }
        }
        // 换牌具种类时回到该组第一件，同时恢复合适的相机距离
        function setMode(nextMode) {
            if (!config[nextMode] || nextMode === mode) {
                return;
            }
            mode = nextMode;
            itemIndex = 0;
            resetView();
            updateButtons();
            loadCurrentItem();
        }
        // 恢复当前牌具的初始角度和距离
        function resetView() {
            targetRotation = { x: showcaseSettings.initialRotationX, y: showcaseSettings.initialRotationY };
            let valueResult53;
            if (mode === "poker") {
                valueResult53 = showcaseSettings.pokerCameraDistance;
            }
            else {
                valueResult53 = showcaseSettings.mahjongCameraDistance;
            }
            camera.position.set(0, showcaseSettings.cameraPositionY, valueResult53);
            camera.lookAt(0, 0, 0);
            if (model) {
                model.rotation.set(targetRotation.x, targetRotation.y, 0);
            }
            flipped = false;
        }
        // 容器尺寸变化后同步画布与相机比例，避免模型被拉宽或压扁
        function resize() {
            const rect = viewport.getBoundingClientRect();
            if (!rect.width || !rect.height) {
                return;
            }
            renderer.setSize(rect.width, rect.height, false);
            camera.aspect = rect.width / rect.height;
            camera.updateProjectionMatrix();
        }
        // direction 为 1 是下一件，-1 是上一件；到头后从另一端继续
        function changeItem(direction) {
            const count = config[mode].items.length;
            itemIndex += direction;
            if (itemIndex < 0) {
                itemIndex = count - 1;
            }
            if (itemIndex >= count) {
                itemIndex = 0;
            }
            loadCurrentItem();
        }
        // 每次再转半圈；按钮点击和双击模型共用这一入口
        function flipItem() {
            flipped = !flipped;
            targetRotation.y += Math.PI;
            updateButtons();
        }
        root.addEventListener("click", function handleClick(event) {
            const modeButton = ((event.target as HTMLElement).closest("[data-product-mode]") as HTMLElement);
            if (modeButton) {
                return setMode(modeButton.dataset.productMode);
            }
            if (((event.target as HTMLElement).closest("#product3dPrev") as HTMLButtonElement)) {
                changeItem(-1);
            }
            if (((event.target as HTMLElement).closest("#product3dNext") as HTMLButtonElement)) {
                changeItem(1);
            }
            if (((event.target as HTMLElement).closest("#product3dFlip") as HTMLButtonElement)) {
                flipItem();
            }
            if (((event.target as HTMLElement).closest("#product3dAutoRotate") as HTMLButtonElement)) {
                autoRotate = !autoRotate;
                updateButtons();
            }
            if (((event.target as HTMLElement).closest("#product3dReset") as HTMLButtonElement)) {
                resetView();
                updateButtons();
            }
            if (((event.target as HTMLElement).closest("#product3dFullscreen") as HTMLButtonElement)) {
                let valueResult55;
                const value45 = viewport.requestFullscreen;
                if (value45 === null || value45 === undefined) {
                    valueResult55 = undefined;
                }
                else {
                    valueResult55 = value45.call(viewport);
                }
            }
        });
        viewport.addEventListener("pointerdown", function handlePointerdown(event) {
            if (((event.target as HTMLElement).closest("button, .product-3d-mode, .product-3d-controls") as HTMLElement)) {
                return;
            }
            isDragging = true;
            autoRotate = false;
            dragStart = { x: event.clientX, y: event.clientY };
            viewport.setPointerCapture(event.pointerId);
            updateButtons();
        });
        viewport.addEventListener("pointermove", function handlePointermove(event) {
            if (!isDragging) {
                return;
            }
            const dx = event.clientX - dragStart.x;
            const dy = event.clientY - dragStart.y;
            targetRotation.y += dx * showcaseSettings.dragRotateY;
            targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + dy * showcaseSettings.dragRotateX, -1.15, 1.15);
            dragStart = { x: event.clientX, y: event.clientY };
        });
        viewport.addEventListener("pointerup", function handlePointerup() {
            isDragging = false;
        });
        viewport.addEventListener("pointercancel", function handlePointercancel() {
            isDragging = false;
        });
        viewport.addEventListener("dblclick", function handleDblclick(event) {
            if (!((event.target as HTMLElement).closest("button") as HTMLButtonElement)) {
                flipItem();
            }
        });
        viewport.addEventListener("wheel", function handleWheel(event) {
            event.preventDefault();
            camera.position.z = THREE.MathUtils.clamp(camera.position.z + event.deltaY * showcaseSettings.wheelZoomSpeed, showcaseSettings.cameraMinDistance, showcaseSettings.cameraMaxDistance);
        }, { passive: false });
        new ResizeObserver(resize).observe(viewport);
        document.addEventListener("fullscreenchange", resize);
        // 3D 展厅离开视口或页面切到后台时暂停渲染，回来后再从当前状态继续
        const showcaseVisibilityObserver = new IntersectionObserver(function updateShowcaseVisibility(options47) {
            const source48 = options47;
            const entry = source48[0];
            showcaseVisible = entry.isIntersecting;
            if (showcaseVisible && !document.hidden && !animationFrameId) {
                animate();
            }
        }, { threshold: 0.01 });
        showcaseVisibilityObserver.observe(root);
        document.addEventListener("visibilitychange", function handleVisibilitychange() {
            if (document.hidden && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = 0;
            }
            else {
                if (!document.hidden && showcaseVisible && !animationFrameId) {
                    animate();
                }
            }
        });
        const clock = new THREE.Clock();
        // 模型逐帧靠近拖动的目标角度；离开视口后暂停，减少不必要的绘制
        function animate() {
            if (!showcaseVisible || document.hidden) {
                animationFrameId = 0;
                return;
            }
            animationFrameId = requestAnimationFrame(animate);
            const delta = Math.min(clock.getDelta(), 0.04);
            if (model) {
                if (autoRotate && document.documentElement.dataset.motion !== "0") {
                    targetRotation.y += delta * showcaseSettings.autoRotateSpeed;
                }
                model.rotation.x += (targetRotation.x - model.rotation.x) * showcaseSettings.rotationSmoothing;
                model.rotation.y += (targetRotation.y - model.rotation.y) * showcaseSettings.rotationSmoothing;
            }
            renderer.render(scene, camera);
        }
        resetView();
        resize();
        updateButtons();
        loadCurrentItem();
        animate();
    }
})();
