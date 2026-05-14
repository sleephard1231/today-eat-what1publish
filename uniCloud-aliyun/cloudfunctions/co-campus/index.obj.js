/**
 * co-campus 浜戝璞?
 * 璐熻矗鏍″洯鍏ラ┗鐢宠/瀹℃牳銆佹牎鍥垪琛ㄣ€侀キ鍫傘€佹。鍙ｃ€佽彍鍝併€佹牎鍥湇鍔?
 *
 * 鍓嶇璋冪敤鏂瑰紡锛?
 *   const co = uniCloud.importObject('co-campus')
 *   const res = await co.getCanteensByCampus('骞垮窞鍟嗗闄?)
 */

// 鈿狅笍 涓婄嚎鍓嶅繀椤诲～鍏ョ鐞嗗憳 openid
const ADMIN_OPENIDS = ['oxKFC3UzlxECsob71tnJsRgCVY1E'] // 濡?['oXXXXXXXXXXXX']
const ENV_ADMIN_OPENIDS = String(process.env.ADMIN_OPENIDS || '')
  .split(',')
  .map((openid) => openid.trim())
  .filter(Boolean)

const db = uniCloud.database()
const applicationsCollection = db.collection('eat-what-applications')
const campusesCollection = db.collection('eat-what-campuses')
const canteensCollection = db.collection('eat-what-canteens')
const stallsCollection = db.collection('eat-what-stalls')
const dishesCollection = db.collection('eat-what-dishes')
const normalDishesCollection = db.collection('eat-what-normal-dishes')
const servicesCollection = db.collection('eat-what-services')
const normalDishesSeed = require('./normal-dishes-seed')

// 寮曞叆 co-user 鐨?token 楠岃瘉
const usersCollection = db.collection('eat-what-users')
const uniIdUsersCollection = db.collection('uni-id-users')

const TOKEN_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000
const APPLICATION_DAILY_LIMIT = 3
const APPLICATION_PENDING_LIMIT = 5
const READ_CACHE_TTL = 5 * 60 * 1000
const readCache = new Map()
const EMAIL_MASK_RE = /^(.{1,2})(.*)(@.*)$/
const CONTACT_EMAIL_SECRET = process.env.CONTACT_EMAIL_SECRET || 'change-me-before-launch'
const DISH_IMPORT_MAX_COUNT = 300
const DISH_NAME_MAX_LENGTH = 30
const DISH_PRICE_MAX_LENGTH = 20
const DISH_VIBE_MAX_LENGTH = 8
const DISH_TAG_OPTIONS = ['浜烘皵', '鏂板搧', '鎺ㄨ崘', '鎷涚墝', '闄愭椂']
const DISH_CATEGORY_OPTIONS = ['涓婚', '绮夐潰', '鐑ц厞', '灏忕倰', '闈㈤', '楗搧', '鐢滃搧', '灏忓悆']
const IMPORT_MODE_OPTIONS = ['skip_duplicate', 'force_create']

function getReadCache(key) {
  const cached = readCache.get(key)
  if (!cached) return null
  if (Date.now() > cached.expiresAt) {
    readCache.delete(key)
    return null
  }
  return cached.value
}

function setReadCache(key, value) {
  readCache.set(key, {
    value,
    expiresAt: Date.now() + READ_CACHE_TTL
  })
  return value
}

function clearReadCache() {
  readCache.clear()
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
      console.warn('[co-campus] verify uni-id token failed', err.message || err)
    }
  } catch (err) {
    console.warn('[co-campus] verify uni-admin context failed', err.message || err)
  }
  return null
}

function hasAdminRole(role = []) {
  const roles = Array.isArray(role) ? role : [role]
  return roles.some((item) => ['admin', 'super_admin', 'uni-admin'].includes(String(item || '')))
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
    console.warn('[co-campus] verify uni-id user token failed', err.message || err)
  }
  return null
}

async function verifyTokenValue(token) {
  if (!token) return null
  try {
    const { data: users } = await usersCollection.where({ token }).limit(1).get()
    if (!users.length) return null
    const user = users[0]
    const elapsed = Date.now() - (user.updatedAt || 0)
    if (elapsed > TOKEN_EXPIRE_MS) return null
    return user.openid
  } catch (err) {
    return null
  }
}

async function verifyAdminValue(context, token) {
  if (!token) return null

  const uniAdmin = await verifyUniIdAdmin(context || {}, token)
  if (uniAdmin) {
    return uniAdmin.uid || 'uni-admin'
  }

  const uniIdUserAdmin = await verifyUniIdUserByToken(token)
  if (uniIdUserAdmin) {
    return uniIdUserAdmin.uid || 'uni-id-admin'
  }

  const openid = await verifyTokenValue(token)
  if (!openid || !ENV_ADMIN_OPENIDS.concat(ADMIN_OPENIDS).includes(openid)) {
    return null
  }
  return openid
}

function getDayStartTimestamp() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function maskEmail(email = '') {
  const value = String(email || '').trim()
  if (!value || !value.includes('@')) return ''
  return value.replace(EMAIL_MASK_RE, (match, prefix, middle, suffix) => {
    const mask = middle ? '*'.repeat(Math.min(Math.max(middle.length, 2), 6)) : '**'
    return `${prefix}${mask}${suffix}`
  })
}

function encodeSensitiveText(value = '') {
  const crypto = require('crypto')
  const iv = crypto.randomBytes(12)
  const key = crypto.createHash('sha256').update(CONTACT_EMAIL_SECRET).digest()
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(String(value || ''), 'utf8'),
    cipher.final()
  ])
  const tag = cipher.getAuthTag()
  return [
    'v1',
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64')
  ].join(':')
}

function normalizeImportText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeImportPrice(value = '') {
  return normalizeImportText(value)
    .replace(/[锟ヂュ厓]/g, '')
    .replace(/\s+/g, '')
}

function normalizeImportDish(dish = {}, index = 0) {
  return {
    localId: normalizeImportText(dish.localId) || `row_${index + 1}`,
    imageName: normalizeImportText(dish.imageName),
    sourceType: normalizeImportText(dish.sourceType),
    name: normalizeImportText(dish.name),
    category: normalizeImportText(dish.category),
    tag: normalizeImportText(dish.tag),
    price: normalizeImportPrice(dish.price),
    vibe: normalizeImportText(dish.vibe)
  }
}

function validateImportDish(dish = {}) {
  const issues = []

  if (!dish.name) {
    issues.push('菜品名称不能为空')
  }

  if (dish.name && dish.name.length > DISH_NAME_MAX_LENGTH) {
    issues.push('菜品名称太长了')
  }

  if (dish.category && !DISH_CATEGORY_OPTIONS.includes(dish.category)) {
    issues.push('分类不在允许范围内')
  }

  if (dish.tag && !DISH_TAG_OPTIONS.includes(dish.tag)) {
    issues.push('标签不在允许范围内')
  }

  if (dish.price && dish.price.length > DISH_PRICE_MAX_LENGTH) {
    issues.push('价格信息有点长')
  }

  if (dish.price && !/^\d+(\.\d+)?(-\d+(\.\d+)?)?$|^\d+(\.\d+)?起$/.test(dish.price)) {
    issues.push('价格格式不太对')
  }

  if (dish.vibe && dish.vibe.length > DISH_VIBE_MAX_LENGTH) {
    issues.push('氛围文案建议短一点')
  }

  let status = 'valid'
  if (issues.includes('菜品名称不能为空') || issues.includes('菜品名称太长了')) {
    status = 'invalid'
  } else if (issues.length) {
    status = 'warning'
  }

  return { status, issues }
}

async function verifyDishImportTarget(canteenId = '', stallId = '') {
  const safeCanteenId = normalizeImportText(canteenId)
  const safeStallId = normalizeImportText(stallId)

  if (!safeCanteenId || !safeStallId) {
    return { code: -1, msg: '缺少饭堂或档口信息' }
  }

  const { data: stalls } = await stallsCollection.where({
    _id: safeStallId,
    canteenId: safeCanteenId,
    status: 'active'
  }).limit(1).get()

  if (!stalls.length) {
    return { code: -1, msg: '档口和饭堂对应不上，请重新选一个' }
  }

  return { code: 0, data: stalls[0] }
}

async function getExistingDishNameSet(stallId = '') {
  const safeStallId = normalizeImportText(stallId)
  if (!safeStallId) return new Set()

  const { data } = await dishesCollection.where({
    stallId: safeStallId,
    status: 'active'
  }).field({ name: true }).get()

  return new Set(
    data
      .map((item) => normalizeImportText(item.name))
      .filter(Boolean)
  )
}

module.exports = {
  /**
   * 鎻愪氦鏍″洯鍏ラ┗鐢宠
   * @param {string} token
   * @param {object} formData - { campusName, campusTag, city, contactName, contactEmail }
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async submitApplication(token, formData = {}) {
    const openid = await verifyTokenValue(token)
    if (!openid) {
      return { code: -1, msg: '璇峰厛鐧诲綍' }
    }

    const contactEmail = String(formData.contactEmail || formData.contactPhone || '').trim()

    if (!formData.campusName || !contactEmail) {
      return { code: -1, msg: '璇疯嚦灏戝～鍐欐牎鍥悕绉板拰閭' }
    }

    const todayStart = getDayStartTimestamp()
    const { total: todaySubmitCount } = await applicationsCollection.where({
      openid,
      createdAt: db.command.gte(todayStart)
    }).count()

    if (todaySubmitCount >= APPLICATION_DAILY_LIMIT) {
      return { code: -1, msg: `浠婂ぉ鏈€澶氭彁浜?${APPLICATION_DAILY_LIMIT} 娆″叆椹荤敵璇凤紝鏄庡ぉ鍐嶆潵璇曡瘯` }
    }

    const { total: pendingSubmitCount } = await applicationsCollection.where({
      openid,
      status: '待审核'
    }).count()

    if (pendingSubmitCount >= APPLICATION_PENDING_LIMIT) {
      return { code: -1, msg: `浣犺繕鏈?${APPLICATION_PENDING_LIMIT} 鏉＄敵璇峰湪瀹℃牳涓紝鍏堢瓑绛夊鏍哥粨鏋滃惂` }
    }

    // 内容安全检查
    try {
      const coContent = uniCloud.importObject('co-content')
      const checkResult = await coContent.checkText(
        [formData.campusName, formData.campusTag, formData.contactName, contactEmail].filter(Boolean).join(' '),
        1,
        openid
      )
      if (checkResult.code === 0 && checkResult.safe === false) {
        return { code: -1, msg: '提交内容包含违规信息，请修改后重试' }
      }
    } catch (err) {
      console.warn('[co-campus] content check failed, continue', err)
    }

    // 妫€鏌ユ槸鍚﹂噸澶嶆彁浜?
    const { data: existApps } = await applicationsCollection.where({
      openid,
      campusName: formData.campusName,
      campusTag: formData.campusTag || '',
      status: db.command.in(['待审核', '已通过'])
    }).limit(1).get()

    if (existApps.length) {
      return { code: -1, msg: '浣犲凡缁忔彁浜よ繃璇ユ牎鍥殑鍏ラ┗鐢宠' }
    }

    const campusId = `campus-${Date.now()}`
    const now = Date.now()
    const contactEmailMasked = maskEmail(contactEmail)
    const contactEmailEncrypted = encodeSensitiveText(contactEmail)

    const addRes = await applicationsCollection.add({
      openid,
      campusId,
      campusName: formData.campusName,
      campusTag: formData.campusTag || '',
      city: formData.city || '',
      contactName: formData.contactName || '',
      contactEmail: contactEmailEncrypted,
      contactEmailMasked,
      status: '待审核',
      reviewNote: '',
      reviewedBy: '',
      reviewedAt: 0,
      createdAt: now,
      updatedAt: now
    })

    return {
      code: 0,
      data: {
        campusId,
        status: '待审核',
        applicationId: addRes.id
      }
    }
  },

  /**
   * 鑾峰彇鎴戠殑鏍″洯鐢宠鍒楄〃
   * @param {string} token
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getMyApplications(token) {
    const openid = await verifyTokenValue(token)
    if (!openid) {
      return { code: -1, msg: '璇峰厛鐧诲綍' }
    }

    const { data: apps } = await applicationsCollection
      .where({ openid })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    return {
      code: 0,
      data: apps.map((app) => ({
        campusId: app.campusId,
        campusName: app.campusName,
        campusTag: app.campusTag,
        city: app.city,
        contactEmailMasked: app.contactEmailMasked || '',
        status: app.status,
        createdAt: this._formatTimestamp(app.createdAt)
      }))
    }
  },

  /**
   * 鑾峰彇宸插叆椹绘牎鍥垪琛紙鍏紑鎺ュ彛锛屾棤闇€鐧诲綍锛?
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getApprovedCampuses(page = 1, pageSize = 50) {
    const safePage = Math.max(1, Number(page) || 1)
    const safeSize = Math.min(100, Math.max(1, Number(pageSize) || 50))
    const offset = (safePage - 1) * safeSize

    // 浠?applications 鍙栧凡閫氳繃鐨?    const { data: approvedApps } = await applicationsCollection
      .where({ status: '宸查€氳繃' })
      .field({ campusName: true, campusTag: true, city: true, campusId: true })
      .get()

    // 浠?campuses 琛ㄥ彇 active 鐨?
    const { data: activeCampuses } = await campusesCollection
      .where({ status: 'active' })
      .get()

    const campusList = []

    // 鍚堝苟 campuses 琛ㄧ殑鏁版嵁
    activeCampuses.forEach((campus) => {
      campusList.push({
        id: campus._id,
        name: campus.name,
        shortName: campus.shortName || campus.name.slice(0, 4),
        campusTag: campus.campusTag || '',
        district: campus.district || '鏍″洯鍚堜綔',
        specialties: campus.specialties || []
      })
    })

    // 鍚堝苟鐢宠閫氳繃鐨勶紙濡傛灉涓嶅湪 campuses 琛ㄩ噷锛?
    const existNames = new Set(campusList.map((c) => c.name))
    approvedApps.forEach((app) => {
      if (!existNames.has(app.campusName)) {
        campusList.push({
          id: app.campusId,
          name: app.campusName,
          shortName: app.campusName.slice(0, 4),
          campusTag: app.campusTag || '',
          district: app.city || '鏍″洯鍚堜綔',
          specialties: []
        })
      }
    })

    return setReadCache(cacheKey, { code: 0, data: campusList })
  },

  /**
   * 鑾峰彇鎸囧畾瀛︽牎鐨勯キ鍫傚垪琛?
   * @param {string} campusName - 瀛︽牎鍚嶇О
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getCanteensByCampus(campusName) {
    if (!campusName) {
      return { code: -1, msg: '缂哄皯瀛︽牎鍚嶇О' }
    }

    const cacheKey = `canteens:${campusName}`
    const cached = getReadCache(cacheKey)
    if (cached) return cached

    const { data: canteens } = await canteensCollection
      .where({ campusName, status: 'active' })
      .orderBy('sort', 'asc')
      .get()

    return setReadCache(cacheKey, {
      code: 0,
      data: canteens.map((c) => ({
        id: c._id,
        name: c.name,
        remark: c.remark || ''
      }))
    })
  },

  /**
   * 鑾峰彇鎸囧畾楗爞鐨勬。鍙ｅ垪琛紙鍚彍鍝侊級
   * @param {string} canteenId - 楗爞ID
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getStallsByCanteen(canteenId) {
    if (!canteenId) {
      return { code: -1, msg: '缂哄皯楗爞ID' }
    }

    const cacheKey = `stalls:${canteenId}`
    const cached = getReadCache(cacheKey)
    if (cached) return cached

    const { data: stalls } = await stallsCollection
      .where({ canteenId, status: 'active' })
      .orderBy('sort', 'asc')
      .get()

    // 鎵归噺鏌ヨ鎵€鏈夋。鍙ｇ殑鑿滃搧
    const stallIds = stalls.map((s) => s._id)
    let allDishes = []
    if (stallIds.length) {
      const { data: stallDishes } = await dishesCollection
        .where({
          stallId: db.command.in(stallIds),
          status: 'active'
        })
        .orderBy('sort', 'asc')
        .get()
      allDishes = stallDishes
    }

    const { data: directDishes } = await dishesCollection
      .where({
        canteenId,
        status: 'active'
      })
      .orderBy('sort', 'asc')
      .get()

    // 鎸夋。鍙ｅ垎缁?    const dishesByStall = {}
    allDishes.forEach((dish) => {
      if (!dishesByStall[dish.stallId]) {
        dishesByStall[dish.stallId] = []
      }
      dishesByStall[dish.stallId].push({
        id: dish._id,
        name: dish.name,
        category: dish.category || '',
        tag: dish.tag || '',
        price: dish.price || '',
        vibe: dish.vibe || ''
      })
    })

    const assignedDishIds = new Set(allDishes.map((dish) => dish._id))
    const orphanDishes = directDishes
      .filter((dish) => !assignedDishIds.has(dish._id) && (!dish.stallId || !stallIds.includes(dish.stallId)))
      .map((dish) => ({
        id: dish._id,
        name: dish.name,
        category: dish.category || '',
        tag: dish.tag || '',
        price: dish.price || '',
        vibe: dish.vibe || ''
      }))

    const result = stalls.map((s) => ({
      id: s._id,
      name: s.name,
      category: s.category || '',
      remark: s.remark || '',
      dishes: dishesByStall[s._id] || []
    }))

    if (orphanDishes.length) {
      result.push({
        id: `${canteenId}-direct-dishes`,
        name: '精选菜品',
        category: '推荐',
        remark: '',
        dishes: orphanDishes
      })
    }

    return setReadCache(cacheKey, {
      code: 0,
      data: result
    })
  },

  /**
   * 鑾峰彇鏅€氱増鎺ㄨ崘鍊欓€夎彍鍝?   * @param {number} limit - 鏈€澶氳繑鍥炴暟閲?   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getNormalDishCandidates(limit = 80) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 80, 200))
    const cacheKey = `normalDishes:${safeLimit}`
    const cached = getReadCache(cacheKey)
    if (cached) return cached

    const { data: dishes } = await normalDishesCollection
      .where({ status: 'active' })
      .orderBy('sort', 'asc')
      .limit(safeLimit)
      .get()

    return setReadCache(cacheKey, {
      code: 0,
      data: dishes.map((dish) => ({
        id: dish._id,
        name: dish.name,
        category: dish.category || '',
        tag: dish.tag || '',
        price: dish.price || '',
        vibe: dish.vibe || '',
        source: 'normal'
      }))
    })
  },

  /**
   * 鑾峰彇鏍″洯鐗堟帹鑽愬€欓€夎彍鍝?   * @param {Array<string>} canteenIds - 楗爞ID鍒楄〃
   * @param {number} limit - 鏈€澶氳繑鍥炴暟閲?   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getCampusDishCandidates(canteenIds = [], limit = 120) {
    const ids = Array.isArray(canteenIds)
      ? [...new Set(canteenIds.filter(Boolean))].slice(0, 20)
      : []

    if (!ids.length) {
      return { code: 0, data: [] }
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 120, 300))
    const cacheKey = `campusDishes:${ids.slice().sort().join('|')}:${safeLimit}`
    const cached = getReadCache(cacheKey)
    if (cached) return cached

    const { data: canteens } = await canteensCollection
      .where({ _id: db.command.in(ids), status: 'active' })
      .get()
    const canteenMap = {}
    canteens.forEach((canteen) => {
      canteenMap[canteen._id] = canteen.name
    })

    const { data: stalls } = await stallsCollection
      .where({ canteenId: db.command.in(ids), status: 'active' })
      .get()
    const stallMap = {}
    stalls.forEach((stall) => {
      stallMap[stall._id] = {
        name: stall.name,
        canteenId: stall.canteenId
      }
    })

    const stallIds = stalls.map((stall) => stall._id)
    let dishes = []
    if (stallIds.length) {
      const { data: stallDishes } = await dishesCollection
        .where({
          stallId: db.command.in(stallIds),
          status: 'active'
        })
        .orderBy('sort', 'asc')
        .limit(safeLimit)
        .get()
      dishes = stallDishes
    }

    const { data: directDishes } = await dishesCollection
      .where({
        canteenId: db.command.in(ids),
        status: 'active'
      })
      .orderBy('sort', 'asc')
      .limit(safeLimit)
      .get()

    const dishMap = new Map()
    dishes.concat(directDishes).forEach((dish) => {
      if (!dishMap.has(dish._id)) {
        dishMap.set(dish._id, dish)
      }
    })
    dishes = Array.from(dishMap.values()).slice(0, safeLimit)

    return setReadCache(cacheKey, {
      code: 0,
      data: dishes.map((dish) => {
        const stall = stallMap[dish.stallId] || {}
        const canteenId = dish.canteenId || stall.canteenId || ''
        return {
          id: dish._id,
          name: dish.name,
          category: dish.category || '',
          tag: dish.tag || '',
          price: dish.price || '',
          vibe: dish.vibe || '',
          source: 'campus',
          canteenId,
          canteenName: canteenMap[canteenId] || '',
          stallId: dish.stallId || '',
          stallName: stall.name || ''
        }
      })
    })
  },

  /**
   * 鑾峰彇鎸囧畾瀛︽牎鐨勫畬鏁撮キ鍫傛暟鎹紙楗爞+妗ｅ彛+鑿滃搧锛?   * @param {string} campusName - 瀛︽牎鍚嶇О
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getCanteenFullData(campusName) {
    if (!campusName) {
      return { code: -1, msg: '缂哄皯瀛︽牎鍚嶇О' }
    }

    const cacheKey = `canteenFull:${campusName}`
    const cached = getReadCache(cacheKey)
    if (cached) return cached

    // 1. 鑾峰彇楗爞鍒楄〃
    const { data: canteens } = await canteensCollection
      .where({ campusName, status: 'active' })
      .orderBy('sort', 'asc')
      .get()

    if (!canteens.length) {
      return setReadCache(cacheKey, { code: 0, data: [] })
    }

    const canteenIds = canteens.map((c) => c._id)

    // 2. 鑾峰彇鎵€鏈夋。鍙?
    const { data: stalls } = await stallsCollection
      .where({
        canteenId: db.command.in(canteenIds),
        status: 'active'
      })
      .orderBy('sort', 'asc')
      .get()

    const stallIds = stalls.map((s) => s._id)

    // 3. 鑾峰彇鎵€鏈夎彍鍝?    let allDishes = []
    if (stallIds.length) {
      const { data: dishes } = await dishesCollection
        .where({
          stallId: db.command.in(stallIds),
          status: 'active'
        })
        .orderBy('sort', 'asc')
        .get()
      allDishes = dishes
    }
    const { data: directDishes } = await dishesCollection
      .where({
        canteenId: db.command.in(canteenIds),
        status: 'active'
      })
      .orderBy('sort', 'asc')
      .get()

    // 鎸夋。鍙ｅ垎缁勮彍鍝?    const dishesByStall = {}
    allDishes.forEach((dish) => {
      if (!dishesByStall[dish.stallId]) {
        dishesByStall[dish.stallId] = []
      }
      dishesByStall[dish.stallId].push({
        id: dish._id,
        name: dish.name,
        category: dish.category || '',
        tag: dish.tag || '',
        price: dish.price || '',
        vibe: dish.vibe || ''
      })
    })

    const assignedDishIds = new Set(allDishes.map((dish) => dish._id))
    const directDishesByCanteen = {}
    directDishes.forEach((dish) => {
      if (assignedDishIds.has(dish._id)) return
      if (dish.stallId && stallIds.includes(dish.stallId)) return
      if (!directDishesByCanteen[dish.canteenId]) {
        directDishesByCanteen[dish.canteenId] = []
      }
      directDishesByCanteen[dish.canteenId].push({
        id: dish._id,
        name: dish.name,
        category: dish.category || '',
        tag: dish.tag || '',
        price: dish.price || '',
        vibe: dish.vibe || ''
      })
    })

    // 鎸夐キ鍫傚垎缁勬。鍙?
    const stallsByCanteen = {}
    stalls.forEach((stall) => {
      if (!stallsByCanteen[stall.canteenId]) {
        stallsByCanteen[stall.canteenId] = []
      }
      stallsByCanteen[stall.canteenId].push({
        id: stall._id,
        name: stall.name,
        category: stall.category || '',
        remark: stall.remark || '',
        dishes: dishesByStall[stall._id] || []
      })
    })

    Object.entries(directDishesByCanteen).forEach(([canteenId, dishes]) => {
      if (!stallsByCanteen[canteenId]) {
        stallsByCanteen[canteenId] = []
      }
      if (dishes.length) {
        stallsByCanteen[canteenId].push({
          id: `${canteenId}-direct-dishes`,
          name: '精选菜品',
          category: '推荐',
          remark: '',
          dishes
        })
      }
    })

    // 缁勮鏈€缁堢粨鏋?
    return setReadCache(cacheKey, {
      code: 0,
      data: canteens.map((c) => ({
        id: c._id,
        name: c.name,
        remark: c.remark || '',
        stalls: stallsByCanteen[c._id] || []
      }))
    })
  },

  /**
   * 鑾峰彇鎸囧畾瀛︽牎鐨勬牎鍥湇鍔″垪琛?
   * @param {string} campusName - 瀛︽牎鍚嶇О
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getServicesByCampus(campusName) {
    if (!campusName) {
      return { code: -1, msg: '缂哄皯瀛︽牎鍚嶇О' }
    }

    const cacheKey = `services:${campusName}`
    const cached = getReadCache(cacheKey)
    if (cached) return cached

    const { data: services } = await servicesCollection
      .where({ campusName, status: 'active' })
      .orderBy('sort', 'asc')
      .get()

    return setReadCache(cacheKey, {
      code: 0,
      data: services.map((s) => ({
        id: s._id,
        icon: s.icon || '馃搵',
        name: s.name,
        remark: s.remark || '',
        externalUrl: s.externalUrl || ''
      }))
    })
  },

  // ====== 妗ｅ彛 CRUD ======

  /**
   * 娣诲姞妗ｅ彛锛堝晢閾猴級
   * @param {string} canteenId - 楗爞ID
   * @param {object} stallData - { name, category, remark }
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async addStall(token, canteenId, stallData = {}) {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!canteenId) {
      return { code: -1, msg: '缂哄皯楗爞ID' }
    }
    if (!stallData.name) {
      return { code: -1, msg: '请输入商铺名称' }
    }

    // 鑾峰彇褰撳墠鏈€澶?sort
    const { data: existingStalls } = await stallsCollection
      .where({ canteenId, status: 'active' })
      .orderBy('sort', 'desc')
      .limit(1)
      .get()
    const maxSort = existingStalls.length ? (existingStalls[0].sort || 0) : 0

    const now = Date.now()
    const addRes = await stallsCollection.add({
      canteenId,
      name: stallData.name,
      category: stallData.category || '',
      remark: stallData.remark || '',
      sort: maxSort + 1,
      status: 'active',
      createdAt: now,
      updatedAt: now
    })

    clearReadCache()

    return {
      code: 0,
      data: {
        id: addRes.id,
        name: stallData.name,
        category: stallData.category || '',
        remark: stallData.remark || ''
      }
    }
  },

  /**
   * 鏇存柊妗ｅ彛淇℃伅
   * @param {string} canteenId - 楗爞ID锛堢敤浜庨獙璇佸綊灞烇級
   * @param {string} stallId - 妗ｅ彛ID
   * @param {object} stallData - { name, category, remark }
   * @returns {{ code: number, msg?: string }}
   */
  async updateStall(token, canteenId, stallId, stallData = {}) {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!canteenId || !stallId) {
      return { code: -1, msg: '缂哄皯鍙傛暟' }
    }

    // 楠岃瘉妗ｅ彛灞炰簬璇ラキ鍫?
    const { data: stalls } = await stallsCollection
      .where({ _id: stallId, canteenId, status: 'active' })
      .limit(1)
      .get()

    if (!stalls.length) {
      return { code: -1, msg: '妗ｅ彛涓嶅瓨鍦ㄦ垨鏃犳潈鎿嶄綔' }
    }

    const updateData = { updatedAt: Date.now() }
    if (stallData.name !== undefined) updateData.name = stallData.name
    if (stallData.category !== undefined) updateData.category = stallData.category
    if (stallData.remark !== undefined) updateData.remark = stallData.remark

    await stallsCollection.doc(stallId).update(updateData)

    clearReadCache()

    return { code: 0, msg: '鏇存柊鎴愬姛' }
  },

  /**
   * 鍒犻櫎妗ｅ彛锛堣蒋鍒犻櫎锛屽悓鏃跺垹闄ゅ叾涓嬫墍鏈夎彍鍝侊級
   * @param {string} canteenId - 楗爞ID
   * @param {string} stallId - 妗ｅ彛ID
   * @returns {{ code: number, msg?: string }}
   */
  async deleteStall(token, canteenId, stallId) {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!canteenId || !stallId) {
      return { code: -1, msg: '缂哄皯鍙傛暟' }
    }

    // 楠岃瘉妗ｅ彛灞炰簬璇ラキ鍫?
    const { data: stalls } = await stallsCollection
      .where({ _id: stallId, canteenId, status: 'active' })
      .limit(1)
      .get()

    if (!stalls.length) {
      return { code: -1, msg: '妗ｅ彛涓嶅瓨鍦ㄦ垨鏃犳潈鎿嶄綔' }
    }

    const now = Date.now()

    // 杞垹闄ゆ。鍙?
    await stallsCollection.doc(stallId).update({
      status: 'inactive',
      updatedAt: now
    })

    // 杞垹闄よ妗ｅ彛涓嬫墍鏈夎彍鍝?
    const { data: dishes } = await dishesCollection
      .where({ stallId, status: 'active' })
      .get()

    if (dishes.length) {
      const batch = dishes.map((dish) =>
        dishesCollection.doc(dish._id).update({
          status: 'inactive',
          updatedAt: now
        })
      )
      await Promise.all(batch)
    }

    clearReadCache()

    return { code: 0, msg: '鍒犻櫎鎴愬姛' }
  },

  // ====== 鑿滃搧 CRUD ======

  /**
   * 鑾峰彇鎸囧畾妗ｅ彛鐨勮彍鍝佸垪琛?
   * @param {string} stallId - 妗ｅ彛ID
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getDishesByStall(stallId) {
    if (!stallId) {
      return { code: -1, msg: '缂哄皯妗ｅ彛ID' }
    }

    const cacheKey = `dishes:${stallId}`
    const cached = getReadCache(cacheKey)
    if (cached) return cached

    const { data: dishes } = await dishesCollection
      .where({ stallId, status: 'active' })
      .orderBy('sort', 'asc')
      .get()

    return setReadCache(cacheKey, {
      code: 0,
      data: dishes.map((d) => ({
        id: d._id,
        name: d.name,
        category: d.category || '',
        tag: d.tag || '',
        price: d.price || '',
        vibe: d.vibe || ''
      }))
    })
  },

  /**
   * 娣诲姞鑿滃搧
   * @param {string} stallId - 妗ｅ彛ID
   * @param {string} canteenId - 楗爞ID锛堝啑浣欏瓧娈碉級
   * @param {object} dishData - { name, category, tag, price, vibe }
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async addDish(token, stallId, canteenId, dishData = {}) {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!stallId) {
      return { code: -1, msg: '缂哄皯妗ｅ彛ID' }
    }
    if (!dishData.name) {
      return { code: -1, msg: '请输入菜品名称' }
    }

    // 鑾峰彇褰撳墠鏈€澶?sort
    const { data: existingDishes } = await dishesCollection
      .where({ stallId, status: 'active' })
      .orderBy('sort', 'desc')
      .limit(1)
      .get()
    const maxSort = existingDishes.length ? (existingDishes[0].sort || 0) : 0

    const now = Date.now()
    const addRes = await dishesCollection.add({
      stallId,
      canteenId: canteenId || '',
      name: dishData.name,
      category: dishData.category || '',
      tag: dishData.tag || '',
      price: dishData.price || '',
      vibe: dishData.vibe || '',
      sort: maxSort + 1,
      status: 'active',
      createdAt: now,
      updatedAt: now
    })

    clearReadCache()

    return {
      code: 0,
      data: {
        id: addRes.id,
        name: dishData.name,
        category: dishData.category || '',
        tag: dishData.tag || '',
        price: dishData.price || '',
        vibe: dishData.vibe || ''
      }
    }
  },

  /**
   * 鏇存柊鑿滃搧淇℃伅
   * @param {string} stallId - 妗ｅ彛ID锛堥獙璇佸綊灞烇級
   * @param {string} dishId - 鑿滃搧ID
   * @param {object} dishData - { name, category, tag, price, vibe }
   * @returns {{ code: number, msg?: string }}
   */
  async updateDish(token, stallId, dishId, dishData = {}) {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!stallId || !dishId) {
      return { code: -1, msg: '缂哄皯鍙傛暟' }
    }

    // 楠岃瘉鑿滃搧灞炰簬璇ユ。鍙?
    const { data: dishes } = await dishesCollection
      .where({ _id: dishId, stallId, status: 'active' })
      .limit(1)
      .get()

    if (!dishes.length) {
      return { code: -1, msg: '鑿滃搧涓嶅瓨鍦ㄦ垨鏃犳潈鎿嶄綔' }
    }

    const updateData = { updatedAt: Date.now() }
    if (dishData.name !== undefined) updateData.name = dishData.name
    if (dishData.category !== undefined) updateData.category = dishData.category
    if (dishData.tag !== undefined) updateData.tag = dishData.tag
    if (dishData.price !== undefined) updateData.price = dishData.price
    if (dishData.vibe !== undefined) updateData.vibe = dishData.vibe

    await dishesCollection.doc(dishId).update(updateData)

    clearReadCache()

    return { code: 0, msg: '鏇存柊鎴愬姛' }
  },

  /**
   * 鍒犻櫎鑿滃搧锛堣蒋鍒犻櫎锛?
   * @param {string} stallId - 妗ｅ彛ID
   * @param {string} dishId - 鑿滃搧ID
   * @returns {{ code: number, msg?: string }}
   */
  async deleteDish(token, stallId, dishId) {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!stallId || !dishId) {
      return { code: -1, msg: '缂哄皯鍙傛暟' }
    }

    // 楠岃瘉鑿滃搧灞炰簬璇ユ。鍙?
    const { data: dishes } = await dishesCollection
      .where({ _id: dishId, stallId, status: 'active' })
      .limit(1)
      .get()

    if (!dishes.length) {
      return { code: -1, msg: '鑿滃搧涓嶅瓨鍦ㄦ垨鏃犳潈鎿嶄綔' }
    }

    await dishesCollection.doc(dishId).update({
      status: 'inactive',
      updatedAt: Date.now()
    })

    clearReadCache()

    return { code: 0, msg: '鍒犻櫎鎴愬姛' }
  },

  /**
   * 棰勬鑿滃搧鎵归噺瀵煎叆鏁版嵁锛堢鐞嗗憳锛?   * @param {string} token
   * @param {object} payload - { canteenId, stallId, dishes }
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async previewImportDishes(token, payload = {}) {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    const canteenId = normalizeImportText(payload.canteenId)
    const stallId = normalizeImportText(payload.stallId)
    const dishList = Array.isArray(payload.dishes) ? payload.dishes : []

    if (!dishList.length) {
      return { code: -1, msg: '杩欎唤鏂囦欢閲岃繕娌℃湁鍙鍏ョ殑鑿滃搧' }
    }

    if (dishList.length > DISH_IMPORT_MAX_COUNT) {
      return { code: -1, msg: `单次最多先处理 ${DISH_IMPORT_MAX_COUNT} 道菜品` }
    }

    const targetCheck = await verifyDishImportTarget(canteenId, stallId)
    if (targetCheck.code !== 0) {
      return targetCheck
    }

    const normalizedRows = dishList.map((dish, index) => normalizeImportDish(dish, index))
    const existingNameSet = await getExistingDishNameSet(stallId)
    const batchNameCountMap = new Map()

    normalizedRows.forEach((row) => {
      if (!row.name) return
      batchNameCountMap.set(row.name, (batchNameCountMap.get(row.name) || 0) + 1)
    })

    const rows = normalizedRows.map((row) => {
      const { status: baseStatus, issues } = validateImportDish(row)
      const nextIssues = [...issues]
      let status = baseStatus

      if (row.name && batchNameCountMap.get(row.name) > 1) {
        nextIssues.push('杩欐壒鏁版嵁閲屾湁閲嶅悕鑿滃搧')
        if (status === 'valid') status = 'warning'
      }

      if (row.name && existingNameSet.has(row.name)) {
        nextIssues.push('褰撳墠妗ｅ彛閲屽凡缁忔湁鍚屽悕鑿滃搧')
        if (status === 'valid') status = 'warning'
      }

      return {
        ...row,
        status,
        issues: nextIssues
      }
    })

    return {
      code: 0,
      data: {
        summary: {
          total: rows.length,
          valid: rows.filter((row) => row.status === 'valid').length,
          warning: rows.filter((row) => row.status === 'warning').length,
          invalid: rows.filter((row) => row.status === 'invalid').length,
          duplicateInBatch: rows.filter((row) => row.issues.includes('杩欐壒鏁版嵁閲屾湁閲嶅悕鑿滃搧')).length,
          duplicateInDb: rows.filter((row) => row.issues.includes('褰撳墠妗ｅ彛閲屽凡缁忔湁鍚屽悕鑿滃搧')).length
        },
        rows
      }
    }
  },

  /**
   * 姝ｅ紡鎵归噺瀵煎叆鑿滃搧锛堢鐞嗗憳锛?   * @param {string} token
   * @param {object} payload - { canteenId, stallId, importMode, dishes }
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async batchImportDishes(token, payload = {}) {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    const canteenId = normalizeImportText(payload.canteenId)
    const stallId = normalizeImportText(payload.stallId)
    const importMode = normalizeImportText(payload.importMode) || 'skip_duplicate'
    const dishList = Array.isArray(payload.dishes) ? payload.dishes : []

    if (!IMPORT_MODE_OPTIONS.includes(importMode)) {
      return { code: -1, msg: '导入模式不支持' }
    }

    if (!dishList.length) {
      return { code: -1, msg: '这次还没有可导入的菜品' }
    }

    if (dishList.length > DISH_IMPORT_MAX_COUNT) {
      return { code: -1, msg: `单次最多先处理 ${DISH_IMPORT_MAX_COUNT} 道菜品` }
    }

    const targetCheck = await verifyDishImportTarget(canteenId, stallId)
    if (targetCheck.code !== 0) {
      return targetCheck
    }

    const normalizedRows = dishList.map((dish, index) => normalizeImportDish(dish, index))
    const existingNameSet = await getExistingDishNameSet(stallId)
    const { data: maxSortRows } = await dishesCollection
      .where({ stallId, status: 'active' })
      .orderBy('sort', 'desc')
      .limit(1)
      .get()

    let currentSort = maxSortRows.length ? (maxSortRows[0].sort || 0) : 0
    const seenNamesInThisRun = new Set()
    const now = Date.now()
    const items = []
    const docsToAdd = []

    for (const row of normalizedRows) {
      const { status, issues } = validateImportDish(row)

      if (status === 'invalid') {
        items.push({
          localId: row.localId,
          name: row.name,
          result: 'failed',
          reason: issues.join('，')
        })
        continue
      }

      const isDuplicateInDb = row.name && existingNameSet.has(row.name)
      const isDuplicateInRun = row.name && seenNamesInThisRun.has(row.name)

      if ((isDuplicateInDb || isDuplicateInRun) && importMode === 'skip_duplicate') {
        items.push({
          localId: row.localId,
          name: row.name,
          result: 'skipped',
          reason: isDuplicateInDb ? '同档口已存在同名菜品' : '本次导入中有重复菜名'
        })
        continue
      }

      currentSort += 1
      seenNamesInThisRun.add(row.name)
      existingNameSet.add(row.name)

      docsToAdd.push({
        localId: row.localId,
        name: row.name,
        doc: {
          stallId,
          canteenId,
          name: row.name,
          category: row.category || '',
          tag: row.tag || '',
          price: row.price || '',
          vibe: row.vibe || '',
          sort: currentSort,
          status: 'active',
          createdAt: now,
          updatedAt: now
        }
      })

      items.push({
        localId: row.localId,
        name: row.name,
        result: 'pending'
      })
    }

    for (const item of docsToAdd) {
      const addRes = await dishesCollection.add(item.doc)
      const targetItem = items.find((row) => row.localId === item.localId && row.result === 'pending')
      if (targetItem) {
        targetItem.result = 'added'
        targetItem.id = addRes.id
      }
    }

    if (docsToAdd.length) {
      clearReadCache()
    }

    return {
      code: 0,
      data: {
        added: items.filter((item) => item.result === 'added').length,
        skipped: items.filter((item) => item.result === 'skipped').length,
        failed: items.filter((item) => item.result === 'failed').length,
        items
      },
      msg: '这批菜品已经整理进档口里了'
    }
  },

  // ====== 绠＄悊鍛樻帴鍙?======

  /**
   * 鑾峰彇寰呭鏍哥敵璇峰垪琛紙绠＄悊鍛橈級
   * @param {string} token
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getPendingApplications(token) {
    const admin = await verifyAdminValue(this, token)
    if (!admin) {
      return { code: -1, msg: '无管理权限' }
    }

    const { data: apps } = await applicationsCollection
      .where({ status: '待审核' })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    return { code: 0, data: apps }
  },

  /**
   * 瀹℃牳鐢宠锛堢鐞嗗憳锛?
   * @param {string} token
   * @param {string} applicationId - 鐢宠璁板綍ID
   * @param {string} action - 'approve' 鎴?'reject'
   * @param {string} note - 瀹℃牳澶囨敞
   * @returns {{ code: number, msg?: string }}
   */
  async reviewApplication(token, applicationId, action, note = '') {
    const admin = await verifyAdminValue(this, token)
    if (!admin) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!['approve', 'reject'].includes(action)) {
      return { code: -1, msg: '鎿嶄綔鏃犳晥' }
    }

    const status = action === 'approve' ? '已通过' : '已拒绝'

    await applicationsCollection.doc(applicationId).update({
      status,
      reviewNote: note,
      reviewedBy: admin,
      reviewedAt: Date.now(),
      updatedAt: Date.now()
    })

    // 濡傛灉閫氳繃锛岃嚜鍔ㄥ垱寤烘牎鍥褰曪紙濡備笉瀛樺湪锛?
    if (action === 'approve') {
      const { data: app } = await applicationsCollection.doc(applicationId).get()
      if (app && app.length) {
        const appData = app[0]
        const { data: existCampus } = await campusesCollection
          .where({ name: appData.campusName, campusTag: appData.campusTag || '' })
          .limit(1)
          .get()

        if (!existCampus.length) {
          await campusesCollection.add({
            name: appData.campusName,
            shortName: appData.campusName.slice(0, 4),
            campusTag: appData.campusTag || '',
            district: appData.city || '鏍″洯鍚堜綔',
            specialties: [],
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now()
          })
        }
      }
    }

    clearReadCache()

    return { code: 0, msg: status === '已通过' ? '已通过' : '已拒绝' }
  },

  // ====== 鍐呴儴鏂规硶 ======

  /**
   * 楠岃瘉 token
   * @private
   */
  async isAdmin(token) {
    const openid = await verifyAdminValue(this, token)
    return { code: 0, data: { isAdmin: !!openid } }
  },

  async clearReadCache(token = '') {
    const admin = await verifyAdminValue(this, token)
    if (!admin) {
      return { code: -1, msg: '无管理权限' }
    }

    clearReadCache()
    return { code: 0, msg: '缓存已清理' }
  },

  async _verifyToken(token) {
    if (!token) return null
    try {
      const { data: users } = await usersCollection.where({ token }).limit(1).get()
      if (!users.length) return null
      const user = users[0]
      const elapsed = Date.now() - (user.updatedAt || 0)
      if (elapsed > TOKEN_EXPIRE_MS) return null
      return user.openid
    } catch (err) {
      return null
    }
  },

  async _verifyAdmin(token) {
    if (!token) return null

    const uniAdmin = await verifyUniIdAdmin(this, token)
    if (uniAdmin) {
      return uniAdmin.uid || 'uni-admin'
    }

    const openid = await verifyTokenValue(token)
    if (!openid || !ENV_ADMIN_OPENIDS.concat(ADMIN_OPENIDS).includes(openid)) {
      return null
    }
    return openid
  },

  /**
   * 鏍煎紡鍖栨椂闂存埑
   * @private
   */
  /**
   * 涓€閿垵濮嬪寲 admin 鑷畾涔夎彍鍗曪紙鎻掑叆鍒?opendb-admin-menus 琛級
   * @returns {{ code: number, msg: string, data?: object }}
   */
  async initAdminMenus(token = '') {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    const menusTable = db.collection('opendb-admin-menus')
    const menus = [
      { menu_id: 'canteen_management', name: '楗爞绠＄悊', icon: 'admin-icons-fl-xitong', url: '', sort: 500, parent_id: '', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-canteen-mgmt' },
      { menu_id: 'campus_list', name: '鏍″洯绠＄悊', icon: 'admin-icons-manager-app', url: '/pages/eat-what/campus/list', sort: 510, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-campus-list' },
      { menu_id: 'canteen_list', name: '楗爞绠＄悊', icon: 'admin-icons-manager-app', url: '/pages/eat-what/canteen/list', sort: 520, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-canteen-list' },
      { menu_id: 'stall_list', name: '鍟嗛摵绠＄悊', icon: 'admin-icons-manager-app', url: '/pages/eat-what/stall/list', sort: 530, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-stall-list' },
      { menu_id: 'dish_list', name: '鑿滃搧绠＄悊', icon: 'admin-icons-manager-tag', url: '/pages/eat-what/dish/list', sort: 540, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-dish-list' },
      { menu_id: 'dish_import', name: '鑿滃搧瀵煎叆', icon: 'admin-icons-manager-tag', url: '/pages/eat-what/dish/import', sort: 542, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-dish-import' },
      { menu_id: 'normal_dish_list', name: '普通版菜品池', icon: 'admin-icons-manager-tag', url: '/pages/eat-what/normal-dish/list', sort: 545, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-normal-dish-list' },
      { menu_id: 'ai_config', name: 'AI鎺ㄨ崘璁剧疆', icon: 'admin-icons-gear', url: '/pages/eat-what/ai-config/index', sort: 548, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-ai-config' },
      { menu_id: 'application_management', name: '鍏ラ┗瀹℃牳', icon: 'admin-icons-manager-permission', url: '/pages/eat-what/application/list', sort: 550, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-application-mgmt' },
      { menu_id: 'service_management', name: '鏍″洯鏈嶅姟', icon: 'admin-icons-manager-role', url: '/pages/eat-what/service/list', sort: 560, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-service-mgmt' },
      { menu_id: 'user_management', name: '鐢ㄦ埛绠＄悊', icon: 'admin-icons-manager-user', url: '', sort: 600, parent_id: '', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-user-mgmt' },
      { menu_id: 'user_list', name: '鐢ㄦ埛鍒楄〃', icon: 'admin-icons-manager-user', url: '/pages/eat-what/user/list', sort: 610, parent_id: 'user_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-user-list' },
      { menu_id: 'history_list', name: '鎺ㄨ崘璁板綍', icon: 'admin-icons-safety', url: '/pages/eat-what/history/list', sort: 620, parent_id: 'user_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-history-list' }
    ]

    let added = 0
    let skipped = 0

    for (const m of menus) {
      const { data } = await menusTable.where({ _id: m._id }).limit(1).get()
      if (data.length > 0) {
        skipped++
        continue
      }
      await menusTable.add(m)
      added++
    }

    return {
      code: 0,
      msg: `菜单初始化完成：新增 ${added} 条，跳过已存在 ${skipped} 条`,
      data: { added, skipped }
    }
  },

  /**
   * 淇 admin 鑷畾涔夎彍鍗曠殑 URL锛堝皢鏃ц矾寰?/pages/xxx/list 鏇存柊涓?/pages/eat-what/xxx/list锛?
   * 鐢ㄤ簬鏁版嵁搴撲腑宸插瓨鍦ㄦ棫璺緞鑿滃崟璁板綍鐨勬儏鍐?
   * @returns {{ code: number, msg: string, data?: object }}
   */
  async fixAdminMenusUrl(token = '') {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    const menusTable = db.collection('opendb-admin-menus')

    // 定义正确的 URL 映射（id -> 正确的新 URL）
    const correctUrls = {
      'eat-what-campus-list': '/pages/eat-what/campus/list',
      'eat-what-canteen-list': '/pages/eat-what/canteen/list',
      'eat-what-stall-list': '/pages/eat-what/stall/list',
      'eat-what-dish-list': '/pages/eat-what/dish/list',
      'eat-what-dish-import': '/pages/eat-what/dish/import',
      'eat-what-normal-dish-list': '/pages/eat-what/normal-dish/list',
      'eat-what-ai-config': '/pages/eat-what/ai-config/index',
      'eat-what-application-mgmt': '/pages/eat-what/application/list',
      'eat-what-service-mgmt': '/pages/eat-what/service/list',
      'eat-what-user-list': '/pages/eat-what/user/list',
      'eat-what-history-list': '/pages/eat-what/history/list'
    }

    const missingMenuRecords = {
      'eat-what-dish-import': {
        _id: 'eat-what-dish-import',
        menu_id: 'dish_import',
        name: '菜品导入',
        icon: 'admin-icons-manager-tag',
        url: '/pages/eat-what/dish/import',
        sort: 542,
        parent_id: 'canteen_management',
        permission: [],
        enable: true,
        create_date: Date.now()
      }
    }

    // 鐖剁骇鑿滃崟涓嶉渶瑕?URL
    const parentIds = ['eat-what-canteen-mgmt', 'eat-what-user-mgmt']

    let updated = 0
    let unchanged = 0
    const details = []

    for (const [menuId, correctUrl] of Object.entries(correctUrls)) {
      const { data } = await menusTable.where({ _id: menuId }).limit(1).get()
      if (!data.length) {
        const missingRecord = missingMenuRecords[menuId]
        if (missingRecord) {
          await menusTable.add(missingRecord)
          updated++
          details.push(`${menuId}: 已新增`)
        } else {
          // 璁板綍涓嶅瓨鍦紝璺宠繃
          unchanged++
          details.push(`${menuId}: 不存在`)
        }
        continue
      }

      const record = data[0]
      if (record.url === correctUrl) {
        unchanged++
        details.push(`${menuId}: 宸叉槸姝ｇ‘璺緞`)
        continue
      }

      // 鏇存柊涓烘纭?URL
      await menusTable.doc(menuId).update({
        url: correctUrl,
        updatedAt: Date.now()
      })
      updated++
      details.push(`${menuId}: ${record.url || '(空)'} -> ${correctUrl}`)
    }

    return {
      code: 0,
      msg: `菜单 URL 修复完成：更新 ${updated} 条，无需修改 ${unchanged} 条`,
      data: { updated, unchanged, details }
    }
  },

  /**
   * 缁煎悎璇婃柇锛氭娴嬪墠鍚庣杩為€氭€с€佹暟鎹簱琛ㄣ€佽彍鍗曢厤缃?
   * @returns {{ code: number, data: object, msg: string }}
   */
  async runDiagnostics(token = '') {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    const results = {
      timestamp: new Date().toISOString(),
      cloudObject: 'co-campus',
      database: {},
      adminMenus: {},
      summary: { total: 0, pass: 0, fail: 0 }
    }

    // 1. 妫€娴嬪悇鏁版嵁搴撹〃杩為€氭€?
    const collections = [
      { name: 'eat-what-campuses', label: '校园表' },
      { name: 'eat-what-canteens', label: '饭堂表' },
      { name: 'eat-what-stalls', label: '档口表' },
      { name: 'eat-what-dishes', label: '菜品表' },
      { name: 'eat-what-services', label: '服务表' },
      { name: 'eat-what-applications', label: '申请表' },
      { name: 'eat-what-users', label: '用户表' },
      { name: 'opendb-admin-menus', label: '菜单表' }
    ]

    for (const col of collections) {
      results.summary.total++
      try {
        const { total } = await db.collection(col.name).count()
        results.database[col.name] = {
          label: col.label,
          status: 'ok',
          count: total
        }
        results.summary.pass++
      } catch (err) {
        results.database[col.name] = {
          label: col.label,
          status: 'error',
          error: err.message || String(err)
        }
        results.summary.fail++
      }
    }

    // 2. 妫€娴?admin 鑿滃崟閰嶇疆
    const menusTable = db.collection('opendb-admin-menus')
    const expectedMenus = [
      { _id: 'eat-what-canteen-mgmt', name: '楗爞绠＄悊(鐖剁骇)', expectedUrl: '' },
      { _id: 'eat-what-campus-list', name: '鏍″洯绠＄悊', expectedUrl: '/pages/eat-what/campus/list' },
      { _id: 'eat-what-canteen-list', name: '楗爞绠＄悊', expectedUrl: '/pages/eat-what/canteen/list' },
      { _id: 'eat-what-stall-list', name: '鍟嗛摵绠＄悊', expectedUrl: '/pages/eat-what/stall/list' },
      { _id: 'eat-what-dish-list', name: '鑿滃搧绠＄悊', expectedUrl: '/pages/eat-what/dish/list' },
      { _id: 'eat-what-dish-import', name: '鑿滃搧瀵煎叆', expectedUrl: '/pages/eat-what/dish/import' },
      { _id: 'eat-what-normal-dish-list', name: '普通版菜品池', expectedUrl: '/pages/eat-what/normal-dish/list' },
      { _id: 'eat-what-ai-config', name: 'AI鎺ㄨ崘璁剧疆', expectedUrl: '/pages/eat-what/ai-config/index' },
      { _id: 'eat-what-application-mgmt', name: '鍏ラ┗瀹℃牳', expectedUrl: '/pages/eat-what/application/list' },
      { _id: 'eat-what-service-mgmt', name: '鏍″洯鏈嶅姟', expectedUrl: '/pages/eat-what/service/list' },
      { _id: 'eat-what-user-mgmt', name: '鐢ㄦ埛绠＄悊(鐖剁骇)', expectedUrl: '' },
      { _id: 'eat-what-user-list', name: '鐢ㄦ埛鍒楄〃', expectedUrl: '/pages/eat-what/user/list' },
      { _id: 'eat-what-history-list', name: '鎺ㄨ崘璁板綍', expectedUrl: '/pages/eat-what/history/list' }
    ]

    let menusOk = 0
    let menusIssue = 0
    for (const m of expectedMenus) {
      results.summary.total++
      try {
        const { data } = await menusTable.where({ _id: m._id }).limit(1).get()
        if (!data.length) {
          results.adminMenus[m._id] = { name: m.name, status: 'missing', msg: '记录不存在' }
          menusIssue++
        } else if (data[0].url !== m.expectedUrl) {
          results.adminMenus[m._id] = {
            name: m.name,
            status: 'url_mismatch',
            currentUrl: data[0].url || '(绌?',
            expectedUrl: m.expectedUrl
          }
          menusIssue++
        } else {
          results.adminMenus[m._id] = { name: m.name, status: 'ok' }
          menusOk++
          results.summary.pass++
        }
      } catch (err) {
        results.adminMenus[m._id] = { name: m.name, status: 'error', error: err.message }
        menusIssue++
      }
    }

    results.adminMenus._summary = { total: expectedMenus.length, ok: menusOk, issue: menusIssue }

    return {
      code: 0,
      msg: `诊断完成：${results.summary.pass}/${results.summary.total} 项通过，${results.summary.fail} 项失败，${menusIssue} 项菜单异常`,
      data: results
    }
  },

  /**
   * 鍒濆鍖栧熀纭€鏁版嵁锛堟牎鍥€侀キ鍫傘€佹湇鍔★級鈥斺€?灏?common/data.js 鐨勯璁炬暟鎹啓鍏ユ暟鎹簱
   * @returns {{ code: number, data?: object, msg: string }}
   */
  async initBaseData(token = '') {
    const openid = await verifyAdminValue(this, token)
    if (!openid) {
      console.warn('[co-campus] initBaseData executed without admin permission')
    }

    const now = Date.now()
    let campusAdded = 0, campusSkipped = 0
    let canteenAdded = 0, canteenSkipped = 0
    let serviceAdded = 0, serviceSkipped = 0
    let stallAdded = 0, stallSkipped = 0
    let dishAdded = 0, dishSkipped = 0
    let normalDishAdded = 0, normalDishSkipped = 0

    // ====== 1. 鍒濆鍖栨牎鍥〃 ======
    const presetCampuses = [
      {
        _id: 'gzcc',
        name: '广州商学院',
        shortName: '广商',
        district: '广州',
        specialties: ['煲仔饭', '鸡腿饭', '汤粉', '糖水'],
        status: 'active', sort: 1,
        createdAt: now, updatedAt: now
      }
    ]

    for (const c of presetCampuses) {
      const { data } = await campusesCollection.where({ name: c.name }).limit(1).get()
      if (!data.length) {
        await campusesCollection.add(c)
        campusAdded++
      } else {
        campusSkipped++
      }
    }

    // ====== 2. 鍒濆鍖栭キ鍫傝〃 ======
    const canteenList = [
      { _id: 'gzcc-tongde', campusName: '广州商学院', name: '同德', remark: '饭堂档口区', status: 'active', sort: 1 },
      { _id: 'gzcc-xingfu', campusName: '广州商学院', name: '幸福', remark: '人气快餐窗口', status: 'active', sort: 2 },
      { _id: 'gzcc-ganen', campusName: '广州商学院', name: '感恩', remark: '盖饭、粉面、小点', status: 'active', sort: 3 },
      { _id: 'gzcc-tongle', campusName: '广州商学院', name: '同乐', remark: '套餐、炖汤、热菜', status: 'active', sort: 4 },
      { _id: 'gzcc-tongxin', campusName: '广州商学院', name: '同心', remark: '轻食、小碗菜、简餐', status: 'active', sort: 5 },
      { _id: 'gzcc-snack', campusName: '广州商学院', name: '小吃街', remark: '夜宵、小吃、饮品', status: 'active', sort: 6 },
      { _id: 'gzcc-other', campusName: '广州商学院', name: '其他', remark: '临时开放窗口 / 其他区域', status: 'active', sort: 7 }
    ]

    for (const ct of canteenList) {
      const { data } = await canteensCollection.where({ _id: ct._id }).limit(1).get()
      if (!data.length) {
        await canteensCollection.add({ ...ct, createdAt: now, updatedAt: now })
        canteenAdded++
      } else {
        canteenSkipped++
      }
    }

    // ====== 3. 鍒濆鍖栧晢閾鸿〃锛堝悓寰烽キ鍫傜殑妗ｅ彛锛?======
    const stallList = [
      { _id: 'gzcc-tongde-dazhong', name: '大众食堂', canteenId: 'gzcc-tongde', campusName: '广州商学院', category: '快餐', remark: '家常菜、自选快餐', sort: 1 },
      { _id: 'gzcc-tongde-mixue', name: '蜜雪冰城', canteenId: 'gzcc-tongde', campusName: '广州商学院', category: '饮品', remark: '冰淇淋与茶饮', sort: 2 },
      { _id: 'gzcc-tongde-yuntun', name: '云吞', canteenId: 'gzcc-tongde', campusName: '广州商学院', category: '粉面', remark: '鲜虾云吞、云吞面', sort: 3 },
      { _id: 'gzcc-tongde-jiaozi', name: '饺子馆', canteenId: 'gzcc-tongde', campusName: '广州商学院', category: '面食', remark: '手工水饺、蒸饺', sort: 4 },
      { _id: 'gzcc-tongde-shaola', name: '烧腊档', canteenId: 'gzcc-tongde', campusName: '广州商学院', category: '烧腊', remark: '叉烧、烧鸭、白切鸡', sort: 5 },
      { _id: 'gzcc-tongde-xiaochao', name: '小炒窗口', canteenId: 'gzcc-tongde', campusName: '广州商学院', category: '小炒', remark: '现炒家常菜', sort: 6 }
    ]

    for (const st of stallList) {
      const { data } = await stallsCollection.where({ _id: st._id }).limit(1).get()
      if (!data.length) {
        await stallsCollection.add({ ...st, status: 'active', createdAt: now, updatedAt: now })
        stallAdded++
      } else {
        stallSkipped++
      }
    }

    // ====== 4. 鍒濆鍖栬彍鍝佽〃 ======
    const dishList = [
      // 澶т紬椋熷爞
      { _id: 'dish-dz-01', stallId: 'gzcc-tongde-dazhong', name: '红烧肉饭', category: '主食', price: '12', vibe: '下饭', tag: '人气', sort: 1 },
      { _id: 'dish-dz-02', stallId: 'gzcc-tongde-dazhong', name: '番茄炒蛋饭', category: '主食', price: '10', vibe: '清淡', tag: '', sort: 2 },
      { _id: 'dish-dz-03', stallId: 'gzcc-tongde-dazhong', name: '鸡腿饭', category: '主食', price: '13', vibe: '满足', tag: '推荐', sort: 3 },
      { _id: 'dish-dz-04', stallId: 'gzcc-tongde-dazhong', name: '青椒肉丝饭', category: '主食', price: '11', vibe: '微辣', tag: '', sort: 4 },
      { _id: 'dish-dz-05', stallId: 'gzcc-tongde-dazhong', name: '麻婆豆腐饭', category: '主食', price: '10', vibe: '辣', tag: '', sort: 5 },
      // 铚滈洩鍐板煄
      { _id: 'dish-mx-01', stallId: 'gzcc-tongde-mixue', name: '冰鲜柠檬水', category: '饮品', price: '4', vibe: '清爽', tag: '人气', sort: 1 },
      { _id: 'dish-mx-02', stallId: 'gzcc-tongde-mixue', name: '珍珠奶茶', category: '饮品', price: '6', vibe: '香甜', tag: '推荐', sort: 2 },
      { _id: 'dish-mx-03', stallId: 'gzcc-tongde-mixue', name: '冰淇淋', category: '甜品', price: '3', vibe: '冰凉', tag: '', sort: 3 },
      { _id: 'dish-mx-04', stallId: 'gzcc-tongde-mixue', name: '满杯百香果', category: '饮品', price: '7', vibe: '酸甜', tag: '新品', sort: 4 },
      // 浜戝悶
      { _id: 'dish-yt-01', stallId: 'gzcc-tongde-yuntun', name: '鲜肉云吞', category: '粉面', price: '10', vibe: '鲜香', tag: '人气', sort: 1 },
      { _id: 'dish-yt-02', stallId: 'gzcc-tongde-yuntun', name: '鲜虾云吞', category: '粉面', price: '13', vibe: '鲜美', tag: '推荐', sort: 2 },
      { _id: 'dish-yt-03', stallId: 'gzcc-tongde-yuntun', name: '云吞面', category: '粉面', price: '12', vibe: '饱腹', tag: '', sort: 3 },
      // 楗哄瓙棣?
      { _id: 'dish-jz-01', stallId: 'gzcc-tongde-jiaozi', name: '白菜猪肉饺', category: '面食', price: '10', vibe: '家常', tag: '人气', sort: 1 },
      { _id: 'dish-jz-02', stallId: 'gzcc-tongde-jiaozi', name: '韭菜鸡蛋饺', category: '面食', price: '10', vibe: '鲜香', tag: '', sort: 2 },
      { _id: 'dish-jz-03', stallId: 'gzcc-tongde-jiaozi', name: '酸辣水饺', category: '面食', price: '12', vibe: '酸辣', tag: '推荐', sort: 3 },
      { _id: 'dish-jz-04', stallId: 'gzcc-tongde-jiaozi', name: '蒸饺拼盘', category: '面食', price: '15', vibe: '丰富', tag: '新品', sort: 4 },
      // 鐑ц厞妗?
      { _id: 'dish-sl-01', stallId: 'gzcc-tongde-shaola', name: '叉烧饭', category: '烧腊', price: '15', vibe: '甜香', tag: '人气', sort: 1 },
      { _id: 'dish-sl-02', stallId: 'gzcc-tongde-shaola', name: '烧鸭饭', category: '烧腊', price: '15', vibe: '油香', tag: '推荐', sort: 2 },
      { _id: 'dish-sl-03', stallId: 'gzcc-tongde-shaola', name: '白切鸡饭', category: '烧腊', price: '16', vibe: '清淡', tag: '', sort: 3 },
      // 灏忕倰绐楀彛
      { _id: 'dish-xc-01', stallId: 'gzcc-tongde-xiaochao', name: '辣椒炒肉', category: '小炒', price: '14', vibe: '辣', tag: '人气', sort: 1 },
      { _id: 'dish-xc-02', stallId: 'gzcc-tongde-xiaochao', name: '酸菜鱼', category: '小炒', price: '18', vibe: '酸辣', tag: '推荐', sort: 2 },
      { _id: 'dish-xc-03', stallId: 'gzcc-tongde-xiaochao', name: '蒜蓉炒时蔬', category: '小炒', price: '10', vibe: '清淡', tag: '', sort: 3 }
    ]

    const stallCanteenMap = new Map(stallList.map((item) => [item._id, item.canteenId]))

    for (const d of dishList) {
      const canteenId = d.canteenId || stallCanteenMap.get(d.stallId) || ''
      const { data } = await dishesCollection.where({ _id: d._id }).limit(1).get()
      if (!data.length) {
        await dishesCollection.add({ ...d, canteenId, status: 'active', createdAt: now, updatedAt: now })
        dishAdded++
      } else {
        if (canteenId && !data[0].canteenId) {
          await dishesCollection.doc(data[0]._id).update({ canteenId, updatedAt: now })
        }
        dishSkipped++
      }
    }

    // ====== 5. 鍒濆鍖栨湇鍔¤〃 ======
    // ====== 5. 初始化普通版菜品池 ======
    for (const item of normalDishesSeed) {
      const { data } = await normalDishesCollection.where({ _id: item._id }).limit(1).get()
      if (!data.length) {
        await normalDishesCollection.add({
          ...item,
          createdAt: now,
          updatedAt: now
        })
        normalDishAdded++
      } else {
        normalDishSkipped++
      }
    }
    const serviceList = [
      { _id: 'gzcc-laundry', campusName: '广州商学院', icon: '洗', name: '洗衣机服务', remark: '宿舍洗护自助预约', enable: true, sort: 1 },
      { _id: 'gzcc-shoes', campusName: '广州商学院', icon: '鞋', name: '洗鞋服务', remark: '运动鞋清洗更省心', enable: true, sort: 2 },
      { _id: 'gzcc-storage', campusName: '广州商学院', icon: '收', name: '宿舍收纳', remark: '桌面衣柜整理服务', enable: true, sort: 3 },
      { _id: 'gzcc-cleaning', campusName: '广州商学院', icon: '扫', name: '宿舍打扫', remark: '日常清洁和深度打扫', enable: true, sort: 4 },
      { _id: 'gzcc-repair', campusName: '广州商学院', icon: '修', name: '电脑维修', remark: '常见软件硬件排查', enable: true, sort: 5 }
    ]

    for (const sv of serviceList) {
      const { data } = await servicesCollection.where({ _id: sv._id }).limit(1).get()
      if (!data.length) {
        await servicesCollection.add({
          ...sv, path: '', externalUrl: '', status: 'active', createdAt: now, updatedAt: now
        })
        serviceAdded++
      } else {
        serviceSkipped++
      }
    }

    // ====== 6. 闅愯棌鐙珛鑿滃搧绠＄悊鑿滃崟锛堝凡鍚堝苟鍒板晢閾虹鐞嗭級 ======
    const menusTable = db.collection('opendb-admin-menus')
    try {
      await menusTable.where({ _id: 'eat-what-dish-list' }).update({ enable: false })
      // 更新商铺管理菜单名称
      await menusTable.where({ _id: 'eat-what-stall-list' }).update({ name: '商铺&菜品' })
    } catch (e) {
      console.warn('[initBaseData] update menu name failed', e)
    }

    return {
      code: 0,
      msg: '基础数据初始化完成（包含校园、饭堂、档口、校园菜品、普通版菜品和服务）',
      data: {
        campus: { added: campusAdded, skipped: campusSkipped },
        canteen: { added: canteenAdded, skipped: canteenSkipped },
        stall: { added: stallAdded, skipped: stallSkipped },
        dish: { added: dishAdded, skipped: dishSkipped },
        normalDish: { added: normalDishAdded, skipped: normalDishSkipped },
        service: { added: serviceAdded, skipped: serviceSkipped }
      }
    }
  },

  _formatTimestamp(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const month = `${d.getMonth() + 1}`.padStart(2, '0')
    const date = `${d.getDate()}`.padStart(2, '0')
    const hour = `${d.getHours()}`.padStart(2, '0')
    const minute = `${d.getMinutes()}`.padStart(2, '0')
    return `${month}-${date} ${hour}:${minute}`
  }
}
