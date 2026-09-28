const fs = require("fs");
const path = require("path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist");
const builtQuizPath = path.join(distRoot, "assets", "quiz-bundle.js");

if (!fs.existsSync(builtQuizPath)) {
  throw new Error("未找到 dist/assets/quiz-bundle.js，请先运行 Vite 构建。");
}

// assets 的复制可能覆盖刚生成的问答包，因此先保留构建结果，复制后恢复。
const quizBundle = fs.readFileSync(builtQuizPath);

const copyDirectories = ["assets", "css", "data", "js", ".runtime"];
for (let directoryIndex = 0; directoryIndex < copyDirectories.length; directoryIndex += 1) {
  const directory = copyDirectories[directoryIndex];
  fs.cpSync(path.join(projectRoot, directory), path.join(distRoot, directory), {
    recursive: true,
    force: true,
  });
}

// 校验实际配置引用的媒体，防止构建成功但上线后视频或封面返回 404。
const mediaContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(distRoot, ".runtime/data/media-config.js"), "utf8"), mediaContext);
const mediaKeys = ["recapVideoUrl", "recapPosterUrl"];
for (let keyIndex = 0; keyIndex < mediaKeys.length; keyIndex += 1) {
  const key = mediaKeys[keyIndex];
  const resource = mediaContext.window.MEDIA_CONFIG.coursePack[key];
  if (!resource) throw new Error(`课程媒体缺少配置：${key}`);
  if (/^https:\/\//.test(resource)) continue;
  const resourcePath = path.resolve(distRoot, resource);
  if (!resourcePath.startsWith(distRoot + path.sep) || !fs.existsSync(resourcePath) || !fs.statSync(resourcePath).size) {
    throw new Error(`课程媒体未包含在构建目录中：${resource}`);
  }
}

fs.copyFileSync(path.join(projectRoot, "favicon.ico"), path.join(distRoot, "favicon.ico"));
fs.writeFileSync(builtQuizPath, quizBundle);

const sourcePage = path.join(projectRoot, "index.html");
const outputPage = path.join(distRoot, "index.html");
const glyphScript = fs.readFileSync(path.join(projectRoot, "js", "seal-glyph-paths.js"), "utf8");
const glyphDataMatch = glyphScript.match(/const paths = (\{.*?\});/s);
if (!glyphDataMatch) throw new Error("无法从 js/seal-glyph-paths.js 读取开屏封泥字形。");
const glyphPaths = JSON.parse(glyphDataMatch[1]);
const glyphNames = ["ni", "yun", "zhi", "tan"];
const glyphMarkupParts = [];
for (let index = 0; index < glyphNames.length; index += 1) {
  const name = glyphNames[index];
    if (!glyphPaths[name]) throw new Error(`开屏封泥缺少 ${name} 字形。`);
  glyphMarkupParts.push(`                <path class="seal-inscription-glyph glyph-${name}" d="${glyphPaths[name]}"></path>`);
}
const glyphMarkup = glyphMarkupParts.join("\n");
const version = Date.now().toString(36);
let html = fs.readFileSync(sourcePage, "utf8");

html = html.replace(/\.\/dist\/assets\/quiz-bundle\.js(?:\?v=[^"']+)?/g, "./assets/quiz-bundle.js");
html = html.replace(/(href="\.\/css\/[^"?]+)(?:\?v=[^"]+)?(")/g, `$1?v=${version}$2`);
html = html.replace(
  /(\s*<g class="seal-inscription" role="img" aria-label="泥云智探">)[\s\S]*?(\s*<\/g>)/,
  `$1\n${glyphMarkup}$2`,
);
if ((html.match(/class="seal-inscription-glyph/g) || []).length !== 4) {
  throw new Error("构建后的开屏封泥必须包含四个静态 SVG 字形。");
}
html = html.replace(/\r\n?/g, "\n");

fs.writeFileSync(outputPage, html, "utf8");
console.log("构建目录已准备完成：dist");
