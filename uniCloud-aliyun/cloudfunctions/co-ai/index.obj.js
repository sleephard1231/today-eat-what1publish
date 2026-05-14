/**
 * co-ai 云对象
 * 负责AI推荐理由生成（通义千问 DashScope API）
 *
 * 前端调用方式：
 *   const co = uniCloud.importObject('co-ai')
 *   const res = await co.generateReason(context)
 */

const db = uniCloud.database()

// 推荐在后台「AI推荐设置」里维护 API Key；环境变量只作为兜底。
const DASHSCOPE_API_KEY = String(process.env.DASHSCOPE_API_KEY || '').trim()

// 小程序管理员 openid 兜底校验；后台 uni-admin 会优先走 uni-id 管理员角色校验。
const ADMIN_OPENID_FALLBACKS = ['oxKFC3UzlxECsob71tnJsRgCVY1E']
const ADMIN_OPENIDS = String(process.env.ADMIN_OPENIDS || '')
  .split(',')
  .map((openid) => openid.trim())
  .filter(Boolean)
  .concat(ADMIN_OPENID_FALLBACKS)

// DashScope API 地址。优先使用阿里云百炼 OpenAI 兼容接口，旧 text-generation 地址仍兼容。
const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const DASHSCOPE_LEGACY_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

// 限流：每用户每分钟最多5次
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 5
const PICK_RATE_LIMIT_MAX = 2
const DAILY_PICK_LIMIT_MAX = 5
const userCallLog = {} // { openid: [timestamp, ...] }
const userDailyPickLog = {} // { openid: { dateKey, count } }
const usersCollection = db.collection('eat-what-users')
const uniIdUsersCollection = db.collection('uni-id-users')
const aiConfigCollection = db.collection('eat-what-ai-config')
const aiUsageCollection = db.collection('eat-what-ai-usage')

const AI_CONFIG_ID = 'default'
const CONFIG_CACHE_TTL = 30 * 1000
const aiConfigCache = {
  value: null,
  expireAt: 0
}
const adminTokenCache = {}
const DEFAULT_AI_CONFIG = {
  enable: false,
  enableNormal: true,
  enableCampus: true,
  provider: 'dashscope',
  providerType: 'dashscope',
  providerName: '通义千问 DashScope',
  remark: '',
  websiteUrl: 'https://dashscope.aliyun.com',
  apiUrl: DASHSCOPE_URL,
  useFullUrl: true,
  model: 'qwen-plus',
  dailyLimit: DAILY_PICK_LIMIT_MAX,
  minuteLimit: PICK_RATE_LIMIT_MAX,
  promptStyle: '朋友聊天',
  apiKey: '',
  usage: {
    totalCalls: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    lastTokens: 0,
    lastTestAt: 0,
    lastTestStatus: '',
    lastTestMessage: '',
    lastTestProviderType: '',
    lastTestApiUrl: '',
    lastTestModel: ''
  }
}

function buildReasonPrompt(context) {
  const parts = []

  if (context.mode === 'campus') {
    parts.push(`用户在${context.campusName || '学校'}的${context.canteenName || '饭堂'}吃饭`)
  } else {
    parts.push('用户在普通模式下选餐')
  }

  if (context.mbti) parts.push(`MBTI是${context.mbti}`)
  if (context.zodiac) parts.push(`${context.zodiac}`)
  if (context.foodName) parts.push(`推荐了${context.foodName}`)
  if (context.foodVibe) parts.push(`感觉是${context.foodVibe}`)
  if (context.appetite) parts.push(`今天食欲${context.appetite}`)
  if (context.energy) parts.push(`能量${context.energy}`)

  return `${parts.join('，')}。请给出一句个性化的推荐理由，让用户觉得这道菜就是今天最对味的选择。`
}

function checkRateLimit(openid, max = RATE_LIMIT_MAX) {
  if (!openid) return true

  const now = Date.now()
  if (!userCallLog[openid]) {
    userCallLog[openid] = []
  }

  userCallLog[openid] = userCallLog[openid].filter((ts) => now - ts < RATE_LIMIT_WINDOW)
  if (userCallLog[openid].length >= max) {
    return false
  }

  userCallLog[openid].push(now)
  return true
}

async function verifyToken(token) {
  if (!token) return ''
  const { data } = await usersCollection.where({ token }).limit(1).get()
  return data.length ? data[0].openid : ''
}

function getDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const date = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${date}`
}

function checkDailyPickLimit(openid, max = DAILY_PICK_LIMIT_MAX) {
  const dateKey = getDateKey()
  const record = userDailyPickLog[openid]
  if (!record || record.dateKey !== dateKey) {
    userDailyPickLog[openid] = { dateKey, count: 0 }
    return true
  }
  return record.count < max
}

function recordDailyPick(openid) {
  const dateKey = getDateKey()
  const record = userDailyPickLog[openid]
  if (!record || record.dateKey !== dateKey) {
    userDailyPickLog[openid] = { dateKey, count: 1 }
    return
  }
  record.count += 1
}

function getUsageId(openid, dateKey = getDateKey()) {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha1').update(`${dateKey}:${openid}`).digest('hex')
  return `${dateKey}_${hash}`
}

async function getDailyAiUsage(openid, dateKey = getDateKey()) {
  if (!openid) return { calls: 0, totalTokens: 0 }
  try {
    const { data } = await aiUsageCollection.doc(getUsageId(openid, dateKey)).get()
    return data && data.length ? data[0] : { calls: 0, totalTokens: 0 }
  } catch (err) {
    console.warn('[co-ai] get daily usage failed', err.message || err)
    return { calls: 0, totalTokens: 0 }
  }
}

async function ensureDailyAiQuota(openid, limit) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || DAILY_PICK_LIMIT_MAX, 200))
  const usage = await getDailyAiUsage(openid)
  return Number(usage.calls || 0) < safeLimit
}

async function recordDailyAiUsage(openid, usage = {}) {
  if (!openid) return null
  const dateKey = getDateKey()
  const id = getUsageId(openid, dateKey)
  const promptTokens = Number(usage.promptTokens || 0)
  const completionTokens = Number(usage.completionTokens || 0)
  const totalTokens = Number(usage.totalTokens || (promptTokens + completionTokens) || 0)
  const current = await getDailyAiUsage(openid, dateKey)
  const next = {
    _id: id,
    openid,
    dateKey,
    calls: Number(current.calls || 0) + 1,
    totalTokens: Number(current.totalTokens || 0) + totalTokens,
    promptTokens: Number(current.promptTokens || 0) + promptTokens,
    completionTokens: Number(current.completionTokens || 0) + completionTokens,
    lastTokens: totalTokens,
    updatedAt: Date.now()
  }

  try {
    if (current._id) {
      const { _id, ...updateData } = next
      await aiUsageCollection.doc(id).update(updateData)
    } else {
      await aiUsageCollection.add({
        ...next,
        createdAt: Date.now()
      })
    }
    return next
  } catch (err) {
    console.warn('[co-ai] record daily usage failed', err.message || err)
    return null
  }
}

async function getAiConfig() {
  const now = Date.now()
  if (aiConfigCache.value && now < aiConfigCache.expireAt) {
    return aiConfigCache.value
  }
  try {
    const { data } = await aiConfigCollection.doc(AI_CONFIG_ID).get()
    const config = normalizeAiConfig(data && data.length ? data[0] : {})
    aiConfigCache.value = config
    aiConfigCache.expireAt = now + CONFIG_CACHE_TTL
    return config
  } catch (err) {
    console.warn('[co-ai] get config failed, fallback default', err.message || err)
    return normalizeAiConfig({})
  }
}

function normalizeAiConfig(config = {}) {
  const dailyLimit = Math.max(1, Math.min(Number(config.dailyLimit) || DEFAULT_AI_CONFIG.dailyLimit, 200))
  const minuteLimit = Math.max(1, Math.min(Number(config.minuteLimit) || DEFAULT_AI_CONFIG.minuteLimit, 60))
  const providerType = config.providerType || config.provider || DEFAULT_AI_CONFIG.providerType
  const apiUrl = config.apiUrl || (providerType === 'dashscope' ? DASHSCOPE_URL : 'https://api.openai.com/v1/chat/completions')
  const usage = {
    ...DEFAULT_AI_CONFIG.usage,
    ...(config.usage || {})
  }
  return {
    ...DEFAULT_AI_CONFIG,
    ...config,
    _id: AI_CONFIG_ID,
    enable: !!config.enable,
    enableNormal: config.enableNormal !== false,
    enableCampus: config.enableCampus !== false,
    provider: providerType,
    providerType,
    providerName: config.providerName || getDefaultProviderName(providerType),
    remark: config.remark || '',
    websiteUrl: config.websiteUrl || '',
    apiUrl,
    useFullUrl: config.useFullUrl !== false,
    model: config.model || getDefaultModel(providerType),
    promptStyle: config.promptStyle || DEFAULT_AI_CONFIG.promptStyle,
    dailyLimit,
    minuteLimit,
    apiKey: String(config.apiKey || '').trim(),
    usage
  }
}

function getDefaultProviderName(providerType) {
  if (providerType === 'anthropic-compatible') return 'Anthropic 兼容接口'
  if (providerType === 'openai-compatible') return 'OpenAI 兼容接口'
  if (providerType === 'openai') return 'OpenAI'
  if (providerType === 'deepseek') return 'DeepSeek'
  return '通义千问 DashScope'
}

function getDefaultModel(providerType) {
  if (providerType === 'openai') return 'gpt-4o-mini'
  if (providerType === 'deepseek') return 'deepseek-chat'
  if (providerType === 'anthropic-compatible') return 'kimi-k2.5'
  if (providerType === 'openai-compatible') return 'gpt-4o-mini'
  return DEFAULT_AI_CONFIG.model
}

function isDashScopeLegacyUrl(url = '') {
  return /\/api\/v1\/services\/aigc\/text-generation\/generation\/?$/.test(String(url || ''))
}

function normalizeApiUrl(config) {
  const raw = String(config.apiUrl || '').trim()
  if (config.providerType === 'dashscope') {
    if (!raw) return DASHSCOPE_URL
    if (config.useFullUrl || isDashScopeLegacyUrl(raw) || /\/chat\/completions\/?$/.test(raw)) {
      return raw
    }
    if (/\/compatible-mode\/v1\/?$/.test(raw)) {
      return `${raw.replace(/\/$/, '')}/chat/completions`
    }
    return `${raw.replace(/\/$/, '')}/v1/chat/completions`
  }
  if (!raw) return 'https://api.openai.com/v1/chat/completions'
  if (config.providerType === 'anthropic-compatible') {
    if (/\/messages\/?$/.test(raw)) {
      return raw
    }
    if (config.useFullUrl) {
      return raw
    }
    if (/\/v1\/?$/.test(raw)) {
      return `${raw.replace(/\/$/, '')}/messages`
    }
    return `${raw.replace(/\/$/, '')}/v1/messages`
  }
  if (config.useFullUrl || /\/chat\/completions\/?$/.test(raw)) {
    return raw
  }
  return `${raw.replace(/\/$/, '')}/v1/chat/completions`
}

function buildChatRequest(config, messages, options = {}) {
  const apiUrl = normalizeApiUrl(config)
  if (config.providerType === 'dashscope' && isDashScopeLegacyUrl(apiUrl)) {
    return {
      url: apiUrl,
      body: {
        model: config.model || DEFAULT_AI_CONFIG.model,
        input: { messages },
        parameters: {
          temperature: options.temperature === undefined ? 0.7 : options.temperature,
          top_p: options.topP || 0.9,
          max_tokens: options.maxTokens || 120,
          result_format: 'message'
        }
      }
    }
  }

  if (config.providerType === 'anthropic-compatible') {
    const systemMessages = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .filter(Boolean)
    const chatMessages = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: String(message.content || '')
      }))

    return {
      url: apiUrl,
      body: {
        model: config.model,
        system: systemMessages.join('\n'),
        messages: chatMessages.length ? chatMessages : [{ role: 'user', content: '' }],
        temperature: options.temperature === undefined ? 0.7 : options.temperature,
        max_tokens: options.maxTokens || 120
      }
    }
  }

  return {
    url: apiUrl,
    body: {
      model: config.model,
      messages,
      temperature: options.temperature === undefined ? 0.7 : options.temperature,
      max_tokens: options.maxTokens || 120
    }
  }
}

async function requestChatCompletion(config, messages, options = {}) {
  const apiKey = resolveApiKey(config)
  const request = buildChatRequest(config, messages, options)
  const isDashScopeLegacy = config.providerType === 'dashscope' && isDashScopeLegacyUrl(request.url)
  const res = await uniCloud.httpclient.request(request.url, {
    method: 'POST',
    dataType: 'json',
    contentType: 'json',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    data: request.body,
    timeout: options.timeout || 5000
  })

  const data = res.data || {}
  if (isDashScopeLegacy) {
    const content = (((data.output || {}).choices || [])[0] || {}).message?.content || ''
    const usage = data.usage || {}
    const promptTokens = Number(usage.input_tokens || usage.prompt_tokens || 0)
    const completionTokens = Number(usage.output_tokens || usage.completion_tokens || 0)
    return {
      content: String(content || '').trim(),
      model: data.output?.model || config.model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: Number(usage.total_tokens || (promptTokens + completionTokens) || 0)
      },
      raw: data
    }
  }

  if (config.providerType === 'anthropic-compatible') {
    const firstContent = Array.isArray(data.content) ? data.content[0] : null
    const content = firstContent?.text || data.completion || ''
    const usage = data.usage || {}
    const promptTokens = Number(usage.input_tokens || 0)
    const completionTokens = Number(usage.output_tokens || 0)
    return {
      content: String(content || '').trim(),
      model: data.model || config.model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: Number(usage.total_tokens || (promptTokens + completionTokens) || 0)
      },
      raw: data
    }
  }

  const content = ((data.choices || [])[0] || {}).message?.content || ''
  const usage = data.usage || {}
  return {
    content: String(content || '').trim(),
    model: data.model || config.model,
    usage: {
      promptTokens: Number(usage.prompt_tokens || 0),
      completionTokens: Number(usage.completion_tokens || 0),
      totalTokens: Number(usage.total_tokens || 0)
    },
    raw: data
  }
}

async function recordAiUsage(config, usage = {}, extra = {}) {
  const promptTokens = Number(usage.promptTokens || 0)
  const completionTokens = Number(usage.completionTokens || 0)
  const totalTokens = Number(usage.totalTokens || (promptTokens + completionTokens) || 0)
  const current = normalizeAiConfig(config)
  const currentUsage = current.usage || {}
  const nextUsage = {
    ...currentUsage,
    totalCalls: Number(currentUsage.totalCalls || 0) + 1,
    totalTokens: Number(currentUsage.totalTokens || 0) + totalTokens,
    promptTokens: Number(currentUsage.promptTokens || 0) + promptTokens,
    completionTokens: Number(currentUsage.completionTokens || 0) + completionTokens,
    lastTokens: totalTokens,
    lastTestAt: extra.lastTestAt || currentUsage.lastTestAt || 0,
    lastTestStatus: extra.lastTestStatus || currentUsage.lastTestStatus || '',
    lastTestMessage: extra.lastTestMessage || currentUsage.lastTestMessage || '',
    lastTestProviderType: extra.lastTestProviderType || currentUsage.lastTestProviderType || '',
    lastTestApiUrl: extra.lastTestApiUrl || currentUsage.lastTestApiUrl || '',
    lastTestModel: extra.lastTestModel || currentUsage.lastTestModel || ''
  }
  await aiConfigCollection.doc(AI_CONFIG_ID).update({
    usage: nextUsage,
    updatedAt: Date.now()
  })
  return nextUsage
}

function resolveApiKey(config = {}) {
  const savedKey = String(config.apiKey || '').trim()
  if (savedKey) return savedKey
  if (DASHSCOPE_API_KEY) {
    return DASHSCOPE_API_KEY
  }
  return ''
}

function maskApiKey(apiKey = '') {
  const key = String(apiKey || '')
  if (!key) return ''
  if (key.length <= 10) return `${key.slice(0, 2)}******`
  return `${key.slice(0, 6)}******${key.slice(-4)}`
}

function toClientAiConfig(config = {}) {
  const normalized = normalizeAiConfig(config)
  return {
    enable: normalized.enable,
    enableNormal: normalized.enableNormal,
    enableCampus: normalized.enableCampus,
    provider: normalized.provider,
    providerType: normalized.providerType,
    providerName: normalized.providerName,
    remark: normalized.remark,
    websiteUrl: normalized.websiteUrl,
    apiUrl: normalized.apiUrl,
    useFullUrl: normalized.useFullUrl,
    model: normalized.model,
    dailyLimit: normalized.dailyLimit,
    minuteLimit: normalized.minuteLimit,
    promptStyle: normalized.promptStyle,
    apiKeyMasked: maskApiKey(normalized.apiKey),
    hasApiKey: !!resolveApiKey(normalized),
    usage: normalized.usage,
    updatedAt: normalized.updatedAt || 0,
    updatedBy: normalized.updatedBy || ''
  }
}

function toClientAiStatus(config = {}) {
  const normalized = normalizeAiConfig(config)
  return {
    enable: normalized.enable,
    enableNormal: normalized.enableNormal,
    enableCampus: normalized.enableCampus,
    providerType: normalized.providerType,
    providerName: normalized.providerName,
    model: normalized.model,
    hasApiKey: !!resolveApiKey(normalized)
  }
}

async function verifyConfigAdmin(context, token = '') {
  if (token && adminTokenCache[token] && Date.now() < adminTokenCache[token].expireAt) {
    return adminTokenCache[token].admin
  }

  const tokenAdmin = await verifyUniIdAdmin(context, token)
  if (tokenAdmin) {
    if (token) adminTokenCache[token] = { admin: tokenAdmin, expireAt: Date.now() + CONFIG_CACHE_TTL }
    return tokenAdmin
  }

  const uniIdUserAdmin = await verifyUniIdUserByToken(token)
  if (uniIdUserAdmin) {
    if (token) adminTokenCache[token] = { admin: uniIdUserAdmin, expireAt: Date.now() + CONFIG_CACHE_TTL }
    return uniIdUserAdmin
  }

  const openid = await verifyToken(token)
  if (openid && ADMIN_OPENIDS.includes(openid)) {
    const admin = { openid }
    if (token) adminTokenCache[token] = { admin, expireAt: Date.now() + CONFIG_CACHE_TTL }
    return admin
  }

  return null
}

function hasAdminRole(role = []) {
  const roles = Array.isArray(role) ? role : [role]
  return roles.some((item) => ['admin', 'super_admin', 'uni-admin'].includes(String(item || '')))
}

async function verifyUniIdAdmin(context, token = '') {
  try {
    const clientInfo = context.getClientInfo ? (context.getClientInfo() || {}) : {}
    const runtimeToken = token || (typeof context.getUniIdToken === 'function' ? context.getUniIdToken() : '')
    const uid = clientInfo.uid || clientInfo.UID || ''
    const role = clientInfo.role || clientInfo.ROLE || []
    if (hasAdminRole(role)) {
      return { uid }
    }

    if (!runtimeToken) return null

    try {
      const uniID = require('uni-id-common')
      const uniIDIns = uniID.createInstance({ clientInfo })
      const payload = await uniIDIns.checkToken(runtimeToken, { autoRefresh: false })
      if (payload.code || payload.errCode) return null

      const payloadRole = payload.role || []
      if (hasAdminRole(payloadRole)) {
        return { uid: payload.uid || uid }
      }
    } catch (err) {
      console.warn('[co-ai] verify uni-id token failed', err.message || err)
    }
  } catch (err) {
    console.warn('[co-ai] verify uni-admin context failed', err.message || err)
  }
  return null
}

async function verifyUniIdUserByToken(token = '') {
  if (!token) return null
  try {
    const { data } = await uniIdUsersCollection
      .where({
        token: db.command.elemMatch({ token })
      })
      .field({ _id: true, role: true, username: true, nickname: true })
      .limit(1)
      .get()

    const user = data && data[0]
    if (user && hasAdminRole(user.role)) {
      return { uid: user._id, username: user.username || user.nickname || '' }
    }
  } catch (err) {
    console.warn('[co-ai] verify uni-id user token failed', err.message || err)
  }
  return null
}

function buildPickPrompt(payload) {
  const candidatesText = payload.candidates.map((item, index) => {
    const where = item.canteen || item.canteenName || item.stallName || '普通版'
    return `${index}. ${where} · ${item.name || ''} —— ${item.vibe || item.category || '顺口'}`
  }).join('\n')

  return [
    `用户画像：MBTI ${payload.mbti || 'ENFJ'}，星座 ${payload.zodiac || '白羊座'}。`,
    `当前模式：${payload.mode || 'normal'}。`,
    `今日状态：食欲 ${payload.appetite || '适中'}，能量 ${payload.energy || '平稳'}，运势 ${payload.luck || '小吉'}。`,
    '候选菜品：',
    candidatesText,
    '请从候选菜品里选出今天最合适的一个。',
    '只返回 JSON，格式：{"choice":0,"reason":"40字左右，像朋友聊天的推荐理由"}'
  ].join('\n')
}

function parsePickResult(content) {
  if (!content) return null
  const text = String(content).trim()
  try {
    return JSON.parse(text)
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

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
  async generateReason(token = '', context = {}) {
    const config = await getAiConfig()
    const apiKey = resolveApiKey(config)
    const openid = await verifyToken(token)
    if (!openid) {
      return { code: -1, msg: '请先登录' }
    }

    // 限流检查
    if (!checkRateLimit(openid, config.minuteLimit || RATE_LIMIT_MAX)) {
      return { code: -1, msg: '请求太频繁，请稍后再试' }
    }

    if (!await ensureDailyAiQuota(openid, config.dailyLimit || DAILY_PICK_LIMIT_MAX)) {
      return { code: -1, msg: '今日 AI 推荐次数已用完' }
    }

    if (!config.enable) {
      return { code: -1, msg: 'AI 推荐未开启' }
    }

    const mode = context.mode === 'campus' ? 'campus' : 'normal'
    if (mode === 'normal' && !config.enableNormal) {
      return { code: -1, msg: '普通版 AI 推荐未开启' }
    }
    if (mode === 'campus' && !config.enableCampus) {
      return { code: -1, msg: '校园版 AI 推荐未开启' }
    }

    if (!apiKey) {
      console.warn('[co-ai] DASHSCOPE_API_KEY not configured')
      return { code: -1, msg: 'AI 服务未配置' }
    }

    const prompt = buildReasonPrompt(context)

    try {
      const result = await requestChatCompletion(config, [
        {
          role: 'system',
          content: '你是一个轻松幽默的美食推荐助手，专门帮大学生推荐今天吃什么。你的语气要温暖、有趣、像朋友聊天，不要太正式。推荐理由要自然地融入MBTI性格和星座运势，让推荐有仪式感但又不会太长。回复只需要推荐理由本身，不要加引号或其他格式。控制在50字以内。'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.85,
        maxTokens: 150,
        timeout: 6000
      })

      if (result.content) {
        await recordDailyAiUsage(openid, result.usage)
        await recordAiUsage(config, result.usage)
        return { code: 0, reason: result.content }
      }

      console.warn('[co-ai] unexpected response', JSON.stringify(result.raw || {}).slice(0, 200))
      return { code: -1, msg: 'AI 生成失败' }
    } catch (err) {
      console.warn('[co-ai] generateReason error', err.message || err)
      return { code: -1, msg: 'AI 服务暂时不可用' }
    }
  },

  /**
   * AI 从 3 个候选菜品里选择 1 个，并生成推荐理由
   * @param {string} token
   * @param {object} payload - { mbti, zodiac, mode, appetite, energy, luck, candidates }
   * @returns {{ code: number, choice?: number, reason?: string, msg?: string }}
   */
  async pickDishFromCandidates(token, payload = {}) {
    const config = await getAiConfig()
    const apiKey = resolveApiKey(config)
    const openid = await verifyToken(token)
    if (!openid) {
      return { code: -1, msg: '请先登录' }
    }

    if (!config.enable) {
      return { code: -1, msg: 'AI 推荐未开启' }
    }

    const mode = payload.mode === 'campus' ? 'campus' : 'normal'
    if (mode === 'normal' && !config.enableNormal) {
      return { code: -1, msg: '普通版 AI 推荐未开启' }
    }
    if (mode === 'campus' && !config.enableCampus) {
      return { code: -1, msg: '校园版 AI 推荐未开启' }
    }

    if (!checkRateLimit(openid, config.minuteLimit || PICK_RATE_LIMIT_MAX)) {
      return { code: -1, msg: 'AI 推荐太频繁，请稍后再试' }
    }

    if (!checkDailyPickLimit(openid, config.dailyLimit || DAILY_PICK_LIMIT_MAX)) {
      return { code: -1, msg: '今日 AI 推荐次数已用完' }
    }

    if (!await ensureDailyAiQuota(openid, config.dailyLimit || DAILY_PICK_LIMIT_MAX)) {
      return { code: -1, msg: '今日 AI 推荐次数已用完' }
    }

    if (!apiKey) {
      console.warn('[co-ai] DASHSCOPE_API_KEY not configured')
      return { code: -1, msg: 'AI 服务未配置' }
    }

    const candidates = Array.isArray(payload.candidates) ? payload.candidates.slice(0, 3) : []
    if (candidates.length < 1) {
      return { code: -1, msg: '缺少候选菜品' }
    }

    const prompt = buildPickPrompt({
      ...payload,
      candidates
    })

    try {
      const result = await requestChatCompletion(config, [
        {
          role: 'system',
          content: '你是一个懂 MBTI 和星座的美食推荐助手。你只能从用户给出的候选菜品里选择，必须返回纯 JSON，不要输出其他文字。'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.7,
        maxTokens: 120,
        timeout: 5000
      })

      const parsed = parsePickResult(result.content)
      if (!parsed) {
        return { code: -1, msg: 'AI 返回格式错误' }
      }

      const choice = Math.max(0, Math.min(Number(parsed.choice) || 0, candidates.length - 1))
      const reason = String(parsed.reason || '').trim().slice(0, 80)
      if (!reason) {
        return { code: -1, msg: 'AI 推荐理由为空' }
      }

      recordDailyPick(openid)
      await recordDailyAiUsage(openid, result.usage)
      await recordAiUsage(config, result.usage)
      return { code: 0, choice, reason }
    } catch (err) {
      console.warn('[co-ai] pickDishFromCandidates error', err.message || err)
      return { code: -1, msg: 'AI 服务暂时不可用' }
    }
  },

  /**
   * 批量生成推荐理由
   * @param {Array<object>} contexts
   * @returns {{ code: number, results?: Array, errors?: number, msg?: string }}
   */
  async batchGenerateReasons(token = '', contexts = []) {
    const admin = await verifyConfigAdmin(this, token)
    if (!admin) {
      return { code: -1, results: [], errors: 0, msg: '无管理权限' }
    }

    if (!Array.isArray(contexts) || !contexts.length) {
      return { code: -1, results: [], errors: 0, msg: '空数组' }
    }

    const results = []
    let errors = 0

    for (const ctx of contexts.slice(0, 5)) {
      const res = await this.generateReason(token, ctx)
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
  async generateFortuneText(token = '', context = {}) {
    const config = await getAiConfig()
    const apiKey = resolveApiKey(config)
    const openid = await verifyToken(token)
    if (!openid) {
      return { code: -1, msg: '请先登录' }
    }

    if (!checkRateLimit(openid, config.minuteLimit || RATE_LIMIT_MAX)) {
      return { code: -1, msg: '请求太频繁' }
    }

    if (!await ensureDailyAiQuota(openid, config.dailyLimit || DAILY_PICK_LIMIT_MAX)) {
      return { code: -1, msg: '今日 AI 推荐次数已用完' }
    }

    if (!config.enable) {
      return { code: -1, msg: 'AI 推荐未开启' }
    }

    const mode = context.mode === 'campus' ? 'campus' : 'normal'
    if (mode === 'normal' && !config.enableNormal) {
      return { code: -1, msg: '普通版 AI 推荐未开启' }
    }
    if (mode === 'campus' && !config.enableCampus) {
      return { code: -1, msg: '校园版 AI 推荐未开启' }
    }

    if (!apiKey) {
      return { code: -1, msg: 'AI 服务未配置' }
    }

    const prompt = `今天是${context.dateLabel || '新的一天'}，${context.mbti || 'ENFJ'}的${context.zodiac || '白羊座'}，用轻松一句话描述今天的运势氛围，控制在20字以内。`

    try {
      const result = await requestChatCompletion(config, [
        {
          role: 'system',
          content: '你是轻松幽默的运势助手，回复简短有趣，像朋友之间的调侃。只回复运势文案本身，不加引号。'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.9,
        maxTokens: 80,
        timeout: 5000
      })

      if (result.content) {
        await recordDailyAiUsage(openid, result.usage)
        await recordAiUsage(config, result.usage)
        return { code: 0, text: result.content }
      }

      return { code: -1, msg: '生成失败' }
    } catch (err) {
      console.warn('[co-ai] generateFortuneText error', err.message || err)
      return { code: -1, msg: 'AI 服务不可用' }
    }
  },

  /**
   * 读取小程序可用的 AI 开关状态（不返回密钥）
   */
  async getAiStatus() {
    const config = await getAiConfig()
    return { code: 0, data: toClientAiStatus(config) }
  },

  /**
   * 读取 AI 配置（后台管理）
   */
  async getAiConfig(token = '') {
    const admin = await verifyConfigAdmin(this, token)
    if (!admin) {
      return { code: -1, msg: '无管理权限' }
    }

    const config = await getAiConfig()
    return { code: 0, data: toClientAiConfig(config) }
  },

  /**
   * 更新 AI 配置（后台管理）
   */
  async updateAiConfig(token = '', configData = {}) {
    const admin = await verifyConfigAdmin(this, token)
    if (!admin) {
      return { code: -1, msg: '无管理权限' }
    }

    const current = await getAiConfig()
    const next = normalizeAiConfig({
      ...current,
      ...configData,
      apiKey: configData.apiKey ? String(configData.apiKey).trim() : current.apiKey,
      usage: current.usage
    })

    const now = Date.now()
    const saveData = {
      ...next,
      updatedAt: now,
      updatedBy: admin.uid || admin.openid || ''
    }
    delete saveData._id

    const { data } = await aiConfigCollection.doc(AI_CONFIG_ID).get()
    if (data && data.length) {
      await aiConfigCollection.doc(AI_CONFIG_ID).update(saveData)
    } else {
      await aiConfigCollection.add({
        _id: AI_CONFIG_ID,
        ...saveData,
        createdAt: now
      })
    }
    aiConfigCache.value = null
    aiConfigCache.expireAt = 0

    return { code: 0, msg: '保存成功', data: toClientAiConfig(saveData) }
  },

  /**
   * 测试 AI 配置是否可用（后台管理）
   */
  async testAiConfig(token = '', configData = {}) {
    const admin = await verifyConfigAdmin(this, token)
    if (!admin) {
      return { code: -1, msg: '无管理权限' }
    }

    const current = await getAiConfig()
    const testingConfig = normalizeAiConfig({
      ...current,
      ...configData,
      apiKey: configData.apiKey ? String(configData.apiKey).trim() : current.apiKey
    })
    const apiKey = resolveApiKey(testingConfig)
    if (!apiKey) {
      return { code: -1, msg: '请先填写 DashScope API Key' }
    }

    try {
      const result = await requestChatCompletion(testingConfig, [
        { role: 'system', content: '你是一个简短回复的助手。' },
        { role: 'user', content: '回复“连接正常”四个字。' }
      ], {
        temperature: 0.1,
        maxTokens: 20,
        timeout: 15000
      })

      if (result.content) {
        const usage = await recordAiUsage(testingConfig, result.usage, {
          lastTestAt: Date.now(),
          lastTestStatus: 'success',
          lastTestMessage: '连接正常',
          lastTestProviderType: testingConfig.providerType,
          lastTestApiUrl: normalizeApiUrl(testingConfig),
          lastTestModel: testingConfig.model
        })
        return {
          code: 0,
          msg: '连接正常',
          data: {
            model: result.model || testingConfig.model,
            content: result.content,
            usage
          }
        }
      }

      await recordAiUsage(testingConfig, {}, {
        lastTestAt: Date.now(),
        lastTestStatus: 'fail',
        lastTestMessage: '无有效返回',
        lastTestProviderType: testingConfig.providerType,
        lastTestApiUrl: normalizeApiUrl(testingConfig),
        lastTestModel: testingConfig.model
      })
      console.warn('[co-ai] testAiConfig unexpected response', JSON.stringify(result.raw || {}).slice(0, 200))
      return { code: -1, msg: '测试失败，请检查 API Key 或模型名称' }
    } catch (err) {
      console.warn('[co-ai] testAiConfig error', err.message || err)
      try {
        await recordAiUsage(testingConfig, {}, {
          lastTestAt: Date.now(),
          lastTestStatus: 'fail',
          lastTestMessage: err.message || 'AI 服务连接失败',
          lastTestProviderType: testingConfig.providerType,
          lastTestApiUrl: normalizeApiUrl(testingConfig),
          lastTestModel: testingConfig.model
        })
      } catch (recordErr) {
        console.warn('[co-ai] record test failure failed', recordErr.message || recordErr)
      }
      return { code: -1, msg: err.message || 'AI 服务连接失败' }
    }
  }
}
