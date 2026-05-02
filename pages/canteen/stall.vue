<template>
  <view class="page" :style="pageStyle">
    <view class="top-bar" :style="{ paddingTop: `${statusBarHeight + 12}px` }">
      <text class="back-text" @click="goBack">‹ 返回</text>
      <text class="top-title">{{ stallName }}</text>
      <text class="top-placeholder"></text>
    </view>

    <!-- 档口信息卡 -->
    <view class="stall-info-card" :style="cardStyle">
      <view class="stall-info-row">
        <text class="stall-info-name" :style="{ color: theme.accent }">{{ stallName }}</text>
        <text v-if="stallCategory" class="stall-info-category">{{ stallCategory }}</text>
      </view>
      <text v-if="stallRemark" class="stall-info-remark">{{ stallRemark }}</text>
    </view>

    <!-- 操作栏 -->
    <view class="action-bar">
      <text class="dish-count-label">菜品列表 ({{ dishList.length }})</text>
      <view v-if="canManage" class="add-dish-btn" :style="addBtnStyle" @click="showAddDish">
        <text class="add-dish-btn-text">+ 添加菜品</text>
      </view>
    </view>

    <!-- 菜品列表 -->
    <view v-if="dishList.length" class="dish-list">
      <view v-for="dish in dishList" :key="dish.id" class="dish-card" :style="cardStyle">
        <view class="dish-main">
          <view class="dish-name-row">
            <text class="dish-name">{{ dish.name }}</text>
            <text v-if="dish.tag" class="dish-tag" :style="tagStyle">{{ dish.tag }}</text>
          </view>
          <view class="dish-meta">
            <text v-if="dish.category" class="dish-category">{{ dish.category }}</text>
            <text v-if="dish.price" class="dish-price">¥{{ dish.price }}</text>
            <text v-if="dish.vibe" class="dish-vibe">{{ dish.vibe }}</text>
          </view>
        </view>
        <view v-if="canManage" class="dish-actions">
          <view class="dish-action-btn dish-edit-btn" @click="showEditDish(dish)">编辑</view>
          <view class="dish-action-btn dish-delete-btn" @click="confirmDeleteDish(dish)">删除</view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state" :style="cardStyle">
      <text class="empty-icon">🍽️</text>
      <text class="empty-title">暂无菜品</text>
      <text class="empty-desc">点击上方按钮添加第一道菜品吧</text>
    </view>

    <!-- 添加/编辑菜品弹窗 -->
    <view v-if="showDishForm" class="modal-mask" @click.self="closeDishForm">
      <view class="modal-content" :style="cardStyle">
        <text class="modal-title">{{ isEditing ? '编辑菜品' : '添加菜品' }}</text>

        <view class="form-group">
          <text class="form-label">菜品名称 *</text>
          <input class="form-input" v-model="dishForm.name" placeholder="如：红烧牛腩饭" />
        </view>

        <view class="form-group">
          <text class="form-label">分类</text>
          <input class="form-input" v-model="dishForm.category" placeholder="如：盖饭、粉面、小炒" />
        </view>

        <view class="form-group">
          <text class="form-label">标签</text>
          <view class="tag-options">
            <view v-for="tag in tagOptions" :key="tag" class="tag-option" :style="dishForm.tag === tag ? tagActiveStyle : tagNormalStyle" @click="dishForm.tag = dishForm.tag === tag ? '' : tag">
              <text :style="{ color: dishForm.tag === tag ? '#fff' : theme.accent, fontSize: '24rpx', fontWeight: '600' }">{{ tag }}</text>
            </view>
          </view>
        </view>

        <view class="form-group">
          <text class="form-label">价格 (元)</text>
          <input class="form-input" v-model="dishForm.price" type="digit" placeholder="如：12" />
        </view>

        <view class="form-group">
          <text class="form-label">氛围标签</text>
          <input class="form-input" v-model="dishForm.vibe" placeholder="如：酸甜开胃、香浓满足" />
        </view>

        <view class="modal-actions">
          <view class="modal-btn modal-cancel" @click="closeDishForm">取消</view>
          <view class="modal-btn modal-confirm" :style="confirmBtnStyle" @click="submitDishForm">{{ isEditing ? '保存' : '添加' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getTheme } from '@/utils/app-state.js'
import { cloudGetDishesByStall, cloudAddDish, cloudUpdateDish, cloudDeleteDish, cloudIsCampusAdmin } from '@/utils/cloud.js'

const statusBarHeight = uni.getWindowInfo().statusBarHeight || 20
const stallId = ref('')
const stallName = ref('')
const stallCategory = ref('')
const stallRemark = ref('')
const canteenId = ref('')
const dishList = ref([])
const loading = ref(false)
const canManage = ref(false)
const DISH_REFRESH_TTL = 45 * 1000
const STALL_DIRTY_KEY = 'eat-what-stall-dirty'
let lastDishLoadedAt = 0

const showDishForm = ref(false)
const isEditing = ref(false)
const editingDishId = ref('')
const dishForm = ref({
  name: '',
  category: '',
  tag: '',
  price: '',
  vibe: ''
})

const tagOptions = ['人气', '新品', '推荐', '招牌', '限时']

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

const tagStyle = computed(() => ({
  background: theme.value.accentSoft,
  color: theme.value.accent,
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

const tagActiveStyle = computed(() => ({
  background: theme.value.accent,
  border: `1px solid ${theme.value.accent}`
}))

const tagNormalStyle = computed(() => ({
  background: theme.value.accentSoft,
  border: `1px solid ${theme.value.border}`
}))

onLoad(async (options) => {
  stallId.value = options?.stallId || ''
  stallName.value = decodeURIComponent(options?.stallName || '档口详情')
  stallCategory.value = decodeURIComponent(options?.stallCategory || '')
  stallRemark.value = decodeURIComponent(options?.stallRemark || '')
  canteenId.value = options?.canteenId || ''

  await refreshManagePermission()
  await loadDishes()
})

async function loadDishes() {
  if (!stallId.value) return
  if (Date.now() - lastDishLoadedAt < DISH_REFRESH_TTL && dishList.value.length) return
  loading.value = true
  try {
    const res = await cloudGetDishesByStall(stallId.value)
    if (res.code === 0 && Array.isArray(res.data)) {
      dishList.value = res.data
      lastDishLoadedAt = Date.now()
    }
  } catch (err) {
    console.warn('[stall] loadDishes error', err)
  }
  loading.value = false
}

async function refreshDishes() {
  if (canteenId.value) {
    uni.setStorageSync(STALL_DIRTY_KEY, canteenId.value)
  }
  lastDishLoadedAt = 0
  await loadDishes()
}

async function refreshManagePermission() {
  const res = await cloudIsCampusAdmin()
  canManage.value = res.code === 0 && !!res.data?.isAdmin
}

function showAddDish() {
  if (!canManage.value) {
    uni.showToast({ title: '无管理权限', icon: 'none' })
    return
  }

  isEditing.value = false
  editingDishId.value = ''
  dishForm.value = { name: '', category: '', tag: '', price: '', vibe: '' }
  showDishForm.value = true
}

function showEditDish(dish) {
  if (!canManage.value) {
    uni.showToast({ title: '无管理权限', icon: 'none' })
    return
  }

  isEditing.value = true
  editingDishId.value = dish.id
  dishForm.value = {
    name: dish.name || '',
    category: dish.category || '',
    tag: dish.tag || '',
    price: dish.price || '',
    vibe: dish.vibe || ''
  }
  showDishForm.value = true
}

function closeDishForm() {
  showDishForm.value = false
}

async function submitDishForm() {
  if (!canManage.value) {
    uni.showToast({ title: '无管理权限', icon: 'none' })
    return
  }

  const form = dishForm.value
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入菜品名称', icon: 'none' })
    return
  }

  const dishData = {
    name: form.name.trim(),
    category: form.category.trim(),
    tag: form.tag,
    price: form.price.trim(),
    vibe: form.vibe.trim()
  }

  uni.showLoading({ title: isEditing.value ? '保存中...' : '添加中...' })

  try {
    let res
    if (isEditing.value) {
      res = await cloudUpdateDish(stallId.value, editingDishId.value, dishData)
    } else {
      res = await cloudAddDish(stallId.value, canteenId.value, dishData)
    }

    if (res.code === 0) {
      uni.showToast({ title: isEditing.value ? '保存成功' : '添加成功', icon: 'success' })
      closeDishForm()
      await refreshDishes()
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
    }
  } catch (err) {
    console.warn('[stall] submitDishForm error', err)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }

  uni.hideLoading()
}

function confirmDeleteDish(dish) {
  if (!canManage.value) {
    uni.showToast({ title: '无管理权限', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${dish.name}」吗？`,
    confirmText: '删除',
    confirmColor: '#e74c3c',
    success: async ({ confirm }) => {
      if (!confirm) return
      uni.showLoading({ title: '删除中...' })
      try {
        const res = await cloudDeleteDish(stallId.value, dish.id)
        if (res.code === 0) {
          uni.showToast({ title: '已删除', icon: 'success' })
          await refreshDishes()
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

.stall-info-card { margin-top: 28rpx; border-radius: 28rpx; padding: 28rpx; }
.stall-info-row { display: flex; align-items: center; gap: 12rpx; }
.stall-info-name { font-size: 36rpx; font-weight: 700; }
.stall-info-category { font-size: 22rpx; color: #888; background: #f5f5f5; padding: 4rpx 14rpx; border-radius: 12rpx; }
.stall-info-remark { display: block; margin-top: 10rpx; font-size: 24rpx; color: #988d83; line-height: 1.5; }

.action-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 28rpx; margin-bottom: 16rpx; }
.dish-count-label { font-size: 28rpx; color: #2f251d; font-weight: 700; }
.add-dish-btn { padding: 14rpx 28rpx; border-radius: 24rpx; }
.add-dish-btn-text { color: #fff; font-size: 26rpx; font-weight: 700; }

.dish-list { margin-top: 8rpx; }
.dish-card { border-radius: 24rpx; padding: 24rpx; margin-bottom: 16rpx; }
.dish-main { flex: 1; }
.dish-name-row { display: flex; align-items: center; gap: 10rpx; }
.dish-name { font-size: 30rpx; color: #2f251d; font-weight: 700; }
.dish-tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 10rpx; font-weight: 600; }
.dish-meta { display: flex; align-items: center; gap: 14rpx; margin-top: 10rpx; flex-wrap: wrap; }
.dish-category { font-size: 22rpx; color: #aaa; background: #f8f8f8; padding: 2rpx 10rpx; border-radius: 8rpx; }
.dish-price { font-size: 28rpx; color: #e67e22; font-weight: 700; }
.dish-vibe { font-size: 22rpx; color: #988d83; }
.dish-card { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.dish-actions { display: flex; gap: 10rpx; flex-shrink: 0; }
.dish-action-btn { padding: 10rpx 20rpx; border-radius: 16rpx; font-size: 22rpx; font-weight: 600; }
.dish-edit-btn { background: rgba(103,182,160,0.12); color: #67b6a0; border: 1px solid rgba(103,182,160,0.25); }
.dish-delete-btn { background: rgba(231,76,60,0.08); color: #e74c3c; border: 1px solid rgba(231,76,60,0.2); }

.empty-state { margin-top: 60rpx; border-radius: 28rpx; padding: 60rpx 28rpx; text-align: center; }
.empty-icon { display: block; font-size: 80rpx; margin-bottom: 20rpx; opacity: 0.7; }
.empty-title { display: block; font-size: 32rpx; font-weight: 700; color: #2f251d; }
.empty-desc { display: block; margin-top: 12rpx; font-size: 26rpx; color: #988d83; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); z-index: 999; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 85%; max-height: 85vh; border-radius: 32rpx; padding: 36rpx; overflow-y: auto; }
.modal-title { display: block; font-size: 34rpx; font-weight: 700; color: #2f251d; margin-bottom: 28rpx; text-align: center; }
.form-group { margin-bottom: 22rpx; }
.form-label { display: block; font-size: 26rpx; color: #5a4d42; font-weight: 600; margin-bottom: 8rpx; }
.form-input { width: 100%; height: 76rpx; border-radius: 18rpx; border: 1px solid rgba(0,0,0,0.1); padding: 0 20rpx; font-size: 28rpx; background: #fff; box-sizing: border-box; }
.tag-options { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag-option { padding: 10rpx 22rpx; border-radius: 18rpx; }
.modal-actions { display: flex; gap: 18rpx; margin-top: 30rpx; }
.modal-btn { flex: 1; height: 84rpx; border-radius: 26rpx; text-align: center; line-height: 84rpx; font-size: 30rpx; font-weight: 700; }
.modal-cancel { background: #f5f5f5; color: #666; }
</style>
