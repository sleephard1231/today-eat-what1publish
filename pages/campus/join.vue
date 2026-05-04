<template>
  <view class="page" :style="pageStyle">
    <view class="top-bar" :style="{ paddingTop: `${statusBarHeight + 12}px` }">
      <text class="back-text" @click="goBack">‹ 返回</text>
      <text class="top-title">校园入驻</text>
      <text class="top-placeholder"></text>
    </view>

    <view class="intro-card" :style="cardStyle">
      <text class="intro-title">让你的校园也上榜</text>
      <text class="intro-desc">
        现在改成两步流程：先保存申请内容，再点击一次提交到后台。提交后会进入待审核状态，审核通过后才会出现在校园切换页。
      </text>
    </view>

    <view v-if="isDraftSaved" class="status-card" :style="statusCardStyle">
      <text class="status-title">已保存，待提交</text>
      <text class="status-desc">当前内容已经保存在本地。再点一次底部按钮，才会正式提交到后台。</text>
    </view>

    <view class="form-card" :style="cardStyle">
      <view class="field">
        <text class="field-label">校园名称</text>
        <input
          v-model="form.campusName"
          class="field-input"
          placeholder="例如：广东金融学院"
          placeholder-style="color:#b7ada4;font-size:26rpx;"
          @input="markDraftDirty"
        />
      </view>

      <view class="field">
        <text class="field-label">校区标志 / 校区名（可选）</text>
        <input
          v-model="form.campusTag"
          class="field-input"
          placeholder="例如：北校区 / 大学城校区，没有可不填"
          placeholder-style="color:#b7ada4;font-size:26rpx;"
          @input="markDraftDirty"
        />
      </view>

      <view class="field" @click="showCityPicker = true">
        <text class="field-label">所在城市</text>
        <view :class="['field-input', 'field-input--picker', form.city ? '' : 'field-input--placeholder']">
          {{ form.city || '点击选择所在城市' }}
          <text class="field-arrow">›</text>
        </view>
      </view>

      <view class="field">
        <text class="field-label">网名</text>
        <input
          v-model="form.nickName"
          class="field-input"
          placeholder="例如：小北同学"
          placeholder-style="color:#b7ada4;font-size:26rpx;"
          @input="markDraftDirty"
        />
      </view>

      <view class="field">
        <text class="field-label">邮箱</text>
        <input
          v-model="form.email"
          class="field-input"
          placeholder="例如：example@email.com"
          placeholder-style="color:#b7ada4;font-size:26rpx;"
          @input="markDraftDirty"
        />
      </view>
    </view>

    <!-- 隐私协议勾选 -->
    <view class="privacy-row" @click="privacyAgreed = !privacyAgreed">
      <view :class="['privacy-check', privacyAgreed ? 'privacy-check--active' : '']" :style="privacyAgreed ? accentFillStyle : {}">
        <text class="privacy-check-icon">✓</text>
      </view>
      <text class="privacy-text">
        我已阅读并同意
        <text class="privacy-link" @click.stop="openPrivacyPolicy">《隐私政策》</text>
        和
        <text class="privacy-link" @click.stop="openUserAgreement">《用户协议》</text>
        ，允许收集和处理网名和邮箱用于入驻审核
      </text>
    </view>

    <button class="submit-button" :style="accentFillStyle" :loading="isSubmitting" :disabled="isSubmitting" @click="submitForm">
      {{ isSubmitting ? '提交中...' : (isDraftSaved ? '提交到后台' : '保存申请内容') }}
    </button>

    <!-- 城市选择弹窗 -->
    <view v-if="showCityPicker" class="city-picker-mask" @click.self="showCityPicker = false">
      <view class="city-picker" :style="cardStyle" @click.stop>
        <view class="city-picker-header">
          <text class="city-picker-title">选择城市</text>
          <text class="city-picker-close" @click="showCityPicker = false">✕</text>
        </view>
        <view class="city-search-row city-search-row--top" @click.stop>
          <input
            v-model="customCity"
            class="city-search-input"
            placeholder="搜索或输入其他城市名称"
            placeholder-style="color:#b7ada4;font-size:24rpx;"
            confirm-type="search"
            @confirm="confirmCustomCity"
          />
          <text class="city-confirm-btn" :style="accentFillStyle" @click="confirmCustomCity">确认</text>
        </view>
        <scroll-view scroll-y class="city-list">
          <view
            v-for="(group, gi) in cityGroups"
            :key="gi"
            class="city-group"
          >
            <text class="city-group-label">{{ group.label }}</text>
            <view class="city-grid">
              <text
                v-for="(city, ci) in group.cities"
                :key="ci"
                :class="['city-item', form.city === city ? 'city-item--active' : '']"
                :style="form.city === city ? accentFillStyle : {}"
                @click="selectCity(city)"
              >{{ city }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  clearCampusApplicationDraft,
  getAppState,
  getCampusApplicationDraft,
  getTheme,
  saveCampusApplicationDraft,
  submitCampusApplication
} from '@/utils/app-state.js'
import { requirePrivacyAgreement } from '@/utils/privacy-state.js'
import { requireLogin } from '@/utils/user-state.js'

const statusBarHeight = uni.getWindowInfo().statusBarHeight || 20
const state = ref(getAppState())
const isDraftSaved = ref(false)
const privacyAgreed = ref(false)
const isSubmitting = ref(false)
const showCityPicker = ref(false)
const customCity = ref('')
const form = reactive({
  campusName: '',
  campusTag: '',
  city: '',
  nickName: '',
  email: ''
})

// 常用城市列表（按区域分组）
const cityGroups = [
  {
    label: '热门',
    cities: ['广州', '深圳', '北京', '上海', '杭州', '成都', '武汉', '西安']
  },
  {
    label: '华南',
    cities: ['广州', '深圳', '佛山', '东莞', '珠海', '中山', '惠州', '汕头', '江门', '湛江', '肇庆', '韶关', '茂名', '梅州', '清远', '阳江', '揭阳', '潮州', '云浮', '河源', '汕尾', '南宁', '柳州', '桂林', '北海', '海口', '三亚', '厦门', '福州', '泉州', '漳州']
  },
  {
    label: '华东',
    cities: ['上海', '南京', '苏州', '杭州', '宁波', '温州', '合肥', '南昌', '济南', '青岛', '烟台', '无锡', '常州', '徐州', '南通', '盐城', '淮安', '扬州', '镇江', '泰州']
  },
  {
    label: '华北',
    cities: ['北京', '天津', '石家庄', '太原', '呼和浩特', '唐山', '保定', '邯郸', '廊坊', '秦皇岛', '沧州', '大同', '包头']
  },
  {
    label: '华中',
    cities: ['武汉', '长沙', '郑州', '洛阳', '南阳', '襄阳', '株洲', '衡阳', '湘潭', '宜昌', '赣州', '九江']
  },
  {
    label: '西南',
    cities: ['成都', '重庆', '昆明', '贵阳', '绵阳', '宜宾', '乐山', '遵义', '大理', '丽江', '拉萨']
  },
  {
    label: '西北',
    cities: ['西安', '兰州', '银川', '西宁', '乌鲁木齐', '咸阳', '宝鸡', '榆林', '延安', '天水']
  },
  {
    label: '东北',
    cities: ['沈阳', '大连', '长春', '哈尔滨', '鞍山', '抚顺', '吉林', '齐齐哈尔', '大庆', '牡丹江']
  }
]

onLoad(() => {
  state.value = getAppState()
  hydrateDraft()
})

function selectCity(city) {
  form.city = city
  showCityPicker.value = false
  markDraftDirty()
}

function confirmCustomCity() {
  const val = customCity.value.trim()
  if (val) {
    form.city = val.replace(/市$/, '')
    showCityPicker.value = false
    customCity.value = ''
    markDraftDirty()
  }
}

const theme = computed(() => getTheme(state.value.mode))

const pageStyle = computed(() => ({
  minHeight: '100vh',
  padding: '0 32rpx 120rpx',
  background: `linear-gradient(180deg, ${theme.value.pageStart} 0%, ${theme.value.pageEnd} 100%)`
}))

const cardStyle = computed(() => ({
  background: theme.value.card,
  boxShadow: theme.value.shadow,
  border: `1px solid ${theme.value.border}`
}))

const statusCardStyle = computed(() => ({
  background: theme.value.accentSoft,
  boxShadow: theme.value.shadow,
  border: `1px solid ${theme.value.border}`
}))

const accentFillStyle = computed(() => ({
  background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
  boxShadow: theme.value.shadow,
  color: '#ffffff'
}))

function hydrateDraft() {
  const draft = getCampusApplicationDraft()

  if (!draft) {
    return
  }

  form.campusName = draft.campusName || ''
  form.campusTag = draft.campusTag || ''
  form.city = draft.city || ''
  form.nickName = draft.nickName || ''
  form.email = draft.email || ''
  isDraftSaved.value = Boolean(draft.campusName || draft.email)
}

function markDraftDirty() {
  if (isDraftSaved.value) {
    isDraftSaved.value = false
  }
}

function validateForm() {
  if (!form.campusName || !form.email) {
    uni.showToast({
      title: '请至少填校园名称和邮箱',
      icon: 'none'
    })
    return false
  }

  if (!privacyAgreed.value) {
    uni.showToast({
      title: '请先同意隐私政策和用户协议',
      icon: 'none'
    })
    return false
  }

  return true
}

async function submitForm() {
  if (isSubmitting.value) {
    return
  }

  if (!validateForm()) {
    return
  }

  if (!requirePrivacyAgreement({
    content: '同意隐私政策和用户协议后，才能提交校园入驻申请。'
  })) {
    return
  }

  if (!isDraftSaved.value) {
    saveCampusApplicationDraft({ ...form })
    isDraftSaved.value = true

    uni.showToast({
      title: '已保存，再点一次才会提交',
      icon: 'none'
    })
    return
  }

  if (!requireLogin({
    cloudOnly: true,
    content: '登录后才能把入驻申请提交到后台。'
  })) {
    return
  }

  isSubmitting.value = true
  try {
    await submitCampusApplication({
      campusName: form.campusName,
      campusTag: form.campusTag,
      city: form.city,
      contactName: form.nickName,
      contactEmail: form.email
    })
    clearCampusApplicationDraft()

    uni.showToast({
      title: '已提交到后台，待审核',
      icon: 'none',
      duration: 2500
    })

    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  } catch (err) {
    uni.showToast({
      title: err?.message || '提交失败，请稍后再试',
      icon: 'none'
    })
  } finally {
    isSubmitting.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

function openPrivacyPolicy() {
  uni.navigateTo({ url: '/pages/webview/index?url=privacy' })
}

function openUserAgreement() {
  uni.navigateTo({ url: '/pages/webview/index?url=agreement' })
}
</script>

<style lang="scss">
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-text,
.top-placeholder {
  width: 120rpx;
  color: #8a7b6e;
  font-size: 28rpx;
}

.top-title {
  color: #2f241c;
  font-size: 34rpx;
  font-weight: 700;
}

.intro-card,
.status-card,
.form-card {
  margin-top: 28rpx;
  border-radius: 32rpx;
  padding: 30rpx;
}

.intro-title,
.status-title {
  display: block;
  color: #2f251d;
  font-size: 34rpx;
  font-weight: 700;
}

.intro-desc,
.status-desc {
  display: block;
  margin-top: 12rpx;
  color: #998d83;
  font-size: 26rpx;
  line-height: 1.7;
}

.status-title {
  color: #ff7a2f;
}

.field + .field {
  margin-top: 26rpx;
}

.field-label {
  display: block;
  color: #2f251d;
  font-size: 28rpx;
  font-weight: 700;
}

.field-input {
  width: 100%;
  margin-top: 14rpx;
  height: 88rpx;
  padding: 0 24rpx;
  line-height: 88rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.74);
  color: #3f3126;
  font-size: 26rpx;
}

.submit-button {
  margin-top: 32rpx;
  width: 100%;
  border-radius: 30rpx;
  padding: 30rpx 0;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
}

.privacy-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-top: 28rpx;
  padding: 0 4rpx;
}

.privacy-check {
  flex-shrink: 0;
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 2rpx solid #c4b8ac;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2rpx;
  transition: all 0.2s;
}

.privacy-check--active {
  border-color: transparent;
}

.privacy-check-icon {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 700;
}

.privacy-text {
  font-size: 22rpx;
  color: #998d83;
  line-height: 1.7;
}

.privacy-link {
  color: #ff7a2f;
  font-weight: 600;
}

// 城市选择器
.field-input--picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-input--placeholder {
  color: #b7ada4 !important;
}

.field-arrow {
  font-size: 32rpx;
  color: #b7ada4;
}

.city-picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.city-picker {
  width: 100%;
  max-height: 80vh;
  border-radius: 32rpx 32rpx 0 0;
  padding: 30rpx;
  display: flex;
  flex-direction: column;
}

.city-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.city-picker-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2f251d;
}

.city-picker-close {
  font-size: 36rpx;
  color: #999;
  padding: 10rpx;
}

.city-list {
  max-height: 55vh;
}

.city-group + .city-group {
  margin-top: 24rpx;
}

.city-group-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}

.city-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.city-item {
  padding: 14rpx 28rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.74);
  color: #3f3126;
  font-size: 26rpx;
}

.city-item--active {
  color: #ffffff !important;
}

.city-search-row {
  display: flex;
  gap: 16rpx;
}

.city-search-row--top {
  margin-bottom: 16rpx;
}

.city-search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.74);
  font-size: 26rpx;
}

.city-confirm-btn {
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: 18rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
}
</style>
