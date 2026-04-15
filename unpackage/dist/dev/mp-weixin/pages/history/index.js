"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_appState = require("../../utils/app-state.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getSystemInfoSync().statusBarHeight || 20;
    const state = common_vendor.ref(utils_appState.getAppState());
    const historyList = common_vendor.ref(utils_appState.getHistoryList());
    const refreshData = () => {
      state.value = utils_appState.getAppState();
      historyList.value = utils_appState.getHistoryList();
    };
    common_vendor.onLoad(() => {
      refreshData();
    });
    common_vendor.onShow(() => {
      refreshData();
    });
    const theme = common_vendor.computed(() => utils_appState.getTheme(state.value.mode));
    const pageStyle = common_vendor.computed(() => ({
      minHeight: "100vh",
      padding: "0 32rpx 120rpx",
      background: `linear-gradient(180deg, ${theme.value.pageStart} 0%, ${theme.value.pageEnd} 100%)`
    }));
    const cardStyle = common_vendor.computed(() => ({
      background: theme.value.card,
      boxShadow: theme.value.shadow,
      border: `1px solid ${theme.value.border}`
    }));
    function modeStyle(mode) {
      const currentTheme = utils_appState.getTheme(mode);
      return {
        color: currentTheme.accent,
        background: currentTheme.accentSoft
      };
    }
    function goBack() {
      common_vendor.index.navigateBack();
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(goBack, "ca"),
        b: `${common_vendor.unref(statusBarHeight) + 12}px`,
        c: common_vendor.s(cardStyle.value),
        d: historyList.value.length
      }, historyList.value.length ? {
        e: common_vendor.f(historyList.value, (item, k0, i0) => {
          return {
            a: common_vendor.t(item.mealName),
            b: common_vendor.t(item.campusName),
            c: common_vendor.t(item.canteen),
            d: common_vendor.t(item.mode === "campus" ? "校园版" : "普通版"),
            e: common_vendor.s(modeStyle(item.mode)),
            f: common_vendor.t(item.vibe),
            g: common_vendor.t(item.reason),
            h: common_vendor.t(item.createdAt),
            i: item.id
          };
        }),
        f: common_vendor.s(cardStyle.value)
      } : {
        g: common_vendor.s(cardStyle.value)
      }, {
        h: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/history/index.js.map
