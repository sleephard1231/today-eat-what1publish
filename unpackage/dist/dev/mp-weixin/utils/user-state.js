"use strict";
const common_vendor = require("../common/vendor.js");
const USER_KEY = "eat-what-user";
const defaultUser = {
  openId: "",
  sessionKey: "",
  token: "",
  nickname: "",
  avatar: "",
  isLoggedIn: false
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
    common_vendor.index.__f__("warn", "at utils/user-state.js:34", "storage write failed", error);
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
exports.clearUser = clearUser;
exports.getUser = getUser;
exports.saveUser = saveUser;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/user-state.js.map
