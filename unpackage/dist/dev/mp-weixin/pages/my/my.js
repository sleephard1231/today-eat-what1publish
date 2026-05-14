"use strict";
const common_vendor = require("../../common/vendor.js");
const common_data = require("../../common/data.js");
const utils_appState = require("../../utils/app-state.js");
const utils_privacyState = require("../../utils/privacy-state.js");
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
    const loginAgreementChecked = common_vendor.ref(utils_privacyState.hasAgreedPrivacy());
    const pendingMbti = common_vendor.ref(state.value.profile.mbti);
    const pendingZodiac = common_vendor.ref(state.value.profile.zodiac);
    function refreshState() {
      state.value = utils_appState.getAppState();
      user.value = utils_userState.getUser();
      historyCount.value = utils_appState.getHistoryList().length;
      applicationCount.value = utils_appState.getCampusApplications().length;
      loginAgreementChecked.value = utils_privacyState.hasAgreedPrivacy();
      pendingMbti.value = state.value.profile.mbti;
      pendingZodiac.value = state.value.profile.zodiac;
      utils_appState.applyTabBarTheme(state.value.mode);
    }
    function openLoginSheetIfNeeded() {
      if (!utils_userState.isCloudUser() && utils_userState.consumeLoginIntent()) {
        showLoginSheet.value = true;
      }
    }
    function onUserStateChange() {
      user.value = utils_userState.getUser();
      refreshState();
    }
    let hasLoaded = false;
    common_vendor.onLoad(() => {
      refreshState();
      openLoginSheetIfNeeded();
      common_vendor.index.$on("user-state-changed", onUserStateChange);
      common_vendor.index.$on("app-state-changed", refreshState);
    });
    common_vendor.onShow(() => {
      if (!hasLoaded) {
        hasLoaded = true;
        return;
      }
      refreshState();
      openLoginSheetIfNeeded();
    });
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
    const loginStatus = common_vendor.computed(() => utils_userState.getLoginStatusMeta());
    const loginStatusLabel = common_vendor.computed(() => loginStatus.value.label);
    const loginStatusDescription = common_vendor.computed(() => user.value.isLoggedIn ? loginStatus.value.description : "登录后才能同步历史、使用 AI 和云端能力。");
    const selectedCanteenText = common_vendor.computed(() => {
      const selected = utils_appState.getSelectedCanteen(state.value.campusId);
      return selected.length ? selected.map((item) => item.name).join("、") : "默认全校饭堂";
    });
    const campusDescription = common_vendor.computed(() => state.value.mode === "campus" ? selectedCanteenText.value : "普通版已开启，会优先推荐附近的人气选择。");
    const openedCampusServiceTags = common_vendor.computed(() => {
      if (!isCampusMode.value)
        return [];
      const services = common_data.campusServiceMap[currentCampus.value.name] || [];
      return services.slice(0, 4).map((item) => item.name);
    });
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
    const canSubmitLogin = common_vendor.computed(() => Boolean(loginAgreementChecked.value && loginForm.nickname.trim()));
    const disabledLoginButtonStyle = common_vendor.computed(() => ({
      background: "#f0d8c6",
      color: "rgba(255,255,255,0.9)",
      boxShadow: "none"
    }));
    const loginAgreementCheckStyle = common_vendor.computed(() => ({
      border: `1px solid ${theme.value.border}`,
      background: "rgba(255,255,255,0.82)",
      color: theme.value.accent
    }));
    const loginModeTextStyle = common_vendor.computed(() => ({
      color: loginStatus.value.isCloudUser ? theme.value.accent : "#c78357"
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
    function toggleLoginAgreement() {
      loginAgreementChecked.value = !loginAgreementChecked.value;
    }
    async function handleLogin() {
      if (isLoggingIn.value)
        return;
      if (!canSubmitLogin.value) {
        return;
      }
      if (!utils_privacyState.hasAgreedPrivacy()) {
        utils_privacyState.agreePrivacy();
      }
      isLoggingIn.value = true;
      try {
        const avatar = await utils_userState.uploadAvatarToCloud(loginForm.avatar);
        if (loginForm.avatar && !avatar) {
          common_vendor.index.showToast({ title: "头像上传失败，请重新选择", icon: "none" });
          return;
        }
        const result = await utils_userState.handleLogin({
          nickname: loginForm.nickname.trim(),
          avatar
        });
        const loginMode = result.loginMode || "local";
        const data = result.data || {};
        utils_appState.saveAppState({
          profile: {
            nickname: loginForm.nickname.trim(),
            avatar,
            openId: data.openid || ""
          }
        });
        user.value = utils_userState.getUser();
        state.value = utils_appState.getAppState();
        showLoginSheet.value = false;
        if (loginMode === "cloud") {
          common_vendor.index.showToast({ title: "登录成功", icon: "none" });
        } else {
          const fallbackMsg = result.fallbackMsg || "云端登录暂时不可用";
          common_vendor.index.showModal({
            title: "已切到本地模式",
            content: `云端登录失败：${fallbackMsg}。这次先用本地模式顶一下，所以 AI、校园申请和云端同步暂时还不能用。`,
            showCancel: false,
            confirmText: "知道了"
          });
        }
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/my/my.vue:577", "handleLogin failed", error);
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
        utils_userState.uploadAvatarToCloud(avatarUrl).then((avatar) => {
          if (!avatar) {
            common_vendor.index.showToast({ title: "头像上传失败，请重新选择", icon: "none" });
            return;
          }
          utils_userState.saveUser({ avatar });
          utils_appState.saveAppState({ profile: { avatar } });
          utils_userState.syncProfileToCloud({ avatar });
          user.value = utils_userState.getUser();
          common_vendor.index.showToast({ title: "头像已更新", icon: "none" });
        });
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
      if (!utils_userState.requireLogin({
        cloudOnly: true,
        content: "登录后才能提交校园入驻申请。"
      })) {
        return;
      }
      common_vendor.index.navigateTo({ url: "/pages/campus/join" });
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
        f: user.value.isLoggedIn
      }, user.value.isLoggedIn ? {
        g: common_vendor.t(loginStatusLabel.value),
        h: common_vendor.s(loginModeTextStyle.value)
      } : {}, {
        i: common_vendor.t(profileHeadline.value),
        j: common_vendor.t(loginStatusDescription.value),
        k: common_vendor.o(handleProfileAreaClick, "b6"),
        l: common_vendor.t(currentMbtiCard.value.emoji),
        m: common_vendor.t(currentMbtiCard.value.value),
        n: common_vendor.t(currentMbtiCard.value.funAlias),
        o: common_vendor.s(pickerChipStyle.value),
        p: common_vendor.o(openMbtiPopup, "91"),
        q: common_vendor.t(currentZodiacCard.value.emoji),
        r: common_vendor.t(currentZodiacCard.value.value),
        s: common_vendor.t(currentZodiacCard.value.funAlias),
        t: common_vendor.s(pickerChipStyle.value),
        v: common_vendor.o(openZodiacPopup, "15"),
        w: common_vendor.s(cardStyle.value),
        x: common_vendor.s({
          marginTop: `${topCardMargin.value}px`
        }),
        y: isCampusMode.value
      }, isCampusMode.value ? {
        z: common_vendor.s(modePillStyle.value)
      } : {}, {
        A: isCampusMode.value
      }, isCampusMode.value ? {
        B: common_vendor.t(currentCampus.value.name)
      } : {}, {
        C: common_vendor.t(campusDescription.value),
        D: common_vendor.s(accentTextStyle.value),
        E: common_vendor.o(goCampusPage, "d5"),
        F: common_vendor.s(cardStyle.value),
        G: isCampusMode.value
      }, isCampusMode.value ? common_vendor.e({
        H: openedCampusServiceTags.value.length
      }, openedCampusServiceTags.value.length ? {
        I: common_vendor.f(openedCampusServiceTags.value, (tag, k0, i0) => {
          return {
            a: common_vendor.t(tag),
            b: tag
          };
        })
      } : {}, {
        J: common_vendor.s(serviceEntryActionStyle.value),
        K: common_vendor.s(serviceEntryStyle.value),
        L: common_vendor.o(goServicePage, "88")
      }) : {}, {
        M: common_vendor.t(historyCount.value),
        N: common_vendor.s(accentFillStyle.value),
        O: common_vendor.o(goHistoryPage, "ae"),
        P: common_vendor.s(cardStyle.value),
        Q: isCampusMode.value
      }, isCampusMode.value ? {
        R: common_vendor.s(accentTextStyle.value),
        S: common_vendor.o(goCanteenPage, "7f"),
        T: common_vendor.s(accentTextStyle.value),
        U: common_vendor.o(goJoinPage, "15"),
        V: common_vendor.s(cardStyle.value)
      } : {}, {
        W: common_vendor.o(goPrivacyPolicy, "86"),
        X: common_vendor.o(goUserAgreement, "b9"),
        Y: showLoginSheet.value
      }, showLoginSheet.value ? common_vendor.e({
        Z: loginForm.avatar
      }, loginForm.avatar ? {
        aa: loginForm.avatar
      } : {
        ab: common_vendor.s(accentFillStyle.value)
      }, {
        ac: common_vendor.s(avatarShellStyle.value),
        ad: common_vendor.o(onChooseAvatar, "be"),
        ae: loginForm.nickname,
        af: common_vendor.o(onNicknameInput, "b6"),
        ag: common_vendor.t(loginAgreementChecked.value ? "✓" : ""),
        ah: common_vendor.s(loginAgreementChecked.value ? accentFillStyle.value : loginAgreementCheckStyle.value),
        ai: common_vendor.o(goPrivacyPolicy, "87"),
        aj: common_vendor.o(goUserAgreement, "13"),
        ak: common_vendor.o(toggleLoginAgreement, "9d"),
        al: common_vendor.t(isLoggingIn.value ? "登录中..." : "登录"),
        am: common_vendor.s(canSubmitLogin.value ? accentFillStyle.value : disabledLoginButtonStyle.value),
        an: isLoggingIn.value,
        ao: !canSubmitLogin.value || isLoggingIn.value,
        ap: common_vendor.o(handleLogin, "40"),
        aq: common_vendor.s(sheetStyle.value),
        ar: common_vendor.o(() => {
        }, "5c"),
        as: common_vendor.o(closeLoginSheet, "88")
      }) : {}, {
        at: showProfileSheet.value
      }, showProfileSheet.value ? common_vendor.e({
        av: user.value.avatar
      }, user.value.avatar ? {
        aw: user.value.avatar
      } : {
        ax: common_vendor.s(accentFillStyle.value)
      }, {
        ay: common_vendor.o(onChooseAvatarEdit, "9b"),
        az: user.value.nickname,
        aA: common_vendor.o(onNicknameEdit, "79"),
        aB: common_vendor.t(currentMbtiCard.value.emoji),
        aC: common_vendor.t(currentMbtiCard.value.value),
        aD: common_vendor.t(currentMbtiCard.value.funAlias),
        aE: common_vendor.s(pickerChipStyle.value),
        aF: common_vendor.o(openMbtiPopupFromSheet, "24"),
        aG: common_vendor.t(currentZodiacCard.value.emoji),
        aH: common_vendor.t(currentZodiacCard.value.value),
        aI: common_vendor.t(currentZodiacCard.value.funAlias),
        aJ: common_vendor.s(pickerChipStyle.value),
        aK: common_vendor.o(openZodiacPopupFromSheet, "84"),
        aL: common_vendor.s(ghostButtonStyle.value),
        aM: common_vendor.o(handleLogout, "30"),
        aN: common_vendor.s(sheetStyle.value),
        aO: common_vendor.o(() => {
        }, "02"),
        aP: common_vendor.o(closeProfileSheet, "80")
      }) : {}, {
        aQ: showMbtiPopup.value
      }, showMbtiPopup.value ? {
        aR: common_vendor.f(common_vendor.unref(common_data.mbtiCardOptions), (item, index, i0) => {
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
        aS: common_vendor.o(cancelMbtiSelection, "81"),
        aT: common_vendor.s(accentFillStyle.value),
        aU: common_vendor.o(confirmMbtiSelection, "78"),
        aV: common_vendor.s(sheetStyle.value),
        aW: common_vendor.o(() => {
        }, "65"),
        aX: common_vendor.o(cancelMbtiSelection, "52")
      } : {}, {
        aY: showZodiacPopup.value
      }, showZodiacPopup.value ? {
        aZ: common_vendor.f(common_vendor.unref(common_data.zodiacCardOptions), (item, index, i0) => {
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
        ba: common_vendor.o(cancelZodiacSelection, "51"),
        bb: common_vendor.s(accentFillStyle.value),
        bc: common_vendor.o(confirmZodiacSelection, "74"),
        bd: common_vendor.s(sheetStyle.value),
        be: common_vendor.o(() => {
        }, "f0"),
        bf: common_vendor.o(cancelZodiacSelection, "9a")
      } : {}, {
        bg: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my/my.js.map
