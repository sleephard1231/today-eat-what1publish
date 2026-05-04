/**
 * 用户状态管理
 * 负责登录态、本地用户信息存储
 * 
 * 支持两种模式：
 * 1. 云端模式：通过 uniCloud 云函数获取真实 openId，数据可跨设备同步
 * 2. 本地模式：云函数不可用时降级为本地模拟登录（开发/测试用）
 */

import { cloudWxLogin, cloudGetProfile, cloudUpdateProfile, isCloudAvailable } from '@/utils/cloud.js'

const USER_KEY = 'eat-what-user'
const LOGIN_INTENT_KEY = 'eat-what-login-intent'
const CLOUD_FILE_PREFIX = 'cloud://'

const defaultUser = {
  openId: '',
  sessionKey: '',
  token: '',
  nickname: '',
  avatar: '',
  isLoggedIn: false,
  loginMode: 'local' // 'cloud' | 'local'
}

function safeRead(key, fallbackValue) {
  try {
    const value = uni.getStorageSync(key)
    return value || fallbackValue
  } catch (error) {
    return fallbackValue
  }
}

function safeWrite(key, value) {
  try {
    uni.setStorageSync(key, value)
  } catch (error) {
    console.warn('storage write failed', error)
  }
}

function isTempAvatarPath(path = '') {
  return Boolean(path) && !path.startsWith(CLOUD_FILE_PREFIX) && !/^https?:\/\//.test(path)
}

export function getUser() {
  return safeRead(USER_KEY, defaultUser)
}

export function isLoggedIn() {
  return Boolean(getUser().isLoggedIn)
}

export function saveUser(user) {
  safeWrite(USER_KEY, { ...defaultUser, ...user, isLoggedIn: true })
  uni.$emit('user-state-changed')
}

export function clearUser() {
  safeWrite(USER_KEY, { ...defaultUser })
  uni.$emit('user-state-changed')
}

export async function uploadAvatarToCloud(tempFilePath = '') {
  if (!isTempAvatarPath(tempFilePath)) {
    return tempFilePath
  }

  try {
    const extMatch = tempFilePath.match(/\.(jpg|jpeg|png|webp)$/i)
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg'
    const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const result = await uniCloud.uploadFile({
      filePath: tempFilePath,
      cloudPath
    })

    return result.fileID || tempFilePath
  } catch (error) {
    console.warn('[user-state] upload avatar failed', error)
    return ''
  }
}

export function consumeLoginIntent() {
  try {
    const value = uni.getStorageSync(LOGIN_INTENT_KEY)
    if (value) {
      uni.removeStorageSync(LOGIN_INTENT_KEY)
    }
    return Boolean(value)
  } catch (error) {
    return false
  }
}

/**
 * 云端微信登录
 * @param {object} userInfo - { nickname, avatar }
 * @returns {{ code: number, data?: object, msg?: string }}
 */
export async function wxCloudLogin(userInfo = {}) {
  // 尝试云端登录
  const result = await cloudWxLogin(userInfo)

  if (result.code === 0 && result.data) {
    // 云端登录成功
    saveUser({
      openId: result.data.openid,
      sessionKey: '',
      token: result.data.token,
      nickname: result.data.nickname || userInfo.nickname || '',
      avatar: result.data.avatar || userInfo.avatar || '',
      loginMode: 'cloud'
    })
    return { code: 0, data: result.data, loginMode: 'cloud' }
  }

  // 云端登录失败，降级为本地模拟登录
  console.warn('[user-state] 云端登录失败，降级为本地登录:', result.msg)
  return { code: result.code, msg: result.msg, loginMode: 'local' }
}

/**
 * 本地模拟登录（降级方案/开发用）
 * @param {object} userInfo - { nickname, avatar }
 */
export function localLogin(userInfo = {}) {
  const mockOpenId = `local_openid_${Date.now()}`
  const mockToken = `local_token_${Date.now()}`

  saveUser({
    openId: mockOpenId,
    sessionKey: '',
    token: mockToken,
    nickname: userInfo.nickname || '',
    avatar: userInfo.avatar || '',
    loginMode: 'local'
  })

  return {
    code: 0,
    data: {
      openid: mockOpenId,
      token: mockToken,
      nickname: userInfo.nickname || '',
      avatar: userInfo.avatar || '',
      isNewUser: true
    },
    loginMode: 'local'
  }
}

/**
 * 统一登录入口
 * 优先尝试云端登录，失败则降级为本地登录
 * @param {object} userInfo - { nickname, avatar }
 * @returns {{ code: number, data?: object, msg?: string, loginMode: string }}
 */
export async function handleLogin(userInfo = {}) {
  const cloudResult = await wxCloudLogin(userInfo)

  if (cloudResult.code === 0) {
    return cloudResult
  }

  // 降级为本地登录
  const localResult = localLogin(userInfo)
  return { ...localResult, fallbackMsg: cloudResult.msg }
}

/**
 * 同步更新用户资料到云端（如果已云端登录）
 * @param {object} profileData - { nickname?, avatar?, profile: { mbti?, zodiac? } }
 */
export async function syncProfileToCloud(profileData = {}) {
  const user = getUser()
  if (user.loginMode !== 'cloud' || !user.token) return

  try {
    await cloudUpdateProfile(user.token, profileData)
  } catch (err) {
    console.warn('[user-state] 同步资料到云端失败', err)
  }
}

/**
 * 检查是否为云端登录用户
 */
export function isCloudUser() {
  const user = getUser()
  return user.loginMode === 'cloud' && !!user.token
}

export function requireLogin(options = {}) {
  const {
    cloudOnly = false,
    title = '先登录一下',
    content = '登录后才能继续使用这个功能。',
    redirect = true
  } = options
  const passed = cloudOnly ? isCloudUser() : isLoggedIn()

  if (passed) {
    return true
  }

  if (!redirect) {
    uni.showToast({ title: content, icon: 'none' })
    return false
  }

  uni.showModal({
    title,
    content,
    confirmText: '去登录',
    cancelText: '先不了',
    success: (res) => {
      if (res.confirm) {
        safeWrite(LOGIN_INTENT_KEY, Date.now())
        uni.switchTab({ url: '/pages/my/my' })
      }
    }
  })

  return false
}
