<template>
  <view class="page" :style="pageStyle">
    <view class="top-bar" :style="{ paddingTop: `${statusBarHeight + 12}px` }">
      <text class="back-text" @click="goBack">‹ 返回</text>
      <text class="top-title">校园服务</text>
      <text class="top-placeholder"></text>
    </view>

    <view class="hero-card" :style="cardStyle">
      <text class="hero-title">🏫 校园专属服务</text>
      <text class="hero-desc">{{ isCampusMode ? `当前学校：${currentCampus.name}` : '当前还是普通模式' }}</text>
      <text class="hero-tip">{{ isCampusMode ? '会按你当前选择的学校，自动展示对应的校园服务。' : '切换到校园模式后，这里才会出现学校专属服务。' }}</text>
      <view v-if="isCampusMode" class="campus-badge">
        <text class="campus-badge__text">{{ currentCampus.name }}</text>
      </view>
    </view>

    <view v-if="isCampusMode && serviceList.length" class="service-grid">
      <view
        v-for="service in serviceList"
        :key="service.id"
        class="service-card press-feedback"
        :style="cardStyle"
        hover-class="press-feedback--active"
        hover-start-time="20"
        hover-stay-time="90"
        @click="openServiceDetail(service)"
      >
        <view class="service-icon-wrap" :style="iconWrapStyle">
          <text class="service-icon">{{ service.icon }}</text>
        </view>
        <text class="service-name">{{ service.name }}</text>
        <text class="service-remark">{{ service.remark }}</text>
        <text class="service-link">点开看看详情</text>
      </view>
    </view>

    <view v-else class="empty-card" :style="cardStyle">
      <text class="empty-title">{{ isCampusMode ? '这所学校暂时还没有校园服务' : '校园服务仅在校园模式下显示' }}</text>
      <text class="empty-desc">{{ isCampusMode ? '后面接入后台后，这里会按学校自动补齐更多服务内容。' : '你可以先去切换校园版，再回来看看学校专属服务。' }}</text>
    </view>

    <view v-if="activeService" class="service-detail-mask" @click="closeServiceDetail">
      <view class="service-detail-sheet" :style="cardStyle" @click.stop>
        <view class="sheet-handle"></view>
        <view class="sheet-head">
          <view class="sheet-icon-wrap" :style="iconWrapStyle">
            <text class="sheet-icon">{{ activeService.icon }}</text>
          </view>
          <view class="sheet-head-copy">
            <text class="sheet-title">{{ activeService.name }}</text>
            <text class="sheet-subtitle">{{ activeService.remark }}</text>
          </view>
        </view>

        <text class="sheet-desc">{{ activeService.description || activeService.remark }}</text>

        <view v-if="activeService.detailTips && activeService.detailTips.length" class="sheet-tips">
          <text v-for="tip in activeService.detailTips" :key="tip" class="sheet-tip">
            {{ tip }}
          </text>
        </view>

        <view class="sheet-note">
          <text class="sheet-note__title">咨询前的小提示</text>
          <text class="sheet-note__desc">{{ activeService.consultHint || '会通过微信里的官方客服能力继续沟通。' }}</text>
        </view>

        <!-- #ifdef MP-WEIXIN -->
        <button class="sheet-action sheet-action--primary press-feedback" open-type="contact" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90">
          立即咨询
        </button>
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <button class="sheet-action sheet-action--primary press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="handleConsultFallback">
          立即咨询
        </button>
        <!-- #endif -->

        <button class="sheet-action sheet-action--ghost press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="closeServiceDetail">
          先看看
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { campusServiceMap } from '@/common/data.js'
import { getAppState, getCampusById, getTheme } from '@/utils/app-state.js'

const statusBarHeight = uni.getWindowInfo().statusBarHeight || 20
const state = ref(getAppState())

const refreshPage = () => {
  state.value = getAppState()
}

let hasLoaded = false

onLoad(() => {
  refreshPage()
})

onShow(() => {
  if (!hasLoaded) {
    hasLoaded = true
    return
  }
  refreshPage()
})

const isCampusMode = computed(() => state.value.mode === 'campus')
const theme = computed(() => getTheme(state.value.mode))
const currentCampus = computed(() => getCampusById(state.value.campusId))
const serviceList = computed(() => campusServiceMap[currentCampus.value.name] || [])
const activeService = ref(null)

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

const iconWrapStyle = computed(() => ({
  background: theme.value.accentSoft,
  border: `1px solid ${theme.value.border}`
}))

function goBack() {
  uni.navigateBack()
}

function openServiceDetail(service) {
  activeService.value = service
}

function closeServiceDetail() {
  activeService.value = null
}

function handleConsultFallback() {
  uni.showToast({
    title: '请在微信小程序里使用咨询入口',
    icon: 'none'
  })
}
</script>

<style lang="scss">
.top-bar { display: flex; align-items: center; justify-content: space-between; }
.back-text, .top-placeholder { width: 120rpx; color: #8a7b6e; font-size: 28rpx; }
.top-title { color: #2f241c; font-size: 34rpx; font-weight: 700; }
.hero-card, .empty-card { margin-top: 28rpx; border-radius: 32rpx; padding: 30rpx; }
.hero-title, .empty-title { display: block; color: #2f251d; font-size: 34rpx; font-weight: 700; }
.hero-desc, .hero-tip, .empty-desc { display: block; margin-top: 12rpx; color: #988d83; font-size: 26rpx; line-height: 1.6; }
.campus-badge { display: inline-flex; align-items: center; margin-top: 22rpx; padding: 12rpx 20rpx; border-radius: 22rpx; background: rgba(255,255,255,0.72); }
.campus-badge__text { color: #3d5b53; font-size: 24rpx; font-weight: 700; }
.service-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20rpx; margin-top: 28rpx; }
.service-card { min-height: 240rpx; border-radius: 30rpx; padding: 28rpx 24rpx; }
.service-icon-wrap { display: inline-flex; align-items: center; justify-content: center; width: 78rpx; height: 78rpx; border-radius: 24rpx; }
.service-icon { font-size: 36rpx; }
.service-name { display: block; margin-top: 18rpx; color: #2f251d; font-size: 30rpx; font-weight: 700; line-height: 1.4; }
.service-remark { display: block; margin-top: 10rpx; color: #93867b; font-size: 24rpx; line-height: 1.6; }
.service-link { display: block; margin-top: 18rpx; color: #67b6a0; font-size: 22rpx; font-weight: 600; }
.empty-card { text-align: center; }
.service-detail-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  background: rgba(47, 37, 29, 0.22);
  padding: 24rpx;
  box-sizing: border-box;
}
.service-detail-sheet {
  width: 100%;
  border-radius: 36rpx;
  padding: 22rpx 28rpx 30rpx;
  box-sizing: border-box;
}
.sheet-handle {
  width: 88rpx;
  height: 8rpx;
  border-radius: 999rpx;
  margin: 0 auto 20rpx;
  background: rgba(152, 141, 131, 0.28);
}
.sheet-head {
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.sheet-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92rpx;
  height: 92rpx;
  border-radius: 28rpx;
  flex-shrink: 0;
}
.sheet-icon {
  font-size: 42rpx;
}
.sheet-head-copy {
  min-width: 0;
  flex: 1;
}
.sheet-title {
  display: block;
  color: #2f251d;
  font-size: 34rpx;
  font-weight: 700;
}
.sheet-subtitle {
  display: block;
  margin-top: 8rpx;
  color: #93867b;
  font-size: 24rpx;
  line-height: 1.5;
}
.sheet-desc {
  display: block;
  margin-top: 22rpx;
  color: #4d4137;
  font-size: 27rpx;
  line-height: 1.75;
}
.sheet-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 20rpx;
}
.sheet-tip {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.74);
  color: #5c6c66;
  font-size: 23rpx;
}
.sheet-note {
  margin-top: 22rpx;
  padding: 22rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.72);
}
.sheet-note__title {
  display: block;
  color: #2f251d;
  font-size: 26rpx;
  font-weight: 700;
}
.sheet-note__desc {
  display: block;
  margin-top: 10rpx;
  color: #8b8076;
  font-size: 24rpx;
  line-height: 1.65;
}
.sheet-action {
  width: 100%;
  margin-top: 18rpx;
  border-radius: 24rpx;
  font-size: 28rpx;
  line-height: 92rpx;
}
.sheet-action::after {
  border: 0;
}
.sheet-action--primary {
  color: #ffffff;
  background: linear-gradient(135deg, #67b6a0, #4f9f8a);
  box-shadow: 0 18rpx 38rpx rgba(103, 182, 160, 0.24);
}
.sheet-action--ghost {
  color: #6f6258;
  background: rgba(255, 255, 255, 0.78);
}
</style>
