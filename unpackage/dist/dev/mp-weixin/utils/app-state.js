"use strict";
const common_vendor = require("../common/vendor.js");
const common_data = require("../common/data.js");
const utils_cloud = require("./cloud.js");
const utils_userState = require("./user-state.js");
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
    common_vendor.index.__f__("warn", "at utils/app-state.js:105", "storage write failed", error);
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
function buildCampusFoods(currentCampus, fallbackCanteenName) {
  return (currentCampus.specialties || []).map((name) => ({
    name,
    vibe: `${currentCampus.shortName} 同学都爱的热门款`,
    canteen: fallbackCanteenName || "默认全校饭堂"
  }));
}
function normalizeFoodCandidate(item = {}, fallback = {}) {
  return {
    id: item.id || item._id || `food-${item.name || Date.now()}`,
    name: item.name || "",
    vibe: item.vibe || item.category || "今天顺口",
    category: item.category || "",
    tag: item.tag || "",
    price: item.price || "",
    canteen: item.canteen || item.canteenName || fallback.canteen || "",
    canteenId: item.canteenId || fallback.canteenId || "",
    stallId: item.stallId || "",
    stallName: item.stallName || "",
    source: item.source || fallback.source || "local"
  };
}
function buildResultFromCandidate({ state, candidate, seed, selectedCanteenNames }) {
  const currentCampus = getCampusById(state.campusId);
  const canteen = state.mode === "campus" ? candidate.canteen || "默认全校饭堂" : "";
  return {
    id: `meal-${Date.now()}`,
    mealName: candidate.name,
    vibe: candidate.vibe,
    canteen,
    campusName: state.mode === "campus" ? currentCampus.name : "普通版推荐",
    mode: state.mode,
    source: candidate.source || "",
    dishId: candidate.id || "",
    stallId: candidate.stallId || "",
    stallName: candidate.stallName || "",
    category: candidate.category || "",
    price: candidate.price || "",
    reason: buildReason({
      state,
      pickedFood: {
        ...candidate,
        canteen
      },
      selectedCanteenNames,
      seed
    }),
    createdAt: formatTimeLabel()
  };
}
function pickUniqueCandidates(pool, seed, count = 3) {
  const source = [...pool].filter((item) => item && item.name);
  const picked = [];
  let cursor = seed % Math.max(source.length, 1);
  while (source.length && picked.length < count) {
    const index = cursor % source.length;
    picked.push(source.splice(index, 1)[0]);
    cursor += 7;
  }
  return picked;
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
    common_vendor.index.__f__("warn", "at utils/app-state.js:358", "setTabBarStyle skipped", error);
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
function saveAppState(patch = {}, options = {}) {
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
  if (!options.skipCloudSync) {
    syncStateToCloud(nextState);
  }
  return nextState;
}
let syncStateTimer = null;
let pendingStateData = null;
const SYNC_DEBOUNCE_MS = 3e3;
let syncHistoryTimer = null;
let pendingHistoryData = null;
let syncAppDataTimer = null;
let pendingAppStateData = null;
let pendingAppHistoryData = null;
const SYNC_APP_DATA_DEBOUNCE_MS = 3e3;
const SYNC_HISTORY_DEBOUNCE_MS = 5e3;
function syncStateToCloud(stateData) {
  if (!utils_userState.isCloudUser())
    return;
  pendingStateData = stateData;
  if (syncStateTimer)
    clearTimeout(syncStateTimer);
  syncStateTimer = setTimeout(() => {
    if (!pendingStateData)
      return;
    const user = utils_userState.getUser();
    utils_cloud.cloudSyncState(user.token, pendingStateData).catch((err) => {
      common_vendor.index.__f__("warn", "at utils/app-state.js:432", "[app-state] 状态同步云端失败", err);
    });
    pendingStateData = null;
  }, SYNC_DEBOUNCE_MS);
}
function syncHistoryToCloud(historyList) {
  if (!utils_userState.isCloudUser())
    return;
  pendingHistoryData = historyList;
  if (syncHistoryTimer)
    clearTimeout(syncHistoryTimer);
  syncHistoryTimer = setTimeout(() => {
    if (!pendingHistoryData)
      return;
    const user = utils_userState.getUser();
    utils_cloud.cloudSyncHistory(user.token, pendingHistoryData).catch((err) => {
      common_vendor.index.__f__("warn", "at utils/app-state.js:449", "[app-state] 历史同步云端失败", err);
    });
    pendingHistoryData = null;
  }, SYNC_HISTORY_DEBOUNCE_MS);
}
function syncAppDataToCloud(stateData, historyList) {
  if (!utils_userState.isCloudUser())
    return;
  pendingAppStateData = stateData || pendingAppStateData;
  pendingAppHistoryData = Array.isArray(historyList) ? historyList : pendingAppHistoryData;
  if (syncAppDataTimer)
    clearTimeout(syncAppDataTimer);
  syncAppDataTimer = setTimeout(() => {
    if (!pendingAppStateData && !pendingAppHistoryData)
      return;
    const user = utils_userState.getUser();
    utils_cloud.cloudSyncAppData(user.token, {
      stateData: pendingAppStateData,
      historyList: pendingAppHistoryData
    }).catch((err) => {
      common_vendor.index.__f__("warn", "at utils/app-state.js:467", "[app-state] sync app data failed", err);
    });
    pendingAppStateData = null;
    pendingAppHistoryData = null;
  }, SYNC_APP_DATA_DEBOUNCE_MS);
}
function getHistoryList() {
  return safeRead(HISTORY_KEY, defaultHistory);
}
function saveHistoryList(historyList, options = {}) {
  safeWrite(HISTORY_KEY, historyList);
  if (!options.skipCloudSync) {
    syncHistoryToCloud(historyList);
  }
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
async function submitCampusApplication(formData) {
  if (!utils_userState.isCloudUser()) {
    throw new Error("请先登录后再提交申请");
  }
  const user = utils_userState.getUser();
  const result = await utils_cloud.cloudSubmitApplication(user.token, formData);
  if (result.code === 0 && result.data) {
    const applications = getStoredApplications();
    const record = {
      ...formData,
      campusId: result.data.campusId || `campus-${Date.now()}`,
      createdAt: formatTimeLabel(),
      status: result.data.status || "待审核"
    };
    safeWrite(APPLICATION_KEY, [record, ...applications]);
    common_vendor.index.$emit("app-state-changed");
    return record;
  }
  throw new Error(result.msg || "提交失败，请稍后再试");
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
let cloudCanteensCache = {};
async function fetchCloudCanteens(campusName) {
  if (!campusName)
    return [];
  if (cloudCanteensCache[campusName]) {
    return cloudCanteensCache[campusName];
  }
  try {
    const res = await utils_cloud.cloudGetCanteensByCampus(campusName);
    if (res.code === 0 && Array.isArray(res.data)) {
      const list = res.data.map((item) => ({
        id: item.id,
        name: item.name,
        remark: item.remark || ""
      }));
      if (list.length > 0) {
        cloudCanteensCache[campusName] = list;
      } else {
        cloudCanteensCache[campusName] = [];
      }
      return list;
    }
    throw new Error("获取失败");
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/app-state.js:673", "[app-state] fetchCloudCanteens fallback to local", err == null ? void 0 : err.message);
    return common_data.campusCanteenMap[campusName] || [];
  }
}
function getCanteenListByCampusName(campusName) {
  const cached = cloudCanteensCache[campusName];
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }
  return common_data.campusCanteenMap[campusName] || [];
}
let cloudMenuCache = {
  normal: null,
  campus: {}
};
const MENU_CACHE_TTL = 1e3 * 60 * 10;
function isMenuCacheFresh(cache) {
  return cache && Date.now() - cache.fetchedAt < MENU_CACHE_TTL;
}
async function fetchNormalFoodPool(forceRefresh = false) {
  if (!forceRefresh && isMenuCacheFresh(cloudMenuCache.normal)) {
    return cloudMenuCache.normal.data;
  }
  try {
    const res = await utils_cloud.cloudGetNormalDishCandidates(120);
    if (res.code === 0 && Array.isArray(res.data) && res.data.length) {
      const data = res.data.map((item) => normalizeFoodCandidate(item, { source: "normal" }));
      cloudMenuCache.normal = { fetchedAt: Date.now(), data };
      return data;
    }
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/app-state.js:713", "[app-state] fetchNormalFoodPool error", err == null ? void 0 : err.message);
  }
  return common_data.genericFoods.map((item) => normalizeFoodCandidate(item, { source: "local-normal" }));
}
async function fetchCampusFoodPool(state, forceRefresh = false) {
  const currentCampus = getCampusById(state.campusId);
  const selectedCanteens = getSelectedCanteen(state.campusId);
  const fallbackCanteens = getCanteenListByCampusName(currentCampus.name);
  const canteens = selectedCanteens.length ? selectedCanteens : fallbackCanteens;
  const canteenIds = canteens.map((item) => item.id).filter(Boolean);
  const cacheKey = canteenIds.join("|") || currentCampus.id;
  if (!forceRefresh && isMenuCacheFresh(cloudMenuCache.campus[cacheKey])) {
    return cloudMenuCache.campus[cacheKey].data;
  }
  if (canteenIds.length) {
    try {
      const res = await utils_cloud.cloudGetCampusDishCandidates(canteenIds, 180);
      if (res.code === 0 && Array.isArray(res.data) && res.data.length) {
        const data = res.data.map((item) => normalizeFoodCandidate(item, { source: "campus" }));
        cloudMenuCache.campus[cacheKey] = { fetchedAt: Date.now(), data };
        return data;
      }
    } catch (err) {
      common_vendor.index.__f__("warn", "at utils/app-state.js:740", "[app-state] fetchCampusFoodPool error", err == null ? void 0 : err.message);
    }
  }
  const selectedCanteenNames = canteens.map((item) => item.name).filter(Boolean);
  const fallbackCanteenName = selectedCanteenNames[0] || "默认全校饭堂";
  return [...buildCampusFoods(currentCampus, fallbackCanteenName), ...common_data.genericFoods].map((item, index) => normalizeFoodCandidate(item, {
    source: "local-campus",
    canteen: item.canteen || selectedCanteenNames[index % Math.max(selectedCanteenNames.length, 1)] || fallbackCanteenName
  }));
}
async function drawMealResultAsync() {
  const state = ensureAppState();
  if (state.daily.remaining <= 0) {
    return {
      exhausted: true,
      state,
      result: state.daily.lastResult,
      candidates: []
    };
  }
  const pool = state.mode === "campus" ? await fetchCampusFoodPool(state) : await fetchNormalFoodPool();
  const safePool = pool.length ? pool : common_data.genericFoods.map((item) => normalizeFoodCandidate(item, { source: "local-normal" }));
  const seed = createSeed(`${state.profile.mbti}-${state.profile.zodiac}-${state.mode}-${state.daily.remaining}-${Date.now()}`);
  const candidates = pickUniqueCandidates(safePool, seed, 3);
  const selectedCanteenNames = getSelectedCanteen(state.campusId).map((item) => item.name);
  const result = buildResultFromCandidate({
    state,
    candidate: candidates[0],
    seed,
    selectedCanteenNames
  });
  const nextState = saveAppState({
    daily: {
      dateKey: getTodayKey(),
      remaining: state.daily.remaining - 1,
      lastResult: result
    },
    stats: {
      servedCount: state.stats.servedCount + 1
    }
  }, { skipCloudSync: true });
  const nextHistory = [result, ...getHistoryList()].slice(0, 30);
  saveHistoryList(nextHistory, { skipCloudSync: true });
  syncAppDataToCloud(nextState, nextHistory);
  return {
    exhausted: false,
    state: nextState,
    result,
    candidates,
    seed,
    selectedCanteenNames
  };
}
async function aiPickFromCandidates({ candidates = [], state, fortune, seed = Date.now(), selectedCanteenNames = [] } = {}) {
  var _a, _b;
  const fallbackCandidate = candidates[0];
  if (!fallbackCandidate) {
    return { choice: 0, reason: "", isAI: false };
  }
  const fallbackReason = buildReason({
    state,
    pickedFood: fallbackCandidate,
    selectedCanteenNames,
    seed
  });
  if (!utils_userState.isCloudUser()) {
    return { choice: 0, reason: fallbackReason, isAI: false };
  }
  try {
    const res = await utils_cloud.aiPickDishFromCandidates({
      mbti: ((_a = state.profile) == null ? void 0 : _a.mbti) || "ENFJ",
      zodiac: ((_b = state.profile) == null ? void 0 : _b.zodiac) || "白羊座",
      mode: state.mode || "normal",
      appetite: (fortune == null ? void 0 : fortune.appetite) || "",
      energy: (fortune == null ? void 0 : fortune.energy) || "",
      luck: (fortune == null ? void 0 : fortune.luck) || "",
      candidates: candidates.slice(0, 3).map((item) => ({
        name: item.name,
        vibe: item.vibe,
        category: item.category,
        price: item.price,
        canteen: item.canteen,
        stallName: item.stallName
      }))
    });
    if (res.code === 0 && Number.isInteger(res.choice) && res.reason) {
      return {
        choice: Math.max(0, Math.min(res.choice, candidates.length - 1)),
        reason: res.reason,
        isAI: true
      };
    }
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/app-state.js:847", "[app-state] aiPickFromCandidates error", err == null ? void 0 : err.message);
  }
  return { choice: 0, reason: fallbackReason, isAI: false };
}
function updateLatestMealResult(result) {
  var _a, _b;
  if (!(result == null ? void 0 : result.id))
    return;
  const current = ensureAppState();
  if (((_b = (_a = current.daily) == null ? void 0 : _a.lastResult) == null ? void 0 : _b.id) === result.id) {
    const nextState = saveAppState({
      daily: {
        ...current.daily,
        lastResult: result
      }
    }, { skipCloudSync: true });
    const history2 = getHistoryList();
    const nextHistory2 = history2.map((item) => item.id === result.id ? { ...item, ...result } : item);
    saveHistoryList(nextHistory2, { skipCloudSync: true });
    syncAppDataToCloud(nextState, nextHistory2);
    return;
  }
  const history = getHistoryList();
  const nextHistory = history.map((item) => item.id === result.id ? { ...item, ...result } : item);
  saveHistoryList(nextHistory);
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
exports.aiPickFromCandidates = aiPickFromCandidates;
exports.applyTabBarTheme = applyTabBarTheme;
exports.clearCampusApplicationDraft = clearCampusApplicationDraft;
exports.clearSelectedCanteen = clearSelectedCanteen;
exports.drawMealResultAsync = drawMealResultAsync;
exports.ensureAppState = ensureAppState;
exports.fetchCloudCanteens = fetchCloudCanteens;
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
exports.updateLatestMealResult = updateLatestMealResult;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/app-state.js.map
