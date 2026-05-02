<template>
  <view class="page" :style="pageStyle">
    <view class="top-bar" :style="{ paddingTop: `${statusBarHeight + 12}px` }">
      <text class="back-text" @click="goBack">‹ 返回</text>
      <text class="top-title">{{ canteenName }}</text>
      <text class="top-placeholder"></text>
    </view>

    <!-- 操作栏 -->
    <view class="action-bar">
      <text class="stall-count-label">商铺列表 ({{ stallList.length }})</text>
      <view v-if="canManage" class="add-stall-btn" :style="addBtnStyle" @click="showAddStall">
        <text class="add-stall-btn-text">+ 添加商铺</text>
      </view>
    </view>

    <!-- 档口列表 -->
    <view v-if="stallList.length" class="stall-list">
      <view v-for="stall in stallList" :key="stall.id" class="stall-card" :style="cardStyle">
        <view class="stall-header" @click="goToStall(stall)">
          <view class="stall-info">
            <view class="stall-name-row">
              <text class="stall-name" :style="{ color: theme.accent }">{{ stall.name }}</text>
              <text v-if="stall.category" class="stall-category">{{ stall.category }}</text>
            </view>
            <text v-if="stall.remark" class="stall-remark">{{ stall.remark }}</text>
            <text class="stall-dish-count">{{ (stall.dishes || []).length }} 道菜</text>
          </view>
          <view class="stall-right">
            <view class="stall-enter-btn" :style="enterBtnStyle">进入 ›</view>
          </view>
        </view>

        <!-- 快捷操作 -->
        <view v-if="canManage" class="stall-actions">
          <view class="stall-action-btn stall-edit-btn" @click.stop="showEditStall(stall)">编辑</view>
          <view class="stall-action-btn stall-delete-btn" @click.stop="confirmDeleteStall(stall)">删除</view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state" :style="cardStyle">
      <text class="empty-icon">🏪</text>
      <text class="empty-title">暂无商铺数据</text>
      <text class="empty-desc">点击上方按钮添加第一个商铺吧</text>
    </view>

    <!-- 添加/编辑商铺弹窗 -->
    <view v-if="showStallForm" class="modal-mask" @click.self="closeStallForm">
      <view class="modal-content" :style="cardStyle">
        <text class="modal-title">{{ isEditingStall ? '编辑商铺' : '添加商铺' }}</text>

        <view class="form-group">
          <text class="form-label">商铺名称 *</text>
          <input class="form-input" v-model="stallForm.name" placeholder="如：大众食堂、莫小喃水饺" />
        </view>

        <view class="form-group">
          <text class="form-label">分类</text>
          <input class="form-input" v-model="stallForm.category" placeholder="如：快餐、面食、小炒" />
        </view>

        <view class="form-group">
          <text class="form-label">备注/描述</text>
          <input class="form-input" v-model="stallForm.remark" placeholder="如：人气快餐窗口" />
        </view>

        <view class="modal-actions">
          <view class="modal-btn modal-cancel" @click="closeStallForm">取消</view>
          <view class="modal-btn modal-confirm" :style="confirmBtnStyle" @click="submitStallForm">{{ isEditingStall ? '保存' : '添加' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getTheme } from '@/utils/app-state.js'
import { cloudGetStallsByCanteen, cloudAddStall, cloudUpdateStall, cloudDeleteStall, cloudIsCampusAdmin } from '@/utils/cloud.js'

const statusBarHeight = uni.getWindowInfo().statusBarHeight || 20
const canteenId = ref('')
const canteenName = ref('')
const stallList = ref([])
const canManage = ref(false)
const skipNextShow = ref(true)
const STALL_REFRESH_TTL = 45 * 1000
const STALL_DIRTY_KEY = 'eat-what-stall-dirty'
let lastStallLoadedAt = 0

const showStallForm = ref(false)
const isEditingStall = ref(false)
const editingStallId = ref('')
const stallForm = ref({
  name: '',
  category: '',
  remark: ''
})

const theme = computed(() => getTheme('campus'))

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

const addBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
  boxShadow: theme.value.shadow
}))

const confirmBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, ${theme.value.accent} 0%, ${theme.value.accentDeep} 100%)`,
  color: '#fff'
}))

const enterBtnStyle = computed(() => ({
  background: theme.value.accentSoft,
  color: theme.value.accent,
  border: `1px solid ${theme.value.border}`
}))

onLoad(async (options) => {
  canteenId.value = options?.canteenId || ''
  canteenName.value = decodeURIComponent(options?.canteenName || '饭堂详情')

  await refreshManagePermission()
  await loadStalls()
})

onShow(async () => {
  if (skipNextShow.value) {
    skipNextShow.value = false
    return
  }

  // 从 stall 页面返回时刷新数据
  if (canteenId.value) {
    if (uni.getStorageSync(STALL_DIRTY_KEY) === canteenId.value) {
      uni.removeStorageSync(STALL_DIRTY_KEY)
      await refreshStalls()
      return
    }
    await loadStalls()
  }
})

async function loadStalls() {
  if (!canteenId.value) return
  if (Date.now() - lastStallLoadedAt < STALL_REFRESH_TTL && stallList.value.length) return
  try {
    const res = await cloudGetStallsByCanteen(canteenId.value)
    if (res.code === 0 && Array.isArray(res.data)) {
      stallList.value = res.data
      lastStallLoadedAt = Date.now()
    }
  } catch (err) {
    console.warn('[detail] loadStalls error', err)
  }
}

async function refreshStalls() {
  lastStallLoadedAt = 0
  await loadStalls()
}

async function refreshManagePermission() {
  const res = await cloudIsCampusAdmin()
  canManage.value = res.code === 0 && !!res.data?.isAdmin
}

function goToStall(stall) {
  uni.navigateTo({
    url: `/pages/canteen/stall?stallId=${stall.id}&stallName=${encodeURIComponent(stall.name)}&stallCategory=${encodeURIComponent(stall.category || '')}&stallRemark=${encodeURIComponent(stall.remark || '')}&canteenId=${canteenId.value}`
  })
}

function showAddStall() {
  if (!canManage.value) {
    uni.showToast({ title: '无管理权限', icon: 'none' })
    return
  }

  isEditingStall.value = false
  editingStallId.value = ''
  stallForm.value = { name: '', category: '', remark: '' }
  showStallForm.value = true
}

function showEditStall(stall) {
  if (!canManage.value) {
    uni.showToast({ title: '无管理权限', icon: 'none' })
    return
  }

  isEditingStall.value = true
  editingStallId.value = stall.id
  stallForm.value = {
    name: stall.name || '',
    category: stall.category || '',
    remark: stall.remark || ''
  }
  showStallForm.value = true
}

function closeStallForm() {
  showStallForm.value = false
}

async function submitStallForm() {
  if (!canManage.value) {
    uni.showToast({ title: '无管理权限', icon: 'none' })
    return
  }

  const form = stallForm.value
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入商铺名称', icon: 'none' })
    return
  }

  const stallData = {
    name: form.name.trim(),
    category: form.category.trim(),
    remark: form.remark.trim()
  }

  uni.showLoading({ title: isEditingStall.value ? '保存中...' : '添加中...' })

  try {
    let res
    if (isEditingStall.value) {
      res = await cloudUpdateStall(canteenId.value, editingStallId.value, stallData)
    } else {
      res = await cloudAddStall(canteenId.value, stallData)
    }

    if (res.code === 0) {
      uni.showToast({ title: isEditingStall.value ? '保存成功' : '添加成功', icon: 'success' })
      closeStallForm()
      await refreshStalls()
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
    }
  } catch (err) {
    console.warn('[detail] submitStallForm error', err)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }

  uni.hideLoading()
}

function confirmDeleteStall(stall) {
  if (!canManage.value) {
    uni.showToast({ title: '无管理权限', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认删除',
    content: `确定要删除商铺「${stall.name}」吗？该商铺下的所有菜品也会被删除。`,
    confirmText: '删除',
    confirmColor: '#e74c3c',
    success: async ({ confirm }) => {
      if (!confirm) return
      uni.showLoading({ title: '删除中...' })
      try {
        const res = await cloudDeleteStall(canteenId.value, stall.id)
        if (res.code === 0) {
          uni.showToast({ title: '已删除', icon: 'success' })
          await refreshStalls()
        } else {
          uni.showToast({ title: res.msg || '删除失败', icon: 'none' })
        }
      } catch (err) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
      uni.hideLoading()
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

.action-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 28rpx; margin-bottom: 16rpx; }
.stall-count-label { font-size: 28rpx; color: #2f251d; font-weight: 700; }
.add-stall-btn { padding: 14rpx 28rpx; border-radius: 24rpx; }
.add-stall-btn-text { color: #fff; font-size: 26rpx; font-weight: 700; }

.stall-list { margin-top: 8rpx; }
.stall-card { border-radius: 28rpx; padding: 28rpx; margin-bottom: 20rpx; }
.stall-header { display: flex; align-items: center; justify-content: space-between; }
.stall-info { flex: 1; }
.stall-name-row { display: flex; align-items: center; gap: 10rpx; }
.stall-name { font-size: 32rpx; font-weight: 700; }
.stall-category { font-size: 22rpx; color: #888; background: #f5f5f5; padding: 4rpx 14rpx; border-radius: 12rpx; }
.stall-remark { display: block; margin-top: 8rpx; font-size: 24rpx; color: #988d83; line-height: 1.5; }
.stall-dish-count { display: block; margin-top: 8rpx; font-size: 22rpx; color: #aaa; }
.stall-right { flex-shrink: 0; margin-left: 16rpx; }
.stall-enter-btn { padding: 10rpx 22rpx; border-radius: 18rpx; font-size: 24rpx; font-weight: 700; }
.stall-actions { display: flex; gap: 10rpx; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid rgba(0,0,0,0.06); }
.stall-action-btn { padding: 8rpx 20rpx; border-radius: 14rpx; font-size: 22rpx; font-weight: 600; }
.stall-edit-btn { background: rgba(103,182,160,0.12); color: #67b6a0; border: 1px solid rgba(103,182,160,0.25); }
.stall-delete-btn { background: rgba(231,76,60,0.08); color: #e74c3c; border: 1px solid rgba(231,76,60,0.2); }

.empty-state { margin-top: 80rpx; border-radius: 32rpx; padding: 60rpx 28rpx; text-align: center; }
.empty-icon { display: block; font-size: 80rpx; margin-bottom: 20rpx; opacity: 0.7; }
.empty-title { display: block; font-size: 32rpx; font-weight: 700; color: #2f251d; }
.empty-desc { display: block; margin-top: 12rpx; font-size: 26rpx; color: #988d83; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); z-index: 999; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 85%; max-height: 85vh; border-radius: 32rpx; padding: 36rpx; overflow-y: auto; }
.modal-title { display: block; font-size: 34rpx; font-weight: 700; color: #2f251d; margin-bottom: 28rpx; text-align: center; }
.form-group { margin-bottom: 22rpx; }
.form-label { display: block; font-size: 26rpx; color: #5a4d42; font-weight: 600; margin-bottom: 8rpx; }
.form-input { width: 100%; height: 76rpx; border-radius: 18rpx; border: 1px solid rgba(0,0,0,0.1); padding: 0 20rpx; font-size: 28rpx; background: #fff; box-sizing: border-box; }
.modal-actions { display: flex; gap: 18rpx; margin-top: 30rpx; }
.modal-btn { flex: 1; height: 84rpx; border-radius: 26rpx; text-align: center; line-height: 84rpx; font-size: 30rpx; font-weight: 700; }
.modal-cancel { background: #f5f5f5; color: #666; }
</style>
