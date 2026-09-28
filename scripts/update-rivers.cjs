const fs = require('node:fs/promises');
const path = require('node:path');

// 这里只筛选包围盒内的连续顶点，不做精确省界裁剪，也不补画缺失河段。
// 判断一个经纬度点是否在山东地图的包围盒内。
function isWithinMapBounds(point) {
  const longitude = point[0];
  const latitude = point[1];
  return longitude >= 114.8 && longitude <= 122.71 && latitude >= 34.37 && latitude <= 38.41;
}

// 下载公开河流数据，筛选黄河在山东范围内的连续线段并写入前端数据文件。
async function updateRivers() {
  const source = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson';
  const response = await fetch(source);
  if (!response.ok) throw new Error(`River source HTTP ${response.status}`);
  const data = await response.json();
  const rivers = [];
  for (let featureIndex = 0; featureIndex < data.features.length; featureIndex += 1) {
    const feature = data.features[featureIndex];
    // 当前公开数据只使用黄河，避免更新时重新带回已停用的 Yi、Zhang 折线。
    if (feature.properties.name !== 'Huang') continue;
    let lines = [];
    if (feature.geometry.type === 'MultiLineString') {
      lines = feature.geometry.coordinates;
    } else if (feature.geometry.type === 'LineString') {
      lines = [feature.geometry.coordinates];
    }
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      let segment = [];
      for (let pointIndex = 0; pointIndex < line.length; pointIndex += 1) {
        const point = line[pointIndex];
        const inside = isWithinMapBounds(point);
        if (inside) segment.push(point.slice(0, 2));
        else {
          if (segment.length > 1) rivers.push({ name: feature.properties.name, coordinates: segment });
          segment = [];
        }
      }
      if (segment.length > 1) rivers.push({ name: feature.properties.name, coordinates: segment });
    }
  }
  if (!rivers.length) throw new Error('No river geometry found');
  await fs.writeFile(path.join(__dirname, '../data/shandong-rivers.js'),
    `/* Natural Earth 1:10m rivers/lake centerlines, public domain.\n * Source: ${source}\n * Generalized centerlines; channel width/depth are illustrative, not measured. */\nwindow.SHANDONG_RIVERS = ${JSON.stringify(rivers)};\n`);
  const summaries = [];
  for (let index = 0; index < rivers.length; index += 1) {
    const river = rivers[index];
    summaries.push(`${river.name}: ${river.coordinates.length}`);
  }
  console.log(summaries.join('\n'));
}

updateRivers().catch(function reportRiverImportFailure(error) {
  console.error(error.message);
  process.exitCode = 1;
});
