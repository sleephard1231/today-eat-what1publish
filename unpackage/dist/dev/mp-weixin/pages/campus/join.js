"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_appState = require("../../utils/app-state.js");
const _sfc_main = {
  __name: "join",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getSystemInfoSync().statusBarHeight || 20;
    const state = common_vendor.ref(utils_appState.getAppState());
    const form = common_vendor.reactive({
      campusName: "",
      campusTag: "",
      city: "",
      contactName: "",
      contact: ""
    });
    common_vendor.onLoad(() => {
      state.value = utils_appState.getAppState();
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
    const accentFillStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
      boxShadow: theme.value.shadow,
      color: "#ffffff"
    }));
    function submitForm() {
      if (!form.campusName || !form.contact) {
        common_vendor.index.showToast({
          title: "请至少填校园名称和联系方式",
          icon: "none"
        });
        return;
      }
      utils_appState.submitCampusApplication({
        ...form
      });
      common_vendor.index.showToast({
        title: "已提交，当前状态为待审核",
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
      return {
        a: common_vendor.o(goBack, "ca"),
        b: `${common_vendor.unref(statusBarHeight) + 12}px`,
        c: common_vendor.s(cardStyle.value),
        d: form.campusName,
        e: common_vendor.o(($event) => form.campusName = $event.detail.value, "4a"),
        f: form.campusTag,
        g: common_vendor.o(($event) => form.campusTag = $event.detail.value, "c7"),
        h: form.city,
        i: common_vendor.o(($event) => form.city = $event.detail.value, "0a"),
        j: form.contactName,
        k: common_vendor.o(($event) => form.contactName = $event.detail.value, "57"),
        l: form.contact,
        m: common_vendor.o(($event) => form.contact = $event.detail.value, "66"),
        n: common_vendor.s(cardStyle.value),
        o: common_vendor.s(accentFillStyle.value),
        p: common_vendor.o(submitForm, "f7"),
        q: common_vendor.s(pageStyle.value)
      };
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/campus/join.js.map
