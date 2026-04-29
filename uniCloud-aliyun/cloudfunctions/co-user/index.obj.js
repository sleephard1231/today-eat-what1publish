/**
 * co-user 云对象
 * 负责微信登录、用户资料管理、状态同步、历史同步
 *
 * 前端调用方式：
 *   const co = uniCloud.importObject('co-user')
 *   const res = await co.wxLogin(code, userInfo)
 */

// ⚠️ 上线前必须填入真实的 AppSecret
const WX_APPID = 'wx3212c0e346843235'
const WX_APPSECRET = '9a2f13b99c9f0c1c9b106e5552d74b3e'

// token 有效期 7 天
const TOKEN_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000

const db = uniCloud.database()
const usersCollection = db.collection('eat-what-users')
const stateCollection = db.collection('eat-what-state')
const historyCollection = db.collection('eat-what-history')

module.exports = {
  /**
   * 微信登录
   * @param {string} code - uni.login 获取的 code
   * @param {object} userInfo - { nickname, avatar }
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async wxLogin(code, userInfo = {}) {
    if (!code) {
      return { code: -1, msg: '缺少登录凭证' }
    }

    try {
      // 1. 用 code 换 openid
      const wxRes = await uniCloud.httpclient.request(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_APPSECRET}&js_code=${code}&grant_type=authorization_code`,
        { dataType: 'json', method: 'GET', timeout: 8000 }
      )

      const wxData = wxRes.data || {}
      const openid = wxData.openid
      const sessionKey = wxData.session_key

      if (!openid) {
        console.warn('[co-user] jscode2session failed', JSON.stringify(wxData))
        return { code: -1, msg: '微信登录失败，请重试' }
      }

      // 2. 查找或创建用户
      const { data: existUsers } = await usersCollection.where({ openid }).limit(1).get()
      let user = existUsers[0] || null
      let isNewUser = false

      const token = this._generateToken(openid)
      const now = Date.now()

      if (user) {
        // 已有用户，更新登录态
        await usersCollection.doc(user._id).update({
          sessionKey: sessionKey || '',
          token,
          loginMode: 'cloud',
          nickname: userInfo.nickname || user.nickname || '',
          avatar: userInfo.avatar || user.avatar || '',
          updatedAt: now
        })
        user.nickname = userInfo.nickname || user.nickname || ''
        user.avatar = userInfo.avatar || user.avatar || ''
      } else {
        // 新用户
        isNewUser = true
        const addRes = await usersCollection.add({
          openid,
          unionid: wxData.unionid || '',
          sessionKey: sessionKey || '',
          token,
          nickname: userInfo.nickname || '',
          avatar: userInfo.avatar || '',
          profile: {
            mbti: 'ENFJ',
            zodiac: '白羊座'
          },
          loginMode: 'cloud',
          createdAt: now,
          updatedAt: now
        })

        // 初始化状态记录
        await stateCollection.add({
          openid,
          mode: 'normal',
          campusId: 'gzcc',
          profile: {
            nickname: userInfo.nickname || '',
            mbti: 'ENFJ',
            zodiac: '白羊座',
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
          updatedAt: now
        })

        // 初始化历史记录
        await historyCollection.add({
          openid,
          records: [],
          updatedAt: now
        })

        user = { _id: addRes.id, openid, nickname: userInfo.nickname || '', avatar: userInfo.avatar || '' }
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
      return { code: -1, msg: '登录失败，请稍后重试' }
    }
  },

  /**
   * 获取用户资料
   * @param {string} token
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async getProfile(token) {
    const openid = await this._verifyToken(token)
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

  /**
   * 更新用户资料
   * @param {string} token
   * @param {object} profileData - { nickname?, avatar?, profile: { mbti?, zodiac? } }
   * @returns {{ code: number, msg?: string }}
   */
  async updateProfile(token, profileData = {}) {
    const openid = await this._verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const updateFields = { updatedAt: Date.now() }

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

  /**
   * 同步应用状态到云端
   * @param {string} token
   * @param {object} stateData
   * @returns {{ code: number, msg?: string }}
   */
  async syncState(token, stateData) {
    const openid = await this._verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const updateFields = {
      updatedAt: Date.now()
    }

    if (stateData.mode !== undefined) updateFields.mode = stateData.mode
    if (stateData.campusId !== undefined) updateFields.campusId = stateData.campusId
    if (stateData.profile !== undefined) updateFields.profile = stateData.profile
    if (stateData.daily !== undefined) updateFields.daily = stateData.daily
    if (stateData.stats !== undefined) updateFields.stats = stateData.stats
    if (stateData.selectedCanteen !== undefined) updateFields.selectedCanteen = stateData.selectedCanteen

    const { data: existState } = await stateCollection.where({ openid }).limit(1).get()

    if (existState.length) {
      await stateCollection.doc(existState[0]._id).update(updateFields)
    } else {
      await stateCollection.add({
        openid,
        ...stateData,
        updatedAt: Date.now()
      })
    }

    return { code: 0, msg: '同步成功' }
  },

  /**
   * 获取云端应用状态
   * @param {string} token
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async getState(token) {
    const openid = await this._verifyToken(token)
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

  /**
   * 同步历史记录到云端
   * @param {string} token
   * @param {Array} historyList
   * @returns {{ code: number, msg?: string }}
   */
  async syncHistory(token, historyList) {
    const openid = await this._verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const records = Array.isArray(historyList) ? historyList.slice(0, 30) : []

    const { data: existHistory } = await historyCollection.where({ openid }).limit(1).get()

    if (existHistory.length) {
      await historyCollection.doc(existHistory[0]._id).update({
        records,
        updatedAt: Date.now()
      })
    } else {
      await historyCollection.add({
        openid,
        records,
        updatedAt: Date.now()
      })
    }

    return { code: 0, msg: '同步成功' }
  },

  /**
   * 获取云端历史记录
   * @param {string} token
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getHistory(token) {
    const openid = await this._verifyToken(token)
    if (!openid) {
      return { code: -1, msg: 'token 无效或已过期' }
    }

    const { data: histories } = await historyCollection.where({ openid }).limit(1).get()
    if (!histories.length) {
      return { code: 0, data: [] }
    }

    return { code: 0, data: histories[0].records || [] }
  },

  // ====== 内部方法 ======

  /**
   * 生成简易 token
   * @private
   */
  _generateToken(openid) {
    const crypto = require('crypto')
    const raw = `${openid}:${Date.now()}:${Math.random().toString(36).slice(2)}`
    return crypto.createHash('sha256').update(raw).digest('hex')
  },

  /**
   * 验证 token，返回 openid
   * @private
   */
  async _verifyToken(token) {
    if (!token) return null

    try {
      const { data: users } = await usersCollection.where({ token }).limit(1).get()
      if (!users.length) return null

      const user = users[0]
      // 检查 token 是否过期（通过 updatedAt 粗略判断）
      const elapsed = Date.now() - (user.updatedAt || 0)
      if (elapsed > TOKEN_EXPIRE_MS) {
        return null
      }

      return user.openid
    } catch (err) {
      console.warn('[co-user] _verifyToken error', err)
      return null
    }
  }
}
