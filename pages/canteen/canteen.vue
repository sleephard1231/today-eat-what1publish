<template>
  <view class="page" :style="pageStyle">
    <view class="top-bar" :style="{ paddingTop: `${statusBarHeight + 12}px` }">
      <text class="back-text" @click="goBack">‹ 返回</text>
      <text class="top-title">校园饭堂</text>
      <text class="top-placeholder"></text>
    </view>

    <view v-if="state.mode === 'campus'" class="hero-card" :style="cardStyle">
      <text class="hero-title">今天想去哪家饭堂吃饭？</text>
      <text class="hero-desc">{{ currentCampus.name }} · {{ currentCampusLabel }}</text>
      <text class="hero-tip">想缩小推荐范围时再勾选就好；如果不选，系统会默认全校饭堂都可推荐。</text>

      <view class="selection-state" :style="selectionStateStyle">
        <view class="selection-state__head">
          <text class="selection-state__title">{{ selectionStateTitle }}</text>
          <text class="selection-state__badge" :style="selectionStatusBadgeStyle">{{ selectionStatusText }}</text>
        </view>
        <text class="selection-state__desc">{{ selectionStateDesc }}</text>
      </view>

      <text class="section-title section-title--inside">饭堂列表</text>
      <text class="section-desc">选中后，AI 会优先在这些饭堂里帮你挑更合适的菜。</text>

      <view v-if="canteenList.length" class="canteen-list">
        <view v-for="canteen in canteenList" :key="canteen.id" class="canteen-card press-feedback" :style="canteenCardStyle(isSelected(canteen.id))" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="handleSelectCanteen(canteen)">
          <view v-if="isSelected(canteen.id)" class="canteen-card__glow" :style="canteenGlowStyle"></view>
          <view class="canteen-card__head">
            <view class="canteen-card__copy">
              <text class="canteen-name" :style="canteenTitleStyle(isSelected(canteen.id))">{{ canteen.name }}</text>
              <text class="canteen-remark" :style="canteenSubStyle(isSelected(canteen.id))">{{ canteen.remark }}</text>
            </view>
            <view class="canteen-badge" :style="canteenBadgeStyle(isSelected(canteen.id))">{{ isSelected(canteen.id) ? '已选' : '可选' }}</view>
          </view>
        </view>
      </view>

      <view v-else class="empty-card">
        <text class="empty-title">这所学校还没有配置饭堂数据</text>
        <text class="empty-desc">后面接入后台后，这里会按学校自动展示对应饭堂。</text>
      </view>
    </view>

    <view v-if="state.mode === 'campus'" class="action-row">
      <button class="clear-button press-feedback" :style="ghostButtonStyle" @click="handleClearSelection">恢复默认范围</button>
      <button class="save-button press-feedback" :style="saveButtonStyle" @click="handleSaveSelection">保存选择</button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { clearSelectedCanteen, getAppState, getCampusById, getCanteenListByCampusName, getSelectedCanteen, getTheme, saveSelectedCanteen } from '@/utils/app-state.js'

const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
const state = ref(getAppState())
const selectedCanteens = ref([])
const savedCanteens = ref([])

const refreshPage = () => {
  state.value = getAppState()
  const stored = getSelectedCanteen(state.value.campusId)
  savedCanteens.value = stored
  selectedCanteens.value = [...stored]
}

onLoad(refreshPage)
onShow(refreshPage)

const theme = computed(() => getTheme(state.value.mode))
const currentCampus = computed(() => getCampusById(state.value.campusId))
const currentCampusLabel = computed(() => currentCampus.value.campusTag || '校园版')
const canteenList = computed(() => getCanteenListByCampusName(currentCampus.value.name))

function normalizeSelection(list) {
  return [...list].map((item) => item.id).sort().join('|')
}

const hasPendingChanges = computed(() => normalizeSelection(selectedCanteens.value) !== normalizeSelection(savedCanteens.value))
const selectionStatusText = computed(() => (hasPendingChanges.value ? '未保存' : '已保存'))

const selectionStateTitle = computed(() => {
  if (!selectedCanteens.value.length) return '当前未限制饭堂，默认全校可推荐'
  return `当前选了 ${selectedCanteens.value.length} 个饭堂`
})

const selectionStateDesc = computed(() => {
  if (hasPendingChanges.value) {
    return selectedCanteens.value.length
      ? `你刚改了范围，记得点保存后才会正式生效：${selectedCanteens.value.map((item) => item.name).join('、')}`
      : '你刚恢复成默认范围，记得点保存后才会正式生效。'
  }

  if (!savedCanteens.value.length) {
    return '当前已经生效：系统会在这所学校的全部饭堂范围内为你推荐。'
  }

  return `当前已经生效：AI 会优先在 ${savedCanteens.value.map((item) => item.name).join('、')} 里推荐。`
})

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

const selectionAccent = computed(() => (state.value.mode === 'campus' ? '#2e9f82' : '#ff7a2f'))
const selectionSoft = computed(() => (state.value.mode === 'campus' ? '#e8f5f2' : '#fff0df'))

const selectionStateStyle = computed(() => ({
  background: hasPendingChanges.value ? selectionSoft.value : 'rgba(255, 255, 255, 0.82)',
  border: `1px solid ${hasPendingChanges.value ? selectionAccent.value : theme.value.border}`
}))

const selectionStatusBadgeStyle = computed(() => ({
  background: hasPendingChanges.value ? selectionSoft.value : 'rgba(255, 255, 255, 0.9)',
  color: selectionAccent.value,
  border: `1px solid ${hasPendingChanges.value ? selectionAccent.value : theme.value.border}`
}))

const ghostButtonStyle = computed(() => ({
  background: theme.value.accentSoft,
  color: theme.value.accent,
  border: `1px solid ${theme.value.border}`
}))

const canteenGlowStyle = computed(() => ({
  background: state.value.mode === 'campus'
    ? 'radial-gradient(circle, rgba(103, 182, 160, 0.18) 0%, rgba(103, 182, 160, 0) 72%)'
    : 'radial-gradient(circle, rgba(255, 156, 91, 0.24) 0%, rgba(255, 156, 91, 0) 72%)'
}))

const saveButtonStyle = computed(() => ({
  background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
  color: '#ffffff',
  boxShadow: theme.value.shadow
}))

function canteenCardStyle(isActive) {
  return {
    position: 'relative',
    overflow: 'hidden',
    background: isActive ? selectionSoft.value : '#ffffff',
    boxShadow: isActive ? theme.value.shadow : '0 10rpx 24rpx rgba(43, 34, 27, 0.04)',
    border: `1px solid ${isActive ? selectionAccent.value : 'rgba(187, 186, 181, 0.35)'}`,
    transform: isActive ? 'translateY(-2rpx)' : 'translateY(0)'
  }
}

function canteenTitleStyle(isActive) {
  return { color: isActive ? selectionAccent.value : '#2f251d' }
}

function canteenSubStyle(isActive) {
  return { color: isActive ? selectionAccent.value : '#8f8278' }
}

function canteenBadgeStyle(isActive) {
  return {
    background: isActive ? selectionAccent.value : selectionSoft.value,
    color: isActive ? '#ffffff' : selectionAccent.value,
    border: `1px solid ${isActive ? selectionAccent.value : 'transparent'}`
  }
}

function handleSelectCanteen(canteen) {
  const exists = selectedCanteens.value.some((item) => item.id === canteen.id)

  if (exists) {
    selectedCanteens.value = selectedCanteens.value.filter((item) => item.id !== canteen.id)
    return
  }

  selectedCanteens.value = [...selectedCanteens.value, { id: canteen.id, name: canteen.name }]
}

function handleClearSelection() {
  selectedCanteens.value = []
  uni.showToast({ title: '已恢复默认范围', icon: 'none' })
}

function isSelected(canteenId) {
  return selectedCanteens.value.some((item) => item.id === canteenId)
}

function handleSaveSelection() {
  const canteenNames = selectedCanteens.value.map((item) => item.name)
  const content = canteenNames.length
    ? `确认只在这些饭堂里推荐吗？\n${canteenNames.join('、')}`
    : '确认恢复默认范围吗？\n保存后会在当前学校全部饭堂范围内推荐。'

  uni.showModal({
    title: '确认保存',
    content,
    confirmText: '保存',
    success: ({ confirm }) => {
      if (!confirm) {
        selectedCanteens.value = [...savedCanteens.value]
        return
      }

      if (selectedCanteens.value.length) {
        saveSelectedCanteen(state.value.campusId, selectedCanteens.value)
      } else {
        clearSelectedCanteen(state.value.campusId)
      }

      savedCanteens.value = [...selectedCanteens.value]
      uni.showToast({ title: selectedCanteens.value.length ? '饭堂偏好已保存' : '已恢复默认范围', icon: 'none' })
    }
  })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss">
.top-bar { display: flex; align-items: center; justify-content: space-between; }
.back-text, .top-placeholder { width: 120rpx; color: #8a7b6e; font-size: 28rpx; }
.top-title { color: #2f241c; font-size: 34rpx; font-weight: 700; }
.hero-card { margin-top: 28rpx; border-radius: 32rpx; padding: 30rpx; }
.hero-title, .section-title { display: block; color: #2f251d; font-size: 34rpx; font-weight: 700; }
.section-title--inside { margin-top: 26rpx; }
.hero-desc, .hero-tip, .section-desc, .empty-desc { display: block; margin-top: 12rpx; color: #988d83; font-size: 26rpx; line-height: 1.6; }
.selection-state { margin-top: 24rpx; border-radius: 24rpx; padding: 22rpx 24rpx; }
.selection-state__head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.selection-state__title { display: block; color: #3c3027; font-size: 28rpx; font-weight: 700; }
.selection-state__badge { display: inline-flex; align-items: center; justify-content: center; min-width: 88rpx; padding: 8rpx 18rpx; border-radius: 22rpx; font-size: 22rpx; font-weight: 700; }
.selection-state__desc { display: block; margin-top: 10rpx; color: #907f72; font-size: 24rpx; line-height: 1.6; }
.canteen-list { margin-top: 24rpx; }
.canteen-card { border-radius: 28rpx; padding: 28rpx; transition: all 0.2s ease; }
.canteen-card + .canteen-card { margin-top: 18rpx; }
.canteen-card__glow { position: absolute; top: -50rpx; right: -40rpx; width: 180rpx; height: 180rpx; border-radius: 50%; }
.canteen-card__head { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.canteen-card__copy { flex: 1; }
.canteen-name, .empty-title { display: block; font-size: 32rpx; font-weight: 700; }
.canteen-remark { display: block; margin-top: 12rpx; font-size: 24rpx; line-height: 1.5; }
.canteen-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 86rpx; padding: 10rpx 18rpx; border-radius: 22rpx; font-size: 22rpx; font-weight: 700; }
.empty-card { margin-top: 22rpx; border-radius: 24rpx; padding: 28rpx; background: rgba(255,255,255,0.82); text-align: center; }
.action-row { display: flex; gap: 18rpx; margin-top: 32rpx; }
.clear-button, .save-button { flex: 1; height: 92rpx; border-radius: 30rpx; text-align: center; line-height: 92rpx; font-size: 30rpx; font-weight: 700; }
</style>
