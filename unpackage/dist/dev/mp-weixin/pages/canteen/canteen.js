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
    common_vendor.onLoad(refreshPage);
    common_vendor.onShow(refreshPage);
    const theme = common_vendor.computed(() => utils_appState.getTheme(state.value.mode));
    const currentCampus = common_vendor.computed(() => utils_appState.getCampusById(state.value.campusId));
    const currentCampusLabel = common_vendor.computed(() => currentCampus.value.campusTag || "校园版");
    const canteenList = common_vendor.computed(() => utils_appState.getCanteenListByCampusName(currentCampus.value.name));
    function normalizeSelection(list) {
      return [...list].map((item) => item.id).sort().join("|");
    }
    const hasPendingChanges = common_vendor.computed(() => normalizeSelection(selectedCanteens.value) !== normalizeSelection(savedCanteens.value));
    const selectionStatusText = common_vendor.computed(() => hasPendingChanges.value ? "未保存" : "已保存");
    const selectionStateTitle = common_vendor.computed(() => {
      if (!selectedCanteens.value.length)
        return "当前未限制饭堂，默认全校可推荐";
      return `当前选了 ${selectedCanteens.value.length} 个饭堂`;
    });
    const selectionStateDesc = common_vendor.computed(() => {
      if (hasPendingChanges.value) {
        return selectedCanteens.value.length ? `你刚改了范围，记得点保存后才会正式生效：${selectedCanteens.value.map((item) => item.name).join("、")}` : "你刚恢复成默认范围，记得点保存后才会正式生效。";
      }
      if (!savedCanteens.value.length) {
        return "当前已经生效：系统会在这所学校的全部饭堂范围内为你推荐。";
      }
      return `当前已经生效：AI 会优先在 ${savedCanteens.value.map((item) => item.name).join("、")} 里推荐。`;
    });
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
    const selectionAccent = common_vendor.computed(() => theme.value.accent);
    const selectionSoft = common_vendor.computed(() => theme.value.accentSoft);
    const selectionStateStyle = common_vendor.computed(() => ({
      background: hasPendingChanges.value ? selectionSoft.value : "rgba(255, 255, 255, 0.82)",
      border: `1px solid ${hasPendingChanges.value ? selectionAccent.value : theme.value.border}`
    }));
    const selectionStatusBadgeStyle = common_vendor.computed(() => ({
      background: hasPendingChanges.value ? selectionSoft.value : "rgba(255, 255, 255, 0.9)",
      color: selectionAccent.value,
      border: `1px solid ${hasPendingChanges.value ? selectionAccent.value : theme.value.border}`
    }));
    const ghostButtonStyle = common_vendor.computed(() => ({
      background: theme.value.accentSoft,
      color: theme.value.accent,
      border: `1px solid ${theme.value.border}`
    }));
    const canteenGlowStyle = common_vendor.computed(() => ({
      background: `radial-gradient(circle, ${theme.value.accent}30 0%, ${theme.value.accent}00 72%)`
    }));
    const saveButtonStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
      color: "#ffffff",
      boxShadow: theme.value.shadow
    }));
    function canteenCardStyle(isActive) {
      return {
        position: "relative",
        overflow: "hidden",
        background: isActive ? selectionSoft.value : "#ffffff",
        boxShadow: isActive ? theme.value.shadow : "0 10rpx 24rpx rgba(43, 34, 27, 0.04)",
        border: `1px solid ${isActive ? selectionAccent.value : "rgba(187, 186, 181, 0.35)"}`,
        transform: isActive ? "translateY(-2rpx)" : "translateY(0)"
      };
    }
    function canteenTitleStyle(isActive) {
      return { color: isActive ? selectionAccent.value : "#2f251d" };
    }
    function canteenSubStyle(isActive) {
      return { color: isActive ? selectionAccent.value : "#8f8278" };
    }
    function canteenBadgeStyle(isActive) {
      return {
        background: isActive ? selectionAccent.value : selectionSoft.value,
        color: isActive ? "#ffffff" : selectionAccent.value,
        border: `1px solid ${isActive ? selectionAccent.value : "transparent"}`
      };
    }
    function handleSelectCanteen(canteen) {
      const exists = selectedCanteens.value.some((item) => item.id === canteen.id);
      if (exists) {
        selectedCanteens.value = selectedCanteens.value.filter((item) => item.id !== canteen.id);
        return;
      }
      selectedCanteens.value = [...selectedCanteens.value, { id: canteen.id, name: canteen.name }];
    }
    function handleClearSelection() {
      selectedCanteens.value = [];
      common_vendor.index.showToast({ title: "已恢复默认范围", icon: "none" });
    }
    function isSelected(canteenId) {
      return selectedCanteens.value.some((item) => item.id === canteenId);
    }
    function handleSaveSelection() {
      const canteenNames = selectedCanteens.value.map((item) => item.name);
      const content = canteenNames.length ? `确认只在这些饭堂里推荐吗？
${canteenNames.join("、")}` : "确认恢复默认范围吗？\n保存后会在当前学校全部饭堂范围内推荐。";
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
          common_vendor.index.showToast({ title: selectedCanteens.value.length ? "饭堂偏好已保存" : "已恢复默认范围", icon: "none" });
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
        f: common_vendor.t(selectionStateTitle.value),
        g: common_vendor.t(selectionStatusText.value),
        h: common_vendor.s(selectionStatusBadgeStyle.value),
        i: common_vendor.t(selectionStateDesc.value),
        j: common_vendor.s(selectionStateStyle.value),
        k: canteenList.value.length
      }, canteenList.value.length ? {
        l: common_vendor.f(canteenList.value, (canteen, k0, i0) => {
          return common_vendor.e({
            a: isSelected(canteen.id)
          }, isSelected(canteen.id) ? {
            b: common_vendor.s(canteenGlowStyle.value)
          } : {}, {
            c: common_vendor.t(canteen.name),
            d: common_vendor.s(canteenTitleStyle(isSelected(canteen.id))),
            e: common_vendor.t(canteen.remark),
            f: common_vendor.s(canteenSubStyle(isSelected(canteen.id))),
            g: common_vendor.t(isSelected(canteen.id) ? "已选" : "可选"),
            h: common_vendor.s(canteenBadgeStyle(isSelected(canteen.id))),
            i: canteen.id,
            j: common_vendor.s(canteenCardStyle(isSelected(canteen.id))),
            k: common_vendor.o(($event) => handleSelectCanteen(canteen), canteen.id)
          });
        })
      } : {
        m: common_vendor.s(cardStyle.value)
      }, {
        n: common_vendor.s(cardStyle.value)
      }) : {}, {
        o: state.value.mode === "campus"
      }, state.value.mode === "campus" ? {
        p: common_vendor.s(ghostButtonStyle.value),
        q: common_vendor.o(handleClearSelection, "b4"),
        r: common_vendor.s(saveButtonStyle.value),
        s: common_vendor.o(handleSaveSelection, "97")
      } : {}, {
        t: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/canteen/canteen.js.map
