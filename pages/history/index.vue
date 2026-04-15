<template>
  <view class="page" :style="pageStyle">
    <view class="top-bar" :style="{ paddingTop: `${statusBarHeight + 12}px` }">
      <text class="back-text" @click="goBack">‹ 返回</text>
      <text class="top-title">占卜历史</text>
      <text class="top-placeholder"></text>
    </view>

    <view class="summary-card" :style="cardStyle">
      <text class="summary-title">最近推荐记录</text>
      <text class="summary-desc">你点过的美食会按时间倒序存在这里，方便回看今天到底吃了什么。</text>
    </view>

    <view v-if="historyList.length" class="list-wrap">
      <view v-for="item in historyList" :key="item.id" class="history-card" :style="cardStyle">
        <view class="history-head">
          <view>
            <text class="history-name">{{ item.mealName }}</text>
            <text class="history-meta">{{ item.campusName }} · {{ item.canteen }}</text>
          </view>
          <text class="history-mode" :style="modeStyle(item.mode)">{{ item.mode === 'campus' ? '校园版' : '普通版' }}</text>
        </view>

        <text class="history-vibe">{{ item.vibe }}</text>
        <text class="history-reason">{{ item.reason }}</text>
        <text class="history-time">{{ item.createdAt }}</text>
      </view>
    </view>

    <view v-else class="empty-card" :style="cardStyle">
      <text class="empty-title">还没有新的占卜记录</text>
      <text class="empty-desc">去首页点一下“吃什么”，这里就会生成第一条结果。</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getAppState, getHistoryList, getTheme } from '@/utils/app-state.js'

const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
const state = ref(getAppState())
const historyList = ref(getHistoryList())

const refreshData = () => {
  state.value = getAppState()
  historyList.value = getHistoryList()
}

onLoad(() => {
  refreshData()
})

onShow(() => {
  refreshData()
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

function modeStyle(mode) {
  const currentTheme = getTheme(mode)
  return {
    color: currentTheme.accent,
    background: currentTheme.accentSoft
  }
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

.summary-card,
.history-card,
.empty-card {
  margin-top: 28rpx;
  border-radius: 32rpx;
  padding: 30rpx;
}

.summary-title,
.empty-title {
  display: block;
  color: #2f251d;
  font-size: 34rpx;
  font-weight: 700;
}

.summary-desc,
.empty-desc {
  display: block;
  margin-top: 12rpx;
  color: #998d83;
  font-size: 26rpx;
  line-height: 1.7;
}

.history-head {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
}

.history-name {
  display: block;
  color: #2f251d;
  font-size: 34rpx;
  font-weight: 700;
}

.history-meta,
.history-vibe,
.history-reason,
.history-time {
  display: block;
  margin-top: 12rpx;
  color: #998d83;
  font-size: 25rpx;
  line-height: 1.6;
}

.history-mode {
  align-self: flex-start;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
}

.list-wrap .history-card + .history-card {
  margin-top: 22rpx;
}
</style>
