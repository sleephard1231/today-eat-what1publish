<template>
  <view class="page" :style="pageStyle">
    <view class="profile-card profile-card--top" :style="[cardStyle, { marginTop: `${statusBarHeight + 16}px` }]">
      <view class="profile-top">
        <view class="avatar" :style="accentFillStyle">🍚</view>
        <view class="profile-copy">
          <text class="nickname">{{ state.profile.nickname }}的干饭人主页</text>
          <text class="signature">把偏好和校园设置好，今天吃什么就会更准一点。</text>
        </view>
      </view>

      <view class="picker-row">
        <view class="picker-item press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="openMbtiPopup">
          <view class="picker-chip picker-chip--detail" :style="pickerChipStyle">
            <text class="picker-chip__emoji">{{ currentMbtiCard.emoji }}</text>
            <view class="picker-chip__body">
              <text class="picker-chip__title">{{ currentMbtiCard.value }}</text>
              <text class="picker-chip__desc">{{ currentMbtiCard.funAlias }}</text>
            </view>
          </view>
        </view>
        <view class="picker-item press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="openZodiacPopup">
          <view class="picker-chip picker-chip--detail" :style="pickerChipStyle">
            <text class="picker-chip__emoji">{{ currentZodiacCard.emoji }}</text>
            <view class="picker-chip__body">
              <text class="picker-chip__title">{{ currentZodiacCard.value }}</text>
              <text class="picker-chip__desc">{{ currentZodiacCard.funAlias }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <text class="section-label">当前状态</text>
    <view class="section-card" :style="cardStyle">
      <view class="row-item press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="goCampusPage">
        <view>
          <view class="row-title-row">
            <text class="row-title">🏫 当前校园</text>
            <text v-if="isCampusMode" class="mode-pill" :style="modePillStyle">校园</text>
          </view>
          <text v-if="isCampusMode" class="campus-name">{{ currentCampus.name }}</text>
          <text class="row-desc">{{ campusDescription }}</text>
        </view>
        <text class="row-action" :style="accentTextStyle">切换</text>
      </view>
    </view>

    <text class="section-label">常用功能</text>
    <view class="section-card" :style="cardStyle">
      <view class="row-item press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="goHistoryPage">
        <view>
          <text class="row-title">🧾 占卜历史记录</text>
          <text class="row-desc">看看最近都吃了什么，也方便回头翻一翻。</text>
        </view>
        <view class="count-badge" :style="accentFillStyle">{{ historyCount }}</view>
      </view>
    </view>

    <template v-if="isCampusMode">
      <text class="section-label">校园功能</text>
      <view class="section-card" :style="cardStyle">
        <view class="row-item press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="goCanteenPage">
          <view>
            <text class="row-title">🍚 校园饭堂</text>
            <text class="row-desc">先圈出常去的饭堂，让推荐范围更贴近你。</text>
          </view>
          <text class="row-action" :style="accentTextStyle">进入</text>
        </view>

        <view class="row-item press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="goJoinPage">
          <view>
            <text class="row-title">📝 校园入驻申请</text>
            <text class="row-desc">提交学校信息后，会进入后台审核流程。</text>
          </view>
          <view class="count-badge" :style="accentFillStyle">{{ applicationCount }}</view>
        </view>
      </view>

      <view class="service-entry press-feedback" :style="serviceEntryStyle" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="goServicePage">
        <view class="service-entry__copy">
          <text class="service-entry__eyebrow">🏫 校园专属服务</text>
          <text class="service-entry__title">按当前学校解锁对应服务</text>
          <text class="service-entry__desc">会根据你选中的学校，自动显示可用的校园生活服务。</text>
        </view>
        <text class="service-entry__action" :style="serviceEntryActionStyle">进入</text>
      </view>
    </template>

    <view v-if="showMbtiPopup" class="sheet-mask" @click="cancelMbtiSelection">
      <view class="sheet-panel" :style="sheetStyle" @click.stop>
        <view class="sheet-handle"></view>
        <text class="sheet-title">✨ 选择你的专属人格</text>
        <view class="sheet-grid">
          <view v-for="(item, index) in mbtiCardOptions" :key="item.value" class="select-card press-feedback" :style="[selectorCardStyle(pendingMbti === item.value), cardEntranceStyle(index)]" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="pendingMbti = item.value">
            <text class="select-card__emoji">{{ item.emoji }}</text>
            <text class="select-card__title" :style="selectorTitleStyle(pendingMbti === item.value)">{{ item.value }}</text>
            <text class="select-card__official" :style="selectorSubStyle(pendingMbti === item.value)">{{ item.officialName }}</text>
            <text class="select-card__alias" :style="selectorAliasStyle(pendingMbti === item.value)">{{ item.funAlias }}</text>
          </view>
        </view>
        <view class="sheet-actions">
          <button class="sheet-button sheet-button--ghost press-feedback" @click="cancelMbtiSelection">取消</button>
          <button class="sheet-button sheet-button--solid press-feedback" :style="accentFillStyle" @click="confirmMbtiSelection">确定</button>
        </view>
      </view>
    </view>

    <view v-if="showZodiacPopup" class="sheet-mask" @click="cancelZodiacSelection">
      <view class="sheet-panel" :style="sheetStyle" @click.stop>
        <view class="sheet-handle"></view>
        <text class="sheet-title">✨ 选择你的星座气质</text>
        <view class="sheet-grid">
          <view v-for="(item, index) in zodiacCardOptions" :key="item.value" class="select-card press-feedback" :style="[selectorCardStyle(pendingZodiac === item.value), cardEntranceStyle(index)]" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="pendingZodiac = item.value">
            <text class="select-card__emoji">{{ item.emoji }}</text>
            <text class="select-card__title" :style="selectorTitleStyle(pendingZodiac === item.value)">{{ item.value }}</text>
            <text class="select-card__official" :style="selectorSubStyle(pendingZodiac === item.value)">{{ item.officialName }}</text>
            <text class="select-card__alias" :style="selectorAliasStyle(pendingZodiac === item.value)">{{ item.funAlias }}</text>
          </view>
        </view>
        <view class="sheet-actions">
          <button class="sheet-button sheet-button--ghost press-feedback" @click="cancelZodiacSelection">取消</button>
          <button class="sheet-button sheet-button--solid press-feedback" :style="accentFillStyle" @click="confirmZodiacSelection">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { mbtiCardOptions, zodiacCardOptions } from '@/common/data.js'
import { applyTabBarTheme, getAppState, getCampusApplications, getCampusById, getHistoryList, getSelectedCanteen, getTheme, saveAppState } from '@/utils/app-state.js'

const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
const state = ref(getAppState())
const historyCount = ref(0)
const applicationCount = ref(0)
const showMbtiPopup = ref(false)
const showZodiacPopup = ref(false)
const pendingMbti = ref(state.value.profile.mbti)
const pendingZodiac = ref(state.value.profile.zodiac)

const refreshState = () => {
  state.value = getAppState()
  historyCount.value = getHistoryList().length
  applicationCount.value = getCampusApplications().length
  pendingMbti.value = state.value.profile.mbti
  pendingZodiac.value = state.value.profile.zodiac
  applyTabBarTheme(state.value.mode)
}

onLoad(refreshState)
onShow(refreshState)

const theme = computed(() => getTheme(state.value.mode))
const currentCampus = computed(() => getCampusById(state.value.campusId))
const currentMbtiCard = computed(() => mbtiCardOptions.find((item) => item.value === state.value.profile.mbti) || mbtiCardOptions[0])
const currentZodiacCard = computed(() => zodiacCardOptions.find((item) => item.value === state.value.profile.zodiac) || zodiacCardOptions[0])
const isCampusMode = computed(() => state.value.mode === 'campus')

const selectedCanteenText = computed(() => {
  const selected = getSelectedCanteen(state.value.campusId)
  return selected.length ? selected.map((item) => item.name).join('、') : '默认全校饭堂'
})

const campusDescription = computed(() => (
  state.value.mode === 'campus' ? selectedCanteenText.value : '普通版已开启，会优先推荐附近的人气选择。'
))

const pageStyle = computed(() => ({
  minHeight: '100vh',
  padding: '0 32rpx 160rpx',
  background: `linear-gradient(180deg, ${theme.value.pageStart} 0%, ${theme.value.pageEnd} 100%)`
}))

const cardStyle = computed(() => ({
  background: theme.value.card,
  boxShadow: theme.value.shadow,
  border: `1px solid ${theme.value.border}`
}))

const sheetStyle = computed(() => ({
  background: theme.value.card,
  boxShadow: theme.value.shadow
}))

const accentFillStyle = computed(() => ({
  background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
  color: '#ffffff'
}))

const accentTextStyle = computed(() => ({ color: theme.value.accent }))

const modePillStyle = computed(() => ({
  color: theme.value.accent,
  background: theme.value.accentSoft,
  border: `1px solid ${theme.value.border}`
}))

const pickerChipStyle = computed(() => ({ color: theme.value.accent }))

const serviceEntryStyle = computed(() => ({
  background: `linear-gradient(135deg, ${theme.value.cardStrong} 0%, ${theme.value.card} 100%)`,
  boxShadow: theme.value.shadow,
  border: `1px solid ${theme.value.border}`
}))

const serviceEntryActionStyle = computed(() => ({
  background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
  boxShadow: theme.value.shadow,
  color: '#ffffff'
}))

function selectorCardStyle(isActive) {
  return {
    background: isActive ? `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)` : theme.value.accentSoft,
    boxShadow: isActive ? theme.value.shadow : 'none',
    border: `1px solid ${isActive ? theme.value.accent : theme.value.border}`
  }
}

function selectorTitleStyle(isActive) {
  return { color: isActive ? '#ffffff' : '#33271f' }
}

function selectorSubStyle(isActive) {
  return { color: isActive ? 'rgba(255,255,255,0.92)' : '#7f6f63' }
}

function selectorAliasStyle(isActive) {
  return { color: isActive ? 'rgba(255,255,255,0.82)' : '#a59487' }
}

function cardEntranceStyle(index) {
  return { animationDelay: `${index * 100}ms` }
}

function openMbtiPopup() {
  pendingMbti.value = state.value.profile.mbti
  showMbtiPopup.value = true
}

function cancelMbtiSelection() {
  showMbtiPopup.value = false
  pendingMbti.value = state.value.profile.mbti
}

function confirmMbtiSelection() {
  handleMbtiChange(pendingMbti.value)
  showMbtiPopup.value = false
}

function openZodiacPopup() {
  pendingZodiac.value = state.value.profile.zodiac
  showZodiacPopup.value = true
}

function cancelZodiacSelection() {
  showZodiacPopup.value = false
  pendingZodiac.value = state.value.profile.zodiac
}

function confirmZodiacSelection() {
  handleZodiacChange(pendingZodiac.value)
  showZodiacPopup.value = false
}

function handleMbtiChange(nextMbti) {
  state.value = saveAppState({ profile: { mbti: nextMbti } })
  pendingMbti.value = nextMbti
  uni.showToast({ title: `MBTI 已切换为 ${nextMbti}`, icon: 'none' })
}

function handleZodiacChange(nextZodiac) {
  state.value = saveAppState({ profile: { zodiac: nextZodiac } })
  pendingZodiac.value = nextZodiac
  uni.showToast({ title: `星座已切换为 ${nextZodiac}`, icon: 'none' })
}

function goCampusPage() {
  uni.navigateTo({ url: '/pages/campus/select' })
}

function goHistoryPage() {
  uni.navigateTo({ url: '/pages/history/index' })
}

function goCanteenPage() {
  uni.navigateTo({ url: '/pages/canteen/canteen' })
}

function goServicePage() {
  uni.navigateTo({ url: '/pages/service/service' })
}

function goJoinPage() {
  uni.navigateTo({ url: '/pages/campus/join' })
}
</script>

<style lang="scss">
.profile-card, .section-card { border-radius: 34rpx; padding: 30rpx; }
.profile-card--top { margin-top: 0; }
.section-label { display: block; margin: 30rpx 6rpx 14rpx; color: #aa9c90; font-size: 22rpx; letter-spacing: 2rpx; }
.section-card { margin-top: 0; }
.service-entry { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; margin-top: 24rpx; border-radius: 34rpx; padding: 34rpx 30rpx; }
.service-entry__copy { flex: 1; }
.service-entry__eyebrow, .service-entry__title, .service-entry__desc { display: block; }
.service-entry__eyebrow { color: #2f251d; font-size: 32rpx; font-weight: 700; }
.service-entry__title { margin-top: 14rpx; color: #3c3027; font-size: 30rpx; font-weight: 700; }
.service-entry__desc { margin-top: 12rpx; color: #96897e; font-size: 25rpx; line-height: 1.6; }
.service-entry__action { flex-shrink: 0; padding: 18rpx 24rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 700; }
.profile-top { display: flex; align-items: center; gap: 22rpx; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; text-align: center; line-height: 96rpx; font-size: 40rpx; font-weight: 700; }
.profile-copy { flex: 1; }
.nickname { display: block; color: #32271f; font-size: 38rpx; font-weight: 700; line-height: 1.35; }
.signature { display: block; margin-top: 10rpx; color: #a89a8d; font-size: 26rpx; line-height: 1.6; }
.picker-row { display: flex; gap: 18rpx; margin-top: 28rpx; }
.picker-item { flex: 1; }
.picker-chip { border-radius: 28rpx; background: rgba(255,255,255,0.72); text-align: center; font-size: 28rpx; font-weight: 700; }
.picker-chip--detail { display: flex; align-items: center; gap: 16rpx; min-height: 116rpx; padding: 20rpx 24rpx; text-align: left; }
.picker-chip__emoji { flex-shrink: 0; font-size: 40rpx; }
.picker-chip__body { min-width: 0; }
.picker-chip__title, .picker-chip__desc { display: block; }
.picker-chip__title { color: #32271f; font-size: 30rpx; font-weight: 700; }
.picker-chip__desc { margin-top: 6rpx; color: #9f9388; font-size: 22rpx; line-height: 1.4; }
.row-item { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 12rpx 0; }
.row-item + .row-item { margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid rgba(255,255,255,0.65); }
.row-title { display: block; color: #2f251d; font-size: 32rpx; font-weight: 700; }
.row-title-row { display: flex; align-items: center; gap: 14rpx; }
.mode-pill { display: inline-flex; align-items: center; justify-content: center; padding: 8rpx 18rpx; border-radius: 22rpx; font-size: 22rpx; font-weight: 700; }
.campus-name { display: block; margin-top: 14rpx; color: #2f251d; font-size: 36rpx; font-weight: 700; line-height: 1.3; }
.row-desc { display: block; margin-top: 12rpx; color: #9f9388; font-size: 25rpx; line-height: 1.5; }
.row-action { font-size: 30rpx; font-weight: 700; }
.count-badge { min-width: 56rpx; height: 56rpx; padding: 0 16rpx; border-radius: 22rpx; text-align: center; line-height: 56rpx; font-size: 26rpx; font-weight: 700; }
.sheet-mask { position: fixed; inset: 0; display: flex; align-items: flex-end; justify-content: center; background: rgba(61,45,31,0.26); z-index: 999; }
.sheet-panel { width: 100%; max-height: 72vh; display: flex; flex-direction: column; border-radius: 40rpx 40rpx 0 0; padding: 18rpx 24rpx calc(28rpx + env(safe-area-inset-bottom)); }
.sheet-handle { width: 84rpx; height: 8rpx; margin: 0 auto; border-radius: 999rpx; background: rgba(156,139,126,0.28); }
.sheet-title { display: block; margin-top: 20rpx; text-align: center; color: #2f251d; font-size: 34rpx; font-weight: 700; }
.sheet-grid { display: grid; flex: 1; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16rpx; margin-top: 28rpx; overflow-y: auto; }
.select-card { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-height: 188rpx; padding: 18rpx 12rpx 16rpx; border-radius: 26rpx; text-align: center; opacity: 0; transform: translateY(24rpx); animation: cardFadeUp 0.45s ease-out forwards; }
.select-card__emoji { font-size: 34rpx; }
.select-card__title, .select-card__official, .select-card__alias { display: block; width: 100%; }
.select-card__title { margin-top: 10rpx; font-size: 26rpx; font-weight: 700; line-height: 1.3; }
.select-card__official { margin-top: 8rpx; font-size: 22rpx; line-height: 1.35; }
.select-card__alias { margin-top: 6rpx; font-size: 20rpx; line-height: 1.35; }
.sheet-actions { display: flex; gap: 18rpx; margin-top: 30rpx; }
.sheet-button { flex: 1; height: 88rpx; border-radius: 26rpx; text-align: center; line-height: 88rpx; font-size: 30rpx; font-weight: 700; }
.sheet-button--ghost { background: rgba(255,255,255,0.82); color: #7d6c60; }
.sheet-button--solid { color: #ffffff; }
@keyframes cardFadeUp { from { opacity: 0; transform: translateY(24rpx); } to { opacity: 1; transform: translateY(0); } }
</style>
