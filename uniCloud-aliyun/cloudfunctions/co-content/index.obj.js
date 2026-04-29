/**
 * co-content 云对象
 * 负责文本内容安全检查（微信 msgSecCheck）
 *
 * 前端调用方式：
 *   const co = uniCloud.importObject('co-content')
 *   const res = await co.checkText('检查内容', 1, 'openid')
 */

// ⚠️ 上线前必须填入真实的 AppSecret
const WX_APPID = 'wx你的appid'
const WX_APPSECRET = '你的appsecret'

// 缓存 access_token（有效期2小时）
let accessTokenCache = {
  token: '',
  expireAt: 0
}

module.exports = {
  /**
   * 单条文本内容安全检查
   * @param {string} content - 待检查文本
   * @param {number} scene - 场景值 1资料 2评论 3论坛 4社交日志
   * @param {string} openid - 用户openid（必填）
   * @returns {{ code: number, safe: boolean, msg?: string }}
   */
  async checkText(content, scene = 1, openid = '') {
    if (!content || !content.trim()) {
      return { code: 0, safe: true, msg: '空内容，无需检查' }
    }

    if (!openid) {
      console.warn('[co-content] checkText called without openid, skipping')
      return { code: 0, safe: true, msg: '缺少openid，暂时放行' }
    }

    try {
      const accessToken = await this._getAccessToken()
      if (!accessToken) {
        console.warn('[co-content] getAccessToken failed, skipping check')
        return { code: -1, safe: true, msg: '获取access_token失败，暂时放行' }
      }

      const res = await uniCloud.httpclient.request(
        'https://api.weixin.qq.com/wxa/msg_sec_check?access_token=' + accessToken,
        {
          method: 'POST',
          dataType: 'json',
          contentType: 'json',
          data: {
            content: content.slice(0, 2500), // 微信限制最长 2500 字
            openid,
            scene,
            version: 2
          },
          timeout: 8000
        }
      )

      const data = res.data || {}

      if (data.errcode !== 0) {
        console.warn('[co-content] msgSecCheck error', JSON.stringify(data))
        // 检查失败暂时放行
        return { code: -1, safe: true, msg: '检查服务异常，暂时放行' }
      }

      // result.suggest: pass / risky / review
      const suggest = (data.result && data.result.suggest) || 'pass'
      const isSafe = suggest === 'pass'

      return {
        code: 0,
        safe: isSafe,
        label: data.result && data.result.label ? data.result.label : '',
        msg: isSafe ? '内容安全' : '内容可能违规'
      }
    } catch (err) {
      console.warn('[co-content] checkText error', err)
      return { code: -1, safe: true, msg: '检查服务异常，暂时放行' }
    }
  },

  /**
   * 批量文本内容安全检查
   * @param {Array<string>} contents - 待检查文本数组
   * @param {number} scene - 场景值
   * @param {string} openid - 用户openid
   * @returns {{ code: number, results?: Array, msg?: string }}
   */
  async checkTextBatch(contents, scene = 1, openid = '') {
    if (!Array.isArray(contents) || !contents.length) {
      return { code: 0, results: [], msg: '空数组' }
    }

    if (!openid) {
      return { code: 0, results: contents.map(() => ({ safe: true })), msg: '缺少openid，全部放行' }
    }

    const results = []
    for (const content of contents) {
      const result = await this.checkText(content, scene, openid)
      results.push({
        safe: result.safe,
        label: result.label || '',
        msg: result.msg || ''
      })
    }

    return { code: 0, results }
  },

  // ====== 内部方法 ======

  /**
   * 获取微信 access_token（带缓存）
   * @private
   */
  async _getAccessToken() {
    if (accessTokenCache.token && Date.now() < accessTokenCache.expireAt) {
      return accessTokenCache.token
    }

    try {
      const res = await uniCloud.httpclient.request(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_APPSECRET}`,
        { dataType: 'json', method: 'GET', timeout: 8000 }
      )

      const data = res.data || {}
      if (!data.access_token) {
        console.warn('[co-content] getAccessToken failed', JSON.stringify(data))
        return ''
      }

      // 缓存，提前5分钟过期
      accessTokenCache = {
        token: data.access_token,
        expireAt: Date.now() + (data.expires_in - 300) * 1000
      }

      return data.access_token
    } catch (err) {
      console.warn('[co-content] _getAccessToken error', err)
      return ''
    }
  }
}
