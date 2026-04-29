"use strict";
const common_vendor = require("../common/vendor.js");
const utils_cloud = require("./cloud.js");
const USER_KEY = "eat-what-user";
const defaultUser = {
  openId: "",
  sessionKey: "",
  token: "",
  nickname: "",
  avatar: "",
  isLoggedIn: false,
  loginMode: "local"
  // 'cloud' | 'local'
};
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
    common_vendor.index.__f__("warn", "at utils/user-state.js:37", "storage write failed", error);
  }
}
function getUser() {
  return safeRead(USER_KEY, defaultUser);
}
function saveUser(user) {
  safeWrite(USER_KEY, { ...defaultUser, ...user, isLoggedIn: true });
  common_vendor.index.$emit("user-state-changed");
}
function clearUser() {
  safeWrite(USER_KEY, { ...defaultUser });
  common_vendor.index.$emit("user-state-changed");
}
async function wxCloudLogin(userInfo = {}) {
  const result = await utils_cloud.cloudWxLogin(userInfo);
  if (result.code === 0 && result.data) {
    saveUser({
      openId: result.data.openid,
      sessionKey: "",
      token: result.data.token,
      nickname: result.data.nickname || userInfo.nickname || "",
      avatar: result.data.avatar || userInfo.avatar || "",
      loginMode: "cloud"
    });
    return { code: 0, data: result.data, loginMode: "cloud" };
  }
  common_vendor.index.__f__("warn", "at utils/user-state.js:78", "[user-state] 云端登录失败，降级为本地登录:", result.msg);
  return { code: result.code, msg: result.msg, loginMode: "local" };
}
function localLogin(userInfo = {}) {
  const mockOpenId = `local_openid_${Date.now()}`;
  const mockToken = `local_token_${Date.now()}`;
  saveUser({
    openId: mockOpenId,
    sessionKey: "",
    token: mockToken,
    nickname: userInfo.nickname || "",
    avatar: userInfo.avatar || "",
    loginMode: "local"
  });
  return {
    code: 0,
    data: {
      openid: mockOpenId,
      token: mockToken,
      nickname: userInfo.nickname || "",
      avatar: userInfo.avatar || "",
      isNewUser: true
    },
    loginMode: "local"
  };
}
async function handleLogin(userInfo = {}) {
  const cloudResult = await wxCloudLogin(userInfo);
  if (cloudResult.code === 0) {
    return cloudResult;
  }
  const localResult = localLogin(userInfo);
  return { ...localResult, fallbackMsg: cloudResult.msg };
}
async function syncProfileToCloud(profileData = {}) {
  const user = getUser();
  if (user.loginMode !== "cloud" || !user.token)
    return;
  try {
    await utils_cloud.cloudUpdateProfile(user.token, profileData);
  } catch (err) {
    common_vendor.index.__f__("warn", "at utils/user-state.js:141", "[user-state] 同步资料到云端失败", err);
  }
}
function isCloudUser() {
  const user = getUser();
  return user.loginMode === "cloud" && !!user.token;
}
exports.clearUser = clearUser;
exports.getUser = getUser;
exports.handleLogin = handleLogin;
exports.isCloudUser = isCloudUser;
exports.saveUser = saveUser;
exports.syncProfileToCloud = syncProfileToCloud;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/user-state.js.map
