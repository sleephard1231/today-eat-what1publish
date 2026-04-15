"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_appState = require("../../utils/app-state.js");
const _sfc_main = {
  __name: "join",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getSystemInfoSync().statusBarHeight || 20;
    const state = common_vendor.ref(utils_appState.getAppState());
    const isDraftSaved = common_vendor.ref(false);
    const form = common_vendor.reactive({
      campusName: "",
      campusTag: "",
      city: "",
      contactName: "",
      contact: ""
    });
    common_vendor.onLoad(() => {
      state.value = utils_appState.getAppState();
      hydrateDraft();
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
    const statusCardStyle = common_vendor.computed(() => ({
      background: theme.value.accentSoft,
      boxShadow: theme.value.shadow,
      border: `1px solid ${theme.value.border}`
    }));
    const accentFillStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
      boxShadow: theme.value.shadow,
      color: "#ffffff"
    }));
    function hydrateDraft() {
      const draft = utils_appState.getCampusApplicationDraft();
      if (!draft) {
        return;
      }
      form.campusName = draft.campusName || "";
      form.campusTag = draft.campusTag || "";
      form.city = draft.city || "";
      form.contactName = draft.contactName || "";
      form.contact = draft.contact || "";
      isDraftSaved.value = Boolean(draft.campusName || draft.contact);
    }
    function markDraftDirty() {
      if (isDraftSaved.value) {
        isDraftSaved.value = false;
      }
    }
    function validateForm() {
      if (!form.campusName || !form.contact) {
        common_vendor.index.showToast({
          title: "请至少填校园名称和联系方式",
          icon: "none"
        });
        return false;
      }
      return true;
    }
    function submitForm() {
      if (!validateForm()) {
        return;
      }
      if (!isDraftSaved.value) {
        utils_appState.saveCampusApplicationDraft({ ...form });
        isDraftSaved.value = true;
        common_vendor.index.showToast({
          title: "已保存，再点一次才会提交",
          icon: "none"
        });
        return;
      }
      utils_appState.submitCampusApplication({
        ...form
      });
      utils_appState.clearCampusApplicationDraft();
      common_vendor.index.showToast({
        title: "已提交到后台，当前为待审核",
        icon: "none"
      });
      setTimeout(() => {
        common_vendor.index.navigateBack();
      }, 500);
    }
    function goBack() {
      common_vendor.index.navigateBack();
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(goBack, "ca"),
        b: `${common_vendor.unref(statusBarHeight) + 12}px`,
        c: common_vendor.s(cardStyle.value),
        d: isDraftSaved.value
      }, isDraftSaved.value ? {
        e: common_vendor.s(statusCardStyle.value)
      } : {}, {
        f: common_vendor.o([($event) => form.campusName = $event.detail.value, markDraftDirty], "a4"),
        g: form.campusName,
        h: common_vendor.o([($event) => form.campusTag = $event.detail.value, markDraftDirty], "f9"),
        i: form.campusTag,
        j: common_vendor.o([($event) => form.city = $event.detail.value, markDraftDirty], "84"),
        k: form.city,
        l: common_vendor.o([($event) => form.contactName = $event.detail.value, markDraftDirty], "8e"),
        m: form.contactName,
        n: common_vendor.o([($event) => form.contact = $event.detail.value, markDraftDirty], "aa"),
        o: form.contact,
        p: common_vendor.s(cardStyle.value),
        q: common_vendor.t(isDraftSaved.value ? "提交到后台" : "保存申请内容"),
        r: common_vendor.s(accentFillStyle.value),
        s: common_vendor.o(submitForm, "45"),
        t: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/campus/join.js.map
