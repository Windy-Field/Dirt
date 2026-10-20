(function loadOfflineTextures() {
    "use strict";
    // WebGL 禁止普通 file:// 图片上传为纹理；仅本地双击模式同步加载内嵌贴图
    if (window.location.protocol === "file:") {
        document.write('<script src="./data/texture-inline.js"><\/script>');
    }
})();
