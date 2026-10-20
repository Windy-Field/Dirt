# 课程资源

三课时 PDF、逐页预览图、教案学习单和活动视频放在这里，路径配置见 [data/media-config.ts](../../data/media-config.ts)

当前目录：

```text
assets/courses/
├─ course-slides/course-01/   第一课时预览图，共 24 页
├─ course-slides/course-02/   第二课时预览图，共 31 页
├─ course-slides/course-03/   第三课时预览图，共 22 页
├─ 第一课时.pdf
├─ 第二课时 ppt.pdf
├─ 第三课时（1）.pdf
├─ 教案+学习单(2).docx
├─ 视频.mp4                  原始视频备份
├─ course-recap.mp4          网页播放版本（元数据前置）
└─ course-recap-poster.jpg   视频片头封面
```

一门课程的配置示例：

```js
"COURSE-01": {
  videoUrl: "",
  posterUrl: "",
  resourceUrl: "./assets/courses/第一课时.pdf",
  resourceType: "PDF",
  resourceName: "第一课时教学课件 PDF",
  resourceFileName: "第一课时.pdf",
  slideBasePath: "./assets/courses/course-slides/course-01",
  slideCount: 24
}
```

课程 ID 与 `data/mock-data.ts` 或数据库记录一致。教案和活动视频配置在 `coursePack` 中，调整预览页数后同步修改 `slideCount`

视频建议使用 MP4（H.264 + AAC）或 WebM，封面使用 WebP 或 PNG。新文件名尽量只用英文字母、数字、短横线和点，例如 `course-01.mp4`；现有中文文件名可继续使用，但修改名称后必须更新配置

活动视频配置在 `coursePack.recapVideoUrl`，封面配置在 `coursePack.recapPosterUrl`。发布时运行 `npm run package:fc` 并上传完整部署包，脚本会检查视频和封面

外部媒体使用 HTTPS，并将主机名加入 `allowedExternalHosts`。配置与媒体均公开可访问，使用已获公开授权的资源
