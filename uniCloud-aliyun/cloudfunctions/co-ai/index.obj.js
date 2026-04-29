/**
 * co-ai 云对象
 * 负责AI推荐理由生成（通义千问 DashScope API）
 *
 * 前端调用方式：
 *   const co = uniCloud.importObject('co-ai')
 *   const res = await co.generateReason(context)
 */

// ⚠️ 上线前必须填入通义千问 API Key
// 获取地址：https://dashscope.console.aliyun.com/apiKey
const DASHSCOPE_API_KEY = '你的dashscope-api-key'

// DashScope API 地址
const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

// 限流：每用户每分钟最多5次
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 5
const userCallLog = {} // { openid: [timestamp, ...] }

module.exports = {
  /**
   * AI 生成推荐理由
   * @param {object} context - 推荐上下文
   *   {
   *     mbti, zodiac, mode, campusName, canteenName,
   *     foodName, foodVibe, appetite, energy, luck
   *   }
   * @returns {{ code: number, reason?: string, msg?: string }}
   */
  async generateReason(context = {}) {
    // 限流检查
    const clientInfo = this.getClientInfo()
    const openid = clientInfo.OPENID || ''
    if (!this._checkRateLimit(openid)) {
      return { code: -1, msg: '请求太频繁，请稍后再试' }
    }

    if (!DASHSCOPE_API_KEY || DASHSCOPE_API_KEY === '你的dashscope-api-key') {
      console.warn('[co-ai] DASHSCOPE_API_KEY not configured')
      return { code: -1, msg: 'AI 服务未配置' }
    }

    const prompt = this._buildReasonPrompt(context)

    try {
      const res = await uniCloud.httpclient.request(DASHSCOPE_URL, {
        method: 'POST',
        dataType: 'json',
        contentType: 'json',
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: 'qwen-turbo',
          input: {
            messages: [
              {
                role: 'system',
                content: '你是一个轻松幽默的美食推荐助手，专门帮大学生推荐今天吃什么。你的语气要温暖、有趣、像朋友聊天，不要太正式。推荐理由要自然地融入MBTI性格和星座运势，让推荐有仪式感但又不会太长。回复只需要推荐理由本身，不要加引号或其他格式。控制在50字以内。'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          parameters: {
            temperature: 0.85,
            top_p: 0.9,
            max_tokens: 150,
            result_format: 'message'
          }
        },
        timeout: 10000
      })

      const data = res.data || {}

      if (data.output && data.output.choices && data.output.choices.length) {
        const message = data.output.choices[0].message || {}
        const reason = (message.content || '').trim()

        if (reason) {
          return { code: 0, reason }
        }
      }

      console.warn('[co-ai] unexpected response', JSON.stringify(data).slice(0, 200))
      return { code: -1, msg: 'AI 生成失败' }
    } catch (err) {
      console.warn('[co-ai] generateReason error', err.message || err)
      return { code: -1, msg: 'AI 服务暂时不可用' }
    }
  },

  /**
   * 批量生成推荐理由
   * @param {Array<object>} contexts
   * @returns {{ code: number, results?: Array, errors?: number, msg?: string }}
   */
  async batchGenerateReasons(contexts) {
    if (!Array.isArray(contexts) || !contexts.length) {
      return { code: -1, results: [], errors: 0, msg: '空数组' }
    }

    const results = []
    let errors = 0

    for (const ctx of contexts.slice(0, 5)) {
      const res = await this.generateReason(ctx)
      if (res.code === 0 && res.reason) {
        results.push({ reason: res.reason, isAI: true })
      } else {
        results.push({ reason: '', isAI: false })
        errors += 1
      }
    }

    return { code: 0, results, errors }
  },

  /**
   * AI 生成运势文案
   * @param {object} context - { mbti, zodiac, dateLabel }
   * @returns {{ code: number, text?: string, msg?: string }}
   */
  async generateFortuneText(context = {}) {
    const clientInfo = this.getClientInfo()
    const openid = clientInfo.OPENID || ''
    if (!this._checkRateLimit(openid)) {
      return { code: -1, msg: '请求太频繁' }
    }

    if (!DASHSCOPE_API_KEY || DASHSCOPE_API_KEY === '你的dashscope-api-key') {
      return { code: -1, msg: 'AI 服务未配置' }
    }

    const prompt = `今天是${context.dateLabel || '新的一天'}，${context.mbti || 'ENFJ'}的${context.zodiac || '白羊座'}，用轻松一句话描述今天的运势氛围，控制在20字以内。`

    try {
      const res = await uniCloud.httpclient.request(DASHSCOPE_URL, {
        method: 'POST',
        dataType: 'json',
        contentType: 'json',
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: 'qwen-turbo',
          input: {
            messages: [
              {
                role: 'system',
                content: '你是轻松幽默的运势助手，回复简短有趣，像朋友之间的调侃。只回复运势文案本身，不加引号。'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          parameters: {
            temperature: 0.9,
            top_p: 0.9,
            max_tokens: 80,
            result_format: 'message'
          }
        },
        timeout: 8000
      })

      const data = res.data || {}
      if (data.output && data.output.choices && data.output.choices.length) {
        const text = (data.output.choices[0].message.content || '').trim()
        if (text) {
          return { code: 0, text }
        }
      }

      return { code: -1, msg: '生成失败' }
    } catch (err) {
      console.warn('[co-ai] generateFortuneText error', err.message || err)
      return { code: -1, msg: 'AI 服务不可用' }
    }
  },

  // ====== 内部方法 ======

  /**
   * 构建推荐理由 prompt
   * @private
   */
  _buildReasonPrompt(context) {
    const parts = []

    if (context.mode === 'campus') {
      parts.push(`用户在${context.campusName || '学校'}的${context.canteenName || '饭堂'}吃饭`)
    } else {
      parts.push('用户在普通模式下选餐')
    }

    if (context.mbti) {
      parts.push(`MBTI是${context.mbti}`)
    }
    if (context.zodiac) {
      parts.push(`${context.zodiac}`)
    }
    if (context.foodName) {
      parts.push(`推荐了${context.foodName}`)
    }
    if (context.foodVibe) {
      parts.push(`感觉是${context.foodVibe}`)
    }
    if (context.appetite) {
      parts.push(`今天食欲${context.appetite}`)
    }
    if (context.energy) {
      parts.push(`能量${context.energy}`)
    }

    return `${parts.join('，')}。请给出一句个性化的推荐理由，让用户觉得这道菜就是今天最对味的选择。`
  },

  /**
   * 限流检查
   * @private
   */
  _checkRateLimit(openid) {
    if (!openid) return true

    const now = Date.now()
    if (!userCallLog[openid]) {
      userCallLog[openid] = []
    }

    // 清理过期记录
    userCallLog[openid] = userCallLog[openid].filter((ts) => now - ts < RATE_LIMIT_WINDOW)

    if (userCallLog[openid].length >= RATE_LIMIT_MAX) {
      return false
    }

    userCallLog[openid].push(now)
    return true
  }
}
