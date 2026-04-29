"use strict";
const common_vendor = require("../common/vendor.js");
let cloudReady = false;
let coUser = null;
let coCampus = null;
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
      common_vendor.index.__f__("warn", "at utils/cloud.js:74", "[cloud] uni.login failed, no code");
      return { code: -1, msg: "获取微信登录凭证失败" };
    }
    const co = getCoUser();
    const result = await co.wxLogin(loginRes.code, userInfo);
    if (result.code === 0) {
      cloudReady = true;
    }
    return result;
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:88", "[cloud] cloudWxLogin error", err);
    return { code: -1, msg: "云函数调用失败，请检查网络" };
  }
}
async function cloudUpdateProfile(token, profileData) {
  try {
    const co = getCoUser();
    return await co.updateProfile(token, profileData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:114", "[cloud] cloudUpdateProfile error", err);
    return { code: -1, msg: "更新资料失败" };
  }
}
async function cloudSyncState(token, stateData) {
  try {
    const co = getCoUser();
    return await co.syncState(token, stateData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:127", "[cloud] cloudSyncState error", err);
    return { code: -1, msg: "状态同步失败" };
  }
}
async function cloudSyncHistory(token, historyList) {
  try {
    const co = getCoUser();
    return await co.syncHistory(token, historyList);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:153", "[cloud] cloudSyncHistory error", err);
    return { code: -1, msg: "历史同步失败" };
  }
}
async function cloudSubmitApplication(token, formData) {
  try {
    const co = getCoCampus();
    return await co.submitApplication(token, formData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:179", "[cloud] cloudSubmitApplication error", err);
    return { code: -1, msg: "提交申请失败" };
  }
}
async function cloudGetStallsByCanteen(canteenId) {
  try {
    const co = getCoCampus();
    return await co.getStallsByCanteen(canteenId);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:247", "[cloud] cloudGetStallsByCanteen error", err);
    return { code: -1, data: [], msg: "获取商铺列表失败" };
  }
}
async function cloudAddStall(canteenId, stallData = {}) {
  try {
    const co = getCoCampus();
    return await co.addStall(canteenId, stallData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:262", "[cloud] cloudAddStall error", err);
    return { code: -1, msg: "添加商铺失败" };
  }
}
async function cloudUpdateStall(canteenId, stallId, stallData = {}) {
  try {
    const co = getCoCampus();
    return await co.updateStall(canteenId, stallId, stallData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:278", "[cloud] cloudUpdateStall error", err);
    return { code: -1, msg: "更新商铺失败" };
  }
}
async function cloudDeleteStall(canteenId, stallId) {
  try {
    const co = getCoCampus();
    return await co.deleteStall(canteenId, stallId);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:293", "[cloud] cloudDeleteStall error", err);
    return { code: -1, msg: "删除商铺失败" };
  }
}
async function cloudGetDishesByStall(stallId) {
  try {
    const co = getCoCampus();
    return await co.getDishesByStall(stallId);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:309", "[cloud] cloudGetDishesByStall error", err);
    return { code: -1, data: [], msg: "获取菜品列表失败" };
  }
}
async function cloudAddDish(stallId, canteenId, dishData = {}) {
  try {
    const co = getCoCampus();
    return await co.addDish(stallId, canteenId, dishData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:325", "[cloud] cloudAddDish error", err);
    return { code: -1, msg: "添加菜品失败" };
  }
}
async function cloudUpdateDish(stallId, dishId, dishData = {}) {
  try {
    const co = getCoCampus();
    return await co.updateDish(stallId, dishId, dishData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:341", "[cloud] cloudUpdateDish error", err);
    return { code: -1, msg: "更新菜品失败" };
  }
}
async function cloudDeleteDish(stallId, dishId) {
  try {
    const co = getCoCampus();
    return await co.deleteDish(stallId, dishId);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:356", "[cloud] cloudDeleteDish error", err);
    return { code: -1, msg: "删除菜品失败" };
  }
}
async function cloudInitAdminMenus() {
  try {
    const co = getCoCampus();
    return await co.initAdminMenus();
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:414", "[cloud] cloudInitAdminMenus error", err);
    return { code: -1, msg: "初始化菜单失败" };
  }
}
async function cloudFixAdminMenusUrl() {
  try {
    const co = getCoCampus();
    return await co.fixAdminMenusUrl();
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:427", "[cloud] cloudFixAdminMenusUrl error", err);
    return { code: -1, msg: "修复菜单URL失败" };
  }
}
async function cloudRunDiagnostics() {
  try {
    const co = getCoCampus();
    return await co.runDiagnostics();
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:440", "[cloud] cloudRunDiagnostics error", err);
    return { code: -1, msg: "诊断服务调用失败：" + (err.message || err) };
  }
}
async function cloudInitBaseData() {
  try {
    const co = getCoCampus();
    return await co.initBaseData();
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/cloud.js:453", "[cloud] cloudInitBaseData error", err);
    return { code: -1, msg: "初始化基础数据失败：" + (err.message || err) };
  }
}
exports.cloudAddDish = cloudAddDish;
exports.cloudAddStall = cloudAddStall;
exports.cloudDeleteDish = cloudDeleteDish;
exports.cloudDeleteStall = cloudDeleteStall;
exports.cloudFixAdminMenusUrl = cloudFixAdminMenusUrl;
exports.cloudGetDishesByStall = cloudGetDishesByStall;
exports.cloudGetStallsByCanteen = cloudGetStallsByCanteen;
exports.cloudInitAdminMenus = cloudInitAdminMenus;
exports.cloudInitBaseData = cloudInitBaseData;
exports.cloudRunDiagnostics = cloudRunDiagnostics;
exports.cloudSubmitApplication = cloudSubmitApplication;
exports.cloudSyncHistory = cloudSyncHistory;
exports.cloudSyncState = cloudSyncState;
exports.cloudUpdateDish = cloudUpdateDish;
exports.cloudUpdateProfile = cloudUpdateProfile;
exports.cloudUpdateStall = cloudUpdateStall;
exports.cloudWxLogin = cloudWxLogin;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/cloud.js.map
