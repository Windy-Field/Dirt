const knowledgeSource = window.SEAL_KNOWLEDGE || window.PPT_KNOWLEDGE;
let valueResultmockdata1;
if (knowledgeSource) {
    valueResultmockdata1 = knowledgeSource.sites.length;
}
else {
    valueResultmockdata1 = 45;
}
let valueResultmockdata3;
{
    let valueResultmockdata5;
    if (knowledgeSource) {
        valueResultmockdata5 = knowledgeSource.sites;
    }
    else {
        valueResultmockdata5 = [];
    }
    const items2 = valueResultmockdata5;
    const result5 = [];
    for (let index4 = 0; index4 < items2.length; index4++) {
        let valueResultmockdata7;
        {
            const site = items2[index4];
            valueResultmockdata7 = (Object.assign({}, site, { description: ("" + (site.note) + " 代表印文：" + (site.seals.join("、")) + "。古代归属：" + (site.admin) + "。") }));
        }
        result5.push(valueResultmockdata7);
    }
    valueResultmockdata3 = result5;
}
window.MOCK_DATA = {
    stats: { relics: 86, sites: valueResultmockdata1, courses: 3 },
    mapImageUrl: "",
    sites: valueResultmockdata3,
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
            imageUrl: "./assets/relics/seal-linzi.png",
            summary: "这枚封泥是汉代齐郡郡守级官署使用的凭信。它的缪篆方正严整，边栏保留了自然残缺。它也为研究汉初郡国并行制度、补充《汉书·百官公卿表》的记载提供了实物线索。"
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
            imageUrl: "./assets/relics/seal-qin-mu.png",
            summary: "这方封泥保留了典型的秦代小篆形态：字形略长，笔画圆劲挺拔，印面还能看到“田”字界格。研究者可以借它观察秦代文字统一和官印制度。"
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
            imageUrl: "./assets/relics/seal-han.png",
            summary: "这类封泥用于粮食和其他物资出入库时的封缄。泥封上的印记可以帮助官署核验物资、追查转运责任，也留下了两汉仓储管理的实物资料。"
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
            imageUrl: "./assets/relics/seal-qibei.png",
            summary: "“齐北船丞”是与齐地北方水运和船政事务有关的官署印信。它为研究齐国及汉初环渤海、黄海的水运商路和盐铁物资调配提供了线索。"
        }
    ],
    courses: [
        { id: "COURSE-01", title: "初识齐鲁封泥：来源与作用", lesson: 1, duration: "45 分钟", description: "第一课从古文字猜读进入封泥主题，讲清封泥怎样用于保密、防伪和确认身份，并结合麋圈、橘官等故事认识秦汉社会。", videoUrl: "", posterUrl: "" },
        { id: "COURSE-02", title: "封泥的文字之美：发现与传承", lesson: 2, duration: "40 分钟", description: "第二课介绍封泥的发现与传承，比较秦印和汉印的文字风格。学生还会从文字、手工痕迹与自然残损中理解封泥的美。", videoUrl: "", posterUrl: "" },
        { id: "COURSE-03", title: "手绘创意封泥：从临摹到创作", lesson: 3, duration: "45 分钟", description: "第三课先认识私印封泥，再从外形、篆文、纹饰和配色入手完成手绘作品。学生可以选择古韵复刻，也可以加入自己的创意。", videoUrl: "", posterUrl: "" }
    ],
    questions: [
        { id: 1, difficulty: "简单", question: "封泥在古代最主要的用途是什么？", optionA: "装饰陶器", optionB: "封缄文书", optionC: "制作钱币", optionD: "固定信件", correctAnswer: "B", explanation: "封泥通常与绳结、封检和印章配合，用于封缄简牍文书、容器或货物。" },
        { id: 2, difficulty: "简单", question: "收件官署打开封缄文书前，首先需要做什么？", optionA: "核验泥封和印文是否完整", optionB: "把封泥重新浸湿", optionC: "在封泥上再盖一枚印", optionD: "加固封泥", correctAnswer: "A", explanation: "收件人先核验印文和泥封完整性，确认没有被私拆，再破泥开读。" },
        { id: 3, difficulty: "困难", question: "研究封泥上的古代地名，最主要有助于了解什么？", optionA: "古代文物分布", optionB: "古代陶艺技术", optionC: "古代区域地理", optionD: "古代文字发展", correctAnswer: "C", explanation: "封泥印文中的郡、国、县、乡等地名，可以与文献和出土地点相互印证。" },
        { id: 4, difficulty: "简单", question: "网页中的“临淄守印”主要体现哪一类研究价值？", optionA: "天文历法", optionB: "官制与史料", optionC: "农业技术", optionD: "陶器技艺", correctAnswer: "B", explanation: "“守”与郡守级官署相关，可为研究汉代郡国官制和地方行政提供实物线索。" },
        { id: 5, difficulty: "困难", question: "制作封泥时，湿泥主要覆盖在哪里？", optionA: "简牍文字表面", optionB: "封检槽中绳结", optionC: "铜印手柄", optionD: "竹简末端", correctAnswer: "B", explanation: "湿泥被填入封泥槽并包裹绳结，钤印、风干后形成防拆凭信。" },
        { id: 6, difficulty: "中等", question: "封泥上的印文通常是怎样形成的？", optionA: "毛笔书写", optionB: "刀具刻在干泥上", optionC: "官印钤压湿泥", optionD: "火焰烧制", correctAnswer: "C", explanation: "官印压入湿泥后留下反向印痕，泥干后保存官署或职官信息。" },
        // 第一课时第20页：区分防拆检查与身份核验
        {
            id: 7, difficulty: "中等",
            question: "一份文书的泥封已破裂，但印文仍能辨认。收件人最合理的判断是什么？",
            optionA: "印文可读，说明文书没有被打开", optionB: "泥封破裂，说明官署印章是伪造的",
            optionC: "印文可提供来源线索，但封缄完整性需核查", optionD: "泥封破裂说明了印文无凭证意义",
            correctAnswer: "C", explanation: "印文可帮助核验使用者身份，泥封完整性则关系到是否被开启。破裂提示需要核查，但不能仅凭破裂就断定伪造或恶意拆阅。"
        },
        // 第二课时第7—10页：陈介祺的贡献
        {
            id: 8, difficulty: "困难",
            question: "按照课件，陈介祺让带字泥块重新获得重视，关键在于哪项工作？",
            optionA: "辨认其性质，并持续搜集、考证与整理", optionB: "制定官署使用封泥的统一格式",
            optionC: "补刻残缺印文，使每枚封泥恢复完整", optionD: "按现代县名重新解释全部古地名",
            correctAnswer: "A", explanation: "课件强调陈介祺运用金石学知识辨认秦汉封泥，并长期搜集、考证与整理。其贡献是认识和研究文物，而非制定古代制度或改造实物。"
        },
        // 第二课时第12—16页：人物、流派与风格
        {
            id: 9, difficulty: "困难",
            question: "哪组人物、流派与风格的对应符合课件介绍？",
            optionA: "邓石如—浙派—古朴苍劲；丁敬—皖派—以书入印",
            optionB: "邓石如—皖派—顿挫斑驳；丁敬—浙派—以书入印",
            optionC: "邓石如—浙派—刚健婀娜；丁敬—皖派—顿挫斑驳",
            optionD: "邓石如—皖派—以书入印；丁敬—浙派—古朴苍劲",
            correctAnswer: "D", explanation: "课件将邓石如与皖派、刚健婀娜、以书入印相联系，将丁敬与浙派、古朴苍劲、顿挫斑驳相联系。"
        },
        // 第二课时第19—20页、城阳候印专题：风格与断代
        {
            id: 10, difficulty: "困难",
            question: "一方封泥有田字格，字形偏狭长、笔画圆转。仅凭这些特征，哪种判断最稳妥？",
            optionA: "可定为秦代，因为汉初不再使用界格", optionB: "可作秦印风格线索，还需结合地层与汉初沿用情况",
            optionC: "可定为汉代，因为圆转笔画只见于缪篆", optionD: "可据此确定官阶，不必再辨认具体印文",
            correctAnswer: "B", explanation: "秦封泥多见田字格，但西汉早期也曾沿用。字形和界格可帮助比较风格，不能代替可靠的出土背景和年代证据。"
        },
        // 第二课时第23—26页：三重美学
        {
            id: 11, difficulty: "困难",
            question: "按课件的“三重美学”，哪组观察与分类对应最恰当？",
            optionA: "字距疏密—手工匠心；按压深浅—岁月残缺；边缘斑驳—文字古韵",
            optionB: "字距疏密—岁月残缺；按压深浅—文字古韵；边缘斑驳—手工匠心",
            optionC: "字距疏密—文字古韵；按压深浅—手工匠心；边缘斑驳—岁月残缺",
            optionD: "字距疏密—文字古韵；按压深浅—岁月残缺；边缘斑驳—手工匠心",
            correctAnswer: "C", explanation: "字形、疏密与章法体现文字古韵；按压造成的深浅差异体现手工痕迹；时间留下的斑驳残损属于岁月残缺。具体损伤成因仍需结合实物研究。"
        },
        // 第二课时第28页：课堂拓印练习
        {
            id: 12, difficulty: "简单",
            question: "第二课中，用铅笔侧面在覆着硬币的纸上涂擦，再给纸撕一个小缺口。这项练习主要帮助理解什么？",
            optionA: "纹理转移到纸上的过程及完整、残缺的视觉差别", optionB: "古代官署用铅制作封泥的完整工序",
            optionC: "根据拓印纸破损程度判断原物年代的方法", optionD: "通过损伤文物本体提高其历史价值的方法",
            correctAnswer: "A", explanation: "练习是在纸上体验拓印与残缺的视觉效果，不是复原古代封缄工序。人为做旧不能证明原物年代，也不意味着可以损伤文物。"
        },
        // 第三课时第5—6页：私印封泥
        {
            id: 13, difficulty: "中等",
            question: "“王固私印”等私印封泥与官印封泥的关系，哪项理解正确？",
            optionA: "私印封泥专供官署代替县丞印使用", optionB: "私印封泥出现后，官印封泥退出使用",
            optionC: "私印只能装饰器物，不能封缄私信", optionD: "两者并行存在，私印也可用于器物封缄",
            correctAnswer: "D", explanation: "第三课时指出私印封泥由私人印章钤成，用于私信和器物封缄，与官印封泥并行存在。封泥不仅涉及官署，也与私人生活有关。"
        },
        // 第三课时第8、10、16、19页：古韵复刻
        {
            id: 14, difficulty: "中等",
            question: "选择“古韵复刻”路线时，哪种方案最符合第三课时的指导？",
            optionA: "边缘统一画成正圆，用印刷楷体替代篆文", optionB: "参考篆文表，结合微不规则外形及大地色、青灰色",
            optionC: "用连续纹饰覆盖印文，突出装饰而淡化文字", optionD: "将出土残损全部修齐，以整洁替代斑驳质感",
            correctAnswer: "B", explanation: "古韵复刻参考出土封泥的古朴外形、篆文与残缺质感。课件推荐略不规则的边缘及大地色、青灰色，不是机械追求规整。"
        },
        // 第三课时第11—14、19页：纹饰与创新
        {
            id: 15, difficulty: "简单",
            question: "同学想在自选篆文周围加入传统纹饰，完成“创意创新”作品。哪种处理较合理？",
            optionA: "以纹饰复杂程度为重要标准，允许其遮盖印文", optionB: "照搬古代图案，并把作品标成出土文物",
            optionC: "用祥云纹、回纹等点缀，保持文字和纹样层次清楚", optionD: "避开传统元素，以免作品被归入古韵复刻",
            correctAnswer: "C", explanation: "课件允许结合个人审美改造文字和纹样，也推荐简单古风线条、祥云纹和回纹。创新可以借鉴传统，不需要抹去封泥特征。"
        },
        // 网站研究发现：实物与印蜕互补
        {
            id: 16, difficulty: "简单",
            question: "要同时研究封泥的文字布局与封缄方式，应怎样安排观察材料？",
            optionA: "用印蜕辨认字形布局，再结合实物绳痕和封槽", optionB: "只用正面印蜕，同时推定厚度和背面形态",
            optionC: "只看实物颜色，以颜色变化代替文字比较", optionD: "只将拓片黑白深浅视为原物泥质差异",
            correctAnswer: "A", explanation: "印蜕突出印面线条和布局，实物保留泥质、厚度、残损、绳痕与封槽信息。两者互补，不能用单一材料替代所有观察。"
        },
        // 补充史料：菑川后府
        {
            id: 17, difficulty: "中等",
            question: "东圈汉墓的85枚“菑川后府”封泥与“菑川北宫”器物铭文呼应。哪项结论最符合证据强度？",
            optionA: "可据85枚封泥确认存在至少85位王后", optionB: "“后府”二字可以确定墓主的姓名",
            optionC: "封泥和器物属于不同类别材料，不适合互相参照", optionD: "支持宫府财物机构的解释，墓主为王后仍属推测",
            correctAnswer: "D", explanation: "同文封泥集中出土并与北宫铭文相互支持，可讨论宫府财物管理机构。但墓主为某位王后的判断仍是综合年代和器物作出的推测。"
        },
        // 补充史料：兰陵丞印的印文地名、发现地与行政归属
        {
            id: 18, difficulty: "简单",
            question: "“兰陵丞印”收入兰陵相关图录，两枚实物却出于徐州狮子山楚王陵。怎样记录最准确？",
            optionA: "据此推断有后人将其运输至徐州", optionB: "记录印文地名、楚王陵出土地与相应文献归属",
            optionC: "将兰陵解释为楚王陵所在地的别称", optionD: "记录古地名和现代省份，省略考古位置",
            correctAnswer: "B", explanation: "图录关联地不等于实物出土地。应区分印文中的古地名、实际发现位置和历史行政归属，不能为求一致而改写记录。"
        },
        // 补充史料：兰陵丞印与容器的空间关系
        {
            id: 19, difficulty: "困难",
            question: "楚王陵耳室中，多县县丞封泥分布在瓮、壶附近。相比孤立封泥，这组材料增加了什么线索？",
            optionA: "各县人口数量的间接体现", optionB: "当时当地百姓的饮食习惯",
            optionC: "地方物资封缄与跨县的输送关系", optionD: "这些县隶属于楚国、向楚国贡纳的证明",
            correctAnswer: "C", explanation: "容器附近的出土位置和多县印文共同出现，为物资来源与输送关系提供线索。但“贡纳”属于历史解释，不能推出材料未记录的精确内容。"
        },
        // 补充史料：驺丞之印，区分实物数量与印文种类
        {
            id: 20, difficulty: "简单",
            question: "邾国故城官署区出土821枚封泥、243枚陶文。哪项表述没有混淆统计对象？",
            optionA: "821是封泥总数，不能代表存在821种不同印文", optionB: "821是封泥总数，可反映出至少821种不同的印文",
            optionC: "两项相加可得当时行政机构的总数量", optionD: "每枚封泥代表一位官员，可统计出821名县丞",
            correctAnswer: "A", explanation: "实物枚数、印文种类和官员人数是不同概念。同一种印文可能重复出现，不能将出土数量直接换算成机构或人物数量。"
        },
        // 补充史料：驺县县衙的遗址性质判断
        {
            id: 21, difficulty: "困难",
            question: "哪组证据最能支持邾国故城相关遗址“可能为秦汉驺县县衙”的判断？",
            optionA: "泥块数量多，且多数功能接近", optionB: "遗址在现代邹城，其历代用途应当十分相似",
            optionC: "孤立封泥上有县名，可推定整座建筑性质", optionD: "官署基址与本县、下属乡库及周边县丞印共同出现",
            correctAnswer: "D", explanation: "建筑与跨层级官署印文的组合，比单一县名或数量更有解释力，支持处理行政文书的判断。资料仍保留“可能”，并未作绝对定论。"
        },
        // 补充史料：观阳丞印与即墨
        {
            id: 22, difficulty: "简单",
            question: "胶东国以即墨为都，属县观阳又有“观阳丞印”。这对理解西汉地方制度有何帮助？",
            optionA: "说明王国与县级官署在同一区域互相排斥", optionB: "说明诸侯王国内也可通过县级官署处理基层行政",
            optionC: "说明即墨和观阳是同一县名的不同时期写法", optionD: "说明两方拓片出自同一墓葬或废坑",
            correctAnswer: "B", explanation: "国都与属县关系说明王国之下仍有县级行政，为理解郡国并行提供微观线索。但制度关联不能证明两件材料属于同一考古单位。"
        },
        // 补充史料：城阳候印的秦、汉两说
        {
            id: 23, difficulty: "困难",
            question: "“城阳候印”的秦代说与西汉初说，关键分歧之一是什么？",
            optionA: "封泥究竟用于文书还是只能用于容器", optionB: "是否以现代城阳区边界代替全部古代区划",
            optionC: "是否采信秦代文书废坑背景，以及如何权衡地层与风格", optionD: "是否把封泥枚数作为郡县机构的数量",
            correctAnswer: "C", explanation: "专题指出分歧涉及秦代中央文书废坑背景及其证据权重。汉初也可能沿用界格，因此不能只凭田字格在秦、汉两说中作出裁定。"
        },
        // 网站临淄图录：官署层级与职掌
        {
            id: 24, difficulty: "简单",
            question: "临淄资料中并见守印、市丞、左右尉和乡印。这组印文更适合用来讨论什么？",
            optionA: "地方官署的不同层级及职掌分工", optionB: "同一官员在不同场合使用的全部别名",
            optionC: "各时期官署相似的编制与俸禄", optionD: "同一天由同一印章制作封泥的过程",
            correctAnswer: "A", explanation: "郡守级、城市管理、尉与乡级称谓共同出现，为行政层级和职掌分化提供线索。仅凭名称组合，不能确定具体人数、俸禄或制作日期。"
        },
        // 网站安丘、沂水图录：保留疑缺与补读说明
        {
            id: 25, difficulty: "简单",
            question: "图录写作“朱虚丞（疑缺‘印’字）”。整理展示文字时，哪种做法最合适？",
            optionA: "写成“朱虚丞印”，把补字当作实物可见文字", optionB: "删除相关资料，疑读不应当参与研究",
            optionC: "按常见四字格式补字，不保留原说明", optionD: "保留已读文字与疑缺说明",
            correctAnswer: "D", explanation: "“疑缺”提醒读者材料缺损和释读不确定性。整理时应区分实物可见文字与研究者补读，保留疑问比无标记补全更准确。"
        }
    ]
};
