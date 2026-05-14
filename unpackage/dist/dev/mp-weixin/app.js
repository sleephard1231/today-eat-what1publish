"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
const utils_appState = require("./utils/app-state.js");
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
  },
  onShow() {
    utils_appState.ensureAppState();
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
