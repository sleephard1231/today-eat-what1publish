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
      <view v-for="service in serviceList" :key="service.id" class="service-card press-feedback" :style="cardStyle" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90">
        <view class="service-icon-wrap" :style="iconWrapStyle">
          <text class="service-icon">{{ service.icon }}</text>
        </view>
        <text class="service-name">{{ service.name }}</text>
        <text class="service-remark">{{ service.remark }}</text>
      </view>
    </view>

    <view v-else class="empty-card" :style="cardStyle">
      <text class="empty-title">{{ isCampusMode ? '这所学校暂时还没有校园服务' : '校园服务仅在校园模式下显示' }}</text>
      <text class="empty-desc">{{ isCampusMode ? '后面接入后台后，这里会按学校自动补齐更多服务内容。' : '你可以先去切换校园版，再回来看看学校专属服务。' }}</text>
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

onLoad(refreshPage)
onShow(refreshPage)

const isCampusMode = computed(() => state.value.mode === 'campus')
const theme = computed(() => getTheme(state.value.mode))
const currentCampus = computed(() => getCampusById(state.value.campusId))
const serviceList = computed(() => campusServiceMap[currentCampus.value.name] || [])

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
.service-card { min-height: 220rpx; border-radius: 30rpx; padding: 28rpx 24rpx; }
.service-icon-wrap { display: inline-flex; align-items: center; justify-content: center; width: 78rpx; height: 78rpx; border-radius: 24rpx; }
.service-icon { font-size: 36rpx; }
.service-name { display: block; margin-top: 18rpx; color: #2f251d; font-size: 30rpx; font-weight: 700; line-height: 1.4; }
.service-remark { display: block; margin-top: 10rpx; color: #93867b; font-size: 24rpx; line-height: 1.6; }
.empty-card { text-align: center; }
</style>
