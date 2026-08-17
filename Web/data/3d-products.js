/*
 * 3D 牌具贴图配置
 * Photoshop 设计完成后，将导出的 PNG/WebP 放到下方路径即可替换占位图。
 * 扑克牌建议 750x1050px，麻将正面建议 768x1024px，均使用 sRGB。
 */
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
        description: "以临淄官署封泥为黑桃 K 的核心纹样，牌面贴图可由 Photoshop 导出后直接替换。",
        front: "./assets/textures/poker/front/spade-k.webp",
        back: "./assets/textures/poker/back/default.webp"
      },
      {
        id: "diamond-j",
        code: "J",
        suit: "♦",
        title: "齐北船丞",
        subtitle: "仓储与漕运 · 汉代",
        description: "以齐北船丞所代表的水陆运输与仓储制度构成方片花色样张。",
        front: "./assets/textures/poker/front/diamond-j.webp",
        back: "./assets/textures/poker/back/default.webp"
      }
    ]
  },
  mahjong: {
    label: "封泥麻将",
    model: { width: 2.6, height: 3.5, depth: 1.75, radius: 0.2 },
    items: [
      {
        id: "wan-1",
        code: "一万",
        title: "官署封泥",
        subtitle: "万子 · 官制谱系",
        description: "保留标准一万识别结构，以官署封泥印面和朱砂文字建立文化层次。",
        front: "./assets/textures/mahjong/front/wan-1.webp",
        back: "./assets/textures/mahjong/back/default.webp",
        side: "./assets/textures/mahjong/side/default.webp"
      },
      {
        id: "east",
        code: "东",
        title: "齐都临淄",
        subtitle: "风牌 · 齐鲁地理",
        description: "东风牌以齐都临淄为主题，文字仍保持麻将实战所需的高识别度。",
        front: "./assets/textures/mahjong/front/east.webp",
        back: "./assets/textures/mahjong/back/default.webp",
        side: "./assets/textures/mahjong/side/default.webp"
      }
    ]
  }
};
