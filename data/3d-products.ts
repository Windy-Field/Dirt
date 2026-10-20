let valueResultdproducts1;
const value1 = window.MEDIA_CONFIG;
if (value1 === null || value1 === undefined) {
    valueResultdproducts1 = undefined;
}
else {
    valueResultdproducts1 = value1.textures;
}
/*
 * 3D 牌具贴图配置
 * Photoshop 设计完成后，将导出的 PNG/WebP 放到下方路径即可替换占位图
 * 扑克牌建议 750x1050px，麻将正面建议 768x1024px，均使用 sRGB
 */
const mediaTextures = valueResultdproducts1 || {};
const texturePath = function (name, fallback) {
    return mediaTextures[name] || fallback;
};
window.SEAL_3D_PRODUCTS = {
    poker: {
        label: "封泥扑克牌",
        model: { width: 3.15, height: 4.4, depth: 0.09, radius: 0.16 },
        items: [
            {
                id: "spade-k",
                code: "K",
                suit: "♠",
                title: "临淄守印",
                subtitle: "官制与权力 · 西汉",
                description: "这张黑桃 K 以临淄官署封泥作为主要纹样。它的背面用泥云智探印面和缠枝网格组成统一牌背。",
                front: texturePath("pokerSpadeKFront", "./assets/textures/poker/front/k.jpg"),
                back: texturePath("pokerDefaultBack", "./assets/textures/poker/back/default.webp")
            },
            {
                id: "diamond-j",
                code: "J",
                suit: "♦",
                title: "齐北船丞",
                subtitle: "仓储与漕运 · 汉代",
                description: "这张方片 J 取材于齐北船丞封泥，牌面文字对应汉代水运和船政事务。它与黑桃 K 共用泥云智探牌背。",
                front: texturePath("pokerDiamondJFront", "./assets/textures/poker/front/j.jpg"),
                back: texturePath("pokerDefaultBack", "./assets/textures/poker/back/default.webp")
            }
        ]
    },
    mahjong: {
        label: "封泥麻将",
        model: { width: 2.6, height: 3.5, depth: 1.30, radius: 0.2 },
        items: [
            {
                id: "east",
                code: "东",
                title: "齐都临淄",
                subtitle: "风牌 · 齐鲁地理",
                description: "东风牌用北周武帝皇后随葬金印作为中心纹样，再配合木纹和朱砂色“东”字。",
                front: texturePath("mahjongEastFront", "./assets/textures/mahjong/front/east.webp"),
                back: texturePath("mahjongDefaultBack", "./assets/textures/mahjong/back/default.webp")
            },
            {
                id: "wan-1",
                code: "一万",
                title: "官署封泥",
                subtitle: "万子 · 官制谱系",
                description: "“一万”牌用西汉《河间王玺》封泥作为中心纹样，把封泥印蜕、木纹和朱砂字组合在牌面上。",
                front: texturePath("mahjongWan1Front", "./assets/textures/mahjong/front/wan-1.webp"),
                back: texturePath("mahjongDefaultBack", "./assets/textures/mahjong/back/default.webp")
            }
        ]
    }
};
