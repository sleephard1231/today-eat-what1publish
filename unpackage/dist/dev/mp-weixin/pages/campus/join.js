"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_appState = require("../../utils/app-state.js");
const utils_privacyState = require("../../utils/privacy-state.js");
const utils_userState = require("../../utils/user-state.js");
const _sfc_main = {
  __name: "join",
  setup(__props) {
    const statusBarHeight = common_vendor.index.getWindowInfo().statusBarHeight || 20;
    const state = common_vendor.ref(utils_appState.getAppState());
    const isDraftSaved = common_vendor.ref(false);
    const privacyAgreed = common_vendor.ref(false);
    const isSubmitting = common_vendor.ref(false);
    const showCityPicker = common_vendor.ref(false);
    const customCity = common_vendor.ref("");
    const form = common_vendor.reactive({
      campusName: "",
      campusTag: "",
      city: "",
      nickName: "",
      email: ""
    });
    const cityGroups = [
      {
        label: "热门",
        cities: ["广州", "深圳", "北京", "上海", "杭州", "成都", "武汉", "西安"]
      },
      {
        label: "华南",
        cities: ["广州", "深圳", "佛山", "东莞", "珠海", "中山", "惠州", "汕头", "江门", "湛江", "肇庆", "韶关", "茂名", "梅州", "清远", "阳江", "揭阳", "潮州", "云浮", "河源", "汕尾", "南宁", "柳州", "桂林", "北海", "海口", "三亚", "厦门", "福州", "泉州", "漳州"]
      },
      {
        label: "华东",
        cities: ["上海", "南京", "苏州", "杭州", "宁波", "温州", "合肥", "南昌", "济南", "青岛", "烟台", "无锡", "常州", "徐州", "南通", "盐城", "淮安", "扬州", "镇江", "泰州"]
      },
      {
        label: "华北",
        cities: ["北京", "天津", "石家庄", "太原", "呼和浩特", "唐山", "保定", "邯郸", "廊坊", "秦皇岛", "沧州", "大同", "包头"]
      },
      {
        label: "华中",
        cities: ["武汉", "长沙", "郑州", "洛阳", "南阳", "襄阳", "株洲", "衡阳", "湘潭", "宜昌", "赣州", "九江"]
      },
      {
        label: "西南",
        cities: ["成都", "重庆", "昆明", "贵阳", "绵阳", "宜宾", "乐山", "遵义", "大理", "丽江", "拉萨"]
      },
      {
        label: "西北",
        cities: ["西安", "兰州", "银川", "西宁", "乌鲁木齐", "咸阳", "宝鸡", "榆林", "延安", "天水"]
      },
      {
        label: "东北",
        cities: ["沈阳", "大连", "长春", "哈尔滨", "鞍山", "抚顺", "吉林", "齐齐哈尔", "大庆", "牡丹江"]
      }
    ];
    common_vendor.onLoad(() => {
      state.value = utils_appState.getAppState();
      hydrateDraft();
    });
    function selectCity(city) {
      form.city = city;
      showCityPicker.value = false;
      markDraftDirty();
    }
    function confirmCustomCity() {
      const val = customCity.value.trim();
      if (val) {
        form.city = val.replace(/市$/, "");
        showCityPicker.value = false;
        customCity.value = "";
        markDraftDirty();
      }
    }
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
      form.nickName = draft.nickName || "";
      form.email = draft.email || "";
      isDraftSaved.value = Boolean(draft.campusName || draft.email);
    }
    function markDraftDirty() {
      if (isDraftSaved.value) {
        isDraftSaved.value = false;
      }
    }
    function validateForm() {
      if (!form.campusName || !form.email) {
        common_vendor.index.showToast({
          title: "请至少填校园名称和邮箱",
          icon: "none"
        });
        return false;
      }
      if (!privacyAgreed.value) {
        common_vendor.index.showToast({
          title: "请先同意隐私政策和用户协议",
          icon: "none"
        });
        return false;
      }
      return true;
    }
    async function submitForm() {
      if (isSubmitting.value) {
        return;
      }
      if (!validateForm()) {
        return;
      }
      utils_privacyState.agreePrivacy();
      if (!isDraftSaved.value) {
        utils_appState.saveCampusApplicationDraft({ ...form });
        isDraftSaved.value = true;
        common_vendor.index.showToast({
          title: "已保存，再点一次才会提交",
          icon: "none"
        });
        return;
      }
      if (!utils_userState.requireLogin({
        cloudOnly: true,
        content: "登录后才能把入驻申请提交到后台。"
      })) {
        return;
      }
      isSubmitting.value = true;
      try {
        await utils_appState.submitCampusApplication({
          campusName: form.campusName,
          campusTag: form.campusTag,
          city: form.city,
          contactName: form.nickName,
          contactEmail: form.email
        });
        utils_appState.clearCampusApplicationDraft();
        common_vendor.index.showToast({
          title: "已提交到后台，待审核",
          icon: "none",
          duration: 2500
        });
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 500);
      } catch (err) {
        common_vendor.index.showToast({
          title: (err == null ? void 0 : err.message) || "提交失败，请稍后再试",
          icon: "none"
        });
      } finally {
        isSubmitting.value = false;
      }
    }
    function goBack() {
      common_vendor.index.navigateBack();
    }
    function openPrivacyPolicy() {
      common_vendor.index.navigateTo({ url: "/pages/webview/index?url=privacy" });
    }
    function openUserAgreement() {
      common_vendor.index.navigateTo({ url: "/pages/webview/index?url=agreement" });
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
        j: common_vendor.t(form.city || "点击选择所在城市"),
        k: common_vendor.n(form.city ? "" : "field-input--placeholder"),
        l: common_vendor.o(($event) => showCityPicker.value = true, "cd"),
        m: common_vendor.o([($event) => form.nickName = $event.detail.value, markDraftDirty], "c1"),
        n: form.nickName,
        o: common_vendor.o([($event) => form.email = $event.detail.value, markDraftDirty], "5e"),
        p: form.email,
        q: common_vendor.s(cardStyle.value),
        r: common_vendor.n(privacyAgreed.value ? "privacy-check--active" : ""),
        s: common_vendor.s(privacyAgreed.value ? accentFillStyle.value : {}),
        t: common_vendor.o(openPrivacyPolicy, "63"),
        v: common_vendor.o(openUserAgreement, "29"),
        w: common_vendor.o(($event) => privacyAgreed.value = !privacyAgreed.value, "22"),
        x: common_vendor.t(isSubmitting.value ? "提交中..." : isDraftSaved.value ? "提交到后台" : "保存申请内容"),
        y: common_vendor.s(accentFillStyle.value),
        z: isSubmitting.value,
        A: isSubmitting.value,
        B: common_vendor.o(submitForm, "b6"),
        C: showCityPicker.value
      }, showCityPicker.value ? {
        D: common_vendor.o(($event) => showCityPicker.value = false, "b4"),
        E: common_vendor.o(confirmCustomCity, "3a"),
        F: customCity.value,
        G: common_vendor.o(($event) => customCity.value = $event.detail.value, "c3"),
        H: common_vendor.s(accentFillStyle.value),
        I: common_vendor.o(confirmCustomCity, "63"),
        J: common_vendor.o(() => {
        }, "5e"),
        K: common_vendor.f(cityGroups, (group, gi, i0) => {
          return {
            a: common_vendor.t(group.label),
            b: common_vendor.f(group.cities, (city, ci, i1) => {
              return {
                a: common_vendor.t(city),
                b: ci,
                c: common_vendor.n(form.city === city ? "city-item--active" : ""),
                d: common_vendor.s(form.city === city ? accentFillStyle.value : {}),
                e: common_vendor.o(($event) => selectCity(city), ci)
              };
            }),
            c: gi
          };
        }),
        L: common_vendor.s(cardStyle.value),
        M: common_vendor.o(() => {
        }, "b6"),
        N: common_vendor.o(($event) => showCityPicker.value = false, "02")
      } : {}, {
        O: common_vendor.s(pageStyle.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/campus/join.js.map
