const knowledgeSource = window.SEAL_KNOWLEDGE || window.PPT_KNOWLEDGE;

window.MOCK_DATA = {
  stats: { relics: 86, sites: knowledgeSource ? knowledgeSource.sites.length : 45, courses: 8 },
  mapImageUrl: "",
  sites: (knowledgeSource ? knowledgeSource.sites : []).map((site) => ({
    ...site,
    description: `${site.note} 代表印文：${site.seals.join("、")}。古代归属：${site.admin}。`
  })),
  relics: [
    {
      id: "NMX-001",
      name: "临淄守印封泥",
      inscription: "临淄守印",
      period: "汉代",
      location: "山东淄博临淄齐故城",
      category: "职官封泥",
      tone: "clay",
      value: "官制与史料价值",
      imageUrl: "./assets/seal-linzi.png",
      summary: "汉代齐郡郡守级重要凭信，缪篆方正严整，边栏残缺自然，反映汉初郡国并行体制下齐国官署的极高规格，可补《汉书·百官公卿表》之阙。"
    },
    {
      id: "NMX-002",
      name: "秦封泥 · 墓印篆",
      inscription: "墓印篆",
      period: "秦代",
      location: "秦汉故城遗址",
      category: "职官封泥",
      tone: "ink",
      value: "古文字学价值",
      imageUrl: "./assets/seal-qin-mu.png",
      summary: "典型秦代小篆体势，结体纵势微长，笔画圆劲挺拔，带有秦代标准“田”字界格痕迹，是研究秦代文字统一与官印制度的标准实物。"
    },
    {
      id: "NMX-003",
      name: "汉代仓府封泥",
      inscription: "仓府",
      period: "汉代",
      location: "山东济南章丘",
      category: "机构仓储封泥",
      tone: "bronze",
      value: "社会经济价值",
      imageUrl: "./assets/seal-han.png",
      summary: "用于粮食与物资出入库的防拆封缄，反映两汉完备的仓储物资核验、转运责任追溯体系，是汉代宏观经济调控与微观治理的实物见证。"
    },
    {
      id: "NMX-004",
      name: "齐北船丞封泥",
      inscription: "齐北船丞",
      period: "战国至汉代",
      location: "山东青岛 / 胶东半岛",
      category: "漕运水利封泥",
      tone: "sand",
      value: "历史地理与漕运",
      imageUrl: "./assets/seal-qibei.png",
      summary: "掌管齐地北方水运漕路与船政事务的官署印信，佐证了齐国及汉初环渤海、黄海便利的水运商路与盐铁物资调配网络。"
    }
  ],
  courses: [
    { id: "COURSE-01", title: "一方澄泥，如何锁住两千年文书？", lesson: 1, duration: "12 分钟", description: "从古代简牍公文的保密机制出发，深入解析封泥的制作、系绳、填泥与破封全过程。", videoUrl: "", posterUrl: "" },
    { id: "COURSE-02", title: "封泥地理志：跟着泥印寻访齐鲁古城", lesson: 2, duration: "15 分钟", description: "结合《汉书·地理志》与出土点位，探索临淄、即墨、琅邪、胶东等古郡国的空间治理格局。", videoUrl: "", posterUrl: "" },
    { id: "COURSE-03", title: "金石微观：封泥上的小篆与缪篆之美", lesson: 3, duration: "18 分钟", description: "从线条刀感、布白严密到印面残缺肌理，赏析秦汉文字从书写到钤印的古雅之变。", videoUrl: "", posterUrl: "" }
  ],
  creativeWorks: [
    { id: "CREATIVE-01", name: "于见泥 IP 形象", category: "角色设计", mark: "于", description: "以古朴封泥轮廓与朱砂印面为灵感，塑造温润亲和的封泥文化数字导览吉祥物。" },
    { id: "CREATIVE-02", name: "齐鲁金石拓片纸品", category: "纸品设计", mark: "印", description: "提取临淄守印、齐北船丞等经典印文，转化为具备传统手作质感的现代文创纸品。" },
    { id: "CREATIVE-03", name: "模拟封缄研学教具", category: "研学教具", mark: "封", description: "配合公益文化普及课堂，动手体验削检、穿绳、覆泥、钤印的古法封缄技艺。" }
  ]
};
