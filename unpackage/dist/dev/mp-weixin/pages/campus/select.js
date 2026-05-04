"use strict";
const common_vendor = require("../../common/vendor.js");
const common_data = require("../../common/data.js");
const utils_appState = require("../../utils/app-state.js");
const utils_userState = require("../../utils/user-state.js");
const _sfc_main = {
  __name: "select",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getWindowInfo().statusBarHeight || 20;
    const presetCampusIds = common_data.presetCampuses.map((item) => item.id);
    const appState = common_vendor.ref(utils_appState.getAppState());
    const selectedMode = common_vendor.ref(appState.value.mode);
    const selectedCampusId = common_vendor.ref(appState.value.campusId);
    const campusList = common_vendor.ref(utils_appState.getCampusList());
    const searchKeyword = common_vendor.ref("");
    const expandedSchoolKey = common_vendor.ref("");
    function refreshPage() {
      const latestState = utils_appState.getAppState();
      appState.value = latestState;
      selectedMode.value = latestState.mode;
      selectedCampusId.value = latestState.campusId;
      campusList.value = utils_appState.getCampusList();
      ensureExpandedForSelection();
    }
    common_vendor.onLoad(refreshPage);
    common_vendor.onShow(refreshPage);
    const theme = common_vendor.computed(() => utils_appState.getTheme(selectedMode.value));
    const currentSelectedCampus = common_vendor.computed(() => utils_appState.getCampusById(selectedCampusId.value));
    const schoolGroups = common_vendor.computed(() => {
      const groupMap = {};
      campusList.value.forEach((campus) => {
        const groupKey = `${campus.name}-${campus.district || ""}`;
        if (!groupMap[groupKey]) {
          groupMap[groupKey] = {
            key: groupKey,
            name: campus.name,
            district: campus.district || "校园合作",
            items: [],
            presetCount: 0
          };
        }
        groupMap[groupKey].items.push(campus);
        if (presetCampusIds.includes(campus.id)) {
          groupMap[groupKey].presetCount += 1;
        }
      });
      return Object.values(groupMap);
    });
    const filteredSchoolGroups = common_vendor.computed(() => {
      const keyword = searchKeyword.value.trim().toLowerCase();
      if (!keyword) {
        return schoolGroups.value;
      }
      return schoolGroups.value.map((group) => {
        const filteredItems = group.items.filter((campus) => {
          const searchPool = [
            campus.name,
            campus.campusTag,
            campus.district
          ].join(" ").toLowerCase();
          return searchPool.includes(keyword);
        });
        if (filteredItems.length === 0) {
          return null;
        }
        return {
          ...group,
          items: filteredItems
        };
      }).filter(Boolean);
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
    const selectedCardStyle = common_vendor.computed(() => ({
      background: theme.value.cardStrong,
      border: `1px solid ${theme.value.accent}`,
      boxShadow: theme.value.shadow
    }));
    const subtleCardStyle = common_vendor.computed(() => ({
      background: theme.value.cardStrong,
      border: `1px solid ${theme.value.border}`
    }));
    const accentFillStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
      boxShadow: theme.value.shadow,
      color: "#ffffff"
    }));
    const accentTextStyle = common_vendor.computed(() => ({
      color: theme.value.accent
    }));
    const badgeStyle = common_vendor.computed(() => ({
      color: theme.value.accent,
      background: theme.value.accentSoft,
      border: `1px solid ${theme.value.border}`
    }));
    const miniBadgeStyle = common_vendor.computed(() => ({
      color: theme.value.accent,
      background: "rgba(255,255,255,0.72)"
    }));
    function modeCardStyle(mode) {
      const isActive = selectedMode.value === mode;
      return {
        background: isActive ? theme.value.card : "rgba(255, 255, 255, 0.78)",
        border: `1px solid ${isActive ? theme.value.accent : "rgba(255,255,255,0.8)"}`,
        boxShadow: isActive ? theme.value.shadow : "none"
      };
    }
    function schoolGroupStyle(group) {
      const containsCurrent = group.items.some((item) => item.id === selectedCampusId.value);
      return {
        background: containsCurrent ? theme.value.cardStrong : "rgba(255, 255, 255, 0.82)",
        border: `1px solid ${containsCurrent ? theme.value.accent : theme.value.border}`
      };
    }
    function campusOptionStyle(campusId) {
      const isActive = selectedCampusId.value === campusId;
      return {
        background: isActive ? theme.value.accentSoft : "rgba(255,255,255,0.84)",
        border: `1px solid ${isActive ? theme.value.accent : "rgba(255,255,255,0.75)"}`
      };
    }
    function statusBadgeStyle(group) {
      return {
        color: group.presetCount > 0 ? theme.value.accent : "#8fb0a6",
        background: group.presetCount > 0 ? theme.value.accentSoft : "#f3f8f4"
      };
    }
    function getGroupStatusLabel(group) {
      if (group.presetCount === group.items.length) {
        return "已入驻";
      }
      if (group.presetCount > 0) {
        return "部分入驻";
      }
      return "筹备中";
    }
    function getGroupTip(group) {
      if (group.items.length > 1) {
        return `${group.items.length} 个校区可选`;
      }
      return getCampusDisplayName(group.items[0]);
    }
    function getCampusDisplayName(campus) {
      return campus.campusTag ? `${campus.name} · ${campus.campusTag}` : campus.name;
    }
    function handleGroupClick(group) {
      if (group.items.length === 1) {
        selectedCampusId.value = group.items[0].id;
        expandedSchoolKey.value = group.key;
        return;
      }
      expandedSchoolKey.value = expandedSchoolKey.value === group.key ? "" : group.key;
    }
    function ensureExpandedForSelection() {
      const currentGroup = schoolGroups.value.find((group) => group.items.some((item) => item.id === selectedCampusId.value));
      expandedSchoolKey.value = currentGroup ? currentGroup.key : "";
    }
    function saveSelection() {
      const nextState = utils_appState.saveAppState({
        mode: selectedMode.value,
        campusId: selectedCampusId.value
      });
      utils_appState.applyTabBarTheme(nextState.mode);
      common_vendor.index.showToast({
        title: nextState.mode === "campus" ? "已切到校园版" : "已切回普通版",
        icon: "none"
      });
      setTimeout(() => {
        common_vendor.index.switchTab({
          url: "/pages/my/my"
        });
      }, 400);
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
    function goBack() {
      common_vendor.index.navigateBack();
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(goBack, "ca"),
        b: `${common_vendor.unref(statusBarHeight) + 12}px`,
        c: common_vendor.s(cardStyle.value),
        d: common_vendor.s(modeCardStyle("normal")),
        e: common_vendor.o(($event) => selectedMode.value = "normal", "0a"),
        f: common_vendor.s(modeCardStyle("campus")),
        g: common_vendor.o(($event) => selectedMode.value = "campus", "a0"),
        h: selectedMode.value === "campus"
      }, selectedMode.value === "campus" ? common_vendor.e({
        i: common_vendor.t(currentSelectedCampus.value.name),
        j: currentSelectedCampus.value.campusTag
      }, currentSelectedCampus.value.campusTag ? {
        k: common_vendor.t(currentSelectedCampus.value.campusTag),
        l: common_vendor.s(badgeStyle.value)
      } : {}, {
        m: common_vendor.t(currentSelectedCampus.value.district),
        n: common_vendor.s(accentTextStyle.value),
        o: common_vendor.s(selectedCardStyle.value),
        p: searchKeyword.value,
        q: common_vendor.o(($event) => searchKeyword.value = $event.detail.value, "72"),
        r: filteredSchoolGroups.value.length
      }, filteredSchoolGroups.value.length ? {
        s: common_vendor.f(filteredSchoolGroups.value, (group, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(group.name),
            b: common_vendor.t(getGroupStatusLabel(group)),
            c: common_vendor.s(statusBadgeStyle(group)),
            d: common_vendor.t(group.district),
            e: common_vendor.t(getGroupTip(group)),
            f: common_vendor.t(group.items.length > 1 ? expandedSchoolKey.value === group.key ? "收起" : "展开" : "选择"),
            g: common_vendor.o(($event) => handleGroupClick(group), group.key),
            h: group.items.length > 1 && expandedSchoolKey.value === group.key
          }, group.items.length > 1 && expandedSchoolKey.value === group.key ? {
            i: common_vendor.f(group.items, (campus, k1, i1) => {
              return common_vendor.e({
                a: common_vendor.t(getCampusDisplayName(campus)),
                b: campus.campusTag
              }, campus.campusTag ? {
                c: common_vendor.s(miniBadgeStyle.value)
              } : {}, {
                d: common_vendor.t(campus.district),
                e: common_vendor.t(selectedCampusId.value === campus.id ? "已选" : "选择"),
                f: campus.id,
                g: common_vendor.s(campusOptionStyle(campus.id)),
                h: common_vendor.o(($event) => selectedCampusId.value = campus.id, campus.id)
              });
            }),
            j: common_vendor.s(accentTextStyle.value)
          } : {}, {
            k: group.key,
            l: common_vendor.s(schoolGroupStyle(group))
          });
        }),
        t: common_vendor.s(accentTextStyle.value)
      } : {}, {
        v: common_vendor.s(cardStyle.value)
      }) : {}, {
        w: common_vendor.s(accentFillStyle.value),
        x: common_vendor.o(saveSelection, "26"),
        y: common_vendor.s(subtleCardStyle.value),
        z: common_vendor.o(goJoinPage, "5a"),
        A: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/campus/select.js.map
