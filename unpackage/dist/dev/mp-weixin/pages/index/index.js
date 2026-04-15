"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_appState = require("../../utils/app-state.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getSystemInfoSync().statusBarHeight || 20;
    const state = common_vendor.ref(utils_appState.getAppState());
    const isDrawing = common_vendor.ref(false);
    const showResultPopup = common_vendor.ref(false);
    const popupResult = common_vendor.ref(null);
    let drawTimer = null;
    const refreshState = () => {
      state.value = utils_appState.getAppState();
      utils_appState.applyTabBarTheme(state.value.mode);
    };
    common_vendor.onLoad(() => {
      refreshState();
    });
    common_vendor.onShow(() => {
      refreshState();
    });
    common_vendor.onUnload(() => {
      if (drawTimer) {
        clearTimeout(drawTimer);
        drawTimer = null;
      }
    });
    const theme = common_vendor.computed(() => utils_appState.getTheme(state.value.mode));
    const fortune = common_vendor.computed(() => utils_appState.getTodayFortune(state.value));
    const currentCampus = common_vendor.computed(() => utils_appState.getCampusById(state.value.campusId));
    const servedCountText = common_vendor.computed(() => `${state.value.stats.servedCount}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    const campusChipText = common_vendor.computed(() => state.value.mode === "campus" ? `🏫 ${currentCampus.value.name}` : "🍐 普通版");
    const pageStyle = common_vendor.computed(() => ({
      minHeight: "100vh",
      padding: "0 32rpx 180rpx",
      background: `linear-gradient(180deg, ${theme.value.pageStart} 0%, ${theme.value.pageEnd} 100%)`
    }));
    const cardStyle = common_vendor.computed(() => ({
      background: theme.value.card,
      boxShadow: theme.value.shadow,
      border: `1px solid ${theme.value.border}`
    }));
    const accentTextStyle = common_vendor.computed(() => ({
      color: theme.value.accent
    }));
    const accentFillStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
      boxShadow: theme.value.shadow,
      color: "#ffffff"
    }));
    const popupCardStyle = common_vendor.computed(() => ({
      background: `linear-gradient(180deg, ${theme.value.card} 0%, #ffffff 100%)`,
      boxShadow: theme.value.shadow,
      border: `1px solid ${theme.value.border}`
    }));
    function handleDrawMeal() {
      if (isDrawing.value) {
        return;
      }
      showResultPopup.value = false;
      const drawResult = utils_appState.drawMealResult();
      state.value = drawResult.state;
      utils_appState.applyTabBarTheme(drawResult.state.mode);
      if (drawResult.exhausted) {
        common_vendor.index.showToast({
          title: "今天的占卜次数用完了",
          icon: "none"
        });
        return;
      }
      popupResult.value = drawResult.result;
      isDrawing.value = true;
      if (drawTimer) {
        clearTimeout(drawTimer);
      }
      drawTimer = setTimeout(() => {
        isDrawing.value = false;
        showResultPopup.value = true;
        drawTimer = null;
      }, 1500);
    }
    function closeResultPopup() {
      showResultPopup.value = false;
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(campusChipText.value),
        b: common_vendor.s(accentFillStyle.value),
        c: common_vendor.t(state.value.profile.mbti),
        d: common_vendor.t(state.value.profile.zodiac),
        e: common_vendor.s(accentTextStyle.value),
        f: `${common_vendor.unref(statusBarHeight) + 16}px`,
        g: common_vendor.t(fortune.value.dateLabel),
        h: common_vendor.s(accentFillStyle.value),
        i: common_vendor.t(fortune.value.appetite),
        j: common_vendor.s(accentTextStyle.value),
        k: common_vendor.t(fortune.value.energy),
        l: common_vendor.s(accentTextStyle.value),
        m: common_vendor.t(fortune.value.luck),
        n: common_vendor.s(accentTextStyle.value),
        o: common_vendor.t(fortune.value.moodText),
        p: common_vendor.t(fortune.value.tasteText),
        q: common_vendor.s(cardStyle.value),
        r: common_vendor.s(accentFillStyle.value),
        s: common_vendor.o(handleDrawMeal, "1b"),
        t: common_vendor.t(state.value.daily.remaining),
        v: common_vendor.t(servedCountText.value),
        w: isDrawing.value
      }, isDrawing.value ? {
        x: common_vendor.s(accentFillStyle.value),
        y: common_vendor.s(cardStyle.value)
      } : {}, {
        z: showResultPopup.value && popupResult.value
      }, showResultPopup.value && popupResult.value ? {
        A: common_vendor.t(state.value.mode === "campus" ? "校园版推荐" : "普通版推荐"),
        B: common_vendor.t(popupResult.value.createdAt),
        C: common_vendor.t(popupResult.value.mealName),
        D: common_vendor.t(popupResult.value.vibe),
        E: common_vendor.t(popupResult.value.campusName),
        F: common_vendor.t(popupResult.value.canteen),
        G: common_vendor.t(popupResult.value.reason),
        H: common_vendor.s(accentFillStyle.value),
        I: common_vendor.o(closeResultPopup, "eb"),
        J: common_vendor.s(popupCardStyle.value),
        K: common_vendor.o(() => {
        }, "0f"),
        L: common_vendor.o(closeResultPopup, "89")
      } : {}, {
        M: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
