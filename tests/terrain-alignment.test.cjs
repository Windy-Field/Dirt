const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

async function setupMap(prefectures = [], rivers = [], referenceRivers = [], lakes = [], referenceLakes = []) {
  const THREE = await import('three');
  let scene;
  let camera;
  const frames = [];
  const input = {
    value: '0',
    addEventListener: function addInputListener(type, handler) {
      this[type] = handler;
    },
  };
  const marker = { dataset: { terrainX: '43.27', terrainY: '56.13' }, style: {} };
  const handlers = {};
  const captures = new Set();
  const root = {
    dataset: {},
    classList: {
      add: function addClass() {},
      remove: function removeClass() {},
      toggle: function toggleClass() {},
    },
    addEventListener: function addRootListener(type, handler, options) {
      let key = type;
      if (options === true) {
        key = `${type}Capture`;
      }
      handlers[key] = handler;
    },
    setPointerCapture: function setPointerCapture(id) {
      captures.add(id);
    },
    hasPointerCapture: function hasPointerCapture(id) {
      return captures.has(id);
    },
    releasePointerCapture: function releasePointerCapture(id) {
      captures.delete(id);
    },
    getBoundingClientRect: function getRootBounds() {
      return { width: 1000, height: 650 };
    },
    querySelector: function findRootElement(selector) {
      if (selector === '#mapTerrainStatus') {
        return {};
      }
      if (selector === '#mapRotation') {
        return input;
      }
      return null;
    },
    querySelectorAll: function findRootElements() {
      return [marker];
    },
  };
  const context = {
    THREE: Object.assign({}, THREE, {
      WebGLRenderer: class {
        constructor() {
          this.shadowMap = {};
        }
        setPixelRatio() {}
        setClearColor() {}
        setSize() {}
        render(s, c) {
          scene = s;
          camera = c;
        }
      },
    }),
    document: {
      querySelector: function findDocumentElement() {
        return root;
      },
      addEventListener: function addDocumentListener() {},
    },
    window: {
      THREE: true, location: { protocol: 'file:' }, devicePixelRatio: 1,
      requestAnimationFrame: function requestAnimationFrame(frame) {
        frames.push(frame);
      },
      addEventListener: function addWindowListener() {},
      SHANDONG_TERRAIN_INLINE: {
        width: 4, height: 4,
        heightBase64: Buffer.from([0, 255, 0, 255, 255, 0, 255, 0, 0, 255, 0, 255, 255, 0, 255, 0]).toString('base64'),
        maskBase64: Buffer.alloc(16, 255).toString('base64'),
      },
      SHANDONG_PREFECTURES: prefectures,
      SHANDONG_RIVERS: rivers,
      SHANDONG_REFERENCE_RIVERS: referenceRivers,
      SHANDONG_LAKES: lakes,
      SHANDONG_REFERENCE_LAKES: referenceLakes,
    },
    ResizeObserver: class {
      observe() {}
    },
    IntersectionObserver: class {
      observe() {}
    },
    atob, console,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('.runtime/data/shandong-terrain.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('.runtime/js/three-map.js', 'utf8'), context);
  while (frames.length) frames.shift()();
  return { THREE, scene, camera, frames, input, marker, root, handlers, captures };
}

test('DEM updates reach the GPU and overlays follow mesh triangles', async function testDemUpdates() {
  const mapResult = await setupMap();
  const THREE = mapResult.THREE;
  const scene = mapResult.scene;
  const camera = mapResult.camera;
  const frames = mapResult.frames;
  const input = mapResult.input;
  const marker = mapResult.marker;
  const terrain = scene.children.find(function findTerrain(item) {
    return item.isMesh;
  });
  assert.ok(terrain.geometry.attributes.position.version > 0,
    'DEM positions changed without needsUpdate: GPU keeps the flat placeholder');
  const angles = [0, 45, 67];
  for (let angleIndex = 0; angleIndex < angles.length; angleIndex += 1) {
    const angle = angles[angleIndex];
    input.value = String(angle);
    input.input();
    while (frames.length) frames.shift()();
    terrain.updateMatrixWorld(true);
    const x = (Number(marker.dataset.terrainX) / 100 - 0.5) * 18;
    const height = terrain.geometry.parameters.height;
    const y = (0.5 - Number(marker.dataset.terrainY) / 100) * height + terrain.position.y;
    const ray = new THREE.Raycaster(new THREE.Vector3(x, y, 10), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(terrain, false)[0];
    assert.ok(hit, 'marker must intersect terrain');
    const projected = hit.point.project(camera);
    assert.ok(Math.abs(parseFloat(marker.style.top) - (1 - projected.y) * 50) < 0.0001,
      `marker floats above rendered triangle at ${angle} degrees`);
  }
});

test('reset responds to a single click after dragging while gesture clicks stay suppressed', async function testResetAfterDrag() {
  const mapResult = await setupMap();
  const root = mapResult.root;
  const handlers = mapResult.handlers;
  const input = mapResult.input;
  const ground = {
    closest: function findGroundElement() {
      return null;
    },
  };
  const pointer = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100, target: ground };
  handlers.pointerdown(pointer);
  const movedPointer = Object.assign({}, pointer, { clientX: 180 });
  handlers.pointermove(movedPointer);
  handlers.pointerup(pointer);
  let blocked = false;
  const click = {
    detail: 1,
    target: ground,
    preventDefault: function preventDefault() {},
    stopImmediatePropagation: function stopImmediatePropagation() {
      blocked = true;
    },
  };
  handlers.clickCapture(click);
  assert.equal(blocked, true, 'drag-generated clicks must remain blocked');
  handlers.wheel({ deltaY: -200, preventDefault: function preventDefault() {} });
  input.value = '45';
  input.input();
  const reset = {
    closest: function findResetElement() {
      return {
        matches: function matchesReset() {
          return false;
        },
      };
    },
  };
  const resetPointer = Object.assign({}, pointer, { target: reset });
  handlers.pointerdown(resetPointer);
  blocked = false;
  const resetClick = Object.assign({}, click, { target: reset });
  handlers.clickCapture(resetClick);
  if (!blocked) handlers.click(resetClick);
  assert.equal(blocked, false, 'reset button must not inherit the previous drag suppression');
  assert.equal(root.dataset.cameraDistance, '18.50');
  assert.equal(root.dataset.cameraElevation, '0.0000');
  assert.equal(root.dataset.cameraTargetX, '0.000');
});

test('single-city duplicated rings are not inter-city boundaries', async function testSingleCityRings() {
  const ring = [[118.227585, 38.037874], [118.410001, 38.053277], [118.40779, 38.026212], [118.2234, 38.00095], [118.227585, 38.037874]];
  const reversedRing = ring.slice().reverse();
  const mapResult = await setupMap([{ name: 'Dongying', rings: [ring, reversedRing] }]);
  const terrain = mapResult.scene.children.find(function findTerrain(item) {
    return item.isMesh;
  });
  assert.equal(terrain.children[0].children.length, 0);
});

test('reported Dongying-Binzhou rectangle is excluded even with two owners', async function testExcludedRectangle() {
  const ring = [[118.40779,38.026212],[118.419951,38.025503],[118.419319,38.053119],[118.410001,38.053277],[118.40779,38.026212]];
  const reversedRing = ring.slice().reverse();
  const mapResult = await setupMap([
    { name: 'Dongying', rings: [ring] },
    { name: 'Binzhou', rings: [reversedRing] },
  ]);
  const terrain = mapResult.scene.children.find(function findTerrain(item) {
    return item.isMesh;
  });
  assert.equal(terrain.children[0].children.length, 0);
});

test('river centerline lowers mesh vertices, not an elevated overlay', async function testRiverCarving() {
  const baseline = await setupMap();
  const carved = await setupMap([], [{ name: 'Huang', coordinates: [[115, 35], [122, 38]] }]);
  const originalTerrain = baseline.scene.children.find(function findTerrain(item) {
    return item.isMesh;
  });
  const carvedTerrain = carved.scene.children.find(function findTerrain(item) {
    return item.isMesh;
  });
  const original = originalTerrain.geometry.attributes.position;
  const updated = carvedTerrain.geometry.attributes.position;
  let lowered = 0;
  for (let index = 0; index < original.count; index++) {
    assert.ok(updated.getZ(index) <= original.getZ(index));
    if (updated.getZ(index) < original.getZ(index)) lowered++;
  }
  assert.ok(lowered > 0);
});

test('unselected waterways do not carve any terrain', async function testUnselectedWaterways() {
  const mapResult = await setupMap([], [
    { name: 'Other', coordinates: [[115, 35], [122, 38]] },
    { name: 'Zhang', coordinates: [[116, 35], [121, 38]] },
  ]);
  const root = mapResult.root;
  assert.equal(root.dataset.riverVertices, '0');
  assert.equal(root.dataset.displayedRivers, '');
});

test('real datasets display selected rivers and Grand Canal', async function testRealRivers() {
  const data = { window: {} };
  const files = ['data/shandong-rivers.js', 'data/shandong-rivers-reference.js'];
  for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
    const file = files[fileIndex];
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), data);
  }
  const mapResult = await setupMap([], data.window.SHANDONG_RIVERS, data.window.SHANDONG_REFERENCE_RIVERS);
  const root = mapResult.root;
  assert.deepEqual(root.dataset.displayedRivers.split(',').sort(),
    ['Huang', '沂河', '大汶河', '徒骇河', '小清河', '潍河', '大沽河', '京杭运河（山东段示意）'].sort());
  assert.ok(Number(root.dataset.riverVertices) > 0);
});

test('Yihe carves terrain near Linyi and Weishan fills lake interior', async function testYiheAndLake() {
  const data = { window: {} };
  const files = ['data/shandong-rivers-reference.js', 'data/shandong-lakes.js'];
  for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
    const file = files[fileIndex];
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), data);
  }
  const baseline = await setupMap();
  const result = await setupMap([], [], data.window.SHANDONG_REFERENCE_RIVERS, data.window.SHANDONG_LAKES);
  const baselineTerrain = baseline.scene.children.find(function findTerrain(item) {
    return item.isMesh;
  });
  const original = baselineTerrain.geometry.attributes.position;
  const mesh = result.scene.children.find(function findTerrain(item) {
    return item.isMesh;
  });
  const updated = mesh.geometry.attributes.position;
  const x = (118.38 - 114.8102646639) / (122.706 - 114.8102646639) * 18 - 9;
  const y = mesh.geometry.parameters.height / 2 - (38.3997238086 - 35.13) / (38.3997238086 - 34.3786) * mesh.geometry.parameters.height;
  let nearest = 0;
  let distance = Infinity;
  for (let index = 0; index < updated.count; index++) {
    const next = Math.hypot(updated.getX(index) - x, updated.getY(index) - y);
    if (next < distance) { nearest = index; distance = next; }
  }
  assert.ok(updated.getZ(nearest) < original.getZ(nearest), 'Linyi river point must be lowered');
  assert.ok(Number(result.root.dataset.lakeVertices) > 0, 'lake polygon interior must be filled');
});

test('northern Nansi lake sketch adds water beyond the southern Weishan polygon', async function testNorthernLake() {
  const data = { window: {} };
  const files = ['data/shandong-lakes.js', 'data/shandong-lakes-reference.js'];
  for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
    const file = files[fileIndex];
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), data);
  }
  const south = await setupMap([], [], [], data.window.SHANDONG_LAKES);
  const combined = await setupMap([], [], [], data.window.SHANDONG_LAKES, data.window.SHANDONG_REFERENCE_LAKES);
  assert.ok(Number(combined.root.dataset.lakeVertices) > Number(south.root.dataset.lakeVertices) * 2);
  const mesh = combined.scene.children.find(function findTerrain(item) {
    return item.isMesh;
  });
  const southTerrain = south.scene.children.find(function findTerrain(item) {
    return item.isMesh;
  });
  const original = southTerrain.geometry.attributes.position;
  const updated = mesh.geometry.attributes.position;
  let northernWater = 0;
  for (let i = 0; i < updated.count; i++) {
    const latitude = 38.3997238086 - (mesh.geometry.parameters.height / 2 - updated.getY(i)) / mesh.geometry.parameters.height * (38.3997238086 - 34.3786);
    if (latitude > 35.1 && updated.getZ(i) < original.getZ(i)) northernWater++;
  }
  assert.ok(northernWater > 0, 'lake must extend north toward Jining');
});

test('Yihe outlet turns southwest rather than extending to the southern map edge', function testYiheOutlet() {
  const data = { window: {} };
  vm.runInNewContext(fs.readFileSync('data/shandong-rivers-reference.js', 'utf8'), data);
  const river = data.window.SHANDONG_REFERENCE_RIVERS.find(function findYihe(item) {
    return item.name === '沂河';
  });
  const lastIndex = river.coordinates.length - 1;
  const last = river.coordinates[lastIndex];
  const previous = river.coordinates[lastIndex - 1];
  assert.ok(last[0] < previous[0] && last[1] < previous[1]);
  assert.ok(last[1] > 34.5, 'do not extend to the map bounding-box bottom');
  assert.equal(river.extendEndToCoast, undefined, 'an inland outlet is not a sea mouth');
});

test('boundary segments follow terrain between source vertices', async function testBoundarySegments() {
  const mapResult = await setupMap([
    { name: 'first', rings: [[[115, 35], [122, 38]]] },
    { name: 'second', rings: [[[122, 38], [115, 35]]] },
  ]);
  const THREE = mapResult.THREE;
  const terrain = mapResult.scene.children.find(function findTerrain(item) {
    return item.isMesh;
  });
  terrain.updateMatrixWorld(true);
  const lines = terrain.children[0].children;
  assert.ok(lines.length);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const positions = line.geometry.attributes.position;
    for (let i = 1; i < positions.count; i++) {
      const midpoint = new THREE.Vector3().fromBufferAttribute(positions, i - 1)
        .add(new THREE.Vector3().fromBufferAttribute(positions, i)).multiplyScalar(0.5);
      terrain.localToWorld(midpoint);
      const ray = new THREE.Raycaster(new THREE.Vector3(midpoint.x, midpoint.y, 10), new THREE.Vector3(0, 0, -1));
      const hit = ray.intersectObject(terrain, false)[0];
      assert.ok(hit);
      assert.ok(midpoint.z - hit.point.z > 0 && midpoint.z - hit.point.z < 0.007,
        'boundary must remain just above the rendered triangle throughout each segment');
    }
  }
});

test('pinch accepts marker touches and resumes single-finger pan', async function testPinchOnMarker() {
  const mapResult = await setupMap();
  const root = mapResult.root;
  const handlers = mapResult.handlers;
  const captures = mapResult.captures;
  function createTouchEvent(id, x, onMarker) {
    let markerTarget = null;
    if (onMarker) {
      markerTarget = {
        matches: function matchesMarker(selector) {
          return selector === '.map-marker';
        },
      };
    }
    return {
      pointerId: id,
      pointerType: 'touch',
      clientX: x,
      clientY: 200,
      target: {
        closest: function findClosest() {
          return markerTarget;
        },
      },
    };
  }
  handlers.pointerdown(createTouchEvent(1, 100, false));
  handlers.pointerdown(createTouchEvent(2, 200, true));
  handlers.pointermove(createTouchEvent(2, 250, true));
  assert.ok(Number(root.dataset.cameraDistance) < 18.5, 'spreading fingers over a marker must zoom in');
  assert.deepEqual(Array.from(captures), [1, 2], 'both fingers must remain captured');
  handlers.pointermove(createTouchEvent(2, 210, false));
  const zoom = Number(root.dataset.cameraDistance);
  assert.ok(zoom > 17.25, 'bringing fingers together must zoom out');
  handlers.pointerup(createTouchEvent(2, 210, false));
  const x = root.dataset.cameraTargetX;
  handlers.pointermove(createTouchEvent(1, 120, false));
  assert.notEqual(root.dataset.cameraTargetX, x, 'remaining finger must resume panning');
  handlers.pointercancel(createTouchEvent(1, 120, false));
  assert.equal(captures.size, 0);
  const stopped = root.dataset.cameraTargetX;
  handlers.pointermove(createTouchEvent(1, 160, false));
  assert.equal(root.dataset.cameraTargetX, stopped, 'cancelled touches must not move the map');
});
