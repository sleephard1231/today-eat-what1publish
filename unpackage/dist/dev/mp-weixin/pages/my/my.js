"use strict";
const common_vendor = require("../../common/vendor.js");
const common_data = require("../../common/data.js");
const utils_appState = require("../../utils/app-state.js");
const utils_userState = require("../../utils/user-state.js");
const _sfc_main = {
  __name: "my",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getWindowInfo().statusBarHeight || 20;
    const menuButtonRect = typeof common_vendor.index.getMenuButtonBoundingClientRect === "function" ? common_vendor.index.getMenuButtonBoundingClientRect() : null;
    const state = common_vendor.ref(utils_appState.getAppState());
    const user = common_vendor.ref(utils_userState.getUser());
    const historyCount = common_vendor.ref(0);
    const applicationCount = common_vendor.ref(0);
    const showMbtiPopup = common_vendor.ref(false);
    const showZodiacPopup = common_vendor.ref(false);
    const showProfileSheet = common_vendor.ref(false);
    const showLoginSheet = common_vendor.ref(false);
    const isLoggingIn = common_vendor.ref(false);
    const loginForm = common_vendor.reactive({
      avatar: "",
      nickname: ""
    });
    const pendingMbti = common_vendor.ref(state.value.profile.mbti);
    const pendingZodiac = common_vendor.ref(state.value.profile.zodiac);
    function refreshState() {
      state.value = utils_appState.getAppState();
      user.value = utils_userState.getUser();
      historyCount.value = utils_appState.getHistoryList().length;
      applicationCount.value = utils_appState.getCampusApplications().length;
      pendingMbti.value = state.value.profile.mbti;
      pendingZodiac.value = state.value.profile.zodiac;
      utils_appState.applyTabBarTheme(state.value.mode);
    }
    function onUserStateChange() {
      user.value = utils_userState.getUser();
      refreshState();
    }
    common_vendor.onLoad(() => {
      refreshState();
      common_vendor.index.$on("user-state-changed", onUserStateChange);
      common_vendor.index.$on("app-state-changed", refreshState);
    });
    common_vendor.onShow(refreshState);
    common_vendor.onUnload(() => {
      common_vendor.index.$off("user-state-changed", onUserStateChange);
      common_vendor.index.$off("app-state-changed", refreshState);
    });
    const theme = common_vendor.computed(() => utils_appState.getTheme(state.value.mode));
    const currentCampus = common_vendor.computed(() => utils_appState.getCampusById(state.value.campusId));
    const currentMbtiCard = common_vendor.computed(() => common_data.mbtiCardOptions.find((item) => item.value === state.value.profile.mbti) || common_data.mbtiCardOptions[0]);
    const currentZodiacCard = common_vendor.computed(() => common_data.zodiacCardOptions.find((item) => item.value === state.value.profile.zodiac) || common_data.zodiacCardOptions[0]);
    const isCampusMode = common_vendor.computed(() => state.value.mode === "campus");
    const topCardMargin = common_vendor.computed(() => menuButtonRect ? menuButtonRect.top + menuButtonRect.height + 8 : statusBarHeight + 42);
    const profileHeadline = common_vendor.computed(() => `${currentZodiacCard.value.value} · ${currentMbtiCard.value.funAlias}`);
    const selectedCanteenText = common_vendor.computed(() => {
      const selected = utils_appState.getSelectedCanteen(state.value.campusId);
      return selected.length ? selected.map((item) => item.name).join("、") : "默认全校饭堂";
    });
    const campusDescription = common_vendor.computed(() => state.value.mode === "campus" ? selectedCanteenText.value : "普通版已开启，会优先推荐附近的人气选择。");
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
    const accentTextStyle = common_vendor.computed(() => ({ color: theme.value.accent }));
    const modePillStyle = common_vendor.computed(() => ({
      color: theme.value.accent,
      background: theme.value.accentSoft,
      border: `1px solid ${theme.value.border}`
    }));
    const pickerChipStyle = common_vendor.computed(() => ({ color: theme.value.accent }));
    const serviceEntryStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.cardStrong} 0%, ${theme.value.card} 100%)`,
      boxShadow: theme.value.shadow,
      border: `1px solid ${theme.value.border}`
    }));
    const serviceEntryActionStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
      boxShadow: theme.value.shadow,
      color: "#ffffff"
    }));
    const avatarShellStyle = common_vendor.computed(() => ({
      background: theme.value.accentSoft,
      border: `2rpx solid ${theme.value.border}`,
      boxShadow: state.value.mode === "campus" ? "0 10rpx 24rpx rgba(103, 182, 160, 0.18)" : "0 10rpx 24rpx rgba(255, 138, 61, 0.16)"
    }));
    const ghostButtonStyle = common_vendor.computed(() => ({
      background: theme.value.accentSoft,
      color: theme.value.accent,
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
      return { color: isActive ? "#ffffff" : "#33271f" };
    }
    function selectorSubStyle(isActive) {
      return { color: isActive ? "rgba(255,255,255,0.92)" : "#7f6f63" };
    }
    function selectorAliasStyle(isActive) {
      return { color: isActive ? "rgba(255,255,255,0.82)" : "#a59487" };
    }
    function cardEntranceStyle(index) {
      return { animationDelay: `${index * 100}ms` };
    }
    function handleProfileAreaClick() {
      if (user.value.isLoggedIn) {
        showProfileSheet.value = true;
      } else {
        showLoginSheet.value = true;
      }
    }
    function closeLoginSheet() {
      showLoginSheet.value = false;
    }
    function closeProfileSheet() {
      showProfileSheet.value = false;
    }
    function onChooseAvatar(e) {
      const avatarUrl = e.detail.avatarUrl;
      if (avatarUrl) {
        loginForm.avatar = avatarUrl;
      }
    }
    function onNicknameInput(e) {
      loginForm.nickname = e.detail.value || "";
    }
    async function handleLogin() {
      if (isLoggingIn.value)
        return;
      if (!loginForm.nickname.trim()) {
        common_vendor.index.showToast({ title: "请填写昵称", icon: "none" });
        return;
      }
      isLoggingIn.value = true;
      try {
        const result = await utils_userState.handleLogin({
          nickname: loginForm.nickname.trim(),
          avatar: loginForm.avatar
        });
        const loginMode = result.loginMode || "local";
        const data = result.data || {};
        utils_appState.saveAppState({
          profile: {
            nickname: loginForm.nickname.trim(),
            avatar: loginForm.avatar,
            openId: data.openid || ""
          }
        });
        user.value = utils_userState.getUser();
        state.value = utils_appState.getAppState();
        showLoginSheet.value = false;
        if (loginMode === "cloud") {
          common_vendor.index.showToast({ title: "登录成功", icon: "none" });
        } else {
          common_vendor.index.showToast({ title: "本地模式登录（云端不可用）", icon: "none" });
        }
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/my/my.vue:496", "handleLogin failed", error);
        common_vendor.index.showToast({ title: "登录失败，请重试", icon: "none" });
      } finally {
        isLoggingIn.value = false;
      }
    }
    function handleLogout() {
      common_vendor.index.showModal({
        title: "确定退出登录？",
        content: "退出后你的个性化推荐记录会保留",
        confirmText: "退出",
        success: (res) => {
          if (res.confirm) {
            utils_userState.clearUser();
            showProfileSheet.value = false;
            common_vendor.index.showToast({ title: "已退出登录", icon: "none" });
          }
        }
      });
    }
    function onChooseAvatarEdit(e) {
      const avatarUrl = e.detail.avatarUrl;
      if (avatarUrl) {
        utils_userState.saveUser({ avatar: avatarUrl });
        utils_appState.saveAppState({ profile: { avatar: avatarUrl } });
        utils_userState.syncProfileToCloud({ avatar: avatarUrl });
        user.value = utils_userState.getUser();
        common_vendor.index.showToast({ title: "头像已更新", icon: "none" });
      }
    }
    function onNicknameEdit(e) {
      const newNickname = (e.detail.value || "").trim();
      if (newNickname && newNickname !== user.value.nickname) {
        utils_userState.saveUser({ nickname: newNickname });
        utils_appState.saveAppState({ profile: { nickname: newNickname } });
        utils_userState.syncProfileToCloud({ nickname: newNickname });
        user.value = utils_userState.getUser();
        common_vendor.index.showToast({ title: "昵称已更新", icon: "none" });
      }
    }
    function openMbtiPopupFromSheet() {
      pendingMbti.value = state.value.profile.mbti;
      showProfileSheet.value = false;
      showMbtiPopup.value = true;
    }
    function openZodiacPopupFromSheet() {
      pendingZodiac.value = state.value.profile.zodiac;
      showProfileSheet.value = false;
      showZodiacPopup.value = true;
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
      state.value = utils_appState.saveAppState({ profile: { mbti: nextMbti } });
      pendingMbti.value = nextMbti;
      utils_userState.syncProfileToCloud({ profile: { mbti: nextMbti } });
      common_vendor.index.showToast({ title: `MBTI 已切换为 ${nextMbti}`, icon: "none" });
    }
    function handleZodiacChange(nextZodiac) {
      state.value = utils_appState.saveAppState({ profile: { zodiac: nextZodiac } });
      pendingZodiac.value = nextZodiac;
      utils_userState.syncProfileToCloud({ profile: { zodiac: nextZodiac } });
      common_vendor.index.showToast({ title: `星座已切换为 ${nextZodiac}`, icon: "none" });
    }
    function goCampusPage() {
      common_vendor.index.navigateTo({ url: "/pages/campus/select" });
    }
    function goHistoryPage() {
      if (!utils_userState.requireLogin({ content: "登录后才能查看你的历史记录。" })) {
        return;
      }
      common_vendor.index.navigateTo({ url: "/pages/history/index" });
    }
    function goCanteenPage() {
      common_vendor.index.navigateTo({ url: "/pages/canteen/canteen" });
    }
    function goServicePage() {
      common_vendor.index.navigateTo({ url: "/pages/service/service" });
    }
    function goJoinPage() {
      common_vendor.index.showToast({ title: "校园入驻功能待开放", icon: "none" });
    }
    function goPrivacyPolicy() {
      common_vendor.index.navigateTo({ url: "/pages/webview/index?url=privacy" });
    }
    function goUserAgreement() {
      common_vendor.index.navigateTo({ url: "/pages/webview/index?url=agreement" });
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: user.value.avatar
      }, user.value.avatar ? {
        b: user.value.avatar
      } : {
        c: common_vendor.s(accentFillStyle.value)
      }, {
        d: common_vendor.s(avatarShellStyle.value),
        e: common_vendor.t(user.value.isLoggedIn ? user.value.nickname : "点击授权微信登录"),
        f: common_vendor.t(profileHeadline.value),
        g: common_vendor.o(handleProfileAreaClick, "b6"),
        h: common_vendor.t(currentMbtiCard.value.emoji),
        i: common_vendor.t(currentMbtiCard.value.value),
        j: common_vendor.t(currentMbtiCard.value.funAlias),
        k: common_vendor.s(pickerChipStyle.value),
        l: common_vendor.o(openMbtiPopup, "d7"),
        m: common_vendor.t(currentZodiacCard.value.emoji),
        n: common_vendor.t(currentZodiacCard.value.value),
        o: common_vendor.t(currentZodiacCard.value.funAlias),
        p: common_vendor.s(pickerChipStyle.value),
        q: common_vendor.o(openZodiacPopup, "e5"),
        r: common_vendor.s(cardStyle.value),
        s: common_vendor.s({
          marginTop: `${topCardMargin.value}px`
        }),
        t: isCampusMode.value
      }, isCampusMode.value ? {
        v: common_vendor.s(modePillStyle.value)
      } : {}, {
        w: isCampusMode.value
      }, isCampusMode.value ? {
        x: common_vendor.t(currentCampus.value.name)
      } : {}, {
        y: common_vendor.t(campusDescription.value),
        z: common_vendor.s(accentTextStyle.value),
        A: common_vendor.o(goCampusPage, "6a"),
        B: common_vendor.s(cardStyle.value),
        C: common_vendor.t(historyCount.value),
        D: common_vendor.s(accentFillStyle.value),
        E: common_vendor.o(goHistoryPage, "2b"),
        F: common_vendor.s(cardStyle.value),
        G: isCampusMode.value
      }, isCampusMode.value ? {
        H: common_vendor.s(accentTextStyle.value),
        I: common_vendor.o(goCanteenPage, "b8"),
        J: common_vendor.s(accentFillStyle.value),
        K: common_vendor.o(goJoinPage, "79"),
        L: common_vendor.s(cardStyle.value),
        M: common_vendor.s(serviceEntryActionStyle.value),
        N: common_vendor.s(serviceEntryStyle.value),
        O: common_vendor.o(goServicePage, "bf")
      } : {}, {
        P: common_vendor.o(goPrivacyPolicy, "e3"),
        Q: common_vendor.o(goUserAgreement, "f5"),
        R: showLoginSheet.value
      }, showLoginSheet.value ? common_vendor.e({
        S: loginForm.avatar
      }, loginForm.avatar ? {
        T: loginForm.avatar
      } : {
        U: common_vendor.s(accentFillStyle.value)
      }, {
        V: common_vendor.s(avatarShellStyle.value),
        W: common_vendor.o(onChooseAvatar, "3f"),
        X: loginForm.nickname,
        Y: common_vendor.o(onNicknameInput, "0a"),
        Z: common_vendor.t(isLoggingIn.value ? "登录中..." : "登录"),
        aa: common_vendor.s(accentFillStyle.value),
        ab: isLoggingIn.value,
        ac: common_vendor.o(handleLogin, "48"),
        ad: common_vendor.s(sheetStyle.value),
        ae: common_vendor.o(() => {
        }, "0a"),
        af: common_vendor.o(closeLoginSheet, "13")
      }) : {}, {
        ag: showProfileSheet.value
      }, showProfileSheet.value ? common_vendor.e({
        ah: user.value.avatar
      }, user.value.avatar ? {
        ai: user.value.avatar
      } : {
        aj: common_vendor.s(accentFillStyle.value)
      }, {
        ak: common_vendor.o(onChooseAvatarEdit, "57"),
        al: user.value.nickname,
        am: common_vendor.o(onNicknameEdit, "6e"),
        an: common_vendor.t(currentMbtiCard.value.emoji),
        ao: common_vendor.t(currentMbtiCard.value.value),
        ap: common_vendor.t(currentMbtiCard.value.funAlias),
        aq: common_vendor.s(pickerChipStyle.value),
        ar: common_vendor.o(openMbtiPopupFromSheet, "24"),
        as: common_vendor.t(currentZodiacCard.value.emoji),
        at: common_vendor.t(currentZodiacCard.value.value),
        av: common_vendor.t(currentZodiacCard.value.funAlias),
        aw: common_vendor.s(pickerChipStyle.value),
        ax: common_vendor.o(openZodiacPopupFromSheet, "ca"),
        ay: common_vendor.s(ghostButtonStyle.value),
        az: common_vendor.o(handleLogout, "53"),
        aA: common_vendor.s(sheetStyle.value),
        aB: common_vendor.o(() => {
        }, "29"),
        aC: common_vendor.o(closeProfileSheet, "15")
      }) : {}, {
        aD: showMbtiPopup.value
      }, showMbtiPopup.value ? {
        aE: common_vendor.f(common_vendor.unref(common_data.mbtiCardOptions), (item, index, i0) => {
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
        aF: common_vendor.o(cancelMbtiSelection, "cd"),
        aG: common_vendor.s(accentFillStyle.value),
        aH: common_vendor.o(confirmMbtiSelection, "41"),
        aI: common_vendor.s(sheetStyle.value),
        aJ: common_vendor.o(() => {
        }, "80"),
        aK: common_vendor.o(cancelMbtiSelection, "be")
      } : {}, {
        aL: showZodiacPopup.value
      }, showZodiacPopup.value ? {
        aM: common_vendor.f(common_vendor.unref(common_data.zodiacCardOptions), (item, index, i0) => {
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
        aN: common_vendor.o(cancelZodiacSelection, "9c"),
        aO: common_vendor.s(accentFillStyle.value),
        aP: common_vendor.o(confirmZodiacSelection, "d5"),
        aQ: common_vendor.s(sheetStyle.value),
        aR: common_vendor.o(() => {
        }, "ab"),
        aS: common_vendor.o(cancelZodiacSelection, "e1")
      } : {}, {
        aT: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my/my.js.map
