<template>
  <view class="page" :style="pageStyle">
    <view class="hero" :style="{ paddingTop: `${statusBarHeight + 16}px` }">
      <view class="chip-row">
        <view class="chip primary-chip" :style="accentFillStyle">{{ campusChipText }}</view>
        <view class="chip">🧠 {{ state.profile.mbti }}</view>
        <view class="chip">⭐ {{ state.profile.zodiac }}</view>
      </view>

      <text class="hero-title" :style="accentTextStyle">今天吃什么？</text>
      <text class="hero-subtitle">根据你的 MBTI 和星座，为你占卜今日美食</text>
    </view>

    <view class="fortune-card" :style="cardStyle">
      <view class="fortune-head">
        <view>
          <text class="fortune-date">{{ fortune.dateLabel }}</text>
          <text class="fortune-title">今日运势更新 🎉</text>
        </view>
        <view class="fortune-badge" :style="accentFillStyle">★</view>
      </view>

      <view class="fortune-grid">
        <view class="fortune-item">
          <text class="fortune-icon">🍽️</text>
          <text class="fortune-name">今日食欲</text>
          <text class="fortune-value" :style="accentTextStyle">{{ fortune.appetite }}</text>
        </view>
        <view class="fortune-item">
          <text class="fortune-icon">⚡</text>
          <text class="fortune-name">能量指数</text>
          <text class="fortune-value" :style="accentTextStyle">{{ fortune.energy }}</text>
        </view>
        <view class="fortune-item">
          <text class="fortune-icon">🌙</text>
          <text class="fortune-name">星座运势</text>
          <text class="fortune-value" :style="accentTextStyle">{{ fortune.luck }}</text>
        </view>
      </view>

      <view class="fortune-tip">
        <text>{{ fortune.moodText }}</text>
        <text>适合 {{ fortune.tasteText }} 风格的菜单</text>
      </view>
    </view>

    <button class="eat-button" :style="accentFillStyle" @click="handleDrawMeal">
      <text class="eat-button__label">吃什么</text>
    </button>

    <text class="quota-text">今日剩余 {{ state.daily.remaining }} 次占卜</text>

    <view class="proof-row">
      <text>🍜</text>
      <text>🍛</text>
      <text>🍚</text>
      <text>🥗</text>
      <text>🌮</text>
    </view>
    <text class="proof-text">已为 {{ servedCountText }} 位同学占卜今日美食 ✨</text>

    <view v-if="isDrawing" class="draw-mask">
      <view class="draw-panel" :style="cardStyle">
        <view class="draw-orbit">
          <view class="draw-orbit__ring"></view>
          <view class="draw-orbit__core" :style="accentFillStyle">🍽️</view>
          <view class="draw-float draw-float--one">盖饭</view>
          <view class="draw-float draw-float--two">粉面</view>
          <view class="draw-float draw-float--three">轻食</view>
        </view>
        <text class="draw-title">正在帮你占卜今天吃什么</text>
        <text class="draw-desc">AI 正在按你的 MBTI、星座和当前模式筛选推荐</text>
      </view>
    </view>

    <view v-if="showResultPopup && popupResult" class="result-popup-mask" @click="closeResultPopup">
      <view class="result-popup" :style="popupCardStyle" @click.stop>
        <view class="result-popup__glow"></view>
        <view class="result-popup__top">
          <text class="result-popup__tag">{{ state.mode === 'campus' ? '校园版推荐' : '普通版推荐' }}</text>
          <text class="result-popup__time">{{ popupResult.createdAt }}</text>
        </view>

        <text class="result-popup__name">{{ popupResult.mealName }}</text>
        <text class="result-popup__vibe">{{ popupResult.vibe }}</text>
        <text class="result-popup__meta">{{ popupResult.campusName }} · {{ popupResult.canteen }}</text>

        <view class="result-popup__divider"></view>

        <text class="result-popup__label">推荐理由</text>
        <text class="result-popup__reason">{{ popupResult.reason }}</text>

        <button class="result-popup__button" :style="accentFillStyle" @click="closeResultPopup">
          收下推荐
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import {
  applyTabBarTheme,
  drawMealResult,
  getAppState,
  getCampusById,
  getTheme,
  getTodayFortune
} from '@/utils/app-state.js'

const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
const state = ref(getAppState())
const isDrawing = ref(false)
const showResultPopup = ref(false)
const popupResult = ref(null)
let drawTimer = null

const refreshState = () => {
  state.value = getAppState()
  applyTabBarTheme(state.value.mode)
}

onLoad(() => {
  refreshState()
})

onShow(() => {
  refreshState()
})

onUnload(() => {
  if (drawTimer) {
    clearTimeout(drawTimer)
    drawTimer = null
  }
})

const theme = computed(() => getTheme(state.value.mode))
const fortune = computed(() => getTodayFortune(state.value))
const currentCampus = computed(() => getCampusById(state.value.campusId))
const servedCountText = computed(() => `${state.value.stats.servedCount}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','))
const campusChipText = computed(() => (
  state.value.mode === 'campus' ? `🏫 ${currentCampus.value.name}` : '🍐 普通版'
))

const pageStyle = computed(() => ({
  minHeight: '100vh',
  padding: '0 32rpx 180rpx',
  background: `linear-gradient(180deg, ${theme.value.pageStart} 0%, ${theme.value.pageEnd} 100%)`
}))

const cardStyle = computed(() => ({
  background: theme.value.card,
  boxShadow: theme.value.shadow,
  border: `1px solid ${theme.value.border}`
}))

const accentTextStyle = computed(() => ({
  color: theme.value.accent
}))

const accentFillStyle = computed(() => ({
  background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
  boxShadow: theme.value.shadow,
  color: '#ffffff'
}))

const popupCardStyle = computed(() => ({
  background: `linear-gradient(180deg, ${theme.value.card} 0%, #ffffff 100%)`,
  boxShadow: theme.value.shadow,
  border: `1px solid ${theme.value.border}`
}))

function handleDrawMeal() {
  if (isDrawing.value) {
    return
  }

  showResultPopup.value = false
  const drawResult = drawMealResult()
  state.value = drawResult.state
  applyTabBarTheme(drawResult.state.mode)

  if (drawResult.exhausted) {
    uni.showToast({
      title: '今天的占卜次数用完了',
      icon: 'none'
    })
    return
  }

  popupResult.value = drawResult.result
  isDrawing.value = true

  if (drawTimer) {
    clearTimeout(drawTimer)
  }

  drawTimer = setTimeout(() => {
    isDrawing.value = false
    showResultPopup.value = true
    drawTimer = null
  }, 1500)
}

function closeResultPopup() {
  showResultPopup.value = false
}
</script>

<style lang="scss">
.hero {
  padding-bottom: 24rpx;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.chip {
  display: flex;
  align-items: center;
  padding: 14rpx 26rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #806e61;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 10rpx 26rpx rgba(255, 255, 255, 0.35);
}

.primary-chip {
  color: #ffffff;
}

.hero-title {
  display: block;
  margin-top: 34rpx;
  font-size: 70rpx;
  line-height: 1.08;
  font-weight: 700;
}

.hero-subtitle {
  display: block;
  margin-top: 18rpx;
  color: #b0a59b;
  font-size: 30rpx;
  line-height: 1.6;
}

.fortune-card {
  padding: 34rpx 30rpx;
  border-radius: 34rpx;
}

.fortune-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.fortune-date {
  display: block;
  color: #b8a99c;
  font-size: 26rpx;
}

.fortune-title {
  display: block;
  margin-top: 12rpx;
  color: #3d3026;
  font-size: 42rpx;
  font-weight: 700;
}

.fortune-badge {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  text-align: center;
  line-height: 72rpx;
  font-size: 30rpx;
}

.fortune-grid {
  display: flex;
  justify-content: space-between;
  margin-top: 34rpx;
  gap: 12rpx;
}

.fortune-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.fortune-icon {
  font-size: 34rpx;
}

.fortune-name {
  color: #9e938a;
  font-size: 24rpx;
}

.fortune-value {
  font-size: 28rpx;
  font-weight: 700;
}

.fortune-tip {
  display: flex;
  justify-content: space-between;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid rgba(255, 255, 255, 0.65);
  color: #907f72;
  font-size: 24rpx;
}

.eat-button {
  width: 100%;
  margin-top: 32rpx;
  border-radius: 30rpx;
  padding: 30rpx 0;
  text-align: center;
}

.eat-button__label {
  color: #ffffff;
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
}

.quota-text {
  display: block;
  margin-top: 22rpx;
  text-align: center;
  color: #b8aca2;
  font-size: 26rpx;
}

.proof-row {
  display: flex;
  justify-content: center;
  gap: 28rpx;
  margin-top: 34rpx;
  font-size: 38rpx;
}

.proof-text {
  display: block;
  margin-top: 18rpx;
  text-align: center;
  color: #a5988e;
  font-size: 26rpx;
}

.draw-mask,
.result-popup-mask {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: rgba(48, 34, 21, 0.32);
  backdrop-filter: blur(10rpx);
  z-index: 999;
}

.draw-panel {
  width: 100%;
  max-width: 640rpx;
  padding: 52rpx 34rpx;
  border-radius: 40rpx;
  text-align: center;
}

.draw-orbit {
  position: relative;
  width: 260rpx;
  height: 260rpx;
  margin: 0 auto;
}

.draw-orbit__ring {
  position: absolute;
  inset: 18rpx;
  border-radius: 50%;
  border: 4rpx dashed rgba(255, 138, 61, 0.26);
  animation: orbitSpin 2.8s linear infinite;
}

.draw-orbit__core {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 116rpx;
  height: 116rpx;
  margin-left: -58rpx;
  margin-top: -58rpx;
  border-radius: 50%;
  font-size: 46rpx;
  animation: corePulse 1s ease-in-out infinite alternate;
}

.draw-float {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 94rpx;
  padding: 14rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
  color: #8f7c6f;
  font-size: 22rpx;
  box-shadow: 0 12rpx 28rpx rgba(255, 138, 61, 0.1);
}

.draw-float--one {
  top: 12rpx;
  left: 10rpx;
  animation: floatMove 1.2s ease-in-out infinite alternate;
}

.draw-float--two {
  top: 26rpx;
  right: 0;
  animation: floatMove 1.2s ease-in-out 0.2s infinite alternate;
}

.draw-float--three {
  bottom: 20rpx;
  left: 50%;
  margin-left: -54rpx;
  animation: floatMove 1.2s ease-in-out 0.35s infinite alternate;
}

.draw-title {
  display: block;
  margin-top: 32rpx;
  color: #35291f;
  font-size: 36rpx;
  font-weight: 700;
}

.draw-desc {
  display: block;
  margin-top: 14rpx;
  color: #9a8d82;
  font-size: 25rpx;
  line-height: 1.6;
}

.result-popup {
  position: relative;
  width: 100%;
  max-width: 650rpx;
  overflow: hidden;
  border-radius: 42rpx;
  padding: 34rpx 30rpx 30rpx;
  transform: translateY(0);
  animation: popupRise 0.35s ease-out;
}

.result-popup__glow {
  position: absolute;
  top: -90rpx;
  right: -50rpx;
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 165, 92, 0.24) 0%, rgba(255, 165, 92, 0) 70%);
}

.result-popup__top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.result-popup__tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.82);
  color: #9b8d80;
  font-size: 22rpx;
  font-weight: 600;
}

.result-popup__time {
  color: #b1a49a;
  font-size: 24rpx;
}

.result-popup__name {
  position: relative;
  display: block;
  margin-top: 20rpx;
  color: #2f251d;
  font-size: 50rpx;
  line-height: 1.18;
  font-weight: 700;
}

.result-popup__vibe {
  display: block;
  margin-top: 16rpx;
  color: #6f5d50;
  font-size: 30rpx;
  font-weight: 600;
}

.result-popup__meta {
  display: block;
  margin-top: 16rpx;
  color: #9b8d82;
  font-size: 26rpx;
  line-height: 1.6;
}

.result-popup__divider {
  height: 2rpx;
  margin-top: 26rpx;
  background: linear-gradient(90deg, rgba(255, 138, 61, 0) 0%, rgba(255, 138, 61, 0.3) 50%, rgba(255, 138, 61, 0) 100%);
}

.result-popup__label {
  display: block;
  margin-top: 24rpx;
  color: #8b7a6d;
  font-size: 24rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.result-popup__reason {
  display: block;
  margin-top: 16rpx;
  color: #6d5c50;
  font-size: 28rpx;
  line-height: 1.8;
}

.result-popup__button {
  margin-top: 28rpx;
  border-radius: 28rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  font-weight: 700;
}

@keyframes orbitSpin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes corePulse {
  from {
    transform: scale(0.96);
  }

  to {
    transform: scale(1.06);
  }
}

@keyframes floatMove {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(-10rpx);
  }
}

@keyframes popupRise {
  from {
    opacity: 0;
    transform: translateY(40rpx) scale(0.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
