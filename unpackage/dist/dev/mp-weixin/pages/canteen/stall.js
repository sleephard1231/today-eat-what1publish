"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_appState = require("../../utils/app-state.js");
const utils_cloud = require("../../utils/cloud.js");
const _sfc_main = {
  __name: "stall",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getWindowInfo().statusBarHeight || 20;
    const stallId = common_vendor.ref("");
    const stallName = common_vendor.ref("");
    const stallCategory = common_vendor.ref("");
    const stallRemark = common_vendor.ref("");
    const canteenId = common_vendor.ref("");
    const dishList = common_vendor.ref([]);
    const loading = common_vendor.ref(false);
    const showDishForm = common_vendor.ref(false);
    const isEditing = common_vendor.ref(false);
    const editingDishId = common_vendor.ref("");
    const dishForm = common_vendor.ref({
      name: "",
      category: "",
      tag: "",
      price: "",
      vibe: ""
    });
    const tagOptions = ["人气", "新品", "推荐", "招牌", "限时"];
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
    const tagStyle = common_vendor.computed(() => ({
      background: theme.value.accentSoft,
      color: theme.value.accent,
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
    const tagActiveStyle = common_vendor.computed(() => ({
      background: theme.value.accent,
      border: `1px solid ${theme.value.accent}`
    }));
    const tagNormalStyle = common_vendor.computed(() => ({
      background: theme.value.accentSoft,
      border: `1px solid ${theme.value.border}`
    }));
    common_vendor.onLoad(async (options) => {
      stallId.value = (options == null ? void 0 : options.stallId) || "";
      stallName.value = decodeURIComponent((options == null ? void 0 : options.stallName) || "档口详情");
      stallCategory.value = decodeURIComponent((options == null ? void 0 : options.stallCategory) || "");
      stallRemark.value = decodeURIComponent((options == null ? void 0 : options.stallRemark) || "");
      canteenId.value = (options == null ? void 0 : options.canteenId) || "";
      await loadDishes();
    });
    async function loadDishes() {
      if (!stallId.value)
        return;
      loading.value = true;
      try {
        const res = await utils_cloud.cloudGetDishesByStall(stallId.value);
        if (res.code === 0 && Array.isArray(res.data)) {
          dishList.value = res.data;
        }
      } catch (err) {
        common_vendor.index.__f__("warn", "at pages/canteen/stall.vue:183", "[stall] loadDishes error", err);
      }
      loading.value = false;
    }
    function showAddDish() {
      isEditing.value = false;
      editingDishId.value = "";
      dishForm.value = { name: "", category: "", tag: "", price: "", vibe: "" };
      showDishForm.value = true;
    }
    function showEditDish(dish) {
      isEditing.value = true;
      editingDishId.value = dish.id;
      dishForm.value = {
        name: dish.name || "",
        category: dish.category || "",
        tag: dish.tag || "",
        price: dish.price || "",
        vibe: dish.vibe || ""
      };
      showDishForm.value = true;
    }
    function closeDishForm() {
      showDishForm.value = false;
    }
    async function submitDishForm() {
      const form = dishForm.value;
      if (!form.name.trim()) {
        common_vendor.index.showToast({ title: "请输入菜品名称", icon: "none" });
        return;
      }
      const dishData = {
        name: form.name.trim(),
        category: form.category.trim(),
        tag: form.tag,
        price: form.price.trim(),
        vibe: form.vibe.trim()
      };
      common_vendor.index.showLoading({ title: isEditing.value ? "保存中..." : "添加中..." });
      try {
        let res;
        if (isEditing.value) {
          res = await utils_cloud.cloudUpdateDish(stallId.value, editingDishId.value, dishData);
        } else {
          res = await utils_cloud.cloudAddDish(stallId.value, canteenId.value, dishData);
        }
        if (res.code === 0) {
          common_vendor.index.showToast({ title: isEditing.value ? "保存成功" : "添加成功", icon: "success" });
          closeDishForm();
          await loadDishes();
        } else {
          common_vendor.index.showToast({ title: res.msg || "操作失败", icon: "none" });
        }
      } catch (err) {
        common_vendor.index.__f__("warn", "at pages/canteen/stall.vue:245", "[stall] submitDishForm error", err);
        common_vendor.index.showToast({ title: "操作失败", icon: "none" });
      }
      common_vendor.index.hideLoading();
    }
    function confirmDeleteDish(dish) {
      common_vendor.index.showModal({
        title: "确认删除",
        content: `确定要删除「${dish.name}」吗？`,
        confirmText: "删除",
        confirmColor: "#e74c3c",
        success: async ({ confirm }) => {
          if (!confirm)
            return;
          common_vendor.index.showLoading({ title: "删除中..." });
          try {
            const res = await utils_cloud.cloudDeleteDish(stallId.value, dish.id);
            if (res.code === 0) {
              common_vendor.index.showToast({ title: "已删除", icon: "success" });
              await loadDishes();
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
        b: common_vendor.t(stallName.value),
        c: `${common_vendor.unref(statusBarHeight) + 12}px`,
        d: common_vendor.t(stallName.value),
        e: theme.value.accent,
        f: stallCategory.value
      }, stallCategory.value ? {
        g: common_vendor.t(stallCategory.value)
      } : {}, {
        h: stallRemark.value
      }, stallRemark.value ? {
        i: common_vendor.t(stallRemark.value)
      } : {}, {
        j: common_vendor.s(cardStyle.value),
        k: common_vendor.t(dishList.value.length),
        l: common_vendor.s(addBtnStyle.value),
        m: common_vendor.o(showAddDish, "7c"),
        n: dishList.value.length
      }, dishList.value.length ? {
        o: common_vendor.f(dishList.value, (dish, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(dish.name),
            b: dish.tag
          }, dish.tag ? {
            c: common_vendor.t(dish.tag),
            d: common_vendor.s(tagStyle.value)
          } : {}, {
            e: dish.category
          }, dish.category ? {
            f: common_vendor.t(dish.category)
          } : {}, {
            g: dish.price
          }, dish.price ? {
            h: common_vendor.t(dish.price)
          } : {}, {
            i: dish.vibe
          }, dish.vibe ? {
            j: common_vendor.t(dish.vibe)
          } : {}, {
            k: common_vendor.o(($event) => showEditDish(dish), dish.id),
            l: common_vendor.o(($event) => confirmDeleteDish(dish), dish.id),
            m: dish.id
          });
        }),
        p: common_vendor.s(cardStyle.value)
      } : {
        q: common_vendor.s(cardStyle.value)
      }, {
        r: showDishForm.value
      }, showDishForm.value ? {
        s: common_vendor.t(isEditing.value ? "编辑菜品" : "添加菜品"),
        t: dishForm.value.name,
        v: common_vendor.o(($event) => dishForm.value.name = $event.detail.value, "a8"),
        w: dishForm.value.category,
        x: common_vendor.o(($event) => dishForm.value.category = $event.detail.value, "1a"),
        y: common_vendor.f(tagOptions, (tag, k0, i0) => {
          return {
            a: common_vendor.t(tag),
            b: dishForm.value.tag === tag ? "#fff" : theme.value.accent,
            c: tag,
            d: common_vendor.s(dishForm.value.tag === tag ? tagActiveStyle.value : tagNormalStyle.value),
            e: common_vendor.o(($event) => dishForm.value.tag = dishForm.value.tag === tag ? "" : tag, tag)
          };
        }),
        z: dishForm.value.price,
        A: common_vendor.o(($event) => dishForm.value.price = $event.detail.value, "41"),
        B: dishForm.value.vibe,
        C: common_vendor.o(($event) => dishForm.value.vibe = $event.detail.value, "4c"),
        D: common_vendor.o(closeDishForm, "e6"),
        E: common_vendor.t(isEditing.value ? "保存" : "添加"),
        F: common_vendor.s(confirmBtnStyle.value),
        G: common_vendor.o(submitDishForm, "10"),
        H: common_vendor.s(cardStyle.value),
        I: common_vendor.o(closeDishForm, "b6")
      } : {}, {
        J: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/canteen/stall.js.map
