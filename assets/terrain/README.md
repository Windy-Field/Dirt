# 山东地形数据

山东 3D 文化地图使用两张轻量图片：

```text
shandong-heightmap.png   768 x 392 灰度高度图
shandong-mask.png        山东轮廓遮罩
```

两张图片由山东省 30 米 DEM GeoTIFF 转换而来，用于生成地形起伏和裁出省界。原始 GeoTIFF 约 148 MB，单独保存

地图还会读取：

- `data/shandong-terrain.ts`：图片路径、经纬度边界和显示参数
- `data/shandong-terrain-inline.js`：本地双击页面时使用的轻量数据
- `data/shandong-prefectures.js`：山东 16 个地级市边界
- `data/shandong-rivers.js`：主要河流概化中心线，供蓝色河槽示意使用
- `data/shandong-rivers-reference.js`：按用户参考图相对位置补绘的河流、运河示意
- `assets/maps/shandong-map-flat.webp`：简化平面版地图
- `js/three-map.ts`：相机、缩放、抬升、点位投影和渲染逻辑

替换 DEM 时，同步核对图片尺寸、`bounds` 经纬度范围、遮罩方向和行政边界映射，保证点位与地形对齐

这些数据用于文化展示和历史地理阅读，不能用于测绘、导航、行政勘界或工程计算

## 市界和河流

立体地图显示黄河、大汶河、徒骇河、小清河、沂河、潍河、大沽河、京杭运河山东段和微山湖。黄河使用 Natural Earth 数据，其余河段按参考图补绘。`getDisplayedRivers()` 选择参与渲染的河流

市界来自 [DataV 山东行政区划数据](https://geo.datav.aliyun.com/areas_v3/bound/370000_full.json)，通过 `node scripts/update-prefectures.cjs` 更新。脚本保留全部顶点，渲染时匹配相邻城市的共享边，再沿地形网格切分，使边界贴合地面

东营、滨州数据中的一处独立四边形行政含义待核实，`createExcludedBoundaryEdges()` 暂时隐藏其四条边。原始坐标保留，更新数据时重新核对

黄河来自 [Natural Earth 河流与湖泊中心线](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_rivers_lake_centerlines.geojson)，属于公共领域数据，比例尺为 1:1000 万。运行 `node scripts/update-rivers.cjs` 可提取地图范围内的黄河连续线段

河槽通过降低中心线附近的网格顶点形成，宽度和深度均为展示参数，原始高度图保持原样

补绘河段保存在 `data/shandong-rivers-reference.js`，包含沂河、徒骇河、小清河、大汶河、京杭运河、潍河和大沽河。沂河从临沂以下向西南出省进入江苏，末段为参考图示意

微山湖采用 Natural Earth 1:1000 万湖泊多边形，保存在 `data/shandong-lakes.js`，通过 `node scripts/update-lakes.cjs` 更新

`data/shandong-lakes-reference.js` 补绘南阳湖、独山湖、昭阳湖方向的连片水面，与公开微山湖数据合并渲染。湖岸按参考图概化，面积、水位和岛屿待核实

## 授权说明

现有原数据说明存在冲突：目录中的 `LICENSE` 标为 MIT License，另一处说明又写有“未经允许不得随意传播和商业使用”。正式公开或用于商业项目之前，应向数据提供方确认可否再分发、如何署名，以及是否允许商用
