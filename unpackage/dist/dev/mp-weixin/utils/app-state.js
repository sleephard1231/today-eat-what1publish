"use strict";
const common_vendor = require("../common/vendor.js");
const common_data = require("../common/data.js");
const STATE_KEY = "eat-what-state";
const HISTORY_KEY = "eat-what-history";
const APPLICATION_KEY = "eat-what-campus-applications";
const SELECTED_CANTEEN_KEY = "selectedCanteen";
const TAB_BAR_ROUTES = ["pages/index/index", "pages/my/my"];
const defaultState = {
  mode: "normal",
  campusId: common_data.presetCampuses[0].id,
  profile: {
    nickname: "大剑哥",
    mbti: "ENFJ",
    zodiac: "白羊座"
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
    vibe: "热乎乎又治愈",
    canteen: "西苑食堂",
    campusName: "广州商学院",
    createdAt: "04-14 12:18",
    mode: "campus",
    reason: "ENFJ 的分享欲遇上白羊座的冲劲，今天就该来点热汤和牛肉。"
  },
  {
    id: "history-2",
    mealName: "芝士鸡排焗饭",
    vibe: "香浓又有仪式感",
    canteen: "云山食堂",
    campusName: "广东外语外贸大学",
    createdAt: "04-13 18:42",
    mode: "campus",
    reason: "白羊座需要多巴胺加持，焗饭的满足感会让今天更顺。"
  },
  {
    id: "history-3",
    mealName: "黑椒牛柳意面",
    vibe: "轻松但不敷衍",
    canteen: "附近人气小店",
    campusName: "普通版",
    createdAt: "04-12 11:36",
    mode: "normal",
    reason: "ENFJ 今天适合有氛围感的主食，意面刚好踩中状态。"
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
    common_vendor.index.__f__("warn", "at utils/app-state.js:84", "storage write failed", error);
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
    common_vendor.index.__f__("warn", "at utils/app-state.js:205", "setTabBarStyle skipped", error);
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
  const campusFoods = (currentCampus.specialties || []).map((name) => ({
    name,
    vibe: `${currentCampus.shortName} 同学都爱的热门款`,
    canteen: currentCampus.canteen
  }));
  if (selectedCanteenNames.length) {
    return [...campusFoods, ...common_data.genericFoods].map((item, index) => ({
      ...item,
      canteen: selectedCanteenNames[index % selectedCanteenNames.length]
    }));
  }
  return [...campusFoods, ...common_data.genericFoods];
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
  const seed = createSeed(`${state.profile.mbti}-${state.profile.zodiac}-${state.mode}-${state.daily.remaining}-${Date.now()}`);
  const pickedFood = pool[seed % pool.length];
  const flavorWords = common_data.mbtiFlavorMap[state.profile.mbti] || ["今天吃点好的"];
  const zodiacWords = common_data.zodiacFortuneMap[state.profile.zodiac] || ["好运开饭"];
  const selectedCanteens = getSelectedCanteen(state.campusId);
  const selectedCanteenNames = selectedCanteens.map((item) => item.name);
  const selectedScopeText = selectedCanteenNames.length ? `已按你选的饭堂范围推荐：${selectedCanteenNames.join("、")}。` : "";
  const result = {
    id: `meal-${Date.now()}`,
    mealName: pickedFood.name,
    vibe: pickedFood.vibe,
    canteen: state.mode === "campus" ? currentCampus.canteen || "校园版推荐" : pickedFood.canteen,
    campusName: state.mode === "campus" ? currentCampus.name : "普通版推荐",
    mode: state.mode,
    reason: `${selectedScopeText}${state.profile.mbti} 的 ${flavorWords[seed % flavorWords.length]} 遇上 ${state.profile.zodiac} 的 ${zodiacWords[(seed + 1) % zodiacWords.length]}，今天就吃 ${pickedFood.name}。`,
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
exports.clearSelectedCanteen = clearSelectedCanteen;
exports.drawMealResult = drawMealResult;
exports.ensureAppState = ensureAppState;
exports.getAppState = getAppState;
exports.getCampusApplications = getCampusApplications;
exports.getCampusById = getCampusById;
exports.getCampusList = getCampusList;
exports.getCanteenListByCampusName = getCanteenListByCampusName;
exports.getHistoryList = getHistoryList;
exports.getSelectedCanteen = getSelectedCanteen;
exports.getTheme = getTheme;
exports.getTodayFortune = getTodayFortune;
exports.saveAppState = saveAppState;
exports.saveSelectedCanteen = saveSelectedCanteen;
exports.submitCampusApplication = submitCampusApplication;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/app-state.js.map
