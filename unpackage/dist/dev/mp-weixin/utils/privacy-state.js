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
function requirePrivacyAgreement(options = {}) {
  const {
    title = "先确认隐私协议",
    content = "同意隐私政策和用户协议后，才能继续使用这个功能。",
    showLink = true
  } = options;
  if (hasAgreedPrivacy()) {
    return true;
  }
  common_vendor.index.showModal({
    title,
    content,
    confirmText: "去查看",
    cancelText: "先不了",
    success: (res) => {
      if (res.confirm && showLink) {
        common_vendor.index.navigateTo({ url: "/pages/webview/index?url=privacy" });
      }
    }
  });
  return false;
}
exports.agreePrivacy = agreePrivacy;
exports.hasAgreedPrivacy = hasAgreedPrivacy;
exports.requirePrivacyAgreement = requirePrivacyAgreement;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/privacy-state.js.map
