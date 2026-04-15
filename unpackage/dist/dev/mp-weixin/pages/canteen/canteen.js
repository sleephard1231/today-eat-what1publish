"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_appState = require("../../utils/app-state.js");
const _sfc_main = {
  __name: "canteen",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getSystemInfoSync().statusBarHeight || 20;
    const state = common_vendor.ref(utils_appState.getAppState());
    const selectedCanteens = common_vendor.ref([]);
    const savedCanteens = common_vendor.ref([]);
    const refreshPage = () => {
      state.value = utils_appState.getAppState();
      const stored = utils_appState.getSelectedCanteen(state.value.campusId);
      savedCanteens.value = stored;
      selectedCanteens.value = [...stored];
    };
    common_vendor.onLoad(() => {
      refreshPage();
    });
    common_vendor.onShow(() => {
      refreshPage();
    });
    const theme = common_vendor.computed(() => utils_appState.getTheme(state.value.mode));
    const currentCampus = common_vendor.computed(() => utils_appState.getCampusById(state.value.campusId));
    const currentCampusLabel = common_vendor.computed(() => currentCampus.value.campusTag || (currentCampus.value.canteen || "校园版推荐"));
    const canteenList = common_vendor.computed(() => utils_appState.getCanteenListByCampusName(currentCampus.value.name));
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
    const ghostButtonStyle = common_vendor.computed(() => ({
      background: theme.value.accentSoft,
      color: theme.value.accent,
      border: `1px solid ${theme.value.border}`
    }));
    const saveButtonStyle = common_vendor.computed(() => ({
      background: "linear-gradient(135deg, #ff9c5b 0%, #ff7a34 100%)",
      color: "#ffffff",
      boxShadow: "0 18rpx 44rpx rgba(255, 138, 61, 0.18)"
    }));
    function canteenCardStyle(isActive) {
      return {
        background: isActive ? "linear-gradient(135deg, #ff9c5b 0%, #ff7a34 100%)" : theme.value.accentSoft,
        boxShadow: isActive ? "0 18rpx 44rpx rgba(255, 138, 61, 0.18)" : "none",
        border: `1px solid ${isActive ? "#ff8a3d" : theme.value.border}`
      };
    }
    function canteenTitleStyle(isActive) {
      return {
        color: isActive ? "#ffffff" : "#2f251d"
      };
    }
    function canteenSubStyle(isActive) {
      return {
        color: isActive ? "rgba(255,255,255,0.88)" : "#8f8278"
      };
    }
    function handleSelectCanteen(canteen) {
      const exists = selectedCanteens.value.some((item) => item.id === canteen.id);
      if (exists) {
        selectedCanteens.value = selectedCanteens.value.filter((item) => item.id !== canteen.id);
      } else {
        if (selectedCanteens.value.length >= 3) {
          common_vendor.index.showToast({
            title: "最多只能选择 3 个饭堂",
            icon: "none"
          });
          return;
        }
        selectedCanteens.value = [
          ...selectedCanteens.value,
          {
            id: canteen.id,
            name: canteen.name
          }
        ];
      }
      common_vendor.index.showToast({
        title: exists ? `已取消 ${canteen.name}` : `已选中 ${canteen.name}`,
        icon: "none"
      });
    }
    function handleClearSelection() {
      selectedCanteens.value = [];
      common_vendor.index.showToast({
        title: "已清空当前勾选",
        icon: "none"
      });
    }
    function isSelected(canteenId) {
      return selectedCanteens.value.some((item) => item.id === canteenId);
    }
    function handleSaveSelection() {
      const canteenNames = selectedCanteens.value.map((item) => item.name);
      const content = canteenNames.length ? `确认保存当前饭堂选择吗？
${canteenNames.join("、")}` : "确认清除当前饭堂保存结果吗？";
      common_vendor.index.showModal({
        title: "确认保存",
        content,
        confirmText: "保存",
        success: ({ confirm }) => {
          if (!confirm) {
            selectedCanteens.value = [...savedCanteens.value];
            return;
          }
          if (selectedCanteens.value.length) {
            utils_appState.saveSelectedCanteen(state.value.campusId, selectedCanteens.value);
          } else {
            utils_appState.clearSelectedCanteen(state.value.campusId);
          }
          savedCanteens.value = [...selectedCanteens.value];
          common_vendor.index.showToast({
            title: selectedCanteens.value.length ? "饭堂选择已保存" : "已清除饭堂保存结果",
            icon: "none"
          });
        }
      });
    }
    function goBack() {
      common_vendor.index.navigateBack();
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(goBack, "ca"),
        b: `${common_vendor.unref(statusBarHeight) + 12}px`,
        c: state.value.mode === "campus"
      }, state.value.mode === "campus" ? common_vendor.e({
        d: common_vendor.t(currentCampus.value.name),
        e: common_vendor.t(currentCampusLabel.value),
        f: canteenList.value.length
      }, canteenList.value.length ? {
        g: common_vendor.f(canteenList.value, (canteen, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(canteen.name),
            b: common_vendor.s(canteenTitleStyle(isSelected(canteen.id))),
            c: common_vendor.t(canteen.remark),
            d: common_vendor.s(canteenSubStyle(isSelected(canteen.id))),
            e: isSelected(canteen.id)
          }, isSelected(canteen.id) ? {} : {}, {
            f: canteen.id,
            g: common_vendor.s(canteenCardStyle(isSelected(canteen.id))),
            h: common_vendor.o(($event) => handleSelectCanteen(canteen), canteen.id)
          });
        })
      } : {}, {
        h: common_vendor.s(cardStyle.value)
      }) : {}, {
        i: state.value.mode === "campus"
      }, state.value.mode === "campus" ? {
        j: common_vendor.s(ghostButtonStyle.value),
        k: common_vendor.o(handleClearSelection, "eb"),
        l: common_vendor.s(saveButtonStyle.value),
        m: common_vendor.o(handleSaveSelection, "c6")
      } : {}, {
        n: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/canteen/canteen.js.map
