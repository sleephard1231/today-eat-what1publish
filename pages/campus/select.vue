<template>
  <view class="page" :style="pageStyle">
    <view class="top-bar" :style="{ paddingTop: `${statusBarHeight + 12}px` }">
      <text class="back-text" @click="goBack">‹ 返回</text>
      <text class="top-title">切换版本</text>
      <text class="top-placeholder"></text>
    </view>

    <view class="hero-card" :style="cardStyle">
      <text class="hero-title">普通版 / 校园版</text>
      <text class="hero-desc">校园版会切成薄荷绿，更偏校园场景；普通版保留暖奶油风。</text>
    </view>

    <view class="mode-grid">
      <view class="mode-card" :style="modeCardStyle('normal')" @click="selectedMode = 'normal'">
        <text class="mode-card__title">普通版</text>
        <text class="mode-card__desc">保留暖橙色，推荐附近热门菜单</text>
      </view>
      <view class="mode-card" :style="modeCardStyle('campus')" @click="selectedMode = 'campus'">
        <text class="mode-card__title">校园版</text>
        <text class="mode-card__desc">切成青绿色，主打校园场景</text>
      </view>
    </view>

    <view v-if="selectedMode === 'campus'" class="section-card" :style="cardStyle">
      <text class="section-title">当前已选校园</text>
      <text class="section-desc">先看你现在的选择，下面再按学校慢慢挑。</text>

      <view class="current-campus-card" :style="selectedCardStyle">
        <view>
          <view class="school-title-row">
            <text class="school-name">{{ currentSelectedCampus.name }}</text>
            <text v-if="currentSelectedCampus.campusTag" class="school-tag" :style="badgeStyle">
              {{ currentSelectedCampus.campusTag }}
            </text>
          </view>
          <text class="school-meta">{{ currentSelectedCampus.district }}</text>
        </view>
        <text class="school-selected" :style="accentTextStyle">已选择</text>
      </view>

      <view class="search-box">
        <text class="search-icon">🔎</text>
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索学校 / 校区 / 城市"
          placeholder-style="color:#b7ada4;font-size:24rpx;"
        />
      </view>

      <text class="section-title section-title--list">选择校园</text>
      <text class="section-desc">只保留学校信息，先找学校，再展开选校区会更清楚。</text>

      <view v-if="filteredSchoolGroups.length" class="school-list">
        <view
          v-for="group in filteredSchoolGroups"
          :key="group.key"
          class="school-group"
          :style="schoolGroupStyle(group)"
        >
          <view class="school-group__header" @click="handleGroupClick(group)">
            <view class="school-group__content">
              <view class="school-title-row">
                <text class="school-name">{{ group.name }}</text>
                <text class="school-status" :style="statusBadgeStyle(group)">{{ getGroupStatusLabel(group) }}</text>
              </view>
              <text class="school-meta">{{ group.district }}</text>
              <text class="school-tip">{{ getGroupTip(group) }}</text>
            </view>
            <text class="school-arrow" :style="accentTextStyle">
              {{ group.items.length > 1 ? (expandedSchoolKey === group.key ? '收起' : '展开') : '选择' }}
            </text>
          </view>

          <view v-if="group.items.length > 1 && expandedSchoolKey === group.key" class="campus-option-list">
            <view
              v-for="campus in group.items"
              :key="campus.id"
              class="campus-option"
              :style="campusOptionStyle(campus.id)"
              @click="selectedCampusId = campus.id"
            >
              <view>
                <view class="school-title-row">
                  <text class="campus-option__title">{{ getCampusDisplayName(campus) }}</text>
                  <text v-if="campus.campusTag" class="campus-option__mini-tag" :style="miniBadgeStyle">校区</text>
                </view>
                <text class="campus-option__meta">{{ campus.district }}</text>
              </view>
              <text class="campus-option__pick" :style="accentTextStyle">
                {{ selectedCampusId === campus.id ? '已选' : '选择' }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="empty-search">
        <text class="empty-search__title">没有搜到对应校园</text>
        <text class="empty-search__desc">换个学校名、校区名或者城市关键词试试。</text>
      </view>
    </view>

    <button class="save-button" :style="accentFillStyle" @click="saveSelection">保存当前选择</button>

    <view class="join-card" :style="subtleCardStyle" @click="goJoinPage">
      <text class="join-title">校园入驻功能</text>
      <text class="join-desc">如果你的学校还没在列表里，可以马上提交入驻申请。</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { presetCampuses } from '@/common/data.js'
import {
  applyTabBarTheme,
  getAppState,
  getCampusById,
  getCampusList,
  getTheme,
  saveAppState
} from '@/utils/app-state.js'

const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
const presetCampusIds = presetCampuses.map((item) => item.id)
const appState = ref(getAppState())
const selectedMode = ref(appState.value.mode)
const selectedCampusId = ref(appState.value.campusId)
const campusList = ref(getCampusList())
const searchKeyword = ref('')
const expandedSchoolKey = ref('')

function refreshPage() {
  const latestState = getAppState()
  appState.value = latestState
  selectedMode.value = latestState.mode
  selectedCampusId.value = latestState.campusId
  campusList.value = getCampusList()
  ensureExpandedForSelection()
}

onLoad(refreshPage)
onShow(refreshPage)

const theme = computed(() => getTheme(selectedMode.value))
const currentSelectedCampus = computed(() => getCampusById(selectedCampusId.value))

const schoolGroups = computed(() => {
  const groupMap = {}

  campusList.value.forEach((campus) => {
    const groupKey = `${campus.name}-${campus.district || ''}`

    if (!groupMap[groupKey]) {
      groupMap[groupKey] = {
        key: groupKey,
        name: campus.name,
        district: campus.district || '校园合作',
        items: [],
        presetCount: 0
      }
    }

    groupMap[groupKey].items.push(campus)

    if (presetCampusIds.includes(campus.id)) {
      groupMap[groupKey].presetCount += 1
    }
  })

  return Object.values(groupMap)
})

const filteredSchoolGroups = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  if (!keyword) {
    return schoolGroups.value
  }

  return schoolGroups.value
    .map((group) => {
      const filteredItems = group.items.filter((campus) => {
        const searchPool = [
          campus.name,
          campus.campusTag,
          campus.district
        ].join(' ').toLowerCase()

        return searchPool.includes(keyword)
      })

      if (filteredItems.length === 0) {
        return null
      }

      return {
        ...group,
        items: filteredItems
      }
    })
    .filter(Boolean)
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

const selectedCardStyle = computed(() => ({
  background: theme.value.cardStrong,
  border: `1px solid ${theme.value.accent}`,
  boxShadow: theme.value.shadow
}))

const subtleCardStyle = computed(() => ({
  background: theme.value.cardStrong,
  border: `1px solid ${theme.value.border}`
}))

const accentFillStyle = computed(() => ({
  background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
  boxShadow: theme.value.shadow,
  color: '#ffffff'
}))

const accentTextStyle = computed(() => ({
  color: theme.value.accent
}))

const badgeStyle = computed(() => ({
  color: theme.value.accent,
  background: theme.value.accentSoft,
  border: `1px solid ${theme.value.border}`
}))

const miniBadgeStyle = computed(() => ({
  color: theme.value.accent,
  background: 'rgba(255,255,255,0.72)'
}))

function modeCardStyle(mode) {
  const isActive = selectedMode.value === mode
  return {
    background: isActive ? theme.value.card : 'rgba(255, 255, 255, 0.78)',
    border: `1px solid ${isActive ? theme.value.accent : 'rgba(255,255,255,0.8)'}`,
    boxShadow: isActive ? theme.value.shadow : 'none'
  }
}

function schoolGroupStyle(group) {
  const containsCurrent = group.items.some((item) => item.id === selectedCampusId.value)

  return {
    background: containsCurrent ? theme.value.cardStrong : 'rgba(255, 255, 255, 0.82)',
    border: `1px solid ${containsCurrent ? theme.value.accent : theme.value.border}`
  }
}

function campusOptionStyle(campusId) {
  const isActive = selectedCampusId.value === campusId

  return {
    background: isActive ? theme.value.accentSoft : 'rgba(255,255,255,0.84)',
    border: `1px solid ${isActive ? theme.value.accent : 'rgba(255,255,255,0.75)'}`
  }
}

function statusBadgeStyle(group) {
  return {
    color: group.presetCount > 0 ? theme.value.accent : '#8fb0a6',
    background: group.presetCount > 0 ? theme.value.accentSoft : '#f3f8f4'
  }
}

function getGroupStatusLabel(group) {
  if (group.presetCount === group.items.length) {
    return '已入驻'
  }

  if (group.presetCount > 0) {
    return '部分入驻'
  }

  return '筹备中'
}

function getGroupTip(group) {
  if (group.items.length > 1) {
    return `${group.items.length} 个校区可选`
  }

  return getCampusDisplayName(group.items[0])
}

function getCampusDisplayName(campus) {
  return campus.campusTag ? `${campus.name} · ${campus.campusTag}` : campus.name
}

function handleGroupClick(group) {
  if (group.items.length === 1) {
    selectedCampusId.value = group.items[0].id
    expandedSchoolKey.value = group.key
    return
  }

  expandedSchoolKey.value = expandedSchoolKey.value === group.key ? '' : group.key
}

function ensureExpandedForSelection() {
  const currentGroup = schoolGroups.value.find((group) => (
    group.items.some((item) => item.id === selectedCampusId.value)
  ))

  expandedSchoolKey.value = currentGroup ? currentGroup.key : ''
}

function saveSelection() {
  const nextState = saveAppState({
    mode: selectedMode.value,
    campusId: selectedCampusId.value
  })

  applyTabBarTheme(nextState.mode)
  uni.showToast({
    title: nextState.mode === 'campus' ? '已切到校园版' : '已切回普通版',
    icon: 'none'
  })

  setTimeout(() => {
    uni.switchTab({
      url: '/pages/my/my'
    })
  }, 400)
}

function goJoinPage() {
  uni.navigateTo({
    url: '/pages/campus/join'
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
.section-card,
.join-card {
  margin-top: 28rpx;
  border-radius: 32rpx;
  padding: 30rpx;
}

.hero-title,
.section-title,
.join-title {
  display: block;
  color: #2f251d;
  font-size: 34rpx;
  font-weight: 700;
}

.section-title--list {
  margin-top: 28rpx;
}

.hero-desc,
.section-desc,
.join-desc {
  display: block;
  margin-top: 12rpx;
  color: #988d83;
  font-size: 26rpx;
  line-height: 1.6;
}

.mode-grid {
  display: flex;
  gap: 18rpx;
  margin-top: 28rpx;
}

.mode-card {
  flex: 1;
  padding: 26rpx;
  border-radius: 28rpx;
}

.mode-card__title {
  display: block;
  color: #2f251d;
  font-size: 30rpx;
  font-weight: 700;
}

.mode-card__desc {
  display: block;
  margin-top: 12rpx;
  color: #988d83;
  font-size: 24rpx;
  line-height: 1.5;
}

.current-campus-card,
.school-group {
  border-radius: 26rpx;
  padding: 24rpx;
}

.current-campus-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 24rpx;
  padding: 0 22rpx;
  height: 82rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.8);
}

.search-icon {
  font-size: 28rpx;
}

.search-input {
  flex: 1;
  height: 82rpx;
  line-height: 82rpx;
  font-size: 24rpx;
  color: #3f3126;
}

.school-list {
  margin-top: 22rpx;
}

.school-group + .school-group {
  margin-top: 18rpx;
}

.school-group__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.school-group__content {
  flex: 1;
}

.school-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.school-name,
.campus-option__title {
  color: #2f251d;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.35;
}

.school-tag,
.school-status,
.campus-option__mini-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 16rpx;
  border-radius: 22rpx;
  font-size: 20rpx;
  font-weight: 700;
}

.school-meta,
.school-tip,
.campus-option__meta {
  display: block;
  margin-top: 10rpx;
  color: #9b8f84;
  font-size: 24rpx;
  line-height: 1.5;
}

.school-arrow,
.school-selected,
.campus-option__pick {
  font-size: 26rpx;
  font-weight: 700;
}

.campus-option-list {
  margin-top: 18rpx;
}

.campus-option {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx;
  border-radius: 22rpx;
}

.campus-option + .campus-option {
  margin-top: 14rpx;
}

.empty-search {
  margin-top: 22rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.78);
  text-align: center;
}

.empty-search__title {
  display: block;
  color: #2f251d;
  font-size: 28rpx;
  font-weight: 700;
}

.empty-search__desc {
  display: block;
  margin-top: 12rpx;
  color: #9b8f84;
  font-size: 24rpx;
}

.save-button {
  margin-top: 32rpx;
  width: 100%;
  border-radius: 30rpx;
  padding: 30rpx 0;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
}
</style>
