const PRIVACY_AGREED_KEY = 'eat-what-privacy-agreed'

function safeRead(key, fallbackValue) {
  try {
    const value = uni.getStorageSync(key)
    return value === '' || value === undefined ? fallbackValue : value
  } catch (error) {
    return fallbackValue
  }
}

function safeWrite(key, value) {
  try {
    uni.setStorageSync(key, value)
  } catch (error) {
    console.warn('[privacy-state] storage write failed', error)
  }
}

export function hasAgreedPrivacy() {
  return Boolean(safeRead(PRIVACY_AGREED_KEY, false))
}

export function agreePrivacy() {
  safeWrite(PRIVACY_AGREED_KEY, true)
  uni.$emit('privacy-state-changed')
}

export function requirePrivacyAgreement(options = {}) {
  const {
    title = '先确认隐私协议',
    content = '同意隐私政策和用户协议后，才能继续使用这个功能。',
    showLink = true
  } = options

  if (hasAgreedPrivacy()) {
    return true
  }

  uni.showModal({
    title,
    content,
    confirmText: '去查看',
    cancelText: '先不了',
    success: (res) => {
      if (res.confirm && showLink) {
        uni.navigateTo({ url: '/pages/webview/index?url=privacy' })
      }
    }
  })

  return false
}
