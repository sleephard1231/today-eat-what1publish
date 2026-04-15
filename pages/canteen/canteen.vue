<template>
  <view class="page" :style="pageStyle">
    <view class="top-bar" :style="{ paddingTop: `${statusBarHeight + 12}px` }">
      <text class="back-text" @click="goBack">‹ 返回</text>
      <text class="top-title">校园饭堂</text>
      <text class="top-placeholder"></text>
    </view>

    <view v-if="state.mode === 'campus'" class="hero-card" :style="cardStyle">
      <text class="hero-title">选择今天去哪个饭堂吃饭？</text>
      <text class="hero-desc">{{ currentCampus.name }} · {{ currentCampusLabel }}</text>
      <text class="hero-tip">如果你选了饭堂，AI 只会在你选择的饭堂里为你推荐菜品，最多可选 3 个。</text>
      <text class="section-title section-title--inside">饭堂列表</text>
      <text class="section-desc">每个学校对应一套独立饭堂数据，可单选，也可以多选最多 3 个</text>

      <view v-if="canteenList.length" class="canteen-list">
        <view
          v-for="canteen in canteenList"
          :key="canteen.id"
          class="canteen-card"
          :style="canteenCardStyle(isSelected(canteen.id))"
          @click="handleSelectCanteen(canteen)"
        >
          <view class="canteen-card__head">
            <view>
              <text class="canteen-name" :style="canteenTitleStyle(isSelected(canteen.id))">
                {{ canteen.name }}
              </text>
              <text class="canteen-remark" :style="canteenSubStyle(isSelected(canteen.id))">
                {{ canteen.remark }}
              </text>
            </view>
            <text v-if="isSelected(canteen.id)" class="canteen-badge">已选</text>
          </view>
        </view>
      </view>

      <view v-else class="empty-card">
        <text class="empty-title">当前学校还没有配置饭堂数据</text>
        <text class="empty-desc">后面接入后端后，这里会按学校动态返回饭堂列表。</text>
      </view>
    </view>

    <view v-if="state.mode === 'campus'" class="action-row">
      <button class="clear-button" :style="ghostButtonStyle" @click="handleClearSelection">清除选择</button>
      <button class="save-button" :style="saveButtonStyle" @click="handleSaveSelection">保存选择</button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  clearSelectedCanteen,
  getAppState,
  getCampusById,
  getCanteenListByCampusName,
  getSelectedCanteen,
  getTheme,
  saveSelectedCanteen
} from '@/utils/app-state.js'

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

onLoad(() => {
  refreshPage()
})

onShow(() => {
  refreshPage()
})

const theme = computed(() => getTheme(state.value.mode))
const currentCampus = computed(() => getCampusById(state.value.campusId))
const currentCampusLabel = computed(() => currentCampus.value.campusTag || (currentCampus.value.canteen || '校园版推荐'))
const canteenList = computed(() => getCanteenListByCampusName(currentCampus.value.name))

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

const ghostButtonStyle = computed(() => ({
  background: theme.value.accentSoft,
  color: theme.value.accent,
  border: `1px solid ${theme.value.border}`
}))

const saveButtonStyle = computed(() => ({
  background: 'linear-gradient(135deg, #ff9c5b 0%, #ff7a34 100%)',
  color: '#ffffff',
  boxShadow: '0 18rpx 44rpx rgba(255, 138, 61, 0.18)'
}))

function canteenCardStyle(isActive) {
  return {
    background: isActive
      ? 'linear-gradient(135deg, #ff9c5b 0%, #ff7a34 100%)'
      : theme.value.accentSoft,
    boxShadow: isActive ? '0 18rpx 44rpx rgba(255, 138, 61, 0.18)' : 'none',
    border: `1px solid ${isActive ? '#ff8a3d' : theme.value.border}`
  }
}

function canteenTitleStyle(isActive) {
  return {
    color: isActive ? '#ffffff' : '#2f251d'
  }
}

function canteenSubStyle(isActive) {
  return {
    color: isActive ? 'rgba(255,255,255,0.88)' : '#8f8278'
  }
}

function handleSelectCanteen(canteen) {
  const exists = selectedCanteens.value.some((item) => item.id === canteen.id)

  if (exists) {
    selectedCanteens.value = selectedCanteens.value.filter((item) => item.id !== canteen.id)
  } else {
    if (selectedCanteens.value.length >= 3) {
      uni.showToast({
        title: '最多只能选择 3 个饭堂',
        icon: 'none'
      })
      return
    }

    selectedCanteens.value = [
      ...selectedCanteens.value,
      {
        id: canteen.id,
        name: canteen.name
      }
    ]
  }

  uni.showToast({
    title: exists ? `已取消 ${canteen.name}` : `已选中 ${canteen.name}`,
    icon: 'none'
  })
}

function handleClearSelection() {
  selectedCanteens.value = []

  uni.showToast({
    title: '已清空当前勾选',
    icon: 'none'
  })
}

function isSelected(canteenId) {
  return selectedCanteens.value.some((item) => item.id === canteenId)
}

function handleSaveSelection() {
  const canteenNames = selectedCanteens.value.map((item) => item.name)
  const content = canteenNames.length
    ? `确认保存当前饭堂选择吗？\n${canteenNames.join('、')}`
    : '确认清除当前饭堂保存结果吗？'

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

      uni.showToast({
        title: selectedCanteens.value.length ? '饭堂选择已保存' : '已清除饭堂保存结果',
        icon: 'none'
      })
    }
  })
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

.hero-card,
.section-card {
  margin-top: 28rpx;
  border-radius: 32rpx;
  padding: 30rpx;
}

.hero-title,
.section-title {
  display: block;
  color: #2f251d;
  font-size: 34rpx;
  font-weight: 700;
}

.section-title--inside {
  margin-top: 28rpx;
}

.hero-desc,
.hero-tip,
.section-desc,
.empty-desc {
  display: block;
  margin-top: 12rpx;
  color: #988d83;
  font-size: 26rpx;
  line-height: 1.6;
}

.canteen-list {
  margin-top: 24rpx;
}

.canteen-card {
  border-radius: 28rpx;
  padding: 28rpx;
}

.canteen-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.canteen-card + .canteen-card {
  margin-top: 18rpx;
}

.canteen-name,
.empty-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
}

.canteen-remark {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
}

.canteen-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.2);
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 700;
}

.empty-card {
  margin-top: 22rpx;
  border-radius: 24rpx;
  padding: 28rpx;
  background: rgba(255, 255, 255, 0.82);
  text-align: center;
}

.action-row {
  display: flex;
  gap: 18rpx;
  margin-top: 32rpx;
}

.clear-button,
.save-button {
  flex: 1;
  height: 92rpx;
  border-radius: 30rpx;
  text-align: center;
  line-height: 92rpx;
  font-size: 30rpx;
  font-weight: 700;
}
</style>
