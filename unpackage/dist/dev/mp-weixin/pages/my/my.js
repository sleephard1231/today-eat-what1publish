"use strict";
const common_vendor = require("../../common/vendor.js");
const common_data = require("../../common/data.js");
const utils_appState = require("../../utils/app-state.js");
const _sfc_main = {
  __name: "my",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getSystemInfoSync().statusBarHeight || 20;
    const state = common_vendor.ref(utils_appState.getAppState());
    const historyCount = common_vendor.ref(0);
    const applicationCount = common_vendor.ref(0);
    const showMbtiPopup = common_vendor.ref(false);
    const showZodiacPopup = common_vendor.ref(false);
    const pendingMbti = common_vendor.ref(state.value.profile.mbti);
    const pendingZodiac = common_vendor.ref(state.value.profile.zodiac);
    const refreshState = () => {
      state.value = utils_appState.getAppState();
      historyCount.value = utils_appState.getHistoryList().length;
      applicationCount.value = utils_appState.getCampusApplications().length;
      pendingMbti.value = state.value.profile.mbti;
      pendingZodiac.value = state.value.profile.zodiac;
      utils_appState.applyTabBarTheme(state.value.mode);
    };
    common_vendor.onLoad(() => {
      refreshState();
    });
    common_vendor.onShow(() => {
      refreshState();
    });
    const theme = common_vendor.computed(() => utils_appState.getTheme(state.value.mode));
    const currentCampus = common_vendor.computed(() => utils_appState.getCampusById(state.value.campusId));
    const currentMbtiCard = common_vendor.computed(() => common_data.mbtiCardOptions.find((item) => item.value === state.value.profile.mbti) || common_data.mbtiCardOptions[0]);
    const currentZodiacCard = common_vendor.computed(() => common_data.zodiacCardOptions.find((item) => item.value === state.value.profile.zodiac) || common_data.zodiacCardOptions[0]);
    const isCampusMode = common_vendor.computed(() => state.value.mode === "campus");
    const campusDescription = common_vendor.computed(() => state.value.mode === "campus" ? `${currentCampus.value.name} · ${currentCampus.value.canteen || "校园版推荐"}` : "普通版已开启，推荐附近人气菜单");
    const pageStyle = common_vendor.computed(() => ({
      minHeight: "100vh",
      padding: "0 32rpx 160rpx",
      background: `linear-gradient(180deg, ${theme.value.pageStart} 0%, ${theme.value.pageEnd} 100%)`
    }));
    const cardStyle = common_vendor.computed(() => ({
      background: theme.value.card,
      boxShadow: theme.value.shadow,
      border: `1px solid ${theme.value.border}`
    }));
    const sheetStyle = common_vendor.computed(() => ({
      background: theme.value.card,
      boxShadow: theme.value.shadow
    }));
    const accentFillStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
      color: "#ffffff"
    }));
    const accentTextStyle = common_vendor.computed(() => ({
      color: theme.value.accent
    }));
    const modePillStyle = common_vendor.computed(() => ({
      color: theme.value.accent,
      background: theme.value.accentSoft,
      border: `1px solid ${theme.value.border}`
    }));
    const pickerChipStyle = common_vendor.computed(() => ({
      color: theme.value.accent
    }));
    const serviceEntryStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.cardStrong} 0%, ${theme.value.card} 100%)`,
      boxShadow: theme.value.shadow,
      border: `1px solid ${theme.value.border}`
    }));
    function selectorCardStyle(isActive) {
      return {
        background: isActive ? `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)` : theme.value.accentSoft,
        boxShadow: isActive ? theme.value.shadow : "none",
        border: `1px solid ${isActive ? theme.value.accent : theme.value.border}`
      };
    }
    function selectorTitleStyle(isActive) {
      return {
        color: isActive ? "#ffffff" : "#33271f"
      };
    }
    function selectorSubStyle(isActive) {
      return {
        color: isActive ? "rgba(255,255,255,0.92)" : "#7f6f63"
      };
    }
    function selectorAliasStyle(isActive) {
      return {
        color: isActive ? "rgba(255,255,255,0.82)" : "#a59487"
      };
    }
    function cardEntranceStyle(index) {
      return {
        animationDelay: `${index * 100}ms`
      };
    }
    function openMbtiPopup() {
      pendingMbti.value = state.value.profile.mbti;
      showMbtiPopup.value = true;
    }
    function cancelMbtiSelection() {
      showMbtiPopup.value = false;
      pendingMbti.value = state.value.profile.mbti;
    }
    function confirmMbtiSelection() {
      handleMbtiChange(pendingMbti.value);
      showMbtiPopup.value = false;
    }
    function openZodiacPopup() {
      pendingZodiac.value = state.value.profile.zodiac;
      showZodiacPopup.value = true;
    }
    function cancelZodiacSelection() {
      showZodiacPopup.value = false;
      pendingZodiac.value = state.value.profile.zodiac;
    }
    function confirmZodiacSelection() {
      handleZodiacChange(pendingZodiac.value);
      showZodiacPopup.value = false;
    }
    function handleMbtiChange(nextMbti) {
      state.value = utils_appState.saveAppState({
        profile: {
          mbti: nextMbti
        }
      });
      pendingMbti.value = nextMbti;
      common_vendor.index.showToast({
        title: `MBTI 已切到 ${nextMbti}`,
        icon: "none"
      });
    }
    function handleZodiacChange(nextZodiac) {
      state.value = utils_appState.saveAppState({
        profile: {
          zodiac: nextZodiac
        }
      });
      pendingZodiac.value = nextZodiac;
      common_vendor.index.showToast({
        title: `星座已切到 ${nextZodiac}`,
        icon: "none"
      });
    }
    function goCampusPage() {
      common_vendor.index.navigateTo({
        url: "/pages/campus/select"
      });
    }
    function goHistoryPage() {
      common_vendor.index.navigateTo({
        url: "/pages/history/index"
      });
    }
    function goCanteenPage() {
      common_vendor.index.navigateTo({
        url: "/pages/canteen/canteen"
      });
    }
    function goServicePage() {
      common_vendor.index.navigateTo({
        url: "/pages/service/service"
      });
    }
    function goJoinPage() {
      common_vendor.index.navigateTo({
        url: "/pages/campus/join"
      });
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.s(accentFillStyle.value),
        b: common_vendor.t(state.value.profile.nickname),
        c: common_vendor.t(state.value.profile.zodiac),
        d: common_vendor.t(currentMbtiCard.value.emoji),
        e: common_vendor.t(currentMbtiCard.value.value),
        f: common_vendor.t(currentMbtiCard.value.funAlias),
        g: common_vendor.s(pickerChipStyle.value),
        h: common_vendor.o(openMbtiPopup, "ee"),
        i: common_vendor.t(currentZodiacCard.value.emoji),
        j: common_vendor.t(currentZodiacCard.value.value),
        k: common_vendor.t(currentZodiacCard.value.funAlias),
        l: common_vendor.s(pickerChipStyle.value),
        m: common_vendor.o(openZodiacPopup, "b3"),
        n: common_vendor.s(cardStyle.value),
        o: common_vendor.s({
          marginTop: `${common_vendor.unref(statusBarHeight) + 16}px`
        }),
        p: common_vendor.t(theme.value.name),
        q: common_vendor.s(modePillStyle.value),
        r: common_vendor.t(campusDescription.value),
        s: common_vendor.s(accentTextStyle.value),
        t: common_vendor.o(goCampusPage, "79"),
        v: common_vendor.s(cardStyle.value),
        w: isCampusMode.value
      }, isCampusMode.value ? {
        x: common_vendor.s(accentTextStyle.value),
        y: common_vendor.o(goCanteenPage, "6d")
      } : {}, {
        z: common_vendor.t(historyCount.value),
        A: common_vendor.s(accentFillStyle.value),
        B: common_vendor.o(goHistoryPage, "85"),
        C: common_vendor.t(applicationCount.value),
        D: common_vendor.s(accentTextStyle.value),
        E: common_vendor.o(goJoinPage, "4d"),
        F: common_vendor.s(cardStyle.value),
        G: isCampusMode.value
      }, isCampusMode.value ? {
        H: common_vendor.t(currentCampus.value.name),
        I: common_vendor.s(serviceEntryStyle.value),
        J: common_vendor.o(goServicePage, "d5")
      } : {}, {
        K: showMbtiPopup.value
      }, showMbtiPopup.value ? {
        L: common_vendor.f(common_vendor.unref(common_data.mbtiCardOptions), (item, index, i0) => {
          return {
            a: common_vendor.t(item.emoji),
            b: common_vendor.t(item.value),
            c: common_vendor.s(selectorTitleStyle(pendingMbti.value === item.value)),
            d: common_vendor.t(item.officialName),
            e: common_vendor.s(selectorSubStyle(pendingMbti.value === item.value)),
            f: common_vendor.t(item.funAlias),
            g: common_vendor.s(selectorAliasStyle(pendingMbti.value === item.value)),
            h: item.value,
            i: common_vendor.s(selectorCardStyle(pendingMbti.value === item.value)),
            j: common_vendor.s(cardEntranceStyle(index)),
            k: common_vendor.o(($event) => pendingMbti.value = item.value, item.value)
          };
        }),
        M: common_vendor.o(cancelMbtiSelection, "ea"),
        N: common_vendor.s(accentFillStyle.value),
        O: common_vendor.o(confirmMbtiSelection, "b3"),
        P: common_vendor.s(sheetStyle.value),
        Q: common_vendor.o(() => {
        }, "24"),
        R: common_vendor.o(cancelMbtiSelection, "c9")
      } : {}, {
        S: showZodiacPopup.value
      }, showZodiacPopup.value ? {
        T: common_vendor.f(common_vendor.unref(common_data.zodiacCardOptions), (item, index, i0) => {
          return {
            a: common_vendor.t(item.emoji),
            b: common_vendor.t(item.value),
            c: common_vendor.s(selectorTitleStyle(pendingZodiac.value === item.value)),
            d: common_vendor.t(item.officialName),
            e: common_vendor.s(selectorSubStyle(pendingZodiac.value === item.value)),
            f: common_vendor.t(item.funAlias),
            g: common_vendor.s(selectorAliasStyle(pendingZodiac.value === item.value)),
            h: item.value,
            i: common_vendor.s(selectorCardStyle(pendingZodiac.value === item.value)),
            j: common_vendor.s(cardEntranceStyle(index)),
            k: common_vendor.o(($event) => pendingZodiac.value = item.value, item.value)
          };
        }),
        U: common_vendor.o(cancelZodiacSelection, "e3"),
        V: common_vendor.s(accentFillStyle.value),
        W: common_vendor.o(confirmZodiacSelection, "40"),
        X: common_vendor.s(sheetStyle.value),
        Y: common_vendor.o(() => {
        }, "22"),
        Z: common_vendor.o(cancelZodiacSelection, "1d")
      } : {}, {
        aa: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my/my.js.map
