/**
 * co-user 云对象
 * 负责微信登录、用户资料管理、状态同步、历史同步
 */

const WX_APPID = process.env.WX_APPID || 'wx3212c0e346843235'
const WX_APPSECRET = process.env.WX_APPSECRET || ''

const TOKEN_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000
const TOKEN_CACHE_TTL = 60 * 1000
const DEFAULT_PROFILE = {
  mbti: 'ENFJ',
  zodiac: '白羊座'
}

const tokenCache = new Map()

const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('eat-what-users')
const stateCollection = db.collection('eat-what-state')
const historyCollection = db.collection('eat-what-history')

function nowField() {
  return new Date()
}

function getTokenCache(token) {
  const cached = tokenCache.get(token)
  if (!cached) return null
  if (Date.now() > cached.expiresAt) {
    tokenCache.delete(token)
    return null
  }
  return cached.openid
}

function setTokenCache(token, openid) {
  tokenCache.set(token, {
    openid,
    expiresAt: Date.now() + TOKEN_CACHE_TTL
  })
}

function generateToken(openid) {
  const crypto = require('crypto')
  const raw = `${openid}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function getTimestampMs(value) {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

async function verifyToken(token) {
  if (!token) return null

  const cachedOpenid = getTokenCache(token)
  if (cachedOpenid) return cachedOpenid

  try {
    const { data: users } = await usersCollection.where({ token }).limit(1).get()
    if (!users.length) return null

    const user = users[0]
    const elapsed = Date.now() - getTimestampMs(user.updatedAt)
    if (elapsed > TOKEN_EXPIRE_MS) {
      return null
    }

    setTokenCache(token, user.openid)
    return user.openid
  } catch (err) {
    console.warn('[co-user] verifyToken error', err)
    return null
  }
}

async function ensureStateDoc(openid, userInfo = {}) {
  await stateCollection.add({
    openid,
    mode: 'normal',
    campusId: 'gzcc',
    profile: {
      nickname: userInfo.nickname || '',
      mbti: DEFAULT_PROFILE.mbti,
      zodiac: DEFAULT_PROFILE.zodiac,
      avatar: userInfo.avatar || '',
      openId: openid
    },
    daily: {
      dateKey: '',
      remaining: 10,
      lastResult: null
    },
    stats: {
      servedCount: 2847
    },
    selectedCanteen: {},
    updatedAt: nowField()
  })
}

async function ensureHistoryDoc(openid) {
  await historyCollection.add({
    openid,
    records: [],
    updatedAt: nowField()
  })
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function toSafeObject(value) {
  return isPlainObject(value) ? value : {}
}

function normalizeDailyForSave(daily = {}) {
  const source = toSafeObject(daily)
  const remaining = Number(source.remaining)

  return {
    dateKey: typeof source.dateKey === 'string' ? source.dateKey : '',
    remaining: Number.isFinite(remaining) ? remaining : 10,
    lastResult: source.lastResult === undefined ? null : source.lastResult
  }
}

function buildStateUpdateFields(stateData = {}) {
  const updateFields = {
    updatedAt: nowField()
  }

  if (stateData.mode !== undefined) updateFields.mode = stateData.mode
  if (stateData.campusId !== undefined) updateFields.campusId = stateData.campusId
  if (stateData.profile !== undefined) updateFields.profile = dbCmd.set(toSafeObject(stateData.profile))
  if (stateData.daily !== undefined) updateFields.daily = dbCmd.set(normalizeDailyForSave(stateData.daily))
  if (stateData.stats !== undefined) updateFields.stats = dbCmd.set(toSafeObject(stateData.stats))
  if (stateData.selectedCanteen !== undefined) updateFields.selectedCanteen = dbCmd.set(toSafeObject(stateData.selectedCanteen))

  return updateFields
}

function buildStateInsertDoc(openid, stateData = {}) {
  return {
    openid,
    mode: stateData.mode || 'normal',
    campusId: stateData.campusId || 'gzcc',
    profile: toSafeObject(stateData.profile),
    daily: normalizeDailyForSave(stateData.daily),
    stats: toSafeObject(stateData.stats),
    selectedCanteen: toSafeObject(stateData.selectedCanteen),
    updatedAt: nowField()
  }
}

module.exports = {
  async wxLogin(code, userInfo = {}) {
    if (!code) {
      return { code: -1, msg: '缺少登录凭证' }
    }

    try {
      const wxRes = await uniCloud.httpclient.request(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_APPSECRET}&js_code=${code}&grant_type=authorization_code`,
        { dataType: 'json', method: 'GET', timeout: 8000 }
      )

      const wxData = wxRes.data || {}
      const openid = wxData.openid
      const sessionKey = wxData.session_key

      if (!openid) {
        console.warn('[co-user] jscode2session failed', JSON.stringify(wxData))
        const wxErrorMsg = wxData.errmsg || wxData.errMsg || wxData.message || 'jscode2session 未返回 openid'
        return { code: -1, msg: `微信登录失败：${wxErrorMsg}` }
      }

      const { data: existUsers } = await usersCollection.where({ openid }).limit(1).get()
      let user = existUsers[0] || null
      let isNewUser = false
      const token = generateToken(openid)

      if (user) {
        await usersCollection.doc(user._id).update({
          sessionKey: sessionKey || '',
          token,
          loginMode: 'cloud',
          nickname: userInfo.nickname || user.nickname || '',
          avatar: userInfo.avatar || user.avatar || '',
          updatedAt: nowField()
        })
        user.nickname = userInfo.nickname || user.nickname || ''
        user.avatar = userInfo.avatar || user.avatar || ''
      } else {
        isNewUser = true
        const addRes = await usersCollection.add({
          openid,
          unionid: wxData.unionid || '',
          sessionKey: sessionKey || '',
          token,
          nickname: userInfo.nickname || '',
          avatar: userInfo.avatar || '',
          profile: { ...DEFAULT_PROFILE },
          loginMode: 'cloud',
          createdAt: nowField(),
          updatedAt: nowField()
        })

        await ensureStateDoc(openid, userInfo)
        await ensureHistoryDoc(openid)

        user = {
          _id: addRes.id,
          openid,
          nickname: userInfo.nickname || '',
          avatar: userInfo.avatar || ''
        }
      }

      return {
        code: 0,
        data: {
          openid,
          token,
          nickname: user.nickname || '',
          avatar: user.avatar || '',
          isNewUser
        }
      }
    } catch (err) {
      console.warn('[co-user] wxLogin error', err)
      return { code: -1, msg: `登录失败：${err.message || err.errMsg || '云端写入异常'}` }
    }
  },

  async getProfile(token) {
    const openid = await verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const { data: users } = await usersCollection.where({ openid }).limit(1).get()
    if (!users.length) {
      return { code: -1, msg: '用户不存在' }
    }

    const user = users[0]
    return {
      code: 0,
      data: {
        openid: user.openid,
        nickname: user.nickname || '',
        avatar: user.avatar || '',
        profile: user.profile || {},
        loginMode: user.loginMode || 'cloud'
      }
    }
  },

  async updateProfile(token, profileData = {}) {
    const openid = await verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const updateFields = { updatedAt: nowField() }

    if (profileData.nickname !== undefined) {
      updateFields.nickname = profileData.nickname
    }
    if (profileData.avatar !== undefined) {
      updateFields.avatar = profileData.avatar
    }
    if (profileData.profile) {
      const { data: users } = await usersCollection.where({ openid }).limit(1).get()
      const existingProfile = (users[0] && users[0].profile) || {}
      updateFields.profile = {
        ...existingProfile,
        ...profileData.profile
      }
    }

    await usersCollection.where({ openid }).update(updateFields)
    return { code: 0, msg: '更新成功' }
  },

  async syncState(token, stateData = {}) {
    const openid = await verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const updateFields = buildStateUpdateFields(stateData)
    const updateRes = await stateCollection.where({ openid }).update(updateFields)
    const updated = updateRes.updated || updateRes.result?.updated || 0

    if (!updated) {
      await stateCollection.add(buildStateInsertDoc(openid, stateData))
    }

    return { code: 0, msg: '同步成功' }
  },

  async getState(token) {
    const openid = await verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const { data: states } = await stateCollection.where({ openid }).limit(1).get()
    if (!states.length) {
      return { code: -1, msg: '状态不存在' }
    }

    const state = states[0]
    return {
      code: 0,
      data: {
        mode: state.mode || 'normal',
        campusId: state.campusId || 'gzcc',
        profile: state.profile || {},
        daily: state.daily || {},
        stats: state.stats || {},
        selectedCanteen: state.selectedCanteen || {}
      }
    }
  },

  async syncHistory(token, historyList) {
    const openid = await verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const records = Array.isArray(historyList) ? historyList.slice(0, 30) : []
    const updateRes = await historyCollection.where({ openid }).update({
      records,
      updatedAt: nowField()
    })
    const updated = updateRes.updated || updateRes.result?.updated || 0

    if (!updated) {
      await historyCollection.add({
        openid,
        records,
        updatedAt: nowField()
      })
    }

    return { code: 0, msg: '同步成功' }
  },

  async syncAppData(token, payload = {}) {
    const openid = await verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const stateData = payload.stateData || null
    const historyList = payload.historyList

    if (stateData) {
      const updateFields = buildStateUpdateFields(stateData)
      const stateUpdateRes = await stateCollection.where({ openid }).update(updateFields)
      const stateUpdated = stateUpdateRes.updated || stateUpdateRes.result?.updated || 0

      if (!stateUpdated) {
        await stateCollection.add(buildStateInsertDoc(openid, stateData))
      }
    }

    if (Array.isArray(historyList)) {
      const records = historyList.slice(0, 30)
      const historyUpdateRes = await historyCollection.where({ openid }).update({
        records,
        updatedAt: nowField()
      })
      const historyUpdated = historyUpdateRes.updated || historyUpdateRes.result?.updated || 0

      if (!historyUpdated) {
        await historyCollection.add({
          openid,
          records,
          updatedAt: nowField()
        })
      }
    }

    return { code: 0, msg: '同步成功' }
  },

  async getHistory(token) {
    const openid = await verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const { data: histories } = await historyCollection.where({ openid }).limit(1).get()
    if (!histories.length) {
      return { code: 0, data: [] }
    }

    return { code: 0, data: histories[0].records || [] }
  }
}
