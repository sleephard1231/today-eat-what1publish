"use strict";
const common_vendor = require("../common/vendor.js");
const common_data = require("../common/data.js");
const STATE_KEY = "eat-what-state";
const HISTORY_KEY = "eat-what-history";
const APPLICATION_KEY = "eat-what-campus-applications";
const APPLICATION_DRAFT_KEY = "eat-what-campus-application-draft";
const SELECTED_CANTEEN_KEY = "selectedCanteen";
const TAB_BAR_ROUTES = ["pages/index/index", "pages/my/my"];
const defaultState = {
  mode: "normal",
  campusId: common_data.presetCampuses[0].id,
  profile: {
    nickname: "大剑哥",
    mbti: "ENFJ",
    zodiac: "白羊座",
    avatar: "",
    openId: ""
  },
  daily: {
    dateKey: "",
    remaining: common_data.DAILY_LIMIT,
    lastResult: null
  },
  stats: {
    servedCount: 2847
  }
};
const defaultHistory = [
  {
    id: "history-1",
    mealName: "番茄肥牛米线",
    vibe: "热乎又治愈",
    canteen: "同德",
    campusName: "广州商学院",
    createdAt: "04-14 12:18",
    mode: "campus",
    reason: "ENFJ 今天更适合热闹又有分享感的一口，白羊座的冲劲也需要一点热汤接住，同德这份番茄肥牛米线会很顺口。"
  },
  {
    id: "history-2",
    mealName: "芝士鸡排焗饭",
    vibe: "香浓又有仪式感",
    canteen: "云山食堂",
    campusName: "广东外语外贸大学",
    createdAt: "04-13 18:42",
    mode: "campus",
    reason: "今天更适合来点有满足感的主食，芝士鸡排焗饭会比清淡路线更能把状态拉起来。"
  },
  {
    id: "history-3",
    mealName: "黑椒牛柳意面",
    vibe: "松弛感在线",
    canteen: "",
    campusName: "普通版推荐",
    createdAt: "04-12 11:36",
    mode: "normal",
    reason: "ENFJ 的分享欲碰上白羊座今天的冲劲，黑椒牛柳意面这种干脆又有存在感的选择，会更合今天的节奏。"
  }
];
function safeRead(key, fallbackValue) {
  try {
    const value = common_vendor.index.getStorageSync(key);
    return value || fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}
function safeWrite(key, value) {
  try {
    common_vendor.index.setStorageSync(key, value);
  } catch (error) {
    common_vendor.index.__f__("warn", "at utils/app-state.js:87", "storage write failed", error);
  }
}
function getTodayKey() {
  const today = /* @__PURE__ */ new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const date = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${date}`;
}
function formatDateLabel() {
  const today = /* @__PURE__ */ new Date();
  const weekMap = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const date = `${today.getDate()}`.padStart(2, "0");
  return `${month}月${date}日 · ${weekMap[today.getDay()]}`;
}
function formatTimeLabel() {
  const now = /* @__PURE__ */ new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const date = `${now.getDate()}`.padStart(2, "0");
  const hour = `${now.getHours()}`.padStart(2, "0");
  const minute = `${now.getMinutes()}`.padStart(2, "0");
  return `${month}-${date} ${hour}:${minute}`;
}
function createSeed(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}
function mergeState(rawState = {}) {
  const merged = {
    ...defaultState,
    ...rawState,
    profile: {
      ...defaultState.profile,
      ...rawState.profile || {}
    },
    daily: {
      ...defaultState.daily,
      ...rawState.daily || {}
    },
    stats: {
      ...defaultState.stats,
      ...rawState.stats || {}
    }
  };
  if (merged.daily.dateKey !== getTodayKey()) {
    merged.daily = {
      dateKey: getTodayKey(),
      remaining: common_data.DAILY_LIMIT,
      lastResult: null
    };
  }
  return merged;
}
function getStoredApplications() {
  return safeRead(APPLICATION_KEY, []);
}
function createDynamicCampuses() {
  return getStoredApplications().filter((item) => item.status === "已入驻").map((item) => ({
    id: item.campusId,
    name: item.campusName,
    campusTag: item.campusTag || "",
    shortName: item.campusName.slice(0, 4),
    district: item.city || "校园合作",
    canteen: "",
    specialties: []
  }));
}
function getDefaultCampusCanteenNames(currentCampus) {
  return getCanteenListByCampusName(currentCampus.name).map((item) => item.name).filter(Boolean);
}
function buildCampusFoods(currentCampus, fallbackCanteenName) {
  return (currentCampus.specialties || []).map((name) => ({
    name,
    vibe: `${currentCampus.shortName} 同学都爱的热门款`,
    canteen: fallbackCanteenName || "默认全校饭堂"
  }));
}
function buildReason({ state, pickedFood, selectedCanteenNames, seed }) {
  const flavorWords = common_data.mbtiFlavorMap[state.profile.mbti] || ["今天适合吃点对味的"];
  const zodiacWords = common_data.zodiacFortuneMap[state.profile.zodiac] || ["今天这口会顺一点"];
  const flavorWord = flavorWords[seed % flavorWords.length];
  const zodiacWord = zodiacWords[(seed + 1) % zodiacWords.length];
  if (state.mode === "campus") {
    const rangeText = selectedCanteenNames.length ? `圈定在 ${selectedCanteenNames.join("、")} 里帮你挑。` : "今天先在全校饭堂里帮你挑了一口。";
    return `${rangeText}${state.profile.mbti} 的 ${flavorWord}，碰上 ${state.profile.zodiac} 今天的 ${zodiacWord}，${pickedFood.name} 放在 ${pickedFood.canteen || "默认全校饭堂"}会更顺口。`;
  }
  return `${state.profile.mbti} 的 ${flavorWord}，刚好接住 ${state.profile.zodiac} 今天的 ${zodiacWord}。随机刷到 ${pickedFood.name}，这一口会比较对你现在的状态。`;
}
function getCampusList() {
  return [...common_data.presetCampuses, ...createDynamicCampuses()];
}
function getCampusById(campusId) {
  return getCampusList().find((item) => item.id === campusId) || getCampusList()[0];
}
function getTheme(mode) {
  return common_data.themeMap[mode] || common_data.themeMap.normal;
}
function applyTabBarTheme(mode) {
  const theme = getTheme(mode);
  if (typeof common_vendor.index.setTabBarStyle !== "function") {
    return;
  }
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const currentRoute = currentPage ? currentPage.route : "";
    if (!TAB_BAR_ROUTES.includes(currentRoute)) {
      return;
    }
    common_vendor.index.setTabBarStyle({
      color: "#a3a3a3",
      selectedColor: theme.tabSelected,
      backgroundColor: "#ffffff",
      borderStyle: "white",
      fail: () => {
      }
    });
  } catch (error) {
    common_vendor.index.__f__("warn", "at utils/app-state.js:238", "setTabBarStyle skipped", error);
  }
}
function ensureAppState() {
  const nextState = mergeState(safeRead(STATE_KEY, defaultState));
  safeWrite(STATE_KEY, nextState);
  const history = safeRead(HISTORY_KEY, null);
  if (!history) {
    safeWrite(HISTORY_KEY, defaultHistory);
  }
  return nextState;
}
function getAppState() {
  return ensureAppState();
}
function saveAppState(patch = {}) {
  const current = ensureAppState();
  const nextState = mergeState({
    ...current,
    ...patch,
    profile: {
      ...current.profile,
      ...patch.profile || {}
    },
    daily: {
      ...current.daily,
      ...patch.daily || {}
    },
    stats: {
      ...current.stats,
      ...patch.stats || {}
    }
  });
  safeWrite(STATE_KEY, nextState);
  common_vendor.index.$emit("app-state-changed");
  return nextState;
}
function getHistoryList() {
  return safeRead(HISTORY_KEY, defaultHistory);
}
function saveHistoryList(historyList) {
  safeWrite(HISTORY_KEY, historyList);
}
function getFoodPool(state) {
  const currentCampus = getCampusById(state.campusId);
  const selectedCanteens = getSelectedCanteen(state.campusId);
  const selectedCanteenNames = selectedCanteens.map((item) => item.name);
  const defaultCampusCanteenNames = getDefaultCampusCanteenNames(currentCampus);
  const fallbackCanteenName = defaultCampusCanteenNames[0] || "默认全校饭堂";
  const campusFoods = buildCampusFoods(currentCampus, fallbackCanteenName);
  if (state.mode !== "campus") {
    return [...common_data.genericFoods];
  }
  if (selectedCanteenNames.length) {
    return [...campusFoods, ...common_data.genericFoods].map((item, index) => ({
      ...item,
      canteen: selectedCanteenNames[index % selectedCanteenNames.length]
    }));
  }
  if (defaultCampusCanteenNames.length) {
    return [...campusFoods, ...common_data.genericFoods].map((item, index) => ({
      ...item,
      canteen: defaultCampusCanteenNames[index % defaultCampusCanteenNames.length]
    }));
  }
  return [...campusFoods, ...common_data.genericFoods].map((item) => ({
    ...item,
    canteen: item.canteen || "默认全校饭堂"
  }));
}
function getTodayFortune(state = getAppState()) {
  const currentState = mergeState(state);
  const seed = createSeed(`${currentState.profile.mbti}-${currentState.profile.zodiac}-${currentState.mode}-${getTodayKey()}`);
  const zodiacWords = common_data.zodiacFortuneMap[currentState.profile.zodiac] || ["快乐开饭"];
  const flavorWords = common_data.mbtiFlavorMap[currentState.profile.mbti] || ["今天吃点好的"];
  return {
    dateLabel: formatDateLabel(),
    appetite: common_data.appetiteLabels[seed % common_data.appetiteLabels.length],
    energy: common_data.energyLevelLabels[(seed + 2) % common_data.energyLevelLabels.length],
    luck: common_data.luckLabels[(seed + 1) % common_data.luckLabels.length],
    moodText: zodiacWords[seed % zodiacWords.length],
    tasteText: flavorWords[(seed + 1) % flavorWords.length]
  };
}
function drawMealResult() {
  const state = ensureAppState();
  if (state.daily.remaining <= 0) {
    return {
      exhausted: true,
      state,
      result: state.daily.lastResult
    };
  }
  const currentCampus = getCampusById(state.campusId);
  const pool = getFoodPool(state);
  const defaultCampusCanteenNames = getDefaultCampusCanteenNames(currentCampus);
  const seed = createSeed(`${state.profile.mbti}-${state.profile.zodiac}-${state.mode}-${state.daily.remaining}-${Date.now()}`);
  const pickedFood = pool[seed % pool.length];
  const selectedCanteens = getSelectedCanteen(state.campusId);
  const selectedCanteenNames = selectedCanteens.map((item) => item.name);
  const canteen = state.mode === "campus" ? pickedFood.canteen || defaultCampusCanteenNames[0] || "默认全校饭堂" : "";
  const result = {
    id: `meal-${Date.now()}`,
    mealName: pickedFood.name,
    vibe: pickedFood.vibe,
    canteen,
    campusName: state.mode === "campus" ? currentCampus.name : "普通版推荐",
    mode: state.mode,
    reason: buildReason({
      state,
      pickedFood: {
        ...pickedFood,
        canteen
      },
      selectedCanteenNames,
      seed
    }),
    createdAt: formatTimeLabel()
  };
  const nextState = saveAppState({
    daily: {
      dateKey: getTodayKey(),
      remaining: state.daily.remaining - 1,
      lastResult: result
    },
    stats: {
      servedCount: state.stats.servedCount + 1
    }
  });
  const nextHistory = [result, ...getHistoryList()].slice(0, 30);
  saveHistoryList(nextHistory);
  return {
    exhausted: false,
    state: nextState,
    result
  };
}
function submitCampusApplication(formData) {
  const applications = getStoredApplications();
  const campusId = `campus-${Date.now()}`;
  const record = {
    ...formData,
    campusId,
    createdAt: formatTimeLabel(),
    status: "待审核"
  };
  safeWrite(APPLICATION_KEY, [record, ...applications]);
  common_vendor.index.$emit("app-state-changed");
  return record;
}
function getCampusApplications() {
  return getStoredApplications();
}
function getCampusApplicationDraft() {
  return safeRead(APPLICATION_DRAFT_KEY, null);
}
function saveCampusApplicationDraft(formData) {
  const draft = {
    ...formData,
    updatedAt: formatTimeLabel()
  };
  safeWrite(APPLICATION_DRAFT_KEY, draft);
  return draft;
}
function clearCampusApplicationDraft() {
  safeWrite(APPLICATION_DRAFT_KEY, "");
}
function getCanteenListByCampusName(campusName) {
  return common_data.campusCanteenMap[campusName] || [];
}
function getSelectedCanteenMap() {
  return safeRead(SELECTED_CANTEEN_KEY, {});
}
function getSelectedCanteen(campusId) {
  const canteenMap = getSelectedCanteenMap();
  const selected = canteenMap[campusId];
  if (Array.isArray(selected)) {
    return selected;
  }
  return selected ? [selected] : [];
}
function saveSelectedCanteen(campusId, canteens) {
  const canteenMap = getSelectedCanteenMap();
  const nextMap = {
    ...canteenMap,
    [campusId]: canteens
  };
  safeWrite(SELECTED_CANTEEN_KEY, nextMap);
  return nextMap[campusId];
}
function clearSelectedCanteen(campusId) {
  const canteenMap = getSelectedCanteenMap();
  const nextMap = {
    ...canteenMap
  };
  delete nextMap[campusId];
  safeWrite(SELECTED_CANTEEN_KEY, nextMap);
  return [];
}
exports.applyTabBarTheme = applyTabBarTheme;
exports.clearCampusApplicationDraft = clearCampusApplicationDraft;
exports.clearSelectedCanteen = clearSelectedCanteen;
exports.drawMealResult = drawMealResult;
exports.ensureAppState = ensureAppState;
exports.getAppState = getAppState;
exports.getCampusApplicationDraft = getCampusApplicationDraft;
exports.getCampusApplications = getCampusApplications;
exports.getCampusById = getCampusById;
exports.getCampusList = getCampusList;
exports.getCanteenListByCampusName = getCanteenListByCampusName;
exports.getHistoryList = getHistoryList;
exports.getSelectedCanteen = getSelectedCanteen;
exports.getTheme = getTheme;
exports.getTodayFortune = getTodayFortune;
exports.saveAppState = saveAppState;
exports.saveCampusApplicationDraft = saveCampusApplicationDraft;
exports.saveSelectedCanteen = saveSelectedCanteen;
exports.submitCampusApplication = submitCampusApplication;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/app-state.js.map
