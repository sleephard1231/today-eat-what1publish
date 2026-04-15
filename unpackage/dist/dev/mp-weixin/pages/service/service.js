"use strict";
const common_vendor = require("../../common/vendor.js");
const common_data = require("../../common/data.js");
const utils_appState = require("../../utils/app-state.js");
const _sfc_main = {
  __name: "service",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getSystemInfoSync().statusBarHeight || 20;
    const state = common_vendor.ref(utils_appState.getAppState());
    const refreshPage = () => {
      state.value = utils_appState.getAppState();
    };
    common_vendor.onLoad(refreshPage);
    common_vendor.onShow(refreshPage);
    const isCampusMode = common_vendor.computed(() => state.value.mode === "campus");
    const theme = common_vendor.computed(() => utils_appState.getTheme(state.value.mode));
    const currentCampus = common_vendor.computed(() => utils_appState.getCampusById(state.value.campusId));
    const serviceList = common_vendor.computed(() => common_data.campusServiceMap[currentCampus.value.name] || []);
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
    const iconWrapStyle = common_vendor.computed(() => ({
      background: theme.value.accentSoft,
      border: `1px solid ${theme.value.border}`
    }));
    function goBack() {
      common_vendor.index.navigateBack();
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(goBack, "ca"),
        b: `${common_vendor.unref(statusBarHeight) + 12}px`,
        c: common_vendor.t(isCampusMode.value ? `当前学校：${currentCampus.value.name}` : "当前还是普通模式"),
        d: common_vendor.t(isCampusMode.value ? "会按你当前选择的学校，自动展示对应的校园服务。" : "切换到校园模式后，这里才会出现学校专属服务。"),
        e: isCampusMode.value
      }, isCampusMode.value ? {
        f: common_vendor.t(currentCampus.value.name)
      } : {}, {
        g: common_vendor.s(cardStyle.value),
        h: isCampusMode.value && serviceList.value.length
      }, isCampusMode.value && serviceList.value.length ? {
        i: common_vendor.f(serviceList.value, (service, k0, i0) => {
          return {
            a: common_vendor.t(service.icon),
            b: common_vendor.t(service.name),
            c: common_vendor.t(service.remark),
            d: service.id
          };
        }),
        j: common_vendor.s(iconWrapStyle.value),
        k: common_vendor.s(cardStyle.value)
      } : {
        l: common_vendor.t(isCampusMode.value ? "这所学校暂时还没有校园服务" : "校园服务仅在校园模式下显示"),
        m: common_vendor.t(isCampusMode.value ? "后面接入后台后，这里会按学校自动补齐更多服务内容。" : "你可以先去切换校园版，再回来看看学校专属服务。"),
        n: common_vendor.s(cardStyle.value)
      }, {
        o: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/service/service.js.map
