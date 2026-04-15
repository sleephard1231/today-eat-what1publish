"use strict";
const DAILY_LIMIT = 10;
const mbtiCardOptions = [
  { value: "ENFP", emoji: "🐶", officialName: "竞选者", funAlias: "快乐小狗" },
  { value: "INFP", emoji: "🦋", officialName: "调停者", funAlias: "小蝴蝶" },
  { value: "ENTP", emoji: "🗣️", officialName: "辩论家", funAlias: "辩论鬼才" },
  { value: "INTP", emoji: "🧠", officialName: "逻辑学家", funAlias: "逻辑怪" },
  { value: "ENFJ", emoji: "🐕", officialName: "教育家", funAlias: "大狗狗" },
  { value: "INFJ", emoji: "🧙", officialName: "提倡者", funAlias: "绿老头" },
  { value: "ENTJ", emoji: "⚔️", officialName: "指挥官", funAlias: "宝剑哥" },
  { value: "INTJ", emoji: "🏛️", officialName: "建筑师", funAlias: "紫老头" },
  { value: "ESFP", emoji: "🎭", officialName: "表演者", funAlias: "显眼包" },
  { value: "ISFP", emoji: "🎨", officialName: "艺术家", funAlias: "温柔画家" },
  { value: "ESFJ", emoji: "👩‍🍳", officialName: "执政官", funAlias: "热心肠" },
  { value: "ISFJ", emoji: "🩺", officialName: "守卫者", funAlias: "小护士" },
  { value: "ESTP", emoji: "🚀", officialName: "企业家", funAlias: "社牛达人" },
  { value: "ISTP", emoji: "🔧", officialName: "鉴赏家", funAlias: "手艺人" },
  { value: "ESTJ", emoji: "📋", officialName: "总经理", funAlias: "自律卷王" },
  { value: "ISTJ", emoji: "📚", officialName: "物流师", funAlias: "稳重老干部" }
];
const zodiacCardOptions = [
  { value: "白羊座", emoji: "☀️", officialName: "白羊", funAlias: "元气小太阳" },
  { value: "金牛座", emoji: "🍞", officialName: "金牛", funAlias: "干饭忠实粉" },
  { value: "双子座", emoji: "💬", officialName: "双子", funAlias: "百变精分怪" },
  { value: "巨蟹座", emoji: "🦀", officialName: "巨蟹", funAlias: "温柔小哭包" },
  { value: "狮子座", emoji: "🦁", officialName: "狮子", funAlias: "傲娇霸道猫" },
  { value: "处女座", emoji: "✨", officialName: "处女", funAlias: "细节强迫症" },
  { value: "天秤座", emoji: "⚖️", officialName: "天秤", funAlias: "选择困难症" },
  { value: "天蝎座", emoji: "🦂", officialName: "天蝎", funAlias: "神秘腹黑王" },
  { value: "射手座", emoji: "🏹", officialName: "射手", funAlias: "自由乐天派" },
  { value: "摩羯座", emoji: "🐂", officialName: "摩羯", funAlias: "埋头工作狂" },
  { value: "水瓶座", emoji: "🪐", officialName: "水瓶", funAlias: "脑洞外星人" },
  { value: "双鱼座", emoji: "🐟", officialName: "双鱼", funAlias: "感性浪漫鬼" }
];
const presetCampuses = [
  {
    id: "gzcc",
    name: "广州商学院",
    shortName: "广商",
    district: "广州",
    canteen: "西苑食堂",
    specialties: ["煲仔饭", "鸡腿饭", "汤粉", "糖水"]
  },
  {
    id: "scut",
    name: "华南理工大学",
    shortName: "华工",
    district: "广州",
    canteen: "启林南美食城",
    specialties: ["潮汕牛肉粿条", "咖喱鸡排饭", "麻辣香锅", "轻食沙拉"]
  },
  {
    id: "gdufs",
    name: "广东外语外贸大学",
    shortName: "广外",
    district: "广州",
    canteen: "云山食堂",
    specialties: ["芝士焗饭", "酸汤肥牛", "椰子鸡", "鲜虾云吞面"]
  }
];
const campusCanteenMap = {
  "广州商学院": [
    { id: "gzcc-tongde", name: "同德", remark: "饭堂档口区" },
    { id: "gzcc-xingfu", name: "幸福", remark: "人气快餐窗口" },
    { id: "gzcc-ganen", name: "感恩", remark: "盖饭、粉面、小炒" },
    { id: "gzcc-tongle", name: "同乐", remark: "套餐、炖汤、热菜" },
    { id: "gzcc-tongxin", name: "同心", remark: "轻食、小碗菜、简餐" },
    { id: "gzcc-snack", name: "小吃街", remark: "夜宵、小吃、饮品" },
    { id: "gzcc-other", name: "其他", remark: "临时开放窗口 / 其他区域" }
  ],
  "广州大学": [
    { id: "gzu-shangzhong", name: "商中路食堂", remark: "一楼、二楼、夜宵档" },
    { id: "gzu-first", name: "学生第一食堂", remark: "大众窗口、炖汤区" },
    { id: "gzu-south", name: "南区食堂", remark: "轻食、面档、特色饭" }
  ],
  "华南师范": [
    { id: "scnu-taoli", name: "桃李园食堂", remark: "一楼快餐、二楼小炒" },
    { id: "scnu-west", name: "西区食堂", remark: "面食、砂锅、夜宵" }
  ],
  "华南理工大学": [
    { id: "scut-qilin", name: "启林南美食城", remark: "轻食、砂锅、炒菜档" },
    { id: "scut-west", name: "西区食堂", remark: "快餐、炖汤、夜宵档" },
    { id: "scut-east", name: "东区食堂", remark: "面档、麻辣烫、甜品" }
  ],
  "广东外语外贸大学": [
    { id: "gdufs-yunshan", name: "云山食堂", remark: "盖饭、汤面、甜品区" },
    { id: "gdufs-west", name: "西区食堂", remark: "广式、轻食、小炒" }
  ]
};
const campusServiceMap = {
  "广州商学院": [
    { id: "gzcc-laundry", icon: "🧺", name: "洗衣机服务", remark: "宿舍洗护自助预约" },
    { id: "gzcc-shoes", icon: "👟", name: "洗鞋服务", remark: "运动鞋清洗更省心" },
    { id: "gzcc-storage", icon: "🧸", name: "宿舍收纳", remark: "桌面衣柜整理服务" },
    { id: "gzcc-cleaning", icon: "🧹", name: "宿舍打扫", remark: "日常清洁和深度打扫" },
    { id: "gzcc-repair", icon: "💻", name: "电脑维修", remark: "常见软件硬件排查" }
  ],
  "广州大学": [
    { id: "gzu-errand", icon: "🏃", name: "校园跑腿", remark: "课间帮拿帮送更方便" },
    { id: "gzu-express", icon: "📦", name: "快递代拿", remark: "宿舍区代取更省时间" },
    { id: "gzu-print", icon: "🖨️", name: "校园打印", remark: "资料文档快速打印" },
    { id: "gzu-bike", icon: "🚲", name: "单车维修", remark: "补胎调链日常保养" }
  ]
};
const themeMap = {
  normal: {
    mode: "normal",
    name: "普通版",
    accent: "#ff8a3d",
    accentDeep: "#ff6b2c",
    accentSoft: "#fff0df",
    accentMute: "#ffe6cf",
    pageStart: "#fffaf3",
    pageEnd: "#fff7ef",
    card: "#fff5e8",
    cardStrong: "#fff0dd",
    textMain: "#403126",
    textSub: "#a79b90",
    border: "rgba(255, 138, 61, 0.14)",
    shadow: "0 18rpx 44rpx rgba(255, 138, 61, 0.16)",
    tabSelected: "#ff8a3d"
  },
  campus: {
    mode: "campus",
    name: "校园版",
    accent: "#67b6a0",
    accentDeep: "#4f9f8a",
    accentSoft: "#edf7f1",
    accentMute: "#e4f1ea",
    pageStart: "#f8fcf8",
    pageEnd: "#fff8ef",
    card: "#f8fbf6",
    cardStrong: "#f1f7f2",
    textMain: "#325048",
    textSub: "#88a098",
    border: "rgba(103, 182, 160, 0.15)",
    shadow: "0 18rpx 44rpx rgba(103, 182, 160, 0.14)",
    tabSelected: "#67b6a0"
  }
};
const mbtiFlavorMap = {
  INFJ: ["治愈", "暖胃", "平衡"],
  INFP: ["浪漫", "软糯", "奶香"],
  INTJ: ["精准", "高能", "低负担"],
  INTP: ["猎奇", "松弛", "脑洞"],
  ISFJ: ["家常", "温补", "安心"],
  ISFP: ["清爽", "小众", "颜值"],
  ISTJ: ["稳妥", "经典", "耐吃"],
  ISTP: ["重口", "干脆", "带劲"],
  ENFJ: ["热闹", "分享", "旺气"],
  ENFP: ["快乐", "缤纷", "惊喜"],
  ENTJ: ["高效", "硬核", "满足"],
  ENTP: ["反差", "新奇", "刺激"],
  ESFJ: ["团体", "暖场", "人气"],
  ESFP: ["派对", "香辣", "多巴胺"],
  ESTJ: ["扎实", "大份", "顶饱"],
  ESTP: ["冲劲", "炙烤", "爆汁"]
};
const zodiacFortuneMap = {
  白羊座: ["冲冲冲", "火力全开", "胃口大开"],
  金牛座: ["稳稳香", "口福在线", "满足感拉满"],
  双子座: ["想尝新", "双倍快乐", "灵感补给"],
  巨蟹座: ["被治愈了", "想吃热乎的", "很有安全感"],
  狮子座: ["气场满分", "高调开饭", "排面拉满"],
  处女座: ["精致耐吃", "细节控认证", "搭配刚好"],
  天秤座: ["颜值在线", "平衡拿捏", "社交运上升"],
  天蝎座: ["神秘加成", "浓郁上头", "一口封神"],
  射手座: ["随机惊喜", "自由开炫", "冒险值拉满"],
  摩羯座: ["努力加餐", "踏实续航", "续命成功"],
  水瓶座: ["脑洞菜单", "灵魂搭子", "奇妙好吃"],
  双鱼座: ["梦幻治愈", "软乎乎幸福", "心情发光"]
};
const genericFoods = [
  { name: "番茄肥牛米线", vibe: "酸甜开胃", canteen: "小面档" },
  { name: "芝士鸡排焗饭", vibe: "香浓满足", canteen: "西式简餐窗口" },
  { name: "红烧牛腩饭", vibe: "稳稳续航", canteen: "经典盖饭档" },
  { name: "香辣麻辣香锅", vibe: "能量爆棚", canteen: "热炒窗口" },
  { name: "鲜虾云吞面", vibe: "清爽不腻", canteen: "粤式面档" },
  { name: "韩式石锅拌饭", vibe: "热闹满满", canteen: "异国风味档" },
  { name: "炙烤照烧鸡腿饭", vibe: "高能顶饱", canteen: "人气快餐档" },
  { name: "杨枝甘露配小吃拼盘", vibe: "快乐翻倍", canteen: "甜品站" },
  { name: "菌菇鸡汤粉", vibe: "温柔治愈", canteen: "汤粉档" },
  { name: "黑椒牛柳意面", vibe: "松弛感在线", canteen: "轻西餐窗口" }
];
const energyLevelLabels = ["蓄力", "平稳", "充沛", "爆表"];
const appetiteLabels = ["清淡", "适中", "旺盛", "狂炫"];
const luckLabels = ["小吉", "中吉", "大吉", "锦鲤"];
exports.DAILY_LIMIT = DAILY_LIMIT;
exports.appetiteLabels = appetiteLabels;
exports.campusCanteenMap = campusCanteenMap;
exports.campusServiceMap = campusServiceMap;
exports.energyLevelLabels = energyLevelLabels;
exports.genericFoods = genericFoods;
exports.luckLabels = luckLabels;
exports.mbtiCardOptions = mbtiCardOptions;
exports.mbtiFlavorMap = mbtiFlavorMap;
exports.presetCampuses = presetCampuses;
exports.themeMap = themeMap;
exports.zodiacCardOptions = zodiacCardOptions;
exports.zodiacFortuneMap = zodiacFortuneMap;
//# sourceMappingURL=../../.sourcemap/mp-weixin/common/data.js.map
