"use strict";
const common_vendor = require("../../common/vendor.js");
const common_data = require("../../common/data.js");
const utils_appState = require("../../utils/app-state.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getSystemInfoSync().statusBarHeight || 20;
    const state = common_vendor.ref(utils_appState.getAppState());
    const isDrawing = common_vendor.ref(false);
    const showResultPopup = common_vendor.ref(false);
    const popupResult = common_vendor.ref(null);
    const popupRevealStage = common_vendor.ref(0);
    const bouncingChip = common_vendor.ref("");
    const animatedAppetiteProgress = common_vendor.ref(0);
    const animatedEnergyProgress = common_vendor.ref(0);
    const animatedLuckProgress = common_vendor.ref(0);
    let drawTimer = null;
    let revealTimerOne = null;
    let revealTimerTwo = null;
    let progressTimer = null;
    let chipBounceTimer = null;
    const theme = common_vendor.computed(() => utils_appState.getTheme(state.value.mode));
    const fortune = common_vendor.computed(() => utils_appState.getTodayFortune(state.value));
    const currentCampus = common_vendor.computed(() => utils_appState.getCampusById(state.value.campusId));
    const servedCountText = common_vendor.computed(() => `${state.value.stats.servedCount}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    const campusChipIcon = common_vendor.computed(() => state.value.mode === "campus" ? "🏫" : "🍃");
    const campusChipLabel = common_vendor.computed(() => state.value.mode === "campus" ? currentCampus.value.name : "普通版");
    function getLevelProgress(label, labels) {
      const index = labels.indexOf(label);
      return index < 0 ? 50 : Math.round((index + 1) / labels.length * 100);
    }
    const appetiteProgress = common_vendor.computed(() => getLevelProgress(fortune.value.appetite, common_data.appetiteLabels));
    const energyProgress = common_vendor.computed(() => getLevelProgress(fortune.value.energy, common_data.energyLevelLabels));
    const luckProgress = common_vendor.computed(() => getLevelProgress(fortune.value.luck, common_data.luckLabels));
    function clearRevealTimers() {
      if (drawTimer)
        clearTimeout(drawTimer);
      if (revealTimerOne)
        clearTimeout(revealTimerOne);
      if (revealTimerTwo)
        clearTimeout(revealTimerTwo);
      drawTimer = null;
      revealTimerOne = null;
      revealTimerTwo = null;
    }
    function clearProgressTimer() {
      if (progressTimer)
        clearTimeout(progressTimer);
      progressTimer = null;
    }
    function clearChipBounceTimer() {
      if (chipBounceTimer)
        clearTimeout(chipBounceTimer);
      chipBounceTimer = null;
    }
    function animateFortuneProgress() {
      clearProgressTimer();
      animatedAppetiteProgress.value = 0;
      animatedEnergyProgress.value = 0;
      animatedLuckProgress.value = 0;
      progressTimer = setTimeout(() => {
        animatedAppetiteProgress.value = appetiteProgress.value;
        animatedEnergyProgress.value = energyProgress.value;
        animatedLuckProgress.value = luckProgress.value;
        progressTimer = null;
      }, 40);
    }
    function refreshState() {
      state.value = utils_appState.getAppState();
      utils_appState.applyTabBarTheme(state.value.mode);
      animateFortuneProgress();
    }
    function buildRevealReason(result) {
      if (!result)
        return "";
      return state.value.mode === "campus" ? `${result.canteen} 这口最对你今天的状态。` : `${result.vibe}，今天就该吃这一口。`;
    }
    function buildMiniProgressStyle(percent) {
      const isCampusMode = state.value.mode === "campus";
      return {
        width: `${percent}%`,
        background: isCampusMode ? "linear-gradient(90deg, #67b6a0 0%, #67b6a0 100%)" : "linear-gradient(90deg, #ff9b5a 0%, #ff7a2f 100%)",
        boxShadow: isCampusMode ? "0 6rpx 14rpx rgba(103, 182, 160, 0.18)" : "0 6rpx 14rpx rgba(255, 122, 47, 0.18)"
      };
    }
    const miniProgressTrackStyle = common_vendor.computed(() => state.value.mode === "campus" ? { background: "rgba(103, 182, 160, 0.18)", boxShadow: "inset 0 0 0 1rpx rgba(103, 182, 160, 0.08)" } : { background: "rgba(255, 122, 47, 0.14)", boxShadow: "inset 0 0 0 1rpx rgba(255, 122, 47, 0.06)" });
    const popupRevealReason = common_vendor.computed(() => buildRevealReason(popupResult.value));
    const appetiteProgressStyle = common_vendor.computed(() => buildMiniProgressStyle(animatedAppetiteProgress.value));
    const energyProgressStyle = common_vendor.computed(() => buildMiniProgressStyle(animatedEnergyProgress.value));
    const luckProgressStyle = common_vendor.computed(() => buildMiniProgressStyle(animatedLuckProgress.value));
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
    const accentTextStyle = common_vendor.computed(() => ({ color: theme.value.accent }));
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
    function triggerChipBounce(type) {
      clearChipBounceTimer();
      bouncingChip.value = type;
      chipBounceTimer = setTimeout(() => {
        bouncingChip.value = "";
        chipBounceTimer = null;
      }, 420);
    }
    function handleDrawMeal() {
      if (isDrawing.value)
        return;
      clearRevealTimers();
      popupRevealStage.value = 0;
      showResultPopup.value = false;
      const drawResult = utils_appState.drawMealResult();
      state.value = drawResult.state;
      utils_appState.applyTabBarTheme(drawResult.state.mode);
      animateFortuneProgress();
      if (drawResult.exhausted) {
        common_vendor.index.showToast({ title: "今天的占卜次数用完了", icon: "none" });
        return;
      }
      popupResult.value = drawResult.result;
      isDrawing.value = true;
      drawTimer = setTimeout(() => {
        isDrawing.value = false;
        showResultPopup.value = true;
        popupRevealStage.value = 1;
        drawTimer = null;
        revealTimerOne = setTimeout(() => {
          popupRevealStage.value = 2;
          revealTimerOne = null;
        }, 220);
      }, 1500);
    }
    function closeResultPopup() {
      showResultPopup.value = false;
      popupRevealStage.value = 0;
      clearRevealTimers();
    }
    common_vendor.onLoad(refreshState);
    common_vendor.onShow(refreshState);
    common_vendor.onUnload(() => {
      clearRevealTimers();
      clearProgressTimer();
      clearChipBounceTimer();
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.t(campusChipIcon.value),
        b: bouncingChip.value === "campus" ? 1 : "",
        c: common_vendor.t(campusChipLabel.value),
        d: common_vendor.s(accentFillStyle.value),
        e: common_vendor.o(($event) => triggerChipBounce("campus"), "71"),
        f: bouncingChip.value === "mbti" ? 1 : "",
        g: common_vendor.t(state.value.profile.mbti),
        h: common_vendor.o(($event) => triggerChipBounce("mbti"), "a8"),
        i: bouncingChip.value === "zodiac" ? 1 : "",
        j: common_vendor.t(state.value.profile.zodiac),
        k: common_vendor.o(($event) => triggerChipBounce("zodiac"), "5f"),
        l: common_vendor.s(accentTextStyle.value),
        m: `${common_vendor.unref(statusBarHeight) + 16}px`,
        n: common_vendor.t(fortune.value.dateLabel),
        o: common_vendor.s(accentFillStyle.value),
        p: common_vendor.t(fortune.value.appetite),
        q: common_vendor.s(accentTextStyle.value),
        r: common_vendor.s(appetiteProgressStyle.value),
        s: common_vendor.s(miniProgressTrackStyle.value),
        t: common_vendor.t(fortune.value.energy),
        v: common_vendor.s(accentTextStyle.value),
        w: common_vendor.s(energyProgressStyle.value),
        x: common_vendor.s(miniProgressTrackStyle.value),
        y: common_vendor.t(fortune.value.luck),
        z: common_vendor.s(accentTextStyle.value),
        A: common_vendor.s(luckProgressStyle.value),
        B: common_vendor.s(miniProgressTrackStyle.value),
        C: common_vendor.t(fortune.value.moodText),
        D: common_vendor.t(fortune.value.tasteText),
        E: common_vendor.s(cardStyle.value),
        F: common_vendor.s(accentFillStyle.value),
        G: common_vendor.o(handleDrawMeal, "8a"),
        H: common_vendor.t(servedCountText.value),
        I: isDrawing.value
      }, isDrawing.value ? {
        J: common_vendor.s(accentFillStyle.value),
        K: common_vendor.s(cardStyle.value)
      } : {}, {
        L: showResultPopup.value && popupResult.value
      }, showResultPopup.value && popupResult.value ? {
        M: common_vendor.t(state.value.mode === "campus" ? "校园版推荐" : "普通版推荐"),
        N: common_vendor.t(popupResult.value.createdAt),
        O: common_vendor.t(popupResult.value.mealName),
        P: common_vendor.t(popupResult.value.vibe),
        Q: popupRevealStage.value >= 1 ? 1 : "",
        R: common_vendor.t(popupResult.value.campusName),
        S: common_vendor.t(popupResult.value.canteen),
        T: common_vendor.t(popupRevealReason.value),
        U: popupRevealStage.value >= 2 ? 1 : "",
        V: common_vendor.s(accentFillStyle.value),
        W: common_vendor.o(closeResultPopup, "61"),
        X: common_vendor.s(popupCardStyle.value),
        Y: common_vendor.o(() => {
        }, "64"),
        Z: common_vendor.o(closeResultPopup, "02")
      } : {}, {
        aa: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
