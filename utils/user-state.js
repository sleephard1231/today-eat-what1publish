/**
 * 用户状态管理
 * 负责登录态、本地用户信息存储
 *
 * 注意：wx.getUserProfile 已废弃，头像通过 <button open-type="chooseAvatar"> 获取，
 * 昵称通过 <input type="nickname"> 获取，均在页面组件中完成。
 */
import { loginWithWechat } from '@/api/user.js'

const USER_KEY = 'eat-what-user'

const defaultUser = {
  openId: '',
  sessionKey: '',
  token: '',
  nickname: '',
  avatar: '',
  isLoggedIn: false
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

export function getUser() {
  return safeRead(USER_KEY, defaultUser)
}

export function saveUser(user) {
  safeWrite(USER_KEY, { ...defaultUser, ...user, isLoggedIn: true })
  uni.$emit('user-state-changed')
}

export function clearUser() {
  safeWrite(USER_KEY, { ...defaultUser })
  uni.$emit('user-state-changed')
}

export function isLoggedIn() {
  return getUser().isLoggedIn
}

/**
 * 获取微信登录凭证 code，用于后端换取 openId / sessionKey
 * 头像和昵称不再通过此方法获取，需在页面中用 chooseAvatar + nickname input
 */
export async function getWxLoginCode() {
  try {
    const loginRes = await uni.login({ provider: 'weixin' })
    return loginRes.code || null
  } catch (error) {
    console.warn('wx.login failed', error)
    return null
  }
}
