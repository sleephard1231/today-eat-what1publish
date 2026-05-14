<template>
  <view class="page" :style="pageStyle">
    <view class="profile-card profile-card--top" :style="[cardStyle, { marginTop: `${topCardMargin}px` }]">
      <!-- 点击头像/昵称区域：已登录则打开资料编辑 sheet，未登录则打开登录 sheet -->
      <view class="profile-top press-feedback" @click="handleProfileAreaClick">
        <view class="avatar-shell" :style="avatarShellStyle">
          <image
            v-if="user.avatar"
            class="avatar avatar--img"
            :src="user.avatar"
            mode="aspectFill"
          />
          <view v-else class="avatar" :style="accentFillStyle">🍚</view>
        </view>
        <view class="profile-copy">
          <text class="nickname">{{ user.isLoggedIn ? user.nickname : '点击授权微信登录' }}</text>
          <text v-if="user.isLoggedIn" class="login-mode-text" :style="loginModeTextStyle">{{ loginStatusLabel }}</text>
          <text class="profile-tagline">{{ profileHeadline }}</text>
          <text class="profile-tagline profile-tagline--secondary">{{ loginStatusDescription }}</text>
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
    <view v-if="isCampusMode" class="service-entry press-feedback" :style="serviceEntryStyle" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="goServicePage">
      <view class="service-entry__copy">
        <text class="service-entry__eyebrow">🏫 校园生活服务</text>
        <text class="service-entry__title">按当前学校解锁对应服务</text>
        <view v-if="openedCampusServiceTags.length" class="service-entry__tags">
          <text v-for="tag in openedCampusServiceTags" :key="tag" class="service-entry__tag">{{ tag }}</text>
        </view>
      </view>
      <text class="service-entry__action" :style="serviceEntryActionStyle">进入</text>
    </view>
    <view class="section-card" :style="cardStyle">
      <view class="row-item press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="goHistoryPage">
        <view>
          <text class="row-title">📜 历史记录</text>
          <text class="row-desc">看看最近都推荐过什么，回头翻一翻也更方便。</text>
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
            <text class="row-desc">提交你的校园信息，审核通过后就能加入校园版。</text>
          </view>
          <text class="row-action" :style="accentTextStyle">申请</text>
        </view>
      </view>


    </template>

    <!-- 底部法律链接 -->
    <view class="legal-footer">
      <text class="legal-link" @click="goPrivacyPolicy">隐私政策</text>
      <text class="legal-divider">|</text>
      <text class="legal-link" @click="goUserAgreement">用户协议</text>
    </view>

    <!-- 登录引导 sheet -->
    <view v-if="showLoginSheet" class="sheet-mask" @click="closeLoginSheet">
      <view class="sheet-panel sheet-panel--login" :style="sheetStyle" @click.stop>
        <view class="sheet-handle"></view>
        <view class="login-header">
          <button class="login-avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
            <view class="login-avatar-shell" :style="avatarShellStyle">
              <image v-if="loginForm.avatar" class="avatar avatar--img" :src="loginForm.avatar" mode="aspectFill" />
              <view v-else class="avatar" :style="accentFillStyle">🍚</view>
            </view>
            <text class="login-avatar-hint">点击选择头像</text>
          </button>
          <text class="login-title">欢迎来到吃什么</text>
          <text class="login-desc">选择头像并填写昵称即可登录</text>
        </view>
        <view class="login-field">
          <text class="login-field__label">昵称</text>
          <input
            type="nickname"
            class="login-field__input"
            placeholder="请输入昵称"
            placeholder-style="color:#b7ada4;font-size:26rpx;"
            :value="loginForm.nickname"
            @blur="onNicknameInput"
          />
        </view>
        <view class="login-agreement-row" @click="toggleLoginAgreement">
          <view class="login-agreement-check" :style="loginAgreementChecked ? accentFillStyle : loginAgreementCheckStyle">
            <text class="login-agreement-check__icon">{{ loginAgreementChecked ? '✓' : '' }}</text>
          </view>
          <text class="login-agreement-text">
            我已阅读并同意
            <text class="login-agreement-link" @click.stop="goPrivacyPolicy">《隐私政策》</text>
            和
            <text class="login-agreement-link" @click.stop="goUserAgreement">《用户协议》</text>
          </text>
        </view>
        <button
          class="login-button press-feedback"
          :style="canSubmitLogin ? accentFillStyle : disabledLoginButtonStyle"
          hover-class="press-feedback--active"
          hover-start-time="20"
          hover-stay-time="90"
          :loading="isLoggingIn"
          :disabled="!canSubmitLogin || isLoggingIn"
          @click="handleLogin"
        >
          {{ isLoggingIn ? '登录中...' : '登录' }}
        </button>
      </view>
    </view>

    <!-- 个人资料编辑 sheet -->
    <view v-if="showProfileSheet" class="sheet-mask" @click="closeProfileSheet">
      <view class="sheet-panel" :style="sheetStyle" @click.stop>
        <view class="sheet-handle"></view>
        <text class="sheet-title">✨ 个人资料</text>

        <!-- 头像 + 昵称 -->
        <view class="profile-edit-row">
          <button class="profile-edit-avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatarEdit">
            <image v-if="user.avatar" class="profile-edit-avatar" :src="user.avatar" mode="aspectFill" />
            <view v-else class="profile-edit-avatar-placeholder" :style="accentFillStyle">🍚</view>
          </button>
          <view class="profile-edit-info">
            <input
              type="nickname"
              class="profile-edit-nickname-input"
              :value="user.nickname"
              placeholder="点击修改昵称"
              placeholder-style="color:#9f9388;font-size:26rpx;"
              @blur="onNicknameEdit"
            />
          </view>
        </view>

        <view class="profile-edit-divider"></view>

        <!-- MBTI + 星座 -->
        <view class="profile-edit-pickers">
          <view class="picker-item press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="openMbtiPopupFromSheet">
            <view class="picker-chip picker-chip--detail" :style="pickerChipStyle">
              <text class="picker-chip__emoji">{{ currentMbtiCard.emoji }}</text>
              <view class="picker-chip__body">
                <text class="picker-chip__title">{{ currentMbtiCard.value }}</text>
                <text class="picker-chip__desc">{{ currentMbtiCard.funAlias }}</text>
              </view>
            </view>
          </view>

          <view class="picker-item press-feedback" hover-class="press-feedback--active" hover-start-time="20" hover-stay-time="90" @click="openZodiacPopupFromSheet">
            <view class="picker-chip picker-chip--detail" :style="pickerChipStyle">
              <text class="picker-chip__emoji">{{ currentZodiacCard.emoji }}</text>
              <view class="picker-chip__body">
                <text class="picker-chip__title">{{ currentZodiacCard.value }}</text>
                <text class="picker-chip__desc">{{ currentZodiacCard.funAlias }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 退出登录 -->
        <button class="logout-button press-feedback" :style="ghostButtonStyle" @click="handleLogout">退出登录</button>
      </view>
    </view>

    <!-- MBTI 选择 sheet -->
    <view v-if="showMbtiPopup" class="sheet-mask" @click="cancelMbtiSelection">
      <view class="sheet-panel" :style="sheetStyle" @click.stop>
        <view class="sheet-handle"></view>
        <text class="sheet-title">✨ 选择你的专属人格</text>
        <view class="sheet-grid">
          <view
            v-for="(item, index) in mbtiCardOptions"
            :key="item.value"
            class="select-card press-feedback"
            :style="[selectorCardStyle(pendingMbti === item.value), cardEntranceStyle(index)]"
            hover-class="press-feedback--active"
            hover-start-time="20"
            hover-stay-time="90"
            @click="pendingMbti = item.value"
          >
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

    <!-- 星座选择 sheet -->
    <view v-if="showZodiacPopup" class="sheet-mask" @click="cancelZodiacSelection">
      <view class="sheet-panel" :style="sheetStyle" @click.stop>
        <view class="sheet-handle"></view>
        <text class="sheet-title">✨ 选择你的星座气质</text>
        <view class="sheet-grid">
          <view
            v-for="(item, index) in zodiacCardOptions"
            :key="item.value"
            class="select-card press-feedback"
            :style="[selectorCardStyle(pendingZodiac === item.value), cardEntranceStyle(index)]"
            hover-class="press-feedback--active"
            hover-start-time="20"
            hover-stay-time="90"
            @click="pendingZodiac = item.value"
          >
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
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { campusServiceMap, mbtiCardOptions, zodiacCardOptions } from '@/common/data.js'
import {
  applyTabBarTheme,
  getAppState,
  getCampusApplications,
  getCampusById,
  getHistoryList,
  getSelectedCanteen,
  getTheme,
  saveAppState
} from '@/utils/app-state.js'
import { agreePrivacy, hasAgreedPrivacy } from '@/utils/privacy-state.js'
import { getUser, saveUser, clearUser, consumeLoginIntent, getLoginStatusMeta, handleLogin as cloudLogin, isCloudUser, requireLogin, syncProfileToCloud, uploadAvatarToCloud } from '@/utils/user-state.js'

const statusBarHeight = uni.getWindowInfo().statusBarHeight || 20
const menuButtonRect = typeof uni.getMenuButtonBoundingClientRect === 'function'
  ? uni.getMenuButtonBoundingClientRect()
  : null
const state = ref(getAppState())
const user = ref(getUser())
const historyCount = ref(0)
const applicationCount = ref(0)
const showMbtiPopup = ref(false)
const showZodiacPopup = ref(false)
const showProfileSheet = ref(false)
const showLoginSheet = ref(false)
const isLoggingIn = ref(false)
const loginForm = reactive({
  avatar: '',
  nickname: ''
})
const loginAgreementChecked = ref(hasAgreedPrivacy())
const pendingMbti = ref(state.value.profile.mbti)
const pendingZodiac = ref(state.value.profile.zodiac)

function refreshState() {
  state.value = getAppState()
  user.value = getUser()
  historyCount.value = getHistoryList().length
  applicationCount.value = getCampusApplications().length
  loginAgreementChecked.value = hasAgreedPrivacy()
  pendingMbti.value = state.value.profile.mbti
  pendingZodiac.value = state.value.profile.zodiac
  applyTabBarTheme(state.value.mode)
}

function openLoginSheetIfNeeded() {
  if (!isCloudUser() && consumeLoginIntent()) {
    showLoginSheet.value = true
  }
}

function onUserStateChange() {
  user.value = getUser()
  refreshState()
}

let hasLoaded = false

onLoad(() => {
  refreshState()
  openLoginSheetIfNeeded()
  uni.$on('user-state-changed', onUserStateChange)
  uni.$on('app-state-changed', refreshState)
})

onShow(() => {
  if (!hasLoaded) {
    hasLoaded = true
    return
  }
  refreshState()
  openLoginSheetIfNeeded()
})

onUnload(() => {
  uni.$off('user-state-changed', onUserStateChange)
  uni.$off('app-state-changed', refreshState)
})

const theme = computed(() => getTheme(state.value.mode))
const currentCampus = computed(() => getCampusById(state.value.campusId))
const currentMbtiCard = computed(() => mbtiCardOptions.find((item) => item.value === state.value.profile.mbti) || mbtiCardOptions[0])
const currentZodiacCard = computed(() => zodiacCardOptions.find((item) => item.value === state.value.profile.zodiac) || zodiacCardOptions[0])
const isCampusMode = computed(() => state.value.mode === 'campus')
const topCardMargin = computed(() => (
  menuButtonRect
    ? menuButtonRect.top + menuButtonRect.height + 8
    : statusBarHeight + 42
))
const profileHeadline = computed(() => `${currentZodiacCard.value.value} · ${currentMbtiCard.value.funAlias}`)
const loginStatus = computed(() => getLoginStatusMeta())
const loginStatusLabel = computed(() => loginStatus.value.label)
const loginStatusDescription = computed(() => (
  user.value.isLoggedIn
    ? loginStatus.value.description
    : '登录后才能同步历史、使用 AI 和云端能力。'
))

const selectedCanteenText = computed(() => {
  const selected = getSelectedCanteen(state.value.campusId)
  return selected.length ? selected.map((item) => item.name).join('、') : '默认全校饭堂'
})

const campusDescription = computed(() => (
  state.value.mode === 'campus'
    ? selectedCanteenText.value
    : '普通版已开启，会优先推荐附近的人气选择。'
))

const openedCampusServiceTags = computed(() => {
  if (!isCampusMode.value) return []
  const services = campusServiceMap[currentCampus.value.name] || []
  return services.slice(0, 4).map((item) => item.name)
})

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

const avatarShellStyle = computed(() => ({
  background: theme.value.accentSoft,
  border: `2rpx solid ${theme.value.border}`,
  boxShadow: state.value.mode === 'campus'
    ? '0 10rpx 24rpx rgba(103, 182, 160, 0.18)'
    : '0 10rpx 24rpx rgba(255, 138, 61, 0.16)'
}))

const ghostButtonStyle = computed(() => ({
  background: theme.value.accentSoft,
  color: theme.value.accent,
  border: `1px solid ${theme.value.border}`
}))
const canSubmitLogin = computed(() => Boolean(loginAgreementChecked.value && loginForm.nickname.trim()))
const disabledLoginButtonStyle = computed(() => ({
  background: '#f0d8c6',
  color: 'rgba(255,255,255,0.9)',
  boxShadow: 'none'
}))

const loginAgreementCheckStyle = computed(() => ({
  border: `1px solid ${theme.value.border}`,
  background: 'rgba(255,255,255,0.82)',
  color: theme.value.accent
}))

const loginModeTextStyle = computed(() => ({
  color: loginStatus.value.isCloudUser ? theme.value.accent : '#c78357'
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

// 头像/昵称区域点击
function handleProfileAreaClick() {
  if (user.value.isLoggedIn) {
    showProfileSheet.value = true
  } else {
    showLoginSheet.value = true
  }
}

function closeLoginSheet() {
  showLoginSheet.value = false
}

function closeProfileSheet() {
  showProfileSheet.value = false
}

function onChooseAvatar(e) {
  const avatarUrl = e.detail.avatarUrl
  if (avatarUrl) {
    loginForm.avatar = avatarUrl
  }
}

function onNicknameInput(e) {
  loginForm.nickname = e.detail.value || ''
}

function toggleLoginAgreement() {
  loginAgreementChecked.value = !loginAgreementChecked.value
}

async function handleLogin() {
  if (isLoggingIn.value) return
  if (!canSubmitLogin.value) {
    return
  }
  if (!hasAgreedPrivacy()) {
    agreePrivacy()
  }

  isLoggingIn.value = true
  try {
    const avatar = await uploadAvatarToCloud(loginForm.avatar)
    if (loginForm.avatar && !avatar) {
      uni.showToast({ title: '头像上传失败，请重新选择', icon: 'none' })
      return
    }
    // 优先云端登录，失败自动降级为本地登录
    const result = await cloudLogin({
      nickname: loginForm.nickname.trim(),
      avatar
    })

    const loginMode = result.loginMode || 'local'
    const data = result.data || {}

    // 更新本地状态
    saveAppState({
      profile: {
        nickname: loginForm.nickname.trim(),
        avatar,
        openId: data.openid || ''
      }
    })

    user.value = getUser()
    state.value = getAppState()
    showLoginSheet.value = false

    if (loginMode === 'cloud') {
      uni.showToast({ title: '登录成功', icon: 'none' })
    } else {
      const fallbackMsg = result.fallbackMsg || '云端登录暂时不可用'
      uni.showModal({
        title: '已切到本地模式',
        content: `云端登录失败：${fallbackMsg}。这次先用本地模式顶一下，所以 AI、校园申请和云端同步暂时还不能用。`,
        showCancel: false,
        confirmText: '知道了'
      })
    }
  } catch (error) {
    console.warn('handleLogin failed', error)
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
  } finally {
    isLoggingIn.value = false
  }
}

function handleLogout() {
  uni.showModal({
    title: '确定退出登录？',
    content: '退出后你的个性化推荐记录会保留',
    confirmText: '退出',
    success: (res) => {
      if (res.confirm) {
        clearUser()
        showProfileSheet.value = false
        uni.showToast({ title: '已退出登录', icon: 'none' })
      }
    }
  })
}

function onChooseAvatarEdit(e) {
  const avatarUrl = e.detail.avatarUrl
  if (avatarUrl) {
    uploadAvatarToCloud(avatarUrl).then((avatar) => {
      if (!avatar) {
        uni.showToast({ title: '头像上传失败，请重新选择', icon: 'none' })
        return
      }
      saveUser({ avatar })
      saveAppState({ profile: { avatar } })
      syncProfileToCloud({ avatar })
      user.value = getUser()
      uni.showToast({ title: '头像已更新', icon: 'none' })
    })
  }
}

function onNicknameEdit(e) {
  const newNickname = (e.detail.value || '').trim()
  if (newNickname && newNickname !== user.value.nickname) {
    saveUser({ nickname: newNickname })
    saveAppState({ profile: { nickname: newNickname } })
    syncProfileToCloud({ nickname: newNickname })
    user.value = getUser()
    uni.showToast({ title: '昵称已更新', icon: 'none' })
  }
}

// 以下是从 profile sheet 内部打开 MBTI/星座选择器
function openMbtiPopupFromSheet() {
  pendingMbti.value = state.value.profile.mbti
  showProfileSheet.value = false
  showMbtiPopup.value = true
}

function openZodiacPopupFromSheet() {
  pendingZodiac.value = state.value.profile.zodiac
  showProfileSheet.value = false
  showZodiacPopup.value = true
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
  syncProfileToCloud({ profile: { mbti: nextMbti } })
  uni.showToast({ title: `MBTI 已切换为 ${nextMbti}`, icon: 'none' })
}

function handleZodiacChange(nextZodiac) {
  state.value = saveAppState({ profile: { zodiac: nextZodiac } })
  pendingZodiac.value = nextZodiac
  syncProfileToCloud({ profile: { zodiac: nextZodiac } })
  uni.showToast({ title: `星座已切换为 ${nextZodiac}`, icon: 'none' })
}

function goCampusPage() {
  uni.navigateTo({ url: '/pages/campus/select' })
}

function goHistoryPage() {
  if (!requireLogin({ content: '登录后才能查看你的历史记录。' })) {
    return
  }

  uni.navigateTo({ url: '/pages/history/index' })
}

function goCanteenPage() {
  uni.navigateTo({ url: '/pages/canteen/canteen' })
}

function goServicePage() {
  uni.navigateTo({ url: '/pages/service/service' })
}

function goJoinPage() {
  if (!requireLogin({
    cloudOnly: true,
    content: '登录后才能提交校园入驻申请。'
  })) {
    return
  }

  uni.navigateTo({ url: '/pages/campus/join' })
}

function goPrivacyPolicy() {
  uni.navigateTo({ url: '/pages/webview/index?url=privacy' })
}

function goUserAgreement() {
  uni.navigateTo({ url: '/pages/webview/index?url=agreement' })
}

</script>

<style lang="scss">
.profile-card, .section-card { border-radius: 34rpx; padding: 30rpx; }
.profile-card--top { margin-top: 0; }
.section-label { display: block; margin: 22rpx 8rpx 12rpx; color: rgba(160, 149, 139, 0.78); font-size: 20rpx; letter-spacing: 1rpx; }
.section-card { margin-top: 0; }
.service-entry { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; margin-top: 24rpx; border-radius: 34rpx; padding: 34rpx 30rpx; }
.service-entry__copy { flex: 1; }
.service-entry__eyebrow, .service-entry__title, .service-entry__desc { display: block; }
.service-entry__eyebrow { color: #2f251d; font-size: 32rpx; font-weight: 700; }
.service-entry__title { margin-top: 14rpx; color: #3c3027; font-size: 30rpx; font-weight: 700; }
.service-entry__tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 14rpx; }
.service-entry__tag { padding: 6rpx 14rpx; border-radius: 999rpx; background: rgba(255,255,255,0.78); color: #5e766e; font-size: 20rpx; font-weight: 600; line-height: 1.2; }
.service-entry__desc { margin-top: 12rpx; color: #96897e; font-size: 25rpx; line-height: 1.6; }
.service-entry__action { flex-shrink: 0; padding: 18rpx 24rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 700; }
.profile-top { display: flex; align-items: center; gap: 22rpx; }
.avatar-shell { display: flex; align-items: center; justify-content: center; width: 116rpx; height: 116rpx; border-radius: 50%; flex-shrink: 0; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; text-align: center; line-height: 96rpx; font-size: 40rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.avatar--img { width: 116rpx; height: 116rpx; }
.profile-copy { flex: 1; }
.nickname { display: block; color: #32271f; font-size: 38rpx; font-weight: 700; line-height: 1.35; }
.login-mode-text { display: block; margin-top: 8rpx; font-size: 22rpx; line-height: 1.35; font-weight: 700; }
.profile-tagline { display: block; margin-top: 8rpx; color: #b0a398; font-size: 22rpx; line-height: 1.4; }
.profile-tagline--secondary { margin-top: 6rpx; }
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
.sheet-panel--login { max-height: 55vh; }
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

// 登录 sheet
.login-header { display: flex; flex-direction: column; align-items: center; margin-top: 20rpx; }
.login-avatar-btn { background: transparent; padding: 0; margin: 0; border: 0; line-height: 1; display: flex; flex-direction: column; align-items: center; }
.login-avatar-btn::after { border: 0; }
.login-avatar-shell { display: flex; align-items: center; justify-content: center; width: 140rpx; height: 140rpx; border-radius: 50%; margin-bottom: 12rpx; }
.login-avatar-shell .avatar { width: 120rpx; height: 120rpx; font-size: 50rpx; }
.login-avatar-hint { display: block; color: #9f9388; font-size: 22rpx; margin-top: 8rpx; }
.login-title { display: block; color: #2f251d; font-size: 38rpx; font-weight: 700; margin-top: 20rpx; }
.login-desc { display: block; margin-top: 14rpx; color: #9f9388; font-size: 26rpx; text-align: center; }
.login-field { display: flex; align-items: center; gap: 18rpx; margin-top: 32rpx; padding: 0 8rpx; width: 100%; }
.login-field__label { color: #2f251d; font-size: 28rpx; font-weight: 700; flex-shrink: 0; }
.login-field__input { flex: 1; height: 80rpx; padding: 0 22rpx; border-radius: 22rpx; background: rgba(255,255,255,0.74); color: #3f3126; font-size: 26rpx; }
.login-agreement-row { display: flex; align-items: flex-start; gap: 14rpx; margin-top: 22rpx; padding: 0 8rpx; }
.login-agreement-check { display: flex; align-items: center; justify-content: center; width: 32rpx; height: 32rpx; border-radius: 10rpx; flex-shrink: 0; margin-top: 4rpx; }
.login-agreement-check__icon { font-size: 20rpx; font-weight: 700; line-height: 1; color: inherit; }
.login-agreement-text { flex: 1; color: #8f8174; font-size: 22rpx; line-height: 1.6; }
.login-agreement-link { color: #ff7f32; font-weight: 700; }
.login-button { width: 100%; height: 88rpx; border-radius: 28rpx; margin-top: 32rpx; text-align: center; line-height: 88rpx; font-size: 30rpx; font-weight: 700; color: #ffffff; letter-spacing: 2rpx; }

// 个人资料编辑 sheet
.profile-edit-row { display: flex; align-items: center; gap: 24rpx; margin-top: 30rpx; padding: 16rpx 0; }
.profile-edit-avatar-btn { background: transparent; padding: 0; margin: 0; border: 0; line-height: 1; }
.profile-edit-avatar-btn::after { border: 0; }
.profile-edit-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; flex-shrink: 0; }
.profile-edit-avatar-placeholder { width: 100rpx; height: 100rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40rpx; flex-shrink: 0; }
.profile-edit-info { flex: 1; }
.profile-edit-nickname-input { display: block; color: #2f251d; font-size: 34rpx; font-weight: 700; line-height: 1.3; height: 52rpx; }
.profile-edit-divider { height: 2rpx; margin-top: 24rpx; background: rgba(255,255,255,0.65); }
.profile-edit-pickers { display: flex; gap: 18rpx; margin-top: 28rpx; }
.profile-edit-pickers .picker-item { flex: 1; }
.logout-button { width: 100%; height: 88rpx; border-radius: 28rpx; margin-top: 40rpx; text-align: center; line-height: 88rpx; font-size: 30rpx; font-weight: 700; }

.legal-footer { display: flex; align-items: center; justify-content: center; gap: 20rpx; margin-top: 48rpx; padding-bottom: 32rpx; }
.legal-link { font-size: 24rpx; color: #a59487; }
.legal-divider { font-size: 24rpx; color: #c4b8ac; }
</style>
