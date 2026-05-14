"use strict";
const common_vendor = require("../../common/vendor.js");
const common_data = require("../../common/data.js");
const utils_appState = require("../../utils/app-state.js");
const utils_privacyState = require("../../utils/privacy-state.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getWindowInfo().statusBarHeight || 20;
    const state = common_vendor.ref(utils_appState.getAppState());
    const isDrawing = common_vendor.ref(false);
    const showResultPopup = common_vendor.ref(false);
    const popupResult = common_vendor.ref(null);
    const popupCandidates = common_vendor.ref([]);
    const popupSeed = common_vendor.ref(0);
    const popupSelectedCanteenNames = common_vendor.ref([]);
    const bouncingChip = common_vendor.ref("");
    const animatedAppetiteProgress = common_vendor.ref(0);
    const animatedEnergyProgress = common_vendor.ref(0);
    const animatedLuckProgress = common_vendor.ref(0);
    let drawTimer = null;
    let progressTimer = null;
    let chipBounceTimer = null;
    const theme = common_vendor.computed(() => utils_appState.getTheme(state.value.mode));
    const fortune = common_vendor.computed(() => utils_appState.getTodayFortune(state.value));
    const currentCampus = common_vendor.computed(() => utils_appState.getCampusById(state.value.campusId));
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
      drawTimer = null;
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
      if (result.reason) {
        return result.reason;
      }
      if (state.value.mode === "campus") {
        return `${result.canteen || "这家饭堂"} 这口，会比较对你今天的状态。`;
      }
      return `${result.mealName} 今天会比平时更顺口。`;
    }
    function buildMiniProgressStyle(percent) {
      const t = theme.value;
      return {
        width: `${percent}%`,
        background: `linear-gradient(90deg, ${t.accent} 0%, ${t.accentDeep} 100%)`,
        boxShadow: `0 6rpx 14rpx ${t.accent}30`
      };
    }
    const miniProgressTrackStyle = common_vendor.computed(() => {
      const t = theme.value;
      return {
        background: `${t.accent}24`,
        boxShadow: `inset 0 0 0 1rpx ${t.accent}14`
      };
    });
    const popupRevealReason = common_vendor.computed(() => buildRevealReason(popupResult.value));
    const popupMetaText = common_vendor.computed(() => {
      if (!popupResult.value)
        return "";
      if (popupResult.value.mode !== "campus")
        return "";
      return [popupResult.value.campusName, popupResult.value.canteen].filter(Boolean).join(" · ");
    });
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
    const vibeBadgeStyle = common_vendor.computed(() => {
      const t = theme.value;
      return {
        color: t.accentDeep,
        background: `${t.accent}20`
      };
    });
    function triggerChipBounce(type) {
      clearChipBounceTimer();
      bouncingChip.value = type;
      chipBounceTimer = setTimeout(() => {
        bouncingChip.value = "";
        chipBounceTimer = null;
      }, 420);
    }
    function applyAiPick(aiPick, candidates) {
      if (!(aiPick == null ? void 0 : aiPick.isAI) || !popupResult.value)
        return;
      const chosen = candidates[aiPick.choice] || candidates[0];
      popupResult.value = {
        ...popupResult.value,
        mealName: chosen.name,
        vibe: chosen.vibe,
        canteen: popupResult.value.mode === "campus" ? chosen.canteen || popupResult.value.canteen : "",
        source: chosen.source || popupResult.value.source,
        dishId: chosen.id || popupResult.value.dishId,
        stallId: chosen.stallId || popupResult.value.stallId,
        stallName: chosen.stallName || popupResult.value.stallName,
        category: chosen.category || popupResult.value.category,
        price: chosen.price || popupResult.value.price,
        reason: aiPick.reason,
        isAI: true
      };
      utils_appState.updateLatestMealResult(popupResult.value);
    }
    async function handleDrawMeal() {
      if (isDrawing.value)
        return;
      if (!utils_privacyState.hasAgreedPrivacy()) {
        common_vendor.index.showToast({ title: "先去“我的”页勾选用户协议哦", icon: "none" });
        setTimeout(() => {
          common_vendor.index.switchTab({ url: "/pages/my/my" });
        }, 300);
        return;
      }
      clearRevealTimers();
      showResultPopup.value = false;
      isDrawing.value = true;
      const startAt = Date.now();
      try {
        const drawResult = await utils_appState.drawMealResultAsync();
        state.value = drawResult.state;
        utils_appState.applyTabBarTheme(drawResult.state.mode);
        animateFortuneProgress();
        if (drawResult.exhausted) {
          common_vendor.index.showToast({ title: "今天的使用次数用完了", icon: "none" });
          isDrawing.value = false;
          return;
        }
        popupResult.value = drawResult.result;
        popupCandidates.value = drawResult.candidates || [];
        popupSeed.value = drawResult.seed || Date.now();
        popupSelectedCanteenNames.value = drawResult.selectedCanteenNames || [];
        if (popupCandidates.value.length > 0) {
          const aiPick = await utils_appState.aiPickFromCandidates({
            candidates: popupCandidates.value,
            state: state.value,
            fortune: fortune.value,
            seed: popupSeed.value,
            selectedCanteenNames: popupSelectedCanteenNames.value
          });
          applyAiPick(aiPick, popupCandidates.value);
        }
        const elapsed = Date.now() - startAt;
        drawTimer = setTimeout(() => {
          isDrawing.value = false;
          showResultPopup.value = true;
          drawTimer = null;
        }, Math.max(0, 1500 - elapsed));
      } catch (err) {
        common_vendor.index.__f__("warn", "at pages/index/index.vue:373", "[index] draw meal failed", (err == null ? void 0 : err.message) || err);
        isDrawing.value = false;
        common_vendor.index.showToast({ title: "推荐暂时没出来，稍后再试一下", icon: "none" });
      }
    }
    function closeResultPopup() {
      showResultPopup.value = false;
      clearRevealTimers();
    }
    let hasLoaded = false;
    common_vendor.onLoad(() => {
      refreshState();
    });
    common_vendor.onShow(() => {
      if (!hasLoaded) {
        hasLoaded = true;
        return;
      }
      refreshState();
    });
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
        e: common_vendor.o(($event) => triggerChipBounce("campus"), "68"),
        f: bouncingChip.value === "mbti" ? 1 : "",
        g: common_vendor.t(state.value.profile.mbti),
        h: common_vendor.o(($event) => triggerChipBounce("mbti"), "43"),
        i: bouncingChip.value === "zodiac" ? 1 : "",
        j: common_vendor.t(state.value.profile.zodiac),
        k: common_vendor.o(($event) => triggerChipBounce("zodiac"), "79"),
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
        G: common_vendor.o(handleDrawMeal, "8f"),
        H: isDrawing.value
      }, isDrawing.value ? {
        I: common_vendor.s(accentFillStyle.value),
        J: common_vendor.s(cardStyle.value)
      } : {}, {
        K: showResultPopup.value && popupResult.value
      }, showResultPopup.value && popupResult.value ? common_vendor.e({
        L: common_vendor.t(popupResult.value.isAI ? "AI 推荐" : state.value.mode === "campus" ? "校园版推荐" : "普通版推荐"),
        M: common_vendor.t(popupResult.value.createdAt),
        N: common_vendor.t(popupResult.value.mealName),
        O: common_vendor.t(popupResult.value.vibe),
        P: common_vendor.s(vibeBadgeStyle.value),
        Q: popupMetaText.value
      }, popupMetaText.value ? {
        R: common_vendor.t(popupMetaText.value)
      } : {}, {
        S: common_vendor.t(popupRevealReason.value),
        T: common_vendor.s(accentFillStyle.value),
        U: common_vendor.o(closeResultPopup, "fa"),
        V: common_vendor.s(popupCardStyle.value),
        W: common_vendor.o(() => {
        }, "9d"),
        X: common_vendor.o(closeResultPopup, "fb")
      }) : {}, {
        Y: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
