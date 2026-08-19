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
  ],
  questions: [
    { id: 1, difficulty: "简单", question: "封泥在古代最主要的用途是什么？", optionA: "装饰陶器", optionB: "封缄文书或物品", optionC: "制作钱币", optionD: "记录天气", correctAnswer: "B", explanation: "封泥通常与绳结、封检和印章配合，用于封缄简牍文书、容器或货物。" },
    { id: 2, difficulty: "简单", question: "收件官署打开封缄文书前，首先需要做什么？", optionA: "核验泥封和印文是否完整", optionB: "把封泥重新浸湿", optionC: "在封泥上再盖一枚印", optionD: "抄写一份新文书", correctAnswer: "A", explanation: "收件人先核验印文和泥封完整性，确认没有被私拆，再破泥开读。" },
    { id: 3, difficulty: "中等", question: "研究封泥上的古代地名，主要有助于了解什么？", optionA: "古代饮食口味", optionB: "陶器烧制温度", optionC: "郡国县邑和历史地理", optionD: "古代音乐节拍", correctAnswer: "C", explanation: "封泥印文中的郡、国、县、乡等地名，可以与文献和出土地点相互印证。" },
    { id: 4, difficulty: "困难", question: "网页中的“临淄守印”主要体现哪一类研究价值？", optionA: "天文历法", optionB: "官制与史料", optionC: "农作物育种", optionD: "服饰染色", correctAnswer: "B", explanation: "“守”与郡守级官署相关，可为研究汉代郡国官制和地方行政提供实物线索。" },
    { id: 5, difficulty: "简单", question: "制作封泥时，湿泥主要覆盖在哪里？", optionA: "简牍文字表面", optionB: "封检槽中的绳结", optionC: "铜印手柄", optionD: "竹简末端", correctAnswer: "B", explanation: "湿泥被填入封泥槽并包裹绳结，钤印、风干后形成防拆凭信。" },
    { id: 6, difficulty: "简单", question: "封泥上的印文通常是怎样形成的？", optionA: "毛笔书写", optionB: "刀具刻在干泥上", optionC: "官印钤压湿泥", optionD: "火焰烧制", correctAnswer: "C", explanation: "官印压入湿泥后留下反向印痕，泥干后保存官署或职官信息。" },
    { id: 7, difficulty: "中等", question: "观察封泥实物时，哪一项属于重要信息？", optionA: "泥质、残损与绳痕", optionB: "现代包装颜色", optionC: "展柜灯光品牌", optionD: "参观者人数", correctAnswer: "A", explanation: "泥质、残损、绳痕和背面压痕能帮助研究封缄工艺与保存状态。" },
    { id: 8, difficulty: "中等", question: "印蜕相较于实物照片，更适合观察什么？", optionA: "泥块重量", optionB: "文字字形与布局", optionC: "泥土气味", optionD: "出土深度", correctAnswer: "B", explanation: "印蜕强化印面线条和章法，更便于辨认古文字字形与布局。" },
    { id: 9, difficulty: "困难", question: "网页资料为什么要保留“疑缺印字”等说明？", optionA: "增加文字长度", optionB: "保留不确定的学术判断", optionC: "方便改变字体", optionD: "隐藏文物来源", correctAnswer: "B", explanation: "对残缺或有争议的释读保留阙疑，能避免把研究意见写成绝对定论。" },
    { id: 10, difficulty: "中等", question: "“仓府”类封泥可以帮助研究哪方面历史？", optionA: "仓储与物资管理", optionB: "星象观测", optionC: "宫廷音乐", optionD: "服装裁剪", correctAnswer: "A", explanation: "仓府封泥反映物资出入库、核验、转运和责任追溯等管理活动。" },
    { id: 11, difficulty: "困难", question: "封泥在魏晋以后逐渐减少，主要与什么变化有关？", optionA: "纸张逐渐普及", optionB: "青铜完全消失", optionC: "文字停止使用", optionD: "道路全部废弃", correctAnswer: "A", explanation: "随着纸张和新的文书封缄方式普及，依赖简牍封检的封泥制度逐渐退出日常使用。" },
    { id: 12, difficulty: "困难", question: "研究齐鲁封泥分布时，为什么不能只看现代行政边界？", optionA: "现代地图没有颜色", optionB: "古今行政区划并不完全对应", optionC: "封泥不能移动", optionD: "古代没有地名", correctAnswer: "B", explanation: "同一现代省域中的地点，在汉代可能分属不同刺史部、郡国、县或侯国。" },
    { id: 13, difficulty: "困难", question: "研究者发现一枚残缺封泥，出土地在今天的临沂，印文疑似古县名，但传世拓本和地方志的释读并不一致。此时最合适的处理方式是什么？", optionA: "直接采用最清晰的一种释读，并在网页中写成已经确定的历史事实，以免读者产生疑惑", optionB: "只依据今天的行政区划判断古代归属，不再查阅刺史部、郡国和县邑等历史地理资料", optionC: "同时记录实物可见特征、不同文献释读和古今区划差异，保留疑问并等待更多材料或专家复核", optionD: "因为封泥已经残缺且资料存在分歧，所以删除该条记录，不把它纳入后续研究和公开展示", correctAnswer: "C", explanation: "面对残缺实物和不同释读，应区分可见事实、文献意见与研究推断，完整保留证据链和不确定性。现代发现地也不能直接替代古代行政归属；在新材料出现前，应保留阙疑并接受专业复核。" }
  ]
};
