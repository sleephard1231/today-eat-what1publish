/**
 * co-campus 云对象
 * 负责校园入驻申请/审核、校园列表、饭堂、档口、菜品、校园服务
 *
 * 前端调用方式：
 *   const co = uniCloud.importObject('co-campus')
 *   const res = await co.getCanteensByCampus('广州商学院')
 */

// ⚠️ 上线前必须填入管理员 openid
const ADMIN_OPENIDS = [] // 如 ['oXXXXXXXXXXXX']

const db = uniCloud.database()
const applicationsCollection = db.collection('eat-what-applications')
const campusesCollection = db.collection('eat-what-campuses')
const canteensCollection = db.collection('eat-what-canteens')
const stallsCollection = db.collection('eat-what-stalls')
const dishesCollection = db.collection('eat-what-dishes')
const servicesCollection = db.collection('eat-what-services')

// 引入 co-user 的 token 验证
const usersCollection = db.collection('eat-what-users')

const TOKEN_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000

module.exports = {
  /**
   * 提交校园入驻申请
   * @param {string} token
   * @param {object} formData - { campusName, campusTag, city, contactName, contactPhone }
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async submitApplication(token, formData = {}) {
    const openid = await this._verifyToken(token)
    if (!openid) {
      return { code: -1, msg: '请先登录' }
    }

    if (!formData.campusName || !formData.contactPhone) {
      return { code: -1, msg: '请至少填写校园名称和邮箱' }
    }

    // 内容安全检查
    try {
      const coContent = uniCloud.importObject('co-content')
      const checkResult = await coContent.checkText(
        [formData.campusName, formData.campusTag, formData.contactName, formData.contactPhone].filter(Boolean).join(' '),
        1,
        openid
      )
      if (checkResult.code === 0 && checkResult.safe === false) {
        return { code: -1, msg: '提交内容包含违规信息，请修改后重试' }
      }
    } catch (err) {
      console.warn('[co-campus] content check failed, continue', err)
    }

    // 检查是否重复提交
    const { data: existApps } = await applicationsCollection.where({
      openid,
      campusName: formData.campusName,
      campusTag: formData.campusTag || '',
      status: db.command.in(['待审核', '已通过'])
    }).limit(1).get()

    if (existApps.length) {
      return { code: -1, msg: '你已经提交过该校园的入驻申请' }
    }

    const campusId = `campus-${Date.now()}`
    const now = Date.now()

    const addRes = await applicationsCollection.add({
      openid,
      campusId,
      campusName: formData.campusName,
      campusTag: formData.campusTag || '',
      city: formData.city || '',
      contactName: formData.contactName || '',
      contactPhone: formData.contactPhone || '',
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
   * 获取我的校园申请列表
   * @param {string} token
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getMyApplications(token) {
    const openid = await this._verifyToken(token)
    if (!openid) {
      return { code: -1, msg: '请先登录' }
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
        status: app.status,
        createdAt: this._formatTimestamp(app.createdAt)
      }))
    }
  },

  /**
   * 获取已入驻校园列表（公开接口，无需登录）
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getApprovedCampuses() {
    // 从 applications 取已通过的
    const { data: approvedApps } = await applicationsCollection
      .where({ status: '已通过' })
      .field({ campusName: true, campusTag: true, city: true, campusId: true })
      .get()

    // 从 campuses 表取 active 的
    const { data: activeCampuses } = await campusesCollection
      .where({ status: 'active' })
      .get()

    const campusList = []

    // 合并 campuses 表的数据
    activeCampuses.forEach((campus) => {
      campusList.push({
        id: campus._id,
        name: campus.name,
        shortName: campus.shortName || campus.name.slice(0, 4),
        campusTag: campus.campusTag || '',
        district: campus.district || '校园合作',
        specialties: campus.specialties || []
      })
    })

    // 合并申请通过的（如果不在 campuses 表里）
    const existNames = new Set(campusList.map((c) => c.name))
    approvedApps.forEach((app) => {
      if (!existNames.has(app.campusName)) {
        campusList.push({
          id: app.campusId,
          name: app.campusName,
          shortName: app.campusName.slice(0, 4),
          campusTag: app.campusTag || '',
          district: app.city || '校园合作',
          specialties: []
        })
      }
    })

    return { code: 0, data: campusList }
  },

  /**
   * 获取指定学校的饭堂列表
   * @param {string} campusName - 学校名称
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getCanteensByCampus(campusName) {
    if (!campusName) {
      return { code: -1, msg: '缺少学校名称' }
    }

    const { data: canteens } = await canteensCollection
      .where({ campusName, status: 'active' })
      .orderBy('sort', 'asc')
      .get()

    return {
      code: 0,
      data: canteens.map((c) => ({
        id: c._id,
        name: c.name,
        remark: c.remark || ''
      }))
    }
  },

  /**
   * 获取指定饭堂的档口列表（含菜品）
   * @param {string} canteenId - 饭堂ID
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getStallsByCanteen(canteenId) {
    if (!canteenId) {
      return { code: -1, msg: '缺少饭堂ID' }
    }

    const { data: stalls } = await stallsCollection
      .where({ canteenId, status: 'active' })
      .orderBy('sort', 'asc')
      .get()

    if (!stalls.length) {
      return { code: 0, data: [] }
    }

    // 批量查询所有档口的菜品
    const stallIds = stalls.map((s) => s._id)
    const { data: allDishes } = await dishesCollection
      .where({
        stallId: db.command.in(stallIds),
        status: 'active'
      })
      .orderBy('sort', 'asc')
      .get()

    // 按档口分组
    const dishesByStall = {}
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

    return {
      code: 0,
      data: stalls.map((s) => ({
        id: s._id,
        name: s.name,
        category: s.category || '',
        remark: s.remark || '',
        dishes: dishesByStall[s._id] || []
      }))
    }
  },

  /**
   * 获取指定学校的完整饭堂数据（饭堂+档口+菜品）
   * @param {string} campusName - 学校名称
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getCanteenFullData(campusName) {
    if (!campusName) {
      return { code: -1, msg: '缺少学校名称' }
    }

    // 1. 获取饭堂列表
    const { data: canteens } = await canteensCollection
      .where({ campusName, status: 'active' })
      .orderBy('sort', 'asc')
      .get()

    if (!canteens.length) {
      return { code: 0, data: [] }
    }

    const canteenIds = canteens.map((c) => c._id)

    // 2. 获取所有档口
    const { data: stalls } = await stallsCollection
      .where({
        canteenId: db.command.in(canteenIds),
        status: 'active'
      })
      .orderBy('sort', 'asc')
      .get()

    const stallIds = stalls.map((s) => s._id)

    // 3. 获取所有菜品
    let allDishes = []
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

    // 按档口分组菜品
    const dishesByStall = {}
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

    // 按饭堂分组档口
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

    // 组装最终结果
    return {
      code: 0,
      data: canteens.map((c) => ({
        id: c._id,
        name: c.name,
        remark: c.remark || '',
        stalls: stallsByCanteen[c._id] || []
      }))
    }
  },

  /**
   * 获取指定学校的校园服务列表
   * @param {string} campusName - 学校名称
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getServicesByCampus(campusName) {
    if (!campusName) {
      return { code: -1, msg: '缺少学校名称' }
    }

    const { data: services } = await servicesCollection
      .where({ campusName, status: 'active' })
      .orderBy('sort', 'asc')
      .get()

    return {
      code: 0,
      data: services.map((s) => ({
        id: s._id,
        icon: s.icon || '📋',
        name: s.name,
        remark: s.remark || '',
        externalUrl: s.externalUrl || ''
      }))
    }
  },

  // ====== 档口 CRUD ======

  /**
   * 添加档口（商铺）
   * @param {string} canteenId - 饭堂ID
   * @param {object} stallData - { name, category, remark }
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async addStall(token, canteenId, stallData = {}) {
    const openid = await this._verifyAdmin(token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!canteenId) {
      return { code: -1, msg: '缺少饭堂ID' }
    }
    if (!stallData.name) {
      return { code: -1, msg: '请输入商铺名称' }
    }

    // 获取当前最大 sort
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
   * 更新档口信息
   * @param {string} canteenId - 饭堂ID（用于验证归属）
   * @param {string} stallId - 档口ID
   * @param {object} stallData - { name, category, remark }
   * @returns {{ code: number, msg?: string }}
   */
  async updateStall(token, canteenId, stallId, stallData = {}) {
    const openid = await this._verifyAdmin(token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!canteenId || !stallId) {
      return { code: -1, msg: '缺少参数' }
    }

    // 验证档口属于该饭堂
    const { data: stalls } = await stallsCollection
      .where({ _id: stallId, canteenId, status: 'active' })
      .limit(1)
      .get()

    if (!stalls.length) {
      return { code: -1, msg: '档口不存在或无权操作' }
    }

    const updateData = { updatedAt: Date.now() }
    if (stallData.name !== undefined) updateData.name = stallData.name
    if (stallData.category !== undefined) updateData.category = stallData.category
    if (stallData.remark !== undefined) updateData.remark = stallData.remark

    await stallsCollection.doc(stallId).update(updateData)

    return { code: 0, msg: '更新成功' }
  },

  /**
   * 删除档口（软删除，同时删除其下所有菜品）
   * @param {string} canteenId - 饭堂ID
   * @param {string} stallId - 档口ID
   * @returns {{ code: number, msg?: string }}
   */
  async deleteStall(token, canteenId, stallId) {
    const openid = await this._verifyAdmin(token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!canteenId || !stallId) {
      return { code: -1, msg: '缺少参数' }
    }

    // 验证档口属于该饭堂
    const { data: stalls } = await stallsCollection
      .where({ _id: stallId, canteenId, status: 'active' })
      .limit(1)
      .get()

    if (!stalls.length) {
      return { code: -1, msg: '档口不存在或无权操作' }
    }

    const now = Date.now()

    // 软删除档口
    await stallsCollection.doc(stallId).update({
      status: 'inactive',
      updatedAt: now
    })

    // 软删除该档口下所有菜品
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

    return { code: 0, msg: '删除成功' }
  },

  // ====== 菜品 CRUD ======

  /**
   * 获取指定档口的菜品列表
   * @param {string} stallId - 档口ID
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getDishesByStall(stallId) {
    if (!stallId) {
      return { code: -1, msg: '缺少档口ID' }
    }

    const { data: dishes } = await dishesCollection
      .where({ stallId, status: 'active' })
      .orderBy('sort', 'asc')
      .get()

    return {
      code: 0,
      data: dishes.map((d) => ({
        id: d._id,
        name: d.name,
        category: d.category || '',
        tag: d.tag || '',
        price: d.price || '',
        vibe: d.vibe || ''
      }))
    }
  },

  /**
   * 添加菜品
   * @param {string} stallId - 档口ID
   * @param {string} canteenId - 饭堂ID（冗余字段）
   * @param {object} dishData - { name, category, tag, price, vibe }
   * @returns {{ code: number, data?: object, msg?: string }}
   */
  async addDish(token, stallId, canteenId, dishData = {}) {
    const openid = await this._verifyAdmin(token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!stallId) {
      return { code: -1, msg: '缺少档口ID' }
    }
    if (!dishData.name) {
      return { code: -1, msg: '请输入菜品名称' }
    }

    // 获取当前最大 sort
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
   * 更新菜品信息
   * @param {string} stallId - 档口ID（验证归属）
   * @param {string} dishId - 菜品ID
   * @param {object} dishData - { name, category, tag, price, vibe }
   * @returns {{ code: number, msg?: string }}
   */
  async updateDish(token, stallId, dishId, dishData = {}) {
    const openid = await this._verifyAdmin(token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!stallId || !dishId) {
      return { code: -1, msg: '缺少参数' }
    }

    // 验证菜品属于该档口
    const { data: dishes } = await dishesCollection
      .where({ _id: dishId, stallId, status: 'active' })
      .limit(1)
      .get()

    if (!dishes.length) {
      return { code: -1, msg: '菜品不存在或无权操作' }
    }

    const updateData = { updatedAt: Date.now() }
    if (dishData.name !== undefined) updateData.name = dishData.name
    if (dishData.category !== undefined) updateData.category = dishData.category
    if (dishData.tag !== undefined) updateData.tag = dishData.tag
    if (dishData.price !== undefined) updateData.price = dishData.price
    if (dishData.vibe !== undefined) updateData.vibe = dishData.vibe

    await dishesCollection.doc(dishId).update(updateData)

    return { code: 0, msg: '更新成功' }
  },

  /**
   * 删除菜品（软删除）
   * @param {string} stallId - 档口ID
   * @param {string} dishId - 菜品ID
   * @returns {{ code: number, msg?: string }}
   */
  async deleteDish(token, stallId, dishId) {
    const openid = await this._verifyAdmin(token)
    if (!openid) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!stallId || !dishId) {
      return { code: -1, msg: '缺少参数' }
    }

    // 验证菜品属于该档口
    const { data: dishes } = await dishesCollection
      .where({ _id: dishId, stallId, status: 'active' })
      .limit(1)
      .get()

    if (!dishes.length) {
      return { code: -1, msg: '菜品不存在或无权操作' }
    }

    await dishesCollection.doc(dishId).update({
      status: 'inactive',
      updatedAt: Date.now()
    })

    return { code: 0, msg: '删除成功' }
  },

  // ====== 管理员接口 ======

  /**
   * 获取待审核申请列表（管理员）
   * @param {string} token
   * @returns {{ code: number, data?: Array, msg?: string }}
   */
  async getPendingApplications(token) {
    const openid = await this._verifyToken(token)
    if (!openid || !ADMIN_OPENIDS.includes(openid)) {
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
   * 审核申请（管理员）
   * @param {string} token
   * @param {string} applicationId - 申请记录ID
   * @param {string} action - 'approve' 或 'reject'
   * @param {string} note - 审核备注
   * @returns {{ code: number, msg?: string }}
   */
  async reviewApplication(token, applicationId, action, note = '') {
    const openid = await this._verifyToken(token)
    if (!openid || !ADMIN_OPENIDS.includes(openid)) {
      return { code: -1, msg: '无管理权限' }
    }

    if (!['approve', 'reject'].includes(action)) {
      return { code: -1, msg: '操作无效' }
    }

    const status = action === 'approve' ? '已通过' : '已拒绝'

    await applicationsCollection.doc(applicationId).update({
      status,
      reviewNote: note,
      reviewedBy: openid,
      reviewedAt: Date.now(),
      updatedAt: Date.now()
    })

    // 如果通过，自动创建校园记录（如不存在）
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
            district: appData.city || '校园合作',
            specialties: [],
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now()
          })
        }
      }
    }

    return { code: 0, msg: status === '已通过' ? '已通过' : '已拒绝' }
  },

  // ====== 内部方法 ======

  /**
   * 验证 token
   * @private
   */
  async isAdmin(token) {
    const openid = await this._verifyAdmin(token)
    return { code: 0, data: { isAdmin: !!openid } }
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
    const openid = await this._verifyToken(token)
    if (!openid || !ADMIN_OPENIDS.includes(openid)) {
      return null
    }
    return openid
  },

  /**
   * 格式化时间戳
   * @private
   */
  /**
   * 一键初始化 admin 自定义菜单（插入到 opendb-admin-menus 表）
   * @returns {{ code: number, msg: string, data?: object }}
   */
  async initAdminMenus() {
    const menusTable = db.collection('opendb-admin-menus')
    const menus = [
      { menu_id: 'canteen_management', name: '饭堂管理', icon: 'admin-icons-fl-xitong', url: '', sort: 500, parent_id: '', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-canteen-mgmt' },
      { menu_id: 'campus_list', name: '校园管理', icon: 'admin-icons-manager-app', url: '/pages/eat-what/campus/list', sort: 510, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-campus-list' },
      { menu_id: 'canteen_list', name: '饭堂管理', icon: 'admin-icons-manager-app', url: '/pages/eat-what/canteen/list', sort: 520, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-canteen-list' },
      { menu_id: 'stall_list', name: '商铺管理', icon: 'admin-icons-manager-app', url: '/pages/eat-what/stall/list', sort: 530, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-stall-list' },
      { menu_id: 'dish_list', name: '菜品管理', icon: 'admin-icons-manager-tag', url: '/pages/eat-what/dish/list', sort: 540, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-dish-list' },
      { menu_id: 'application_management', name: '入驻审核', icon: 'admin-icons-manager-permission', url: '/pages/eat-what/application/list', sort: 550, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-application-mgmt' },
      { menu_id: 'service_management', name: '校园服务', icon: 'admin-icons-manager-role', url: '/pages/eat-what/service/list', sort: 560, parent_id: 'canteen_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-service-mgmt' },
      { menu_id: 'user_management', name: '用户管理', icon: 'admin-icons-manager-user', url: '', sort: 600, parent_id: '', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-user-mgmt' },
      { menu_id: 'user_list', name: '用户列表', icon: 'admin-icons-manager-user', url: '/pages/eat-what/user/list', sort: 610, parent_id: 'user_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-user-list' },
      { menu_id: 'history_list', name: '推荐记录', icon: 'admin-icons-safety', url: '/pages/eat-what/history/list', sort: 620, parent_id: 'user_management', permission: [], enable: true, create_date: Date.now(), _id: 'eat-what-history-list' }
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
   * 修复 admin 自定义菜单的 URL（将旧路径 /pages/xxx/list 更新为 /pages/eat-what/xxx/list）
   * 用于数据库中已存在旧路径菜单记录的情况
   * @returns {{ code: number, msg: string, data?: object }}
   */
  async fixAdminMenusUrl() {
    const menusTable = db.collection('opendb-admin-menus')

    // 定义正确的 URL 映射（_id -> 正确的新 URL）
    const correctUrls = {
      'eat-what-campus-list': '/pages/eat-what/campus/list',
      'eat-what-canteen-list': '/pages/eat-what/canteen/list',
      'eat-what-stall-list': '/pages/eat-what/stall/list',
      'eat-what-dish-list': '/pages/eat-what/dish/list',
      'eat-what-application-mgmt': '/pages/eat-what/application/list',
      'eat-what-service-mgmt': '/pages/eat-what/service/list',
      'eat-what-user-list': '/pages/eat-what/user/list',
      'eat-what-history-list': '/pages/eat-what/history/list'
    }

    // 父级菜单不需要 URL
    const parentIds = ['eat-what-canteen-mgmt', 'eat-what-user-mgmt']

    let updated = 0
    let unchanged = 0
    const details = []

    for (const [menuId, correctUrl] of Object.entries(correctUrls)) {
      const { data } = await menusTable.where({ _id: menuId }).limit(1).get()
      if (!data.length) {
        // 记录不存在，跳过
        unchanged++
        details.push(`${menuId}: 不存在`)
        continue
      }

      const record = data[0]
      if (record.url === correctUrl) {
        unchanged++
        details.push(`${menuId}: 已是正确路径`)
        continue
      }

      // 更新为正确 URL
      await menusTable.doc(menuId).update({
        url: correctUrl,
        updatedAt: Date.now()
      })
      updated++
      details.push(`${menuId}: ${record.url || '(空)'} → ${correctUrl}`)
    }

    return {
      code: 0,
      msg: `菜单 URL 修复完成：更新 ${updated} 条，无需修改 ${unchanged} 条`,
      data: { updated, unchanged, details }
    }
  },

  /**
   * 综合诊断：检测前后端连通性、数据库表、菜单配置
   * @returns {{ code: number, data: object, msg: string }}
   */
  async runDiagnostics() {
    const results = {
      timestamp: new Date().toISOString(),
      cloudObject: 'co-campus',
      database: {},
      adminMenus: {},
      summary: { total: 0, pass: 0, fail: 0 }
    }

    // 1. 检测各数据库表连通性
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

    // 2. 检测 admin 菜单配置
    const menusTable = db.collection('opendb-admin-menus')
    const expectedMenus = [
      { _id: 'eat-what-canteen-mgmt', name: '饭堂管理(父级)', expectedUrl: '' },
      { _id: 'eat-what-campus-list', name: '校园管理', expectedUrl: '/pages/eat-what/campus/list' },
      { _id: 'eat-what-canteen-list', name: '饭堂管理', expectedUrl: '/pages/eat-what/canteen/list' },
      { _id: 'eat-what-stall-list', name: '商铺管理', expectedUrl: '/pages/eat-what/stall/list' },
      { _id: 'eat-what-dish-list', name: '菜品管理', expectedUrl: '/pages/eat-what/dish/list' },
      { _id: 'eat-what-application-mgmt', name: '入驻审核', expectedUrl: '/pages/eat-what/application/list' },
      { _id: 'eat-what-service-mgmt', name: '校园服务', expectedUrl: '/pages/eat-what/service/list' },
      { _id: 'eat-what-user-mgmt', name: '用户管理(父级)', expectedUrl: '' },
      { _id: 'eat-what-user-list', name: '用户列表', expectedUrl: '/pages/eat-what/user/list' },
      { _id: 'eat-what-history-list', name: '推荐记录', expectedUrl: '/pages/eat-what/history/list' }
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
            currentUrl: data[0].url || '(空)',
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
   * 初始化基础数据（校园、饭堂、服务）—— 将 common/data.js 的预设数据写入数据库
   * @returns {{ code: number, data?: object, msg: string }}
   */
  async initBaseData() {
    const now = Date.now()
    let campusAdded = 0, campusSkipped = 0
    let canteenAdded = 0, canteenSkipped = 0
    let serviceAdded = 0, serviceSkipped = 0
    let stallAdded = 0, stallSkipped = 0
    let dishAdded = 0, dishSkipped = 0

    // ====== 1. 初始化校园表 ======
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

    // ====== 2. 初始化饭堂表 ======
    const canteenList = [
      { _id: 'gzcc-tongde', campusName: '广州商学院', name: '同德', remark: '饭堂档口区', status: 'active', sort: 1 },
      { _id: 'gzcc-xingfu', campusName: '广州商学院', name: '幸福', remark: '人气快餐窗口', status: 'active', sort: 2 },
      { _id: 'gzcc-ganen', campusName: '广州商学院', name: '感恩', remark: '盖饭、粉面、小炒', status: 'active', sort: 3 },
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

    // ====== 3. 初始化商铺表（同德饭堂的档口） ======
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

    // ====== 4. 初始化菜品表 ======
    const dishList = [
      // 大众食堂
      { _id: 'dish-dz-01', stallId: 'gzcc-tongde-dazhong', name: '红烧肉饭', category: '主食', price: '12', vibe: '下饭', tag: '人气', sort: 1 },
      { _id: 'dish-dz-02', stallId: 'gzcc-tongde-dazhong', name: '番茄炒蛋饭', category: '主食', price: '10', vibe: '清淡', tag: '', sort: 2 },
      { _id: 'dish-dz-03', stallId: 'gzcc-tongde-dazhong', name: '鸡腿饭', category: '主食', price: '13', vibe: '满足', tag: '推荐', sort: 3 },
      { _id: 'dish-dz-04', stallId: 'gzcc-tongde-dazhong', name: '青椒肉丝饭', category: '主食', price: '11', vibe: '微辣', tag: '', sort: 4 },
      { _id: 'dish-dz-05', stallId: 'gzcc-tongde-dazhong', name: '麻婆豆腐饭', category: '主食', price: '10', vibe: '辣', tag: '', sort: 5 },
      // 蜜雪冰城
      { _id: 'dish-mx-01', stallId: 'gzcc-tongde-mixue', name: '冰鲜柠檬水', category: '饮品', price: '4', vibe: '清爽', tag: '人气', sort: 1 },
      { _id: 'dish-mx-02', stallId: 'gzcc-tongde-mixue', name: '珍珠奶茶', category: '饮品', price: '6', vibe: '香甜', tag: '推荐', sort: 2 },
      { _id: 'dish-mx-03', stallId: 'gzcc-tongde-mixue', name: '冰淇淋', category: '甜品', price: '3', vibe: '冰凉', tag: '', sort: 3 },
      { _id: 'dish-mx-04', stallId: 'gzcc-tongde-mixue', name: '满杯百香果', category: '饮品', price: '7', vibe: '酸甜', tag: '新品', sort: 4 },
      // 云吞
      { _id: 'dish-yt-01', stallId: 'gzcc-tongde-yuntun', name: '鲜肉云吞', category: '粉面', price: '10', vibe: '鲜香', tag: '人气', sort: 1 },
      { _id: 'dish-yt-02', stallId: 'gzcc-tongde-yuntun', name: '鲜虾云吞', category: '粉面', price: '13', vibe: '鲜美', tag: '推荐', sort: 2 },
      { _id: 'dish-yt-03', stallId: 'gzcc-tongde-yuntun', name: '云吞面', category: '粉面', price: '12', vibe: '饱腹', tag: '', sort: 3 },
      // 饺子馆
      { _id: 'dish-jz-01', stallId: 'gzcc-tongde-jiaozi', name: '白菜猪肉饺', category: '面食', price: '10', vibe: '家常', tag: '人气', sort: 1 },
      { _id: 'dish-jz-02', stallId: 'gzcc-tongde-jiaozi', name: '韭菜鸡蛋饺', category: '面食', price: '10', vibe: '鲜香', tag: '', sort: 2 },
      { _id: 'dish-jz-03', stallId: 'gzcc-tongde-jiaozi', name: '酸辣水饺', category: '面食', price: '12', vibe: '酸辣', tag: '推荐', sort: 3 },
      { _id: 'dish-jz-04', stallId: 'gzcc-tongde-jiaozi', name: '蒸饺拼盘', category: '面食', price: '15', vibe: '丰富', tag: '新品', sort: 4 },
      // 烧腊档
      { _id: 'dish-sl-01', stallId: 'gzcc-tongde-shaola', name: '叉烧饭', category: '烧腊', price: '15', vibe: '甜香', tag: '人气', sort: 1 },
      { _id: 'dish-sl-02', stallId: 'gzcc-tongde-shaola', name: '烧鸭饭', category: '烧腊', price: '15', vibe: '油香', tag: '推荐', sort: 2 },
      { _id: 'dish-sl-03', stallId: 'gzcc-tongde-shaola', name: '白切鸡饭', category: '烧腊', price: '16', vibe: '清淡', tag: '', sort: 3 },
      // 小炒窗口
      { _id: 'dish-xc-01', stallId: 'gzcc-tongde-xiaochao', name: '辣椒炒肉', category: '小炒', price: '14', vibe: '辣', tag: '人气', sort: 1 },
      { _id: 'dish-xc-02', stallId: 'gzcc-tongde-xiaochao', name: '酸菜鱼', category: '小炒', price: '18', vibe: '酸辣', tag: '推荐', sort: 2 },
      { _id: 'dish-xc-03', stallId: 'gzcc-tongde-xiaochao', name: '蒜蓉炒时蔬', category: '小炒', price: '10', vibe: '清淡', tag: '', sort: 3 }
    ]

    for (const d of dishList) {
      const { data } = await dishesCollection.where({ _id: d._id }).limit(1).get()
      if (!data.length) {
        await dishesCollection.add({ ...d, status: 'active', createdAt: now, updatedAt: now })
        dishAdded++
      } else {
        dishSkipped++
      }
    }

    // ====== 5. 初始化服务表 ======
    const serviceList = [
      { _id: 'gzcc-laundry', campusName: '广州商学院', icon: '🧺', name: '洗衣机服务', remark: '宿舍洗护自助预约', enable: true, sort: 1 },
      { _id: 'gzcc-shoes', campusName: '广州商学院', icon: '👟', name: '洗鞋服务', remark: '运动鞋清洗更省心', enable: true, sort: 2 },
      { _id: 'gzcc-storage', campusName: '广州商学院', icon: '🧸', name: '宿舍收纳', remark: '桌面衣柜整理服务', enable: true, sort: 3 },
      { _id: 'gzcc-cleaning', campusName: '广州商学院', icon: '🧹', name: '宿舍打扫', remark: '日常清洁和深度打扫', enable: true, sort: 4 },
      { _id: 'gzcc-repair', campusName: '广州商学院', icon: '💻', name: '电脑维修', remark: '常见软件硬件排查', enable: true, sort: 5 }
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

    // ====== 6. 隐藏独立菜品管理菜单（已合并到商铺管理） ======
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
      msg: `基础数据初始化完成（含商铺+菜品数据，菜品菜单已合并到商铺管理）`,
      data: {
        campus: { added: campusAdded, skipped: campusSkipped },
        canteen: { added: canteenAdded, skipped: canteenSkipped },
        stall: { added: stallAdded, skipped: stallSkipped },
        dish: { added: dishAdded, skipped: dishSkipped },
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
