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

      <view class="field">
        <text class="field-label">所在城市</text>
        <input
          v-model="form.city"
          class="field-input"
          placeholder="例如：广州"
          placeholder-style="color:#b7ada4;font-size:26rpx;"
          @input="markDraftDirty"
        />
      </view>

      <view class="field">
        <text class="field-label">联系人</text>
        <input
          v-model="form.contactName"
          class="field-input"
          placeholder="例如：校园运营同学"
          placeholder-style="color:#b7ada4;font-size:26rpx;"
          @input="markDraftDirty"
        />
      </view>

      <view class="field">
        <text class="field-label">联系方式</text>
        <input
          v-model="form.contact"
          class="field-input"
          placeholder="微信 / 手机号都可以"
          placeholder-style="color:#b7ada4;font-size:26rpx;"
          @input="markDraftDirty"
        />
      </view>
    </view>

    <button class="submit-button" :style="accentFillStyle" @click="submitForm">
      {{ isDraftSaved ? '提交到后台' : '保存申请内容' }}
    </button>
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

const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
const state = ref(getAppState())
const isDraftSaved = ref(false)
const form = reactive({
  campusName: '',
  campusTag: '',
  city: '',
  contactName: '',
  contact: ''
})

onLoad(() => {
  state.value = getAppState()
  hydrateDraft()
})

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
  form.contactName = draft.contactName || ''
  form.contact = draft.contact || ''
  isDraftSaved.value = Boolean(draft.campusName || draft.contact)
}

function markDraftDirty() {
  if (isDraftSaved.value) {
    isDraftSaved.value = false
  }
}

function validateForm() {
  if (!form.campusName || !form.contact) {
    uni.showToast({
      title: '请至少填校园名称和联系方式',
      icon: 'none'
    })
    return false
  }

  return true
}

function submitForm() {
  if (!validateForm()) {
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

  submitCampusApplication({
    ...form
  })
  clearCampusApplicationDraft()

  uni.showToast({
    title: '已提交到后台，当前为待审核',
    icon: 'none'
  })

  setTimeout(() => {
    uni.navigateBack()
  }, 500)
}

function goBack() {
  uni.navigateBack()
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
</style>
