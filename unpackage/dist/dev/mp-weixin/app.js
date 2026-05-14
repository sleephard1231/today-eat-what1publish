"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
const utils_appState = require("./utils/app-state.js");
const utils_privacyState = require("./utils/privacy-state.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/my/my.js";
  "./pages/campus/select.js";
  "./pages/campus/join.js";
  "./pages/history/index.js";
  "./pages/canteen/canteen.js";
  "./pages/canteen/detail.js";
  "./pages/canteen/stall.js";
  "./pages/service/service.js";
  "./pages/webview/index.js";
}
const _sfc_main = {
  onLaunch() {
    utils_appState.ensureAppState();
    this.showPrivacyModal();
  },
  onShow() {
    utils_appState.ensureAppState();
  },
  methods: {
    showPrivacyModal() {
      if (utils_privacyState.hasAgreedPrivacy())
        return;
      common_vendor.index.showModal({
        title: "隐私保护提示",
        content: "我们会使用登录信息、头像昵称、推荐历史和入驻申请信息来提供服务。请先阅读并同意隐私政策和用户协议。",
        confirmText: "同意",
        cancelText: "先不了",
        success: (res) => {
          if (res.confirm) {
            utils_privacyState.agreePrivacy();
          }
        }
      });
    }
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
