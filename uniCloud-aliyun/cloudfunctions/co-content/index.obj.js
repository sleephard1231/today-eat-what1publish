/**
 * co-content cloud object
 * Text content safety checks via WeChat msgSecCheck.
 */

const WX_APPID = process.env.WX_APPID || 'wx3212c0e346843235'
const WX_APPSECRET = process.env.WX_APPSECRET || ''

let accessTokenCache = {
  token: '',
  expireAt: 0
}

module.exports = {
  /**
   * Check a single text value.
   * @param {string} content
   * @param {number} scene 1 profile, 2 comment, 3 forum, 4 social log
   * @param {string} openid
   * @returns {{ code: number, safe: boolean, label?: string, msg?: string }}
   */
  async checkText(content, scene = 1, openid = '') {
    if (!content || !content.trim()) {
      return { code: 0, safe: true, msg: '空内容，无需检查' }
    }

    if (!openid) {
      console.warn('[co-content] checkText called without openid, skipping')
      return { code: 0, safe: true, msg: '缺少 openid，暂时放行' }
    }

    try {
      const accessToken = await this._getAccessToken()
      if (!accessToken) {
        console.warn('[co-content] getAccessToken failed, skipping check')
        return { code: -1, safe: true, msg: '内容安全服务暂时不可用' }
      }

      const res = await uniCloud.httpclient.request(
        `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${accessToken}`,
        {
          method: 'POST',
          dataType: 'json',
          contentType: 'json',
          data: {
            content: String(content).slice(0, 2500),
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
        return { code: -1, safe: true, msg: '内容安全检查异常，暂时放行' }
      }

      const suggest = (data.result && data.result.suggest) || 'pass'
      const safe = suggest === 'pass'

      return {
        code: 0,
        safe,
        label: data.result && data.result.label ? data.result.label : '',
        msg: safe ? '内容安全' : '内容可能违规'
      }
    } catch (err) {
      console.warn('[co-content] checkText error', err)
      return { code: -1, safe: true, msg: '内容安全检查异常，暂时放行' }
    }
  },

  /**
   * Check text values sequentially.
   * @param {Array<string>} contents
   * @param {number} scene
   * @param {string} openid
   * @returns {{ code: number, results?: Array, msg?: string }}
   */
  async checkTextBatch(contents, scene = 1, openid = '') {
    if (!Array.isArray(contents) || !contents.length) {
      return { code: 0, results: [], msg: '空数组' }
    }

    if (!openid) {
      return {
        code: 0,
        results: contents.map(() => ({ safe: true, label: '', msg: '缺少 openid，暂时放行' })),
        msg: '缺少 openid，全部放行'
      }
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

  async _getAccessToken() {
    if (accessTokenCache.token && Date.now() < accessTokenCache.expireAt) {
      return accessTokenCache.token
    }

    if (!WX_APPSECRET) {
      console.warn('[co-content] WX_APPSECRET not configured')
      return ''
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

      accessTokenCache = {
        token: data.access_token,
        expireAt: Date.now() + (Number(data.expires_in || 7200) - 300) * 1000
      }

      return data.access_token
    } catch (err) {
      console.warn('[co-content] _getAccessToken error', err)
      return ''
    }
  }
}
