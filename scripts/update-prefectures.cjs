const fs = require('node:fs/promises');
const path = require('node:path');

async function updatePrefectures() {
  const source = 'https://geo.datav.aliyun.com/areas_v3/bound/370000_full.json';
  const response = await fetch(source);
  if (!response.ok) throw new Error(`DataV HTTP ${response.status}`);
  const data = await response.json();
  if (!data.features || data.features.length !== 16) throw new Error('Expected 16 prefectures');
  const prefectures = [];
  for (let index = 0; index < data.features.length; index += 1) {
    const feature = data.features[index];
    const type = feature.geometry.type;
    const coordinates = feature.geometry.coordinates;
    if (type !== 'Polygon' && type !== 'MultiPolygon') throw new Error(`Unexpected geometry: ${type}`);
    let rings = coordinates;
    if (type === 'MultiPolygon') {
      rings = [];
      for (let polygonIndex = 0; polygonIndex < coordinates.length; polygonIndex += 1) {
        const polygonRings = coordinates[polygonIndex];
        for (let ringIndex = 0; ringIndex < polygonRings.length; ringIndex += 1) {
          rings.push(polygonRings[ringIndex]);
        }
      }
    }
    prefectures.push({
      name: feature.properties.name.replace(/市$/, ''),
      // 保留各环的独立坐标，供展示层匹配共享边
      rings: rings,
    });
  }
  const header = `/* 山东市界，保留 DataV 源数据顶点\n * 来源：${source}\n */\n`;
  await fs.writeFile(path.join(__dirname, '../data/shandong-prefectures.js'),
    header + 'window.SHANDONG_PREFECTURES = ' + JSON.stringify(prefectures) + ';\n');
  console.log(`Updated ${prefectures.length} prefectures without vertex simplification.`);
}

updatePrefectures().catch(function reportUpdateFailure(error) {
  console.error(error.message);
  process.exitCode = 1;
});
