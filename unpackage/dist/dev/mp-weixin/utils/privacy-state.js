"use strict";
const common_vendor = require("../common/vendor.js");
const PRIVACY_AGREED_KEY = "eat-what-privacy-agreed";
function safeRead(key, fallbackValue) {
  try {
    const value = common_vendor.index.getStorageSync(key);
    return value === "" || value === void 0 ? fallbackValue : value;
  } catch (error) {
    return fallbackValue;
  }
}
function safeWrite(key, value) {
  try {
    common_vendor.index.setStorageSync(key, value);
  } catch (error) {
    common_vendor.index.__f__("warn", "at utils/privacy-state.js:16", "[privacy-state] storage write failed", error);
  }
}
function hasAgreedPrivacy() {
  return Boolean(safeRead(PRIVACY_AGREED_KEY, false));
}
function agreePrivacy() {
  safeWrite(PRIVACY_AGREED_KEY, true);
  common_vendor.index.$emit("privacy-state-changed");
}
exports.agreePrivacy = agreePrivacy;
exports.hasAgreedPrivacy = hasAgreedPrivacy;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/privacy-state.js.map
