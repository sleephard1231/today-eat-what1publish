"use strict";
const common_vendor = require("../common/vendor.js");
const utils_cloud = require("./cloud.js");
const USER_KEY = "eat-what-user";
const LOGIN_INTENT_KEY = "eat-what-login-intent";
const CLOUD_FILE_PREFIX = "cloud://";
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
    common_vendor.index.__f__("warn", "at utils/user-state.js:39", "storage write failed", error);
  }
}
function isTempAvatarPath(path = "") {
  return Boolean(path) && !path.startsWith(CLOUD_FILE_PREFIX) && !/^https?:\/\//.test(path);
}
function getUser() {
  return safeRead(USER_KEY, defaultUser);
}
function isLoggedIn() {
  return Boolean(getUser().isLoggedIn);
}
function saveUser(user) {
  safeWrite(USER_KEY, { ...defaultUser, ...user, isLoggedIn: true });
  common_vendor.index.$emit("user-state-changed");
}
function clearUser() {
  safeWrite(USER_KEY, { ...defaultUser });
  common_vendor.index.$emit("user-state-changed");
}
async function uploadAvatarToCloud(tempFilePath = "") {
  if (!isTempAvatarPath(tempFilePath)) {
    return tempFilePath;
  }
  try {
    const extMatch = tempFilePath.match(/\.(jpg|jpeg|png|webp)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
    const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const result = await common_vendor._r.uploadFile({
      filePath: tempFilePath,
      cloudPath
    });
    return result.fileID || tempFilePath;
  } catch (error) {
    common_vendor.index.__f__("warn", "at utils/user-state.js:81", "[user-state] upload avatar failed", error);
    return "";
  }
}
function consumeLoginIntent() {
  try {
    const value = common_vendor.index.getStorageSync(LOGIN_INTENT_KEY);
    if (value) {
      common_vendor.index.removeStorageSync(LOGIN_INTENT_KEY);
    }
    return Boolean(value);
  } catch (error) {
    return false;
  }
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
  common_vendor.index.__f__("warn", "at utils/user-state.js:121", "[user-state] 云端登录失败，降级为本地登录:", result.msg);
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
    common_vendor.index.__f__("warn", "at utils/user-state.js:184", "[user-state] 同步资料到云端失败", err);
  }
}
function isCloudUser() {
  const user = getUser();
  return user.loginMode === "cloud" && !!user.token;
}
function getLoginStatusMeta() {
  const user = getUser();
  const loggedIn = Boolean(user.isLoggedIn);
  const cloudUser = user.loginMode === "cloud" && !!user.token;
  const localFallback = loggedIn && !cloudUser;
  let label = "未登录";
  let description = "登录后才能同步历史、使用 AI 和云端能力。";
  if (cloudUser) {
    label = "云端登录";
    description = "已连接云端，AI、同步和校园申请都可以正常使用。";
  } else if (localFallback) {
    label = "本地模式";
    description = "当前没有连上云端，AI、同步和校园申请暂时不可用。";
  }
  return {
    isLoggedIn: loggedIn,
    isCloudUser: cloudUser,
    isLocalFallback: localFallback,
    loginMode: user.loginMode || "local",
    label,
    description
  };
}
function requireLogin(options = {}) {
  const {
    cloudOnly = false,
    title = "先登录一下",
    content = "登录后才能继续使用这个功能。",
    redirect = true
  } = options;
  const passed = cloudOnly ? isCloudUser() : isLoggedIn();
  const loginStatus = getLoginStatusMeta();
  if (passed) {
    return true;
  }
  const resolvedTitle = cloudOnly && loginStatus.isLocalFallback ? "还差一步云端登录" : title;
  const resolvedContent = cloudOnly && loginStatus.isLocalFallback ? "你现在是本地模式登录，这次没有连上云端，所以 AI 和云同步还不能用。请再登录一次，切到云端登录后再试。" : content;
  const resolvedConfirmText = cloudOnly && loginStatus.isLocalFallback ? "去重新登录" : "去登录";
  if (!redirect) {
    common_vendor.index.showToast({ title: resolvedContent, icon: "none" });
    return false;
  }
  common_vendor.index.showModal({
    title: resolvedTitle,
    content: resolvedContent,
    confirmText: resolvedConfirmText,
    cancelText: "先不了",
    success: (res) => {
      if (res.confirm) {
        safeWrite(LOGIN_INTENT_KEY, Date.now());
        common_vendor.index.switchTab({ url: "/pages/my/my" });
      }
    }
  });
  return false;
}
exports.clearUser = clearUser;
exports.consumeLoginIntent = consumeLoginIntent;
exports.getLoginStatusMeta = getLoginStatusMeta;
exports.getUser = getUser;
exports.handleLogin = handleLogin;
exports.isCloudUser = isCloudUser;
exports.requireLogin = requireLogin;
exports.saveUser = saveUser;
exports.syncProfileToCloud = syncProfileToCloud;
exports.uploadAvatarToCloud = uploadAvatarToCloud;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/user-state.js.map
