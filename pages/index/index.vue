<template>
  <view class="page" :style="pageStyle">
    <view class="hero" :style="{ paddingTop: `${statusBarHeight + 16}px` }">
      <view class="chip-row">
        <view class="chip primary-chip press-feedback" :style="accentFillStyle" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="triggerChipBounce('campus')">
          <text class="chip-icon" :class="{ 'chip-icon--bouncing': bouncingChip === 'campus' }">{{ campusChipIcon }}</text>
          <text class="chip-label">{{ campusChipLabel }}</text>
        </view>
        <view class="chip press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="triggerChipBounce('mbti')">
          <text class="chip-icon" :class="{ 'chip-icon--bouncing': bouncingChip === 'mbti' }">🧠</text>
          <text class="chip-label">{{ state.profile.mbti }}</text>
        </view>
        <view class="chip press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="triggerChipBounce('zodiac')">
          <text class="chip-icon" :class="{ 'chip-icon--bouncing': bouncingChip === 'zodiac' }">⭐</text>
          <text class="chip-label">{{ state.profile.zodiac }}</text>
        </view>
      </view>

      <text class="hero-title" :style="accentTextStyle">今天吃什么？</text>
      <text class="hero-subtitle">按你的性格和星座，给今天挑一口更对味的。</text>
    </view>

    <view class="fortune-card" :style="cardStyle">
      <view class="fortune-glow"></view>

      <view class="fortune-head">
        <view class="fortune-head__copy">
          <text class="fortune-date">{{ fortune.dateLabel }}</text>
          <text class="fortune-title">今日运势更新</text>
          <text class="fortune-note">每天 00:00 自动更新，当天内容保持一致</text>
        </view>
        <view class="fortune-badge" :style="accentFillStyle">
          <text class="fortune-badge__icon">🎉</text>
        </view>
      </view>

      <view class="fortune-grid">
        <view class="fortune-item">
          <text class="fortune-icon fortune-icon--one">🍽️</text>
          <text class="fortune-name">今日食欲</text>
          <text class="fortune-value" :style="accentTextStyle">{{ fortune.appetite }}</text>
          <view class="fortune-mini-progress" :style="miniProgressTrackStyle">
            <view class="fortune-mini-progress__fill" :style="appetiteProgressStyle"></view>
          </view>
        </view>
        <view class="fortune-item">
          <text class="fortune-icon fortune-icon--two">⚡</text>
          <text class="fortune-name">能量指数</text>
          <text class="fortune-value" :style="accentTextStyle">{{ fortune.energy }}</text>
          <view class="fortune-mini-progress" :style="miniProgressTrackStyle">
            <view class="fortune-mini-progress__fill" :style="energyProgressStyle"></view>
          </view>
        </view>
        <view class="fortune-item">
          <text class="fortune-icon fortune-icon--three">🌙</text>
          <text class="fortune-name">星座运势</text>
          <text class="fortune-value" :style="accentTextStyle">{{ fortune.luck }}</text>
          <view class="fortune-mini-progress" :style="miniProgressTrackStyle">
            <view class="fortune-mini-progress__fill" :style="luckProgressStyle"></view>
          </view>
        </view>
      </view>

      <view class="fortune-tip">
        <text>{{ fortune.moodText }}</text>
        <text>适合 {{ fortune.tasteText }} 风格的菜</text>
      </view>
    </view>

    <button class="eat-button press-feedback" :style="accentFillStyle" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="handleDrawMeal">
      <text class="eat-button__label">吃什么</text>
    </button>

    <view class="proof-row">
      <text>🍜</text>
      <text>🍛</text>
      <text>🍚</text>
      <text>🥗</text>
      <text>🌮</text>
    </view>
    <text class="proof-text">已经陪 {{ servedCountText }} 位同学挑过今天这一口 ✨</text>

    <view v-if="isDrawing" class="draw-mask">
      <view class="draw-panel" :style="cardStyle">
        <view class="draw-orbit">
          <view class="draw-orbit__ring"></view>
          <view class="draw-orbit__core" :style="accentFillStyle">🍽️</view>
          <view class="draw-float draw-float--one">盖饭</view>
          <view class="draw-float draw-float--two">粉面</view>
          <view class="draw-float draw-float--three">轻食</view>
        </view>
        <text class="draw-title">正在替你揭晓今天吃什么</text>
        <text class="draw-desc">会结合 MBTI、星座和当前模式，帮你筛出今天更顺口的一份推荐。</text>
      </view>
    </view>

    <view v-if="showResultPopup && popupResult" class="result-popup-mask" @click="closeResultPopup">
      <view class="result-popup" :style="popupCardStyle" @click.stop>
        <view class="result-popup__glow"></view>
        <view class="result-popup__top">
          <text class="result-popup__tag">{{ state.mode === 'campus' ? '校园版推荐' : '普通版推荐' }}</text>
          <text class="result-popup__time">{{ popupResult.createdAt }}</text>
        </view>

        <view class="result-popup__reveal" :class="{ 'is-visible': popupRevealStage >= 1 }">
          <text class="result-popup__name">{{ popupResult.mealName }}</text>
          <text class="result-popup__vibe">{{ popupResult.vibe }}</text>
        </view>

        <view class="result-popup__meta-wrap" :class="{ 'is-visible': popupRevealStage >= 2 }">
          <text class="result-popup__meta">{{ popupResult.campusName }} · {{ popupResult.canteen }}</text>
          <view class="result-popup__divider"></view>
          <text class="result-popup__label">今天就吃它</text>
          <text class="result-popup__reason">{{ popupRevealReason }}</text>
        </view>

        <button class="result-popup__button press-feedback" :style="accentFillStyle" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="closeResultPopup">收下推荐</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { appetiteLabels, energyLevelLabels, luckLabels } from '@/common/data.js'
import { applyTabBarTheme, drawMealResult, getAppState, getCampusById, getTheme, getTodayFortune } from '@/utils/app-state.js'

const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
const state = ref(getAppState())
const isDrawing = ref(false)
const showResultPopup = ref(false)
const popupResult = ref(null)
const popupRevealStage = ref(0)
const bouncingChip = ref('')
const animatedAppetiteProgress = ref(0)
const animatedEnergyProgress = ref(0)
const animatedLuckProgress = ref(0)

let drawTimer = null
let revealTimerOne = null
let revealTimerTwo = null
let progressTimer = null
let chipBounceTimer = null

const theme = computed(() => getTheme(state.value.mode))
const fortune = computed(() => getTodayFortune(state.value))
const currentCampus = computed(() => getCampusById(state.value.campusId))
const servedCountText = computed(() => `${state.value.stats.servedCount}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','))
const campusChipIcon = computed(() => (state.value.mode === 'campus' ? '🏫' : '🍃'))
const campusChipLabel = computed(() => (state.value.mode === 'campus' ? currentCampus.value.name : '普通版'))

function getLevelProgress(label, labels) {
  const index = labels.indexOf(label)
  return index < 0 ? 50 : Math.round(((index + 1) / labels.length) * 100)
}

const appetiteProgress = computed(() => getLevelProgress(fortune.value.appetite, appetiteLabels))
const energyProgress = computed(() => getLevelProgress(fortune.value.energy, energyLevelLabels))
const luckProgress = computed(() => getLevelProgress(fortune.value.luck, luckLabels))

function clearRevealTimers() {
  if (drawTimer) clearTimeout(drawTimer)
  if (revealTimerOne) clearTimeout(revealTimerOne)
  if (revealTimerTwo) clearTimeout(revealTimerTwo)
  drawTimer = null
  revealTimerOne = null
  revealTimerTwo = null
}

function clearProgressTimer() {
  if (progressTimer) clearTimeout(progressTimer)
  progressTimer = null
}

function clearChipBounceTimer() {
  if (chipBounceTimer) clearTimeout(chipBounceTimer)
  chipBounceTimer = null
}

function animateFortuneProgress() {
  clearProgressTimer()
  animatedAppetiteProgress.value = 0
  animatedEnergyProgress.value = 0
  animatedLuckProgress.value = 0

  progressTimer = setTimeout(() => {
    animatedAppetiteProgress.value = appetiteProgress.value
    animatedEnergyProgress.value = energyProgress.value
    animatedLuckProgress.value = luckProgress.value
    progressTimer = null
  }, 40)
}

function refreshState() {
  state.value = getAppState()
  applyTabBarTheme(state.value.mode)
  animateFortuneProgress()
}

function buildRevealReason(result) {
  if (!result) return ''
  return state.value.mode === 'campus'
    ? `${result.canteen} 这口最对你今天的状态。`
    : `${result.vibe}，今天就该吃这一口。`
}

function buildMiniProgressStyle(percent) {
  const isCampusMode = state.value.mode === 'campus'
  return {
    width: `${percent}%`,
    background: isCampusMode
      ? 'linear-gradient(90deg, #67b6a0 0%, #67b6a0 100%)'
      : 'linear-gradient(90deg, #ff9b5a 0%, #ff7a2f 100%)',
    boxShadow: isCampusMode
      ? '0 6rpx 14rpx rgba(103, 182, 160, 0.18)'
      : '0 6rpx 14rpx rgba(255, 122, 47, 0.18)'
  }
}

const miniProgressTrackStyle = computed(() => (
  state.value.mode === 'campus'
    ? { background: 'rgba(103, 182, 160, 0.18)', boxShadow: 'inset 0 0 0 1rpx rgba(103, 182, 160, 0.08)' }
    : { background: 'rgba(255, 122, 47, 0.14)', boxShadow: 'inset 0 0 0 1rpx rgba(255, 122, 47, 0.06)' }
))

const popupRevealReason = computed(() => buildRevealReason(popupResult.value))
const appetiteProgressStyle = computed(() => buildMiniProgressStyle(animatedAppetiteProgress.value))
const energyProgressStyle = computed(() => buildMiniProgressStyle(animatedEnergyProgress.value))
const luckProgressStyle = computed(() => buildMiniProgressStyle(animatedLuckProgress.value))

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

const accentTextStyle = computed(() => ({ color: theme.value.accent }))
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

function triggerChipBounce(type) {
  clearChipBounceTimer()
  bouncingChip.value = type
  chipBounceTimer = setTimeout(() => {
    bouncingChip.value = ''
    chipBounceTimer = null
  }, 420)
}

function handleDrawMeal() {
  if (isDrawing.value) return

  clearRevealTimers()
  popupRevealStage.value = 0
  showResultPopup.value = false

  const drawResult = drawMealResult()
  state.value = drawResult.state
  applyTabBarTheme(drawResult.state.mode)
  animateFortuneProgress()

  if (drawResult.exhausted) {
    uni.showToast({ title: '今天的占卜次数用完了', icon: 'none' })
    return
  }

  popupResult.value = drawResult.result
  isDrawing.value = true

  drawTimer = setTimeout(() => {
    isDrawing.value = false
    showResultPopup.value = true
    popupRevealStage.value = 1
    drawTimer = null

    revealTimerOne = setTimeout(() => {
      popupRevealStage.value = 2
      revealTimerOne = null
    }, 220)
  }, 1500)
}

function closeResultPopup() {
  showResultPopup.value = false
  popupRevealStage.value = 0
  clearRevealTimers()
}

onLoad(refreshState)
onShow(refreshState)
onUnload(() => {
  clearRevealTimers()
  clearProgressTimer()
  clearChipBounceTimer()
})
</script>

<style lang="scss">
.hero { padding-bottom: 24rpx; }
.chip-row { display: flex; flex-wrap: wrap; gap: 16rpx; }
.chip { display: inline-flex; align-items: center; gap: 10rpx; padding: 14rpx 26rpx; border-radius: 999rpx; background: rgba(255,255,255,0.72); color: #806e61; font-size: 24rpx; font-weight: 600; box-shadow: 0 10rpx 26rpx rgba(255,255,255,0.35); }
.primary-chip { color: #ffffff; }
.chip-icon { display: inline-flex; align-items: center; justify-content: center; width: 34rpx; height: 34rpx; border-radius: 18rpx; font-size: 22rpx; transform-origin: center; }
.chip-icon--bouncing { animation: chipBounceTap 0.38s ease-out; }
.chip-label { line-height: 1; }
.hero-title { display: block; margin-top: 34rpx; font-size: 70rpx; line-height: 1.08; font-weight: 700; }
.hero-subtitle { display: block; margin-top: 18rpx; color: #b0a59b; font-size: 30rpx; line-height: 1.6; }
.fortune-card { position: relative; overflow: hidden; padding: 34rpx 30rpx; border-radius: 34rpx; }
.fortune-glow { position: absolute; top: -60rpx; right: -40rpx; width: 220rpx; height: 220rpx; border-radius: 50%; background: radial-gradient(circle, rgba(255,167,102,0.18) 0%, rgba(255,167,102,0) 72%); pointer-events: none; }
.fortune-head, .fortune-grid, .fortune-tip { position: relative; z-index: 1; }
.fortune-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.fortune-head__copy { flex: 1; }
.fortune-date { display: block; color: #b8a99c; font-size: 26rpx; }
.fortune-title { display: block; margin-top: 12rpx; color: #3d3026; font-size: 42rpx; font-weight: 700; animation: titleBreath 2.3s ease-in-out infinite; transform-origin: left center; }
.fortune-note { display: block; margin-top: 10rpx; color: rgba(176,165,155,0.82); font-size: 20rpx; line-height: 1.4; }
.fortune-badge { display: flex; align-items: center; justify-content: center; width: 72rpx; height: 72rpx; border-radius: 50%; }
.fortune-badge__icon { font-size: 30rpx; animation: confettiWiggle 1.8s ease-in-out infinite; }
.fortune-grid { display: flex; justify-content: space-between; margin-top: 18rpx; gap: 12rpx; }
.fortune-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10rpx; padding-top: 8rpx; }
.fortune-icon { font-size: 34rpx; }
.fortune-icon--one { animation: iconBounce 1.9s ease-in-out infinite; }
.fortune-icon--two { animation: iconBounce 1.9s ease-in-out 0.18s infinite; }
.fortune-icon--three { animation: iconBounce 1.9s ease-in-out 0.36s infinite; }
.fortune-name { color: #9e938a; font-size: 24rpx; }
.fortune-value { font-size: 28rpx; font-weight: 700; }
.fortune-mini-progress { width: 100%; height: 14rpx; margin-top: 12rpx; border-radius: 999rpx; overflow: hidden; }
.fortune-mini-progress__fill { height: 100%; border-radius: inherit; transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1); animation: progressGlow 2.2s ease-in-out infinite; }
.fortune-tip { display: flex; justify-content: space-between; margin-top: 28rpx; padding-top: 24rpx; border-top: 2rpx solid rgba(255,255,255,0.65); color: #907f72; font-size: 24rpx; }
.eat-button { width: 100%; margin-top: 32rpx; border-radius: 30rpx; padding: 30rpx 0; text-align: center; }
.eat-button__label { color: #ffffff; font-size: 40rpx; font-weight: 700; letter-spacing: 8rpx; }
.proof-row { display: flex; justify-content: center; gap: 28rpx; margin-top: 34rpx; font-size: 38rpx; }
.proof-text { display: block; margin-top: 18rpx; text-align: center; color: #a5988e; font-size: 26rpx; }
.draw-mask, .result-popup-mask { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding: 32rpx; background: rgba(48,34,21,0.32); backdrop-filter: blur(10rpx); z-index: 999; }
.draw-panel { width: 100%; max-width: 640rpx; padding: 52rpx 34rpx; border-radius: 40rpx; text-align: center; }
.draw-orbit { position: relative; width: 260rpx; height: 260rpx; margin: 0 auto; }
.draw-orbit__ring { position: absolute; inset: 18rpx; border-radius: 50%; border: 4rpx dashed rgba(255,138,61,0.26); animation: orbitSpin 2.8s linear infinite; }
.draw-orbit__core { position: absolute; top: 50%; left: 50%; display: flex; align-items: center; justify-content: center; width: 116rpx; height: 116rpx; margin-left: -58rpx; margin-top: -58rpx; border-radius: 50%; font-size: 46rpx; animation: corePulse 1s ease-in-out infinite alternate; }
.draw-float { position: absolute; display: inline-flex; align-items: center; justify-content: center; min-width: 94rpx; padding: 14rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,0.88); color: #8f7c6f; font-size: 22rpx; box-shadow: 0 12rpx 28rpx rgba(255,138,61,0.1); }
.draw-float--one { top: 12rpx; left: 10rpx; animation: floatMove 1.2s ease-in-out infinite alternate; }
.draw-float--two { top: 26rpx; right: 0; animation: floatMove 1.2s ease-in-out 0.2s infinite alternate; }
.draw-float--three { bottom: 20rpx; left: 50%; margin-left: -54rpx; animation: floatMove 1.2s ease-in-out 0.35s infinite alternate; }
.draw-title { display: block; margin-top: 32rpx; color: #35291f; font-size: 36rpx; font-weight: 700; }
.draw-desc { display: block; margin-top: 14rpx; color: #9a8d82; font-size: 25rpx; line-height: 1.6; }
.result-popup { position: relative; width: 100%; max-width: 650rpx; overflow: hidden; border-radius: 42rpx; padding: 34rpx 30rpx 30rpx; animation: popupRise 0.35s ease-out; }
.result-popup__glow { position: absolute; top: -90rpx; right: -50rpx; width: 240rpx; height: 240rpx; border-radius: 50%; background: radial-gradient(circle, rgba(255,165,92,0.24) 0%, rgba(255,165,92,0) 70%); }
.result-popup__top, .result-popup__reveal, .result-popup__meta-wrap { position: relative; z-index: 1; }
.result-popup__top { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.result-popup__tag { display: inline-flex; align-items: center; justify-content: center; padding: 10rpx 18rpx; border-radius: 22rpx; background: rgba(255,255,255,0.82); color: #9b8d80; font-size: 22rpx; font-weight: 600; }
.result-popup__time { color: #b1a49a; font-size: 24rpx; }
.result-popup__reveal, .result-popup__meta-wrap { opacity: 0; transform: translateY(18rpx); }
.result-popup__reveal.is-visible, .result-popup__meta-wrap.is-visible { opacity: 1; transform: translateY(0); transition: all 0.28s ease-out; }
.result-popup__name { display: block; margin-top: 24rpx; color: #2f251d; font-size: 64rpx; line-height: 1.1; font-weight: 700; }
.result-popup__vibe { display: block; margin-top: 14rpx; color: #6f5d50; font-size: 30rpx; font-weight: 600; }
.result-popup__meta { display: block; margin-top: 22rpx; color: #9b8d82; font-size: 26rpx; line-height: 1.6; }
.result-popup__divider { height: 2rpx; margin-top: 24rpx; background: linear-gradient(90deg, rgba(255,138,61,0) 0%, rgba(255,138,61,0.3) 50%, rgba(255,138,61,0) 100%); }
.result-popup__label { display: block; margin-top: 22rpx; color: #8b7a6d; font-size: 24rpx; font-weight: 700; letter-spacing: 2rpx; }
.result-popup__reason { display: block; margin-top: 14rpx; color: #4d3a2e; font-size: 34rpx; line-height: 1.45; font-weight: 700; }
.result-popup__button { margin-top: 30rpx; border-radius: 28rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; font-weight: 700; }
@keyframes chipBounceTap { 0% { transform: scale(1); } 35% { transform: translateY(-4rpx) scale(1.14); } 60% { transform: translateY(1rpx) scale(0.96); } 100% { transform: translateY(0) scale(1); } }
@keyframes titleBreath { 0%, 100% { opacity: 0.92; transform: scale(1); } 50% { opacity: 1; transform: scale(1.03); } }
@keyframes confettiWiggle { 0%, 100% { transform: rotate(0deg) scale(1); } 25% { transform: rotate(-10deg) scale(1.06); } 50% { transform: rotate(8deg) scale(1.12); } 75% { transform: rotate(-6deg) scale(1.04); } }
@keyframes iconBounce { 0%, 55%, 100% { transform: translateY(0); } 20% { transform: translateY(-10rpx) scale(1.08); } 36% { transform: translateY(2rpx) scale(0.98); } }
@keyframes progressGlow { 0%, 100% { filter: saturate(1) brightness(1); } 50% { filter: saturate(1.12) brightness(1.05); } }
@keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes corePulse { from { transform: scale(0.96); } to { transform: scale(1.06); } }
@keyframes floatMove { from { transform: translateY(0); } to { transform: translateY(-10rpx); } }
@keyframes popupRise { from { opacity: 0; transform: translateY(40rpx) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
