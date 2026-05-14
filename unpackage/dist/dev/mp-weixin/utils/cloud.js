"use strict";
const common_vendor = require("../common/vendor.js");
let cloudReady = false;
let coUser = null;
let coCampus = null;
let coAi = null;
function getStoredUserToken() {
  try {
    const user = common_vendor.index.getStorageSync("eat-what-user") || {};
    return user.loginMode === "cloud" ? user.token || "" : "";
  } catch {
    return "";
  }
}
function getCoUser() {
  if (!coUser) {
    coUser = common_vendor._r.importObject("co-user");
  }
  return coUser;
}
function getCoCampus() {
  if (!coCampus) {
    coCampus = common_vendor._r.importObject("co-campus");
  }
  return coCampus;
}
function getCoAi() {
  if (!coAi) {
    coAi = common_vendor._r.importObject("co-ai");
  }
  return coAi;
}
async function cloudWxLogin(userInfo = {}) {
  try {
    const loginRes = await new Promise((resolve, reject) => {
      common_vendor.index.login({
        provider: "weixin",
        success: resolve,
        fail: reject
      });
    });
    if (!loginRes.code) {
      common_vendor.index.__f__("warn", "at utils/cloud.js:83", "[cloud] uni.login failed, no code");
      return { code: -1, msg: "获取微信登录凭证失败" };
    }
    const co = getCoUser();
    const result = await co.wxLogin(loginRes.code, userInfo);
    if (result.code === 0) {
      cloudReady = true;
    }
    return result;
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:97", "[cloud] cloudWxLogin error", err);
    return { code: -1, msg: "云函数调用失败，请检查网络" };
  }
}
async function cloudUpdateProfile(token, profileData) {
  try {
    const co = getCoUser();
    return await co.updateProfile(token, profileData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:123", "[cloud] cloudUpdateProfile error", err);
    return { code: -1, msg: "更新资料失败" };
  }
}
async function cloudSyncState(token, stateData) {
  try {
    const co = getCoUser();
    return await co.syncState(token, stateData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:136", "[cloud] cloudSyncState error", err);
    return { code: -1, msg: "状态同步失败" };
  }
}
async function cloudSyncHistory(token, historyList) {
  try {
    const co = getCoUser();
    return await co.syncHistory(token, historyList);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:162", "[cloud] cloudSyncHistory error", err);
    return { code: -1, msg: "历史同步失败" };
  }
}
async function cloudSubmitApplication(token, formData) {
  try {
    const co = getCoCampus();
    return await co.submitApplication(token, formData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:188", "[cloud] cloudSubmitApplication error", err);
    return { code: -1, msg: "提交申请失败" };
  }
}
async function cloudGetCanteensByCampus(campusName) {
  try {
    const co = getCoCampus();
    return await co.getCanteensByCampus(campusName);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:227", "[cloud] cloudGetCanteensByCampus error", err);
    return { code: -1, data: [], msg: "获取饭堂列表失败" };
  }
}
async function cloudGetStallsByCanteen(canteenId) {
  try {
    const co = getCoCampus();
    return await co.getStallsByCanteen(canteenId);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:276", "[cloud] cloudGetStallsByCanteen error", err);
    return { code: -1, data: [], msg: "获取商铺列表失败" };
  }
}
async function cloudAddStall(canteenId, stallData = {}) {
  try {
    const token = getStoredUserToken();
    if (!token)
      return { code: -1, msg: "请先使用管理员账号登录" };
    const co = getCoCampus();
    return await co.addStall(token, canteenId, stallData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:293", "[cloud] cloudAddStall error", err);
    return { code: -1, msg: "添加商铺失败" };
  }
}
async function cloudUpdateStall(canteenId, stallId, stallData = {}) {
  try {
    const token = getStoredUserToken();
    if (!token)
      return { code: -1, msg: "请先使用管理员账号登录" };
    const co = getCoCampus();
    return await co.updateStall(token, canteenId, stallId, stallData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:311", "[cloud] cloudUpdateStall error", err);
    return { code: -1, msg: "更新商铺失败" };
  }
}
async function cloudDeleteStall(canteenId, stallId) {
  try {
    const token = getStoredUserToken();
    if (!token)
      return { code: -1, msg: "请先使用管理员账号登录" };
    const co = getCoCampus();
    return await co.deleteStall(token, canteenId, stallId);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:328", "[cloud] cloudDeleteStall error", err);
    return { code: -1, msg: "删除商铺失败" };
  }
}
async function cloudGetDishesByStall(stallId) {
  try {
    const co = getCoCampus();
    return await co.getDishesByStall(stallId);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:344", "[cloud] cloudGetDishesByStall error", err);
    return { code: -1, data: [], msg: "获取菜品列表失败" };
  }
}
async function cloudAddDish(stallId, canteenId, dishData = {}) {
  try {
    const token = getStoredUserToken();
    if (!token)
      return { code: -1, msg: "请先使用管理员账号登录" };
    const co = getCoCampus();
    return await co.addDish(token, stallId, canteenId, dishData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:362", "[cloud] cloudAddDish error", err);
    return { code: -1, msg: "添加菜品失败" };
  }
}
async function cloudUpdateDish(stallId, dishId, dishData = {}) {
  try {
    const token = getStoredUserToken();
    if (!token)
      return { code: -1, msg: "请先使用管理员账号登录" };
    const co = getCoCampus();
    return await co.updateDish(token, stallId, dishId, dishData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:380", "[cloud] cloudUpdateDish error", err);
    return { code: -1, msg: "更新菜品失败" };
  }
}
async function cloudDeleteDish(stallId, dishId) {
  try {
    const token = getStoredUserToken();
    if (!token)
      return { code: -1, msg: "请先使用管理员账号登录" };
    const co = getCoCampus();
    return await co.deleteDish(token, stallId, dishId);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:397", "[cloud] cloudDeleteDish error", err);
    return { code: -1, msg: "删除菜品失败" };
  }
}
async function cloudIsCampusAdmin() {
  try {
    const token = getStoredUserToken();
    if (!token)
      return { code: 0, data: { isAdmin: false } };
    const co = getCoCampus();
    return await co.isAdmin(token);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:448", "[cloud] cloudIsCampusAdmin error", err);
    return { code: -1, data: { isAdmin: false }, msg: "管理员身份校验失败" };
  }
}
async function cloudSyncAppData(token, payload = {}) {
  try {
    const co = getCoUser();
    return await co.syncAppData(token, payload);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:458", "[cloud] cloudSyncAppData error", err);
    return { code: -1, msg: "应用数据同步失败" };
  }
}
async function cloudGetNormalDishCandidates(limit = 80) {
  try {
    const co = getCoCampus();
    return await co.getNormalDishCandidates(limit);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:472", "[cloud] cloudGetNormalDishCandidates error", err);
    return { code: -1, data: [], msg: "获取普通版菜品池失败" };
  }
}
async function cloudGetCampusDishCandidates(canteenIds = [], limit = 120) {
  try {
    const co = getCoCampus();
    return await co.getCampusDishCandidates(canteenIds, limit);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:487", "[cloud] cloudGetCampusDishCandidates error", err);
    return { code: -1, data: [], msg: "获取校园版菜品池失败" };
  }
}
async function aiPickDishFromCandidates(payload = {}) {
  try {
    const token = getStoredUserToken();
    if (!token)
      return { code: -1, msg: "请先登录" };
    const co = getCoAi();
    return await co.pickDishFromCandidates(token, payload);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:515", "[cloud] aiPickDishFromCandidates error", err);
    return { code: -1, msg: "AI 推荐失败" };
  }
}
exports.aiPickDishFromCandidates = aiPickDishFromCandidates;
exports.cloudAddDish = cloudAddDish;
exports.cloudAddStall = cloudAddStall;
exports.cloudDeleteDish = cloudDeleteDish;
exports.cloudDeleteStall = cloudDeleteStall;
exports.cloudGetCampusDishCandidates = cloudGetCampusDishCandidates;
exports.cloudGetCanteensByCampus = cloudGetCanteensByCampus;
exports.cloudGetDishesByStall = cloudGetDishesByStall;
exports.cloudGetNormalDishCandidates = cloudGetNormalDishCandidates;
exports.cloudGetStallsByCanteen = cloudGetStallsByCanteen;
exports.cloudIsCampusAdmin = cloudIsCampusAdmin;
exports.cloudSubmitApplication = cloudSubmitApplication;
exports.cloudSyncAppData = cloudSyncAppData;
exports.cloudSyncHistory = cloudSyncHistory;
exports.cloudSyncState = cloudSyncState;
exports.cloudUpdateDish = cloudUpdateDish;
exports.cloudUpdateProfile = cloudUpdateProfile;
exports.cloudUpdateStall = cloudUpdateStall;
exports.cloudWxLogin = cloudWxLogin;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/cloud.js.map
