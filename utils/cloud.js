/**
 * 云端适配层
 * 封装 uniCloud 云对象调用，提供统一的云端操作接口
 * 降级策略：云函数调用失败时回退到本地存储
 */

// 是否已连接 uniCloud 服务空间
let cloudReady = false

/**
 * 检查 uniCloud 是否可用
 */
export function isCloudAvailable() {
  try {
    return !!uniCloud && cloudReady
  } catch {
    return false
  }
}

/**
 * 初始化云对象引用
 */
let coUser = null
let coCampus = null
let coContent = null
let coAi = null

function getStoredUserToken() {
  try {
    const user = uni.getStorageSync('eat-what-user') || {}
    return user.loginMode === 'cloud' ? (user.token || '') : ''
  } catch {
    return ''
  }
}

function getCoUser() {
  if (!coUser) {
    coUser = uniCloud.importObject('co-user')
  }
  return coUser
}

function getCoCampus() {
  if (!coCampus) {
    coCampus = uniCloud.importObject('co-campus')
  }
  return coCampus
}

function getCoContent() {
  if (!coContent) {
    coContent = uniCloud.importObject('co-content')
  }
  return coContent
}

function getCoAi() {
  if (!coAi) {
    coAi = uniCloud.importObject('co-ai')
  }
  return coAi
}

/**
 * 微信登录 — 调用云函数获取真实 openId
 * @param {object} userInfo - { nickname, avatar }
 * @returns {{ code: number, data?: object, msg?: string }}
 */
export async function cloudWxLogin(userInfo = {}) {
  try {
    // 1. 调用 uni.login 获取 code
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject
      })
    })

    if (!loginRes.code) {
      console.warn('[cloud] uni.login failed, no code')
      return { code: -1, msg: '获取微信登录凭证失败' }
    }

    // 2. 调用云对象换 openId
    const co = getCoUser()
    const result = await co.wxLogin(loginRes.code, userInfo)

    if (result.code === 0) {
      cloudReady = true
    }

    return result
  } catch (err) {
    console.warn('[cloud] cloudWxLogin error', err)
    return { code: -1, msg: '云函数调用失败，请检查网络' }
  }
}

/**
 * 获取用户资料
 */
export async function cloudGetProfile(token) {
  try {
    const co = getCoUser()
    return await co.getProfile(token)
  } catch (err) {
    console.warn('[cloud] cloudGetProfile error', err)
    return { code: -1, msg: '获取资料失败' }
  }
}

/**
 * 更新用户资料
 */
export async function cloudUpdateProfile(token, profileData) {
  try {
    const co = getCoUser()
    return await co.updateProfile(token, profileData)
  } catch (err) {
    console.warn('[cloud] cloudUpdateProfile error', err)
    return { code: -1, msg: '更新资料失败' }
  }
}

/**
 * 同步应用状态到云端
 */
export async function cloudSyncState(token, stateData) {
  try {
    const co = getCoUser()
    return await co.syncState(token, stateData)
  } catch (err) {
    console.warn('[cloud] cloudSyncState error', err)
    return { code: -1, msg: '状态同步失败' }
  }
}

/**
 * 获取云端应用状态
 */
export async function cloudGetState(token) {
  try {
    const co = getCoUser()
    return await co.getState(token)
  } catch (err) {
    console.warn('[cloud] cloudGetState error', err)
    return { code: -1, msg: '获取状态失败' }
  }
}

/**
 * 同步历史记录到云端
 */
export async function cloudSyncHistory(token, historyList) {
  try {
    const co = getCoUser()
    return await co.syncHistory(token, historyList)
  } catch (err) {
    console.warn('[cloud] cloudSyncHistory error', err)
    return { code: -1, msg: '历史同步失败' }
  }
}

/**
 * 获取云端历史记录
 */
export async function cloudGetHistory(token) {
  try {
    const co = getCoUser()
    return await co.getHistory(token)
  } catch (err) {
    console.warn('[cloud] cloudGetHistory error', err)
    return { code: -1, msg: '获取历史失败' }
  }
}

/**
 * 提交校园入驻申请
 */
export async function cloudSubmitApplication(token, formData) {
  try {
    const co = getCoCampus()
    return await co.submitApplication(token, formData)
  } catch (err) {
    console.warn('[cloud] cloudSubmitApplication error', err)
    return { code: -1, msg: '提交申请失败' }
  }
}

/**
 * 获取我的校园申请列表
 */
export async function cloudGetMyApplications(token) {
  try {
    const co = getCoCampus()
    return await co.getMyApplications(token)
  } catch (err) {
    console.warn('[cloud] cloudGetMyApplications error', err)
    return { code: -1, msg: '获取申请列表失败' }
  }
}

/**
 * 获取已入驻校园列表（公开接口）
 */
export async function cloudGetApprovedCampuses() {
  try {
    const co = getCoCampus()
    return await co.getApprovedCampuses()
  } catch (err) {
    console.warn('[cloud] cloudGetApprovedCampuses error', err)
    return { code: -1, msg: '获取校园列表失败' }
  }
}

/**
 * 文本内容安全检查
 */
export async function cloudCheckText(content, scene = 1, openid = '') {
  try {
    const co = getCoContent()
    return await co.checkText(content, scene, openid)
  } catch (err) {
    console.warn('[cloud] cloudCheckText error', err)
    return { code: -1, safe: true, msg: '安全检查服务异常，暂时放行' }
  }
}

/**
 * 批量文本安全检查
 */
export async function cloudCheckTextBatch(contents, scene = 1, openid = '') {
  try {
    const co = getCoContent()
    return await co.checkTextBatch(contents, scene, openid)
  } catch (err) {
    console.warn('[cloud] cloudCheckTextBatch error', err)
    return { code: -1, safe: true, msg: '安全检查服务异常，暂时放行' }
  }
}

// ====== 档口 CRUD ======

/**
 * 获取指定饭堂的档口列表（含菜品）
 * @param {string} canteenId - 饭堂ID
 */
export async function cloudGetStallsByCanteen(canteenId) {
  try {
    const co = getCoCampus()
    return await co.getStallsByCanteen(canteenId)
  } catch (err) {
    console.warn('[cloud] cloudGetStallsByCanteen error', err)
    return { code: -1, data: [], msg: '获取商铺列表失败' }
  }
}

/**
 * 添加档口（商铺）
 * @param {string} canteenId - 饭堂ID
 * @param {object} stallData - { name, category, remark }
 */
export async function cloudAddStall(canteenId, stallData = {}) {
  try {
    const token = getStoredUserToken()
    if (!token) return { code: -1, msg: '请先使用管理员账号登录' }
    const co = getCoCampus()
    return await co.addStall(token, canteenId, stallData)
  } catch (err) {
    console.warn('[cloud] cloudAddStall error', err)
    return { code: -1, msg: '添加商铺失败' }
  }
}

/**
 * 更新档口信息
 * @param {string} canteenId - 饭堂ID
 * @param {string} stallId - 档口ID
 * @param {object} stallData - { name, category, remark }
 */
export async function cloudUpdateStall(canteenId, stallId, stallData = {}) {
  try {
    const token = getStoredUserToken()
    if (!token) return { code: -1, msg: '请先使用管理员账号登录' }
    const co = getCoCampus()
    return await co.updateStall(token, canteenId, stallId, stallData)
  } catch (err) {
    console.warn('[cloud] cloudUpdateStall error', err)
    return { code: -1, msg: '更新商铺失败' }
  }
}

/**
 * 删除档口
 * @param {string} canteenId - 饭堂ID
 * @param {string} stallId - 档口ID
 */
export async function cloudDeleteStall(canteenId, stallId) {
  try {
    const token = getStoredUserToken()
    if (!token) return { code: -1, msg: '请先使用管理员账号登录' }
    const co = getCoCampus()
    return await co.deleteStall(token, canteenId, stallId)
  } catch (err) {
    console.warn('[cloud] cloudDeleteStall error', err)
    return { code: -1, msg: '删除商铺失败' }
  }
}

// ====== 菜品 CRUD ======

/**
 * 获取指定档口的菜品列表
 * @param {string} stallId - 档口ID
 */
export async function cloudGetDishesByStall(stallId) {
  try {
    const co = getCoCampus()
    return await co.getDishesByStall(stallId)
  } catch (err) {
    console.warn('[cloud] cloudGetDishesByStall error', err)
    return { code: -1, data: [], msg: '获取菜品列表失败' }
  }
}

/**
 * 添加菜品
 * @param {string} stallId - 档口ID
 * @param {string} canteenId - 饭堂ID
 * @param {object} dishData - { name, category, tag, price, vibe }
 */
export async function cloudAddDish(stallId, canteenId, dishData = {}) {
  try {
    const token = getStoredUserToken()
    if (!token) return { code: -1, msg: '请先使用管理员账号登录' }
    const co = getCoCampus()
    return await co.addDish(token, stallId, canteenId, dishData)
  } catch (err) {
    console.warn('[cloud] cloudAddDish error', err)
    return { code: -1, msg: '添加菜品失败' }
  }
}

/**
 * 更新菜品信息
 * @param {string} stallId - 档口ID
 * @param {string} dishId - 菜品ID
 * @param {object} dishData - { name, category, tag, price, vibe }
 */
export async function cloudUpdateDish(stallId, dishId, dishData = {}) {
  try {
    const token = getStoredUserToken()
    if (!token) return { code: -1, msg: '请先使用管理员账号登录' }
    const co = getCoCampus()
    return await co.updateDish(token, stallId, dishId, dishData)
  } catch (err) {
    console.warn('[cloud] cloudUpdateDish error', err)
    return { code: -1, msg: '更新菜品失败' }
  }
}

/**
 * 删除菜品
 * @param {string} stallId - 档口ID
 * @param {string} dishId - 菜品ID
 */
export async function cloudDeleteDish(stallId, dishId) {
  try {
    const token = getStoredUserToken()
    if (!token) return { code: -1, msg: '请先使用管理员账号登录' }
    const co = getCoCampus()
    return await co.deleteDish(token, stallId, dishId)
  } catch (err) {
    console.warn('[cloud] cloudDeleteDish error', err)
    return { code: -1, msg: '删除菜品失败' }
  }
}

// ====== AI 推荐理由 ======

/**
 * AI 生成推荐理由（核心方法）
 * @param {object} context - 推荐上下文，见 co-ai.generateReason 参数说明
 * @returns {{ code: number, reason?: string, msg?: string }}
 */
export async function cloudIsCampusAdmin() {
  try {
    const token = getStoredUserToken()
    if (!token) return { code: 0, data: { isAdmin: false } }
    const co = getCoCampus()
    return await co.isAdmin(token)
  } catch (err) {
    console.warn('[cloud] cloudIsCampusAdmin error', err)
    return { code: -1, data: { isAdmin: false }, msg: '管理员身份校验失败' }
  }
}

export async function aiGenerateReason(context = {}) {
  try {
    const co = getCoAi()
    return await co.generateReason(context)
  } catch (err) {
    console.warn('[cloud] aiGenerateReason error', err)
    return { code: -1, msg: 'AI 服务调用失败' }
  }
}

/**
 * AI 批量生成推荐理由
 */
export async function aiBatchGenerateReasons(contexts) {
  try {
    const co = getCoAi()
    return await co.batchGenerateReasons(contexts)
  } catch (err) {
    console.warn('[cloud] aiBatchGenerateReasons error', err)
    return { code: -1, results: [], errors: contexts.length }
  }
}

/**
 * AI 生成运势文案
 */
export async function aiGenerateFortuneText(context = {}) {
  try {
    const co = getCoAi()
    return await co.generateFortuneText(context)
  } catch (err) {
    console.warn('[cloud] aiGenerateFortuneText error', err)
    return { code: -1, msg: 'AI 服务失败' }
  }
}

// ====== Admin 菜单管理 ======

/**
 * 初始化 admin 后台自定义菜单（插入到 opendb-admin-menus 表）
 */
export async function cloudInitAdminMenus() {
  try {
    const co = getCoCampus()
    return await co.initAdminMenus()
  } catch (err) {
    console.warn('[cloud] cloudInitAdminMenus error', err)
    return { code: -1, msg: '初始化菜单失败' }
  }
}

/**
 * 修复 admin 菜单 URL（旧路径 → /pages/eat-what/xxx/list）
 */
export async function cloudFixAdminMenusUrl() {
  try {
    const co = getCoCampus()
    return await co.fixAdminMenusUrl()
  } catch (err) {
    console.warn('[cloud] cloudFixAdminMenusUrl error', err)
    return { code: -1, msg: '修复菜单URL失败' }
  }
}

/**
 * 综合诊断：检测前后端连通性、数据库表、菜单配置
 */
export async function cloudRunDiagnostics() {
  try {
    const co = getCoCampus()
    return await co.runDiagnostics()
  } catch (err) {
    console.warn('[cloud] cloudRunDiagnostics error', err)
    return { code: -1, msg: '诊断服务调用失败：' + (err.message || err) }
  }
}

/**
 * 初始化基础数据（校园、饭堂、服务）写入数据库
 */
export async function cloudInitBaseData() {
  try {
    const co = getCoCampus()
    return await co.initBaseData()
  } catch (err) {
    console.warn('[cloud] cloudInitBaseData error', err)
    return { code: -1, msg: '初始化基础数据失败：' + (err.message || err) }
  }
}
