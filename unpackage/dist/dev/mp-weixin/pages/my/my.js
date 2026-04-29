"use strict";
const common_vendor = require("../../common/vendor.js");
const common_data = require("../../common/data.js");
const utils_appState = require("../../utils/app-state.js");
const utils_userState = require("../../utils/user-state.js");
const utils_cloud = require("../../utils/cloud.js");
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
        common_vendor.index.__f__("warn", "at pages/my/my.vue:530", "handleLogin failed", error);
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
    async function handleInitAdminMenus() {
      common_vendor.index.showModal({
        title: "初始化后台菜单",
        content: "确定要向数据库插入自定义菜单吗？（已存在的会跳过）",
        success: async (res) => {
          if (!res.confirm)
            return;
          common_vendor.index.showLoading({ title: "正在初始化..." });
          try {
            const result = await utils_cloud.cloudInitAdminMenus();
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({ title: result.msg, icon: "none", duration: 3e3 });
            common_vendor.index.__f__("log", "at pages/my/my.vue:671", "[dev] initAdminMenus:", result);
          } catch (err) {
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({ title: "初始化失败：" + (err.message || err), icon: "none", duration: 3e3 });
          }
        }
      });
    }
    async function handleFixAdminMenusUrl() {
      common_vendor.index.showModal({
        title: "修复菜单 URL",
        content: "确定要将后台菜单的旧路径更新为 /pages/eat-what/xxx/list 吗？",
        success: async (res) => {
          var _a;
          if (!res.confirm)
            return;
          common_vendor.index.showLoading({ title: "正在修复..." });
          try {
            const result = await utils_cloud.cloudFixAdminMenusUrl();
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({ title: result.msg, icon: "none", duration: 3e3 });
            common_vendor.index.__f__("log", "at pages/my/my.vue:691", "[dev] fixAdminMenusUrl:", ((_a = result.data) == null ? void 0 : _a.details) || result.msg);
          } catch (err) {
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({ title: "修复失败：" + (err.message || err), icon: "none", duration: 3e3 });
          }
        }
      });
    }
    async function handleRunDiagnostics() {
      common_vendor.index.showLoading({ title: "正在诊断..." });
      try {
        const result = await utils_cloud.cloudRunDiagnostics();
        common_vendor.index.hideLoading();
        if (result.code !== 0) {
          common_vendor.index.showToast({ title: result.msg || "诊断失败", icon: "none", duration: 3e3 });
          return;
        }
        const d = result.data;
        const lines = [];
        lines.push("=== 数据库表 ===");
        for (const [col, info] of Object.entries(d.database)) {
          const icon = info.status === "ok" ? "✅" : "❌";
          const extra = info.status === "ok" ? ` (${info.count}条)` : ` ${info.error}`;
          lines.push(`${icon} ${info.label}${extra}`);
        }
        lines.push("\n=== Admin 菜单 ===");
        for (const [id, info] of Object.entries(d.adminMenus)) {
          if (id === "_summary")
            continue;
          if (info.status === "ok") {
            lines.push(`✅ ${info.name}`);
          } else if (info.status === "missing") {
            lines.push(`❌ ${info.name} - 记录不存在`);
          } else if (info.status === "url_mismatch") {
            lines.push(`⚠️ ${info.name} - URL不对: ${info.currentUrl} → 应为 ${info.expectedUrl}`);
          } else {
            lines.push(`❌ ${info.name} - ${info.error}`);
          }
        }
        const menuSummary = d.adminMenus._summary;
        lines.push(`
菜单: ${menuSummary.ok}/${menuSummary.total} 正常, ${menuSummary.issue} 异常`);
        common_vendor.index.showModal({
          title: "🩺 诊断报告",
          content: lines.join("\n"),
          showCancel: false,
          confirmText: "知道了"
        });
        common_vendor.index.__f__("log", "at pages/my/my.vue:748", "[diagnostics] full report:", JSON.stringify(d, null, 2));
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "诊断失败：" + (err.message || err), icon: "none", duration: 3e3 });
      }
    }
    async function handleInitBaseData() {
      common_vendor.index.showModal({
        title: "初始化基础数据",
        content: "确定要将预设的广州商学院、7个饭堂、5个服务写入数据库吗？已存在的会跳过。",
        success: async (res) => {
          if (!res.confirm)
            return;
          common_vendor.index.showLoading({ title: "正在初始化..." });
          try {
            const result = await utils_cloud.cloudInitBaseData();
            common_vendor.index.hideLoading();
            if (result.code === 0) {
              const d = result.data;
              const msg = [
                `校园：新增 ${d.campus.added}，跳过 ${d.campus.skipped}`,
                `饭堂：新增 ${d.canteen.added}，跳过 ${d.canteen.skipped}`,
                `服务：新增 ${d.service.added}，跳过 ${d.service.skipped}`,
                "\n请刷新 admin 后台查看！"
              ].join("\n");
              common_vendor.index.showModal({
                title: "初始化完成",
                content: msg,
                showCancel: false,
                confirmText: "好的"
              });
            } else {
              common_vendor.index.showToast({ title: result.msg || "初始化失败", icon: "none", duration: 3e3 });
            }
            common_vendor.index.__f__("log", "at pages/my/my.vue:782", "[dev] initBaseData:", result);
          } catch (err) {
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({ title: "初始化失败：" + (err.message || err), icon: "none", duration: 3e3 });
          }
        }
      });
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
        P: common_vendor.s(accentTextStyle.value),
        Q: common_vendor.o(handleInitAdminMenus, "97"),
        R: common_vendor.s(accentTextStyle.value),
        S: common_vendor.o(handleFixAdminMenusUrl, "cc"),
        T: common_vendor.s(accentTextStyle.value),
        U: common_vendor.o(handleRunDiagnostics, "0c"),
        V: common_vendor.s(accentTextStyle.value),
        W: common_vendor.o(handleInitBaseData, "31"),
        X: common_vendor.s(cardStyle.value),
        Y: common_vendor.o(goPrivacyPolicy, "3b"),
        Z: common_vendor.o(goUserAgreement, "16"),
        aa: showLoginSheet.value
      }, showLoginSheet.value ? common_vendor.e({
        ab: loginForm.avatar
      }, loginForm.avatar ? {
        ac: loginForm.avatar
      } : {
        ad: common_vendor.s(accentFillStyle.value)
      }, {
        ae: common_vendor.s(avatarShellStyle.value),
        af: common_vendor.o(onChooseAvatar, "a2"),
        ag: loginForm.nickname,
        ah: common_vendor.o(onNicknameInput, "bd"),
        ai: common_vendor.t(isLoggingIn.value ? "登录中..." : "登录"),
        aj: common_vendor.s(accentFillStyle.value),
        ak: isLoggingIn.value,
        al: common_vendor.o(handleLogin, "ee"),
        am: common_vendor.s(sheetStyle.value),
        an: common_vendor.o(() => {
        }, "7d"),
        ao: common_vendor.o(closeLoginSheet, "99")
      }) : {}, {
        ap: showProfileSheet.value
      }, showProfileSheet.value ? common_vendor.e({
        aq: user.value.avatar
      }, user.value.avatar ? {
        ar: user.value.avatar
      } : {
        as: common_vendor.s(accentFillStyle.value)
      }, {
        at: common_vendor.o(onChooseAvatarEdit, "85"),
        av: user.value.nickname,
        aw: common_vendor.o(onNicknameEdit, "20"),
        ax: common_vendor.t(currentMbtiCard.value.emoji),
        ay: common_vendor.t(currentMbtiCard.value.value),
        az: common_vendor.t(currentMbtiCard.value.funAlias),
        aA: common_vendor.s(pickerChipStyle.value),
        aB: common_vendor.o(openMbtiPopupFromSheet, "51"),
        aC: common_vendor.t(currentZodiacCard.value.emoji),
        aD: common_vendor.t(currentZodiacCard.value.value),
        aE: common_vendor.t(currentZodiacCard.value.funAlias),
        aF: common_vendor.s(pickerChipStyle.value),
        aG: common_vendor.o(openZodiacPopupFromSheet, "3a"),
        aH: common_vendor.s(ghostButtonStyle.value),
        aI: common_vendor.o(handleLogout, "c4"),
        aJ: common_vendor.s(sheetStyle.value),
        aK: common_vendor.o(() => {
        }, "63"),
        aL: common_vendor.o(closeProfileSheet, "3c")
      }) : {}, {
        aM: showMbtiPopup.value
      }, showMbtiPopup.value ? {
        aN: common_vendor.f(common_vendor.unref(common_data.mbtiCardOptions), (item, index, i0) => {
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
        aO: common_vendor.o(cancelMbtiSelection, "3c"),
        aP: common_vendor.s(accentFillStyle.value),
        aQ: common_vendor.o(confirmMbtiSelection, "5a"),
        aR: common_vendor.s(sheetStyle.value),
        aS: common_vendor.o(() => {
        }, "cf"),
        aT: common_vendor.o(cancelMbtiSelection, "af")
      } : {}, {
        aU: showZodiacPopup.value
      }, showZodiacPopup.value ? {
        aV: common_vendor.f(common_vendor.unref(common_data.zodiacCardOptions), (item, index, i0) => {
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
        aW: common_vendor.o(cancelZodiacSelection, "43"),
        aX: common_vendor.s(accentFillStyle.value),
        aY: common_vendor.o(confirmZodiacSelection, "5c"),
        aZ: common_vendor.s(sheetStyle.value),
        ba: common_vendor.o(() => {
        }, "3e"),
        bb: common_vendor.o(cancelZodiacSelection, "5a")
      } : {}, {
        bc: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my/my.js.map
