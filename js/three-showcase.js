const root = document.querySelector("#product3dShowcase");

/*
 * ==================== 3D 展厅交互参数 ====================
 * 单位：角度使用弧度，相机距离使用 Three.js 场景单位，速度为每秒弧度。
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
  rotationSmoothing: 0.09
};

if (root && window.SEAL_3D_PRODUCTS) {
  const config = window.SEAL_3D_PRODUCTS;
  const canvas = root.querySelector("#product3dCanvas");
  const viewport = root.querySelector(".product-3d-viewport");
  const status = root.querySelector("#product3dStatus");
  const title = root.querySelector("#product3dTitle");
  const subtitle = root.querySelector("#product3dSubtitle");
  const description = root.querySelector("#product3dDescription");
  const counter = root.querySelector("#product3dCounter");
  const texturePath = root.querySelector("#product3dTexturePath");
  const autoRotateButton = root.querySelector("#product3dAutoRotate");
  const flipButton = root.querySelector("#product3dFlip");
  const resetButton = root.querySelector("#product3dReset");
  const fullscreenButton = root.querySelector("#product3dFullscreen");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  scene.add(new THREE.HemisphereLight(0xf5ead8, 0x1f302b, 2.35));
  const keyLight = new THREE.DirectionalLight(0xfff1d6, 4.5);
  keyLight.position.set(5, 7, 7);
  keyLight.castShadow = true;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x9dbeb2, 2.2);
  rimLight.position.set(-5, 2, -4);
  scene.add(rimLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22),
    new THREE.ShadowMaterial({ color: 0x18241f, opacity: 0.22 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.6;
  ground.receiveShadow = true;
  scene.add(ground);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  let mode = "poker";
  let itemIndex = 0;
  let model = null;
  let autoRotate = showcaseSettings.defaultAutoRotate;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let targetRotation = { x: showcaseSettings.initialRotationX, y: showcaseSettings.initialRotationY };
  let flipped = false;
  let loadRevision = 0;

  const textureLoader = new THREE.TextureLoader();

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

  function makePlaceholderTexture(item, type, face) {
    const size = type === "poker" ? { width: 750, height: 1050 } : { width: 768, height: 1024 };
    const surface = document.createElement("canvas");
    surface.width = size.width;
    surface.height = size.height;
    const ctx = surface.getContext("2d");
    const dark = face === "back" || face === "side";
    ctx.fillStyle = dark ? "#243b34" : "#eee8dc";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.strokeStyle = dark ? "#b43b31" : "#9f3028";
    ctx.lineWidth = Math.round(size.width * 0.018);
    ctx.strokeRect(size.width * 0.06, size.height * 0.045, size.width * 0.88, size.height * 0.91);
    ctx.setLineDash([18, 12]);
    ctx.lineWidth = 3;
    ctx.strokeRect(size.width * 0.09, size.height * 0.07, size.width * 0.82, size.height * 0.86);
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = dark ? "#ede1cf" : "#3a302b";
    ctx.font = `700 ${Math.round(size.width * 0.17)}px serif`;
    ctx.fillText(face === "front" ? item.code : "泥梦新韵", size.width / 2, size.height * 0.38);
    ctx.fillStyle = dark ? "#d5ad74" : "#a5322a";
    ctx.font = `700 ${Math.round(size.width * 0.09)}px serif`;
    ctx.fillText(face === "front" ? item.title : "齐鲁封泥牌具", size.width / 2, size.height * 0.57);
    ctx.fillStyle = dark ? "#c9c7bd" : "#6e645c";
    ctx.font = `500 ${Math.round(size.width * 0.032)}px sans-serif`;
    ctx.fillText("PS 贴图占位 · 可替换", size.width / 2, size.height * 0.79);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  async function loadTexture(path, fallback) {
    // file:// 会被浏览器禁止读取相邻贴图；直接使用占位图，避免卡在加载状态。
    if (window.location.protocol === "file:") return fallback;
    try {
      const texture = await textureLoader.loadAsync(path);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    } catch (_) {
      return fallback;
    }
  }

  function disposeModel() {
    while (modelRoot.children.length) {
      const child = modelRoot.children.pop();
      child.traverse((object) => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => {
          material.map?.dispose();
          material.dispose?.();
        });
      });
    }
  }

  function makeFace(width, height, depth, texture, back = false) {
    // 标准平面自带 0～1 UV，Photoshop 导出的整张贴图可以无损铺满。
    const geometry = new THREE.PlaneGeometry(width * 0.94, height * 0.94);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.58, metalness: 0.02, polygonOffset: true, polygonOffsetFactor: -1 });
    const mesh = new THREE.Mesh(geometry, material);
    const faceOffset = depth / 2 + 0.04;
    mesh.position.z = back ? -faceOffset : faceOffset;
    if (back) mesh.rotation.y = Math.PI;
    mesh.castShadow = true;
    return mesh;
  }

  function buildPoker(item, textures) {
    const size = config.poker.model;
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRectShape(size.width, size.height, size.radius), { depth: size.depth, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.035, bevelThickness: 0.025, curveSegments: 14 }),
      new THREE.MeshStandardMaterial({ color: 0xe9e1d3, roughness: 0.74, metalness: 0 })
    );
    body.geometry.center();
    body.castShadow = true;
    group.add(body, makeFace(size.width, size.height, size.depth, textures.front), makeFace(size.width, size.height, size.depth, textures.back, true));
    return group;
  }

  function buildMahjong(item, textures) {
    const size = config.mahjong.model;
    const group = new THREE.Group();
    const sideMaterial = new THREE.MeshPhysicalMaterial({ map: textures.side, color: 0xd9ded4, roughness: 0.32, metalness: 0, clearcoat: 0.28, clearcoatRoughness: 0.52 });
    const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0xe9e5d8, roughness: 0.32, metalness: 0, clearcoat: 0.28, clearcoatRoughness: 0.52 });
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(size.width, size.height, size.depth, 6, 8, 5),
      [sideMaterial, sideMaterial, sideMaterial, sideMaterial, bodyMaterial, bodyMaterial]
    );
    body.castShadow = true;
    group.add(body);
    const front = makeFace(size.width, size.height, size.depth, textures.front);
    const back = makeFace(size.width, size.height, size.depth, textures.back, true);
    group.add(front, back);
    return group;
  }

  async function loadCurrentItem() {
    const revision = ++loadRevision;
    const collection = config[mode];
    const item = collection.items[itemIndex];
    status.textContent = "正在装载 3D 贴图…";
    title.textContent = item.title;
    subtitle.textContent = item.subtitle;
    description.textContent = item.description;
    counter.textContent = `${String(itemIndex + 1).padStart(2, "0")} / ${String(collection.items.length).padStart(2, "0")}`;
    texturePath.textContent = item.front;

    const frontFallback = makePlaceholderTexture(item, mode, "front");
    const backFallback = makePlaceholderTexture(item, mode, "back");
    const sideFallback = makePlaceholderTexture(item, mode, "side");
    const [front, back, side] = await Promise.all([
      loadTexture(item.front, frontFallback),
      loadTexture(item.back, backFallback),
      mode === "mahjong" ? loadTexture(item.side, sideFallback) : Promise.resolve(sideFallback)
    ]);
    if (revision !== loadRevision) return;
    disposeModel();
    model = mode === "poker" ? buildPoker(item, { front, back, side }) : buildMahjong(item, { front, back, side });
    model.rotation.set(targetRotation.x, targetRotation.y, 0);
    modelRoot.add(model);
    flipped = false;
    status.textContent = "拖动旋转 · 滚轮缩放 · 双击翻面";
    updateButtons();
  }

  function updateButtons() {
    autoRotateButton.setAttribute("aria-pressed", String(autoRotate));
    autoRotateButton.textContent = autoRotate ? "暂停旋转" : "自动旋转";
    flipButton.textContent = flipped ? "查看正面" : "翻到背面";
    root.querySelectorAll("[data-product-mode]").forEach((button) => {
      const active = button.dataset.productMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function setMode(nextMode) {
    if (!config[nextMode]) return;
    mode = nextMode;
    itemIndex = 0;
    resetView();
    updateButtons();
    loadCurrentItem();
  }

  function resetView() {
    targetRotation = { x: showcaseSettings.initialRotationX, y: showcaseSettings.initialRotationY };
    camera.position.set(0, showcaseSettings.cameraPositionY, mode === "poker" ? showcaseSettings.pokerCameraDistance : showcaseSettings.mahjongCameraDistance);
    camera.lookAt(0, 0, 0);
    if (model) model.rotation.set(targetRotation.x, targetRotation.y, 0);
    flipped = false;
  }

  function resize() {
    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  root.addEventListener("click", (event) => {
    const modeButton = event.target.closest("[data-product-mode]");
    if (modeButton) return setMode(modeButton.dataset.productMode);
    if (event.target.closest("#product3dPrev")) { itemIndex = (itemIndex - 1 + config[mode].items.length) % config[mode].items.length; loadCurrentItem(); }
    if (event.target.closest("#product3dNext")) { itemIndex = (itemIndex + 1) % config[mode].items.length; loadCurrentItem(); }
    if (event.target.closest("#product3dFlip")) { flipped = !flipped; targetRotation.y += Math.PI; updateButtons(); }
    if (event.target.closest("#product3dAutoRotate")) { autoRotate = !autoRotate; updateButtons(); }
    if (event.target.closest("#product3dReset")) { resetView(); updateButtons(); }
    if (event.target.closest("#product3dFullscreen")) viewport.requestFullscreen?.();
  });

  viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, .product-3d-mode, .product-3d-controls")) return;
    isDragging = true;
    autoRotate = false;
    dragStart = { x: event.clientX, y: event.clientY };
    viewport.setPointerCapture(event.pointerId);
    updateButtons();
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    targetRotation.y += dx * showcaseSettings.dragRotateY;
    targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + dy * showcaseSettings.dragRotateX, -1.15, 1.15);
    dragStart = { x: event.clientX, y: event.clientY };
  });
  viewport.addEventListener("pointerup", () => { isDragging = false; });
  viewport.addEventListener("pointercancel", () => { isDragging = false; });
  viewport.addEventListener("dblclick", () => { flipped = !flipped; targetRotation.y += Math.PI; updateButtons(); });
  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    camera.position.z = THREE.MathUtils.clamp(camera.position.z + event.deltaY * showcaseSettings.wheelZoomSpeed, showcaseSettings.cameraMinDistance, showcaseSettings.cameraMaxDistance);
  }, { passive: false });

  new ResizeObserver(resize).observe(viewport);
  document.addEventListener("fullscreenchange", resize);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.04);
    if (model) {
      if (autoRotate && document.documentElement.dataset.motion !== "0") targetRotation.y += delta * showcaseSettings.autoRotateSpeed;
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
