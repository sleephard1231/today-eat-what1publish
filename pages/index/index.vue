<template>
  <view class="page" :style="pageStyle">
    <view class="hero" :style="{ paddingTop: `${statusBarHeight + 16}px` }">
      <view class="chip-row">
        <view
          class="chip primary-chip press-feedback"
          :style="accentFillStyle"
          hover-class="press-feedback--active"
          hover-start-time="20"
          hover-stay-time="90"
          @click="triggerChipBounce('campus')"
        >
          <text class="chip-icon" :class="{ 'chip-icon--bouncing': bouncingChip === 'campus' }">{{ campusChipIcon }}</text>
          <text class="chip-label">{{ campusChipLabel }}</text>
        </view>
        <view
          class="chip press-feedback"
          hover-class="press-feedback--active"
          hover-start-time="20"
          hover-stay-time="90"
          @click="triggerChipBounce('mbti')"
        >
          <text class="chip-icon" :class="{ 'chip-icon--bouncing': bouncingChip === 'mbti' }">🧠</text>
          <text class="chip-label">{{ state.profile.mbti }}</text>
        </view>
        <view
          class="chip press-feedback"
          hover-class="press-feedback--active"
          hover-start-time="20"
          hover-stay-time="90"
          @click="triggerChipBounce('zodiac')"
        >
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

    <button
      class="eat-button press-feedback"
      :style="accentFillStyle"
      hover-class="press-feedback--active"
      hover-start-time="20"
      hover-stay-time="90"
      @click="handleDrawMeal"
    >
      <text class="eat-button__label">吃什么</text>
    </button>

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

        <view class="result-popup__reveal is-visible">
          <text class="result-popup__name">{{ popupResult.mealName }}</text>
          <text class="result-popup__vibe-badge" :style="vibeBadgeStyle">{{ popupResult.vibe }}</text>
        </view>

        <view class="result-popup__meta-wrap is-visible">
          <text v-if="popupMetaText" class="result-popup__meta">{{ popupMetaText }}</text>
          <view class="result-popup__divider"></view>
          <text class="result-popup__label">推荐理由</text>
          <text class="result-popup__reason">{{ popupRevealReason }}</text>
        </view>

        <button
          class="result-popup__button press-feedback"
          :style="accentFillStyle"
          hover-class="press-feedback--active"
          hover-start-time="20"
          hover-stay-time="90"
          @click="closeResultPopup"
        >今天吃它</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { appetiteLabels, energyLevelLabels, luckLabels } from '@/common/data.js'
import { aiPickFromCandidates, applyTabBarTheme, drawMealResultAsync, getAppState, getCampusById, getTheme, getTodayFortune, updateLatestMealResult } from '@/utils/app-state.js'

const statusBarHeight = uni.getWindowInfo().statusBarHeight || 20
const state = ref(getAppState())
const isDrawing = ref(false)
const showResultPopup = ref(false)
const popupResult = ref(null)
const bouncingChip = ref('')
const animatedAppetiteProgress = ref(0)
const animatedEnergyProgress = ref(0)
const animatedLuckProgress = ref(0)

let drawTimer = null
let progressTimer = null
let chipBounceTimer = null

const theme = computed(() => getTheme(state.value.mode))
const fortune = computed(() => getTodayFortune(state.value))
const currentCampus = computed(() => getCampusById(state.value.campusId))
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
  drawTimer = null
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

  if (result.reason) {
    return result.reason
  }

  if (state.value.mode === 'campus') {
    return `${result.canteen || '这家饭堂'} 这口，会比较对你今天的状态。`
  }

  return `${result.mealName} 今天会比平时更顺口。`
}

function buildMiniProgressStyle(percent) {
  const t = theme.value
  return {
    width: `${percent}%`,
    background: `linear-gradient(90deg, ${t.accent} 0%, ${t.accentDeep} 100%)`,
    boxShadow: `0 6rpx 14rpx ${t.accent}30`
  }
}

const miniProgressTrackStyle = computed(() => {
  const t = theme.value
  return {
    background: `${t.accent}24`,
    boxShadow: `inset 0 0 0 1rpx ${t.accent}14`
  }
})

const popupRevealReason = computed(() => buildRevealReason(popupResult.value))
const popupMetaText = computed(() => {
  if (!popupResult.value) return ''
  if (popupResult.value.mode !== 'campus') return ''
  return [popupResult.value.campusName, popupResult.value.canteen].filter(Boolean).join(' · ')
})
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
const vibeBadgeStyle = computed(() => {
  const t = theme.value
  return {
    color: t.accentDeep,
    background: `${t.accent}20`
  }
})

function triggerChipBounce(type) {
  clearChipBounceTimer()
  bouncingChip.value = type
  chipBounceTimer = setTimeout(() => {
    bouncingChip.value = ''
    chipBounceTimer = null
  }, 420)
}

function applyAiPick(aiPick, candidates) {
  if (!aiPick?.isAI || !popupResult.value) return
  const chosen = candidates[aiPick.choice] || candidates[0]
  popupResult.value = {
    ...popupResult.value,
    mealName: chosen.name,
    vibe: chosen.vibe,
    canteen: popupResult.value.mode === 'campus' ? (chosen.canteen || popupResult.value.canteen) : '',
    source: chosen.source || popupResult.value.source,
    dishId: chosen.id || popupResult.value.dishId,
    stallId: chosen.stallId || popupResult.value.stallId,
    stallName: chosen.stallName || popupResult.value.stallName,
    category: chosen.category || popupResult.value.category,
    price: chosen.price || popupResult.value.price,
    reason: aiPick.reason
  }
  updateLatestMealResult(popupResult.value)
}

async function handleDrawMeal() {
  if (isDrawing.value) return

  clearRevealTimers()
  showResultPopup.value = false

  const drawResult = await drawMealResultAsync()
  state.value = drawResult.state
  applyTabBarTheme(drawResult.state.mode)
  animateFortuneProgress()

  if (drawResult.exhausted) {
    uni.showToast({ title: '今天的使用次数用完了', icon: 'none' })
    return
  }

  popupResult.value = drawResult.result
  isDrawing.value = true

  drawTimer = setTimeout(() => {
    isDrawing.value = false
    showResultPopup.value = true
    drawTimer = null
  }, 1500)

  aiPickFromCandidates({
    candidates: drawResult.candidates,
    state: drawResult.state,
    fortune: fortune.value,
    seed: drawResult.seed,
    selectedCanteenNames: drawResult.selectedCanteenNames
  }).then((aiPick) => {
    applyAiPick(aiPick, drawResult.candidates)
  }).catch((err) => {
    console.warn('[index] ai pick failed', err?.message || err)
  })
}

function closeResultPopup() {
  showResultPopup.value = false
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
.fortune-title { display: block; margin-top: 12rpx; color: #3d3026; font-size: 42rpx; font-weight: 700; transform-origin: left center; }
.fortune-note { display: block; margin-top: 10rpx; color: rgba(176,165,155,0.82); font-size: 20rpx; line-height: 1.4; }
.fortune-badge { display: flex; align-items: center; justify-content: center; width: 72rpx; height: 72rpx; border-radius: 50%; }
.fortune-badge__icon { font-size: 30rpx; }
.fortune-grid { display: flex; justify-content: space-between; margin-top: 18rpx; gap: 12rpx; }
.fortune-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10rpx; padding-top: 8rpx; }
.fortune-icon { font-size: 34rpx; }
.fortune-icon--one { animation: iconBounce 1.9s ease-in-out infinite; }
.fortune-name { color: #9e938a; font-size: 24rpx; }
.fortune-value { font-size: 28rpx; font-weight: 700; }
.fortune-mini-progress { width: 100%; height: 14rpx; margin-top: 12rpx; border-radius: 999rpx; overflow: hidden; }
.fortune-mini-progress__fill { height: 100%; border-radius: inherit; transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
.fortune-tip { display: flex; justify-content: space-between; margin-top: 28rpx; padding-top: 24rpx; border-top: 2rpx solid rgba(255,255,255,0.65); color: #907f72; font-size: 24rpx; }

.eat-button { width: 100%; margin-top: 32rpx; border-radius: 30rpx; padding: 30rpx 0; text-align: center; }
.eat-button__label { color: #ffffff; font-size: 40rpx; font-weight: 700; letter-spacing: 8rpx; }

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
.result-popup__name { display: block; margin-top: 24rpx; color: #2f251d; font-size: 72rpx; line-height: 1.04; font-weight: 800; letter-spacing: -1rpx; }
.result-popup__vibe-badge { display: inline-flex; align-items: center; justify-content: center; margin-top: 18rpx; padding: 10rpx 20rpx; border-radius: 18rpx; font-size: 24rpx; font-weight: 700; }
.result-popup__meta { display: block; margin-top: 24rpx; color: #aa9d93; font-size: 24rpx; line-height: 1.5; }
.result-popup__divider { height: 2rpx; margin-top: 24rpx; background: linear-gradient(90deg, rgba(255,138,61,0) 0%, rgba(255,138,61,0.22) 50%, rgba(255,138,61,0) 100%); }
.result-popup__label { display: block; margin-top: 22rpx; color: #9f9185; font-size: 22rpx; font-weight: 700; letter-spacing: 2rpx; }
.result-popup__reason { display: block; margin-top: 14rpx; color: #403127; font-size: 32rpx; line-height: 1.6; font-weight: 600; }
.result-popup__button { margin-top: 32rpx; border-radius: 28rpx; height: 92rpx; line-height: 92rpx; font-size: 30rpx; font-weight: 700; letter-spacing: 4rpx; }

@keyframes chipBounceTap {
  0% { transform: scale(1); }
  35% { transform: translateY(-4rpx) scale(1.14); }
  60% { transform: translateY(1rpx) scale(0.96); }
  100% { transform: translateY(0) scale(1); }
}

@keyframes iconBounce {
  0%, 55%, 100% { transform: translateY(0); }
  20% { transform: translateY(-10rpx) scale(1.08); }
  36% { transform: translateY(2rpx) scale(0.98); }
}

@keyframes orbitSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes corePulse {
  from { transform: scale(0.96); }
  to { transform: scale(1.06); }
}

@keyframes floatMove {
  from { transform: translateY(0); }
  to { transform: translateY(-10rpx); }
}

@keyframes popupRise {
  from { opacity: 0; transform: translateY(40rpx) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
