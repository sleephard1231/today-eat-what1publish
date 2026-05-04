"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_appState = require("../../utils/app-state.js");
const utils_cloud = require("../../utils/cloud.js");
const STALL_REFRESH_TTL = 45 * 1e3;
const STALL_DIRTY_KEY = "eat-what-stall-dirty";
const _sfc_main = {
  __name: "detail",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getWindowInfo().statusBarHeight || 20;
    const canteenId = common_vendor.ref("");
    const canteenName = common_vendor.ref("");
    const stallList = common_vendor.ref([]);
    const canManage = common_vendor.ref(false);
    const skipNextShow = common_vendor.ref(true);
    let lastStallLoadedAt = 0;
    const showStallForm = common_vendor.ref(false);
    const isEditingStall = common_vendor.ref(false);
    const editingStallId = common_vendor.ref("");
    const stallForm = common_vendor.ref({
      name: "",
      category: "",
      remark: ""
    });
    const theme = common_vendor.computed(() => utils_appState.getTheme("campus"));
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
    const addBtnStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
      boxShadow: theme.value.shadow
    }));
    const confirmBtnStyle = common_vendor.computed(() => ({
      background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
      color: "#fff"
    }));
    const enterBtnStyle = common_vendor.computed(() => ({
      background: theme.value.accentSoft,
      color: theme.value.accent,
      border: `1px solid ${theme.value.border}`
    }));
    common_vendor.onLoad(async (options) => {
      canteenId.value = (options == null ? void 0 : options.canteenId) || "";
      canteenName.value = decodeURIComponent((options == null ? void 0 : options.canteenName) || "饭堂详情");
      await refreshManagePermission();
      await loadStalls();
    });
    common_vendor.onShow(async () => {
      if (skipNextShow.value) {
        skipNextShow.value = false;
        return;
      }
      if (canteenId.value) {
        if (common_vendor.index.getStorageSync(STALL_DIRTY_KEY) === canteenId.value) {
          common_vendor.index.removeStorageSync(STALL_DIRTY_KEY);
          await refreshStalls();
          return;
        }
        await loadStalls();
      }
    });
    async function loadStalls() {
      if (!canteenId.value)
        return;
      if (Date.now() - lastStallLoadedAt < STALL_REFRESH_TTL && stallList.value.length)
        return;
      try {
        const res = await utils_cloud.cloudGetStallsByCanteen(canteenId.value);
        if (res.code === 0 && Array.isArray(res.data)) {
          stallList.value = res.data;
          lastStallLoadedAt = Date.now();
        }
      } catch (err) {
        common_vendor.index.__f__("warn", "at pages/canteen/detail.vue:167", "[detail] loadStalls error", err);
      }
    }
    async function refreshStalls() {
      lastStallLoadedAt = 0;
      await loadStalls();
    }
    async function refreshManagePermission() {
      var _a;
      const res = await utils_cloud.cloudIsCampusAdmin();
      canManage.value = res.code === 0 && !!((_a = res.data) == null ? void 0 : _a.isAdmin);
    }
    function goToStall(stall) {
      common_vendor.index.navigateTo({
        url: `/pages/canteen/stall?stallId=${stall.id}&stallName=${encodeURIComponent(stall.name)}&stallCategory=${encodeURIComponent(stall.category || "")}&stallRemark=${encodeURIComponent(stall.remark || "")}&canteenId=${canteenId.value}`
      });
    }
    function showAddStall() {
      if (!canManage.value) {
        common_vendor.index.showToast({ title: "无管理权限", icon: "none" });
        return;
      }
      isEditingStall.value = false;
      editingStallId.value = "";
      stallForm.value = { name: "", category: "", remark: "" };
      showStallForm.value = true;
    }
    function showEditStall(stall) {
      if (!canManage.value) {
        common_vendor.index.showToast({ title: "无管理权限", icon: "none" });
        return;
      }
      isEditingStall.value = true;
      editingStallId.value = stall.id;
      stallForm.value = {
        name: stall.name || "",
        category: stall.category || "",
        remark: stall.remark || ""
      };
      showStallForm.value = true;
    }
    function closeStallForm() {
      showStallForm.value = false;
    }
    async function submitStallForm() {
      if (!canManage.value) {
        common_vendor.index.showToast({ title: "无管理权限", icon: "none" });
        return;
      }
      const form = stallForm.value;
      if (!form.name.trim()) {
        common_vendor.index.showToast({ title: "请输入商铺名称", icon: "none" });
        return;
      }
      const stallData = {
        name: form.name.trim(),
        category: form.category.trim(),
        remark: form.remark.trim()
      };
      common_vendor.index.showLoading({ title: isEditingStall.value ? "保存中..." : "添加中..." });
      try {
        let res;
        if (isEditingStall.value) {
          res = await utils_cloud.cloudUpdateStall(canteenId.value, editingStallId.value, stallData);
        } else {
          res = await utils_cloud.cloudAddStall(canteenId.value, stallData);
        }
        if (res.code === 0) {
          common_vendor.index.showToast({ title: isEditingStall.value ? "保存成功" : "添加成功", icon: "success" });
          closeStallForm();
          await refreshStalls();
        } else {
          common_vendor.index.showToast({ title: res.msg || "操作失败", icon: "none" });
        }
      } catch (err) {
        common_vendor.index.__f__("warn", "at pages/canteen/detail.vue:255", "[detail] submitStallForm error", err);
        common_vendor.index.showToast({ title: "操作失败", icon: "none" });
      }
      common_vendor.index.hideLoading();
    }
    function confirmDeleteStall(stall) {
      if (!canManage.value) {
        common_vendor.index.showToast({ title: "无管理权限", icon: "none" });
        return;
      }
      common_vendor.index.showModal({
        title: "确认删除",
        content: `确定要删除商铺「${stall.name}」吗？该商铺下的所有菜品也会被删除。`,
        confirmText: "删除",
        confirmColor: "#e74c3c",
        success: async ({ confirm }) => {
          if (!confirm)
            return;
          common_vendor.index.showLoading({ title: "删除中..." });
          try {
            const res = await utils_cloud.cloudDeleteStall(canteenId.value, stall.id);
            if (res.code === 0) {
              common_vendor.index.showToast({ title: "已删除", icon: "success" });
              await refreshStalls();
            } else {
              common_vendor.index.showToast({ title: res.msg || "删除失败", icon: "none" });
            }
          } catch (err) {
            common_vendor.index.showToast({ title: "删除失败", icon: "none" });
          }
          common_vendor.index.hideLoading();
        }
      });
    }
    function goBack() {
      common_vendor.index.navigateBack();
    }
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(goBack, "a9"),
        b: common_vendor.t(canteenName.value),
        c: `${common_vendor.unref(statusBarHeight) + 12}px`,
        d: common_vendor.t(stallList.value.length),
        e: canManage.value
      }, canManage.value ? {
        f: common_vendor.s(addBtnStyle.value),
        g: common_vendor.o(showAddStall, "d0")
      } : {}, {
        h: stallList.value.length
      }, stallList.value.length ? {
        i: common_vendor.f(stallList.value, (stall, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(stall.name),
            b: stall.category
          }, stall.category ? {
            c: common_vendor.t(stall.category)
          } : {}, {
            d: stall.remark
          }, stall.remark ? {
            e: common_vendor.t(stall.remark)
          } : {}, {
            f: common_vendor.t((stall.dishes || []).length),
            g: common_vendor.o(($event) => goToStall(stall), stall.id)
          }, canManage.value ? {
            h: common_vendor.o(($event) => showEditStall(stall), stall.id),
            i: common_vendor.o(($event) => confirmDeleteStall(stall), stall.id)
          } : {}, {
            j: stall.id
          });
        }),
        j: theme.value.accent,
        k: common_vendor.s(enterBtnStyle.value),
        l: canManage.value,
        m: common_vendor.s(cardStyle.value)
      } : {
        n: common_vendor.s(cardStyle.value)
      }, {
        o: showStallForm.value
      }, showStallForm.value ? {
        p: common_vendor.t(isEditingStall.value ? "编辑商铺" : "添加商铺"),
        q: stallForm.value.name,
        r: common_vendor.o(($event) => stallForm.value.name = $event.detail.value, "72"),
        s: stallForm.value.category,
        t: common_vendor.o(($event) => stallForm.value.category = $event.detail.value, "56"),
        v: stallForm.value.remark,
        w: common_vendor.o(($event) => stallForm.value.remark = $event.detail.value, "cc"),
        x: common_vendor.o(closeStallForm, "9d"),
        y: common_vendor.t(isEditingStall.value ? "保存" : "添加"),
        z: common_vendor.s(confirmBtnStyle.value),
        A: common_vendor.o(submitStallForm, "d8"),
        B: common_vendor.s(cardStyle.value),
        C: common_vendor.o(closeStallForm, "57")
      } : {}, {
        D: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/canteen/detail.js.map
