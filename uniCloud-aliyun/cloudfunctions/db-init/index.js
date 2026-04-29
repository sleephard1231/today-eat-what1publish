/**
 * 数据库初始化脚本
 * 将前端 common/data.js 中的 mock 数据写入 uniCloud 数据库
 *
 * 使用方式：
 * 1. 在 HBuilderX 中右键此文件 → 运行
 * 2. 或通过 uniCloud 控制台手动导入
 *
 * 注意：重复运行会检测重复数据，不会重复插入
 */

const db = uniCloud.database()

// ====== 校园数据 ======
const campusesData = [
  {
    _id: 'gzcc',
    name: '广州商学院',
    shortName: '广商',
    campusTag: '',
    district: '广州',
    specialties: ['煲仔饭', '鸡腿饭', '汤粉', '糖水'],
    status: 'active'
  }
]

// ====== 饭堂数据 ======
const canteensData = [
  { _id: 'gzcc-tongde', campusName: '广州商学院', name: '同德', remark: '饭堂档口区', sort: 1, status: 'active' },
  { _id: 'gzcc-xingfu', campusName: '广州商学院', name: '幸福', remark: '人气快餐窗口', sort: 2, status: 'active' },
  { _id: 'gzcc-ganen', campusName: '广州商学院', name: '感恩', remark: '盖饭、粉面、小炒', sort: 3, status: 'active' },
  { _id: 'gzcc-tongle', campusName: '广州商学院', name: '同乐', remark: '套餐、炖汤、热菜', sort: 4, status: 'active' },
  { _id: 'gzcc-tongxin', campusName: '广州商学院', name: '同心', remark: '轻食、小碗菜、简餐', sort: 5, status: 'active' },
  { _id: 'gzcc-snack', campusName: '广州商学院', name: '小吃街', remark: '夜宵、小吃、饮品', sort: 6, status: 'active' },
  { _id: 'gzcc-other', campusName: '广州商学院', name: '其他', remark: '临时开放窗口 / 其他区域', sort: 99, status: 'active' }
]

// ====== 档口数据（示例：广州商学院同德饭堂） ======
const stallsData = [
  { _id: 'gzcc-tongde-01', canteenId: 'gzcc-tongde', name: '烧腊档', category: '烧腊', remark: '叉烧、烧鸭、白切鸡', sort: 1, status: 'active' },
  { _id: 'gzcc-tongde-02', canteenId: 'gzcc-tongde', name: '粉面档', category: '粉面', remark: '汤粉、炒粉、牛腩面', sort: 2, status: 'active' },
  { _id: 'gzcc-tongde-03', canteenId: 'gzcc-tongde', name: '小炒档', category: '小炒', remark: '现炒现做、家常菜', sort: 3, status: 'active' },
  { _id: 'gzcc-xingfu-01', canteenId: 'gzcc-xingfu', name: '快餐窗口', category: '快餐', remark: '套餐饭、盖浇饭', sort: 1, status: 'active' },
  { _id: 'gzcc-xingfu-02', canteenId: 'gzcc-xingfu', name: '粥粉档', category: '粥粉', remark: '皮蛋瘦肉粥、肠粉', sort: 2, status: 'active' },
  { _id: 'gzcc-ganen-01', canteenId: 'gzcc-ganen', name: '盖饭档', category: '盖饭', remark: '红烧牛腩饭、咖喱鸡饭', sort: 1, status: 'active' },
  { _id: 'gzcc-ganen-02', canteenId: 'gzcc-ganen', name: '糖水档', category: '糖水', remark: '杨枝甘露、红豆沙', sort: 2, status: 'active' }
]

// ====== 菜品数据（示例） ======
const dishesData = [
  // 同德 - 烧腊档
  { _id: 'gzcc-tongde-01-d01', stallId: 'gzcc-tongde-01', canteenId: 'gzcc-tongde', name: '蜜汁叉烧饭', category: '烧腊饭', tag: '人气', price: '15', vibe: '甜蜜满足', sort: 1, status: 'active' },
  { _id: 'gzcc-tongde-01-d02', stallId: 'gzcc-tongde-01', canteenId: 'gzcc-tongde', name: '白切鸡饭', category: '烧腊饭', tag: '经典', price: '14', vibe: '清爽嫩滑', sort: 2, status: 'active' },
  { _id: 'gzcc-tongde-01-d03', stallId: 'gzcc-tongde-01', canteenId: 'gzcc-tongde', name: '烧鸭饭', category: '烧腊饭', tag: '推荐', price: '14', vibe: '酥香带劲', sort: 3, status: 'active' },
  // 同德 - 粉面档
  { _id: 'gzcc-tongde-02-d01', stallId: 'gzcc-tongde-02', canteenId: 'gzcc-tongde', name: '番茄肥牛米线', category: '汤粉', tag: '人气', price: '13', vibe: '酸甜开胃', sort: 1, status: 'active' },
  { _id: 'gzcc-tongde-02-d02', stallId: 'gzcc-tongde-02', canteenId: 'gzcc-tongde', name: '鲜虾云吞面', category: '面食', tag: '推荐', price: '12', vibe: '清爽不腻', sort: 2, status: 'active' },
  { _id: 'gzcc-tongde-02-d03', stallId: 'gzcc-tongde-02', canteenId: 'gzcc-tongde', name: '菌菇鸡汤粉', category: '汤粉', tag: '新品', price: '12', vibe: '温柔治愈', sort: 3, status: 'active' },
  // 同德 - 小炒档
  { _id: 'gzcc-tongde-03-d01', stallId: 'gzcc-tongde-03', canteenId: 'gzcc-tongde', name: '香辣麻辣香锅', category: '小炒', tag: '人气', price: '18', vibe: '能量爆棚', sort: 1, status: 'active' },
  // 幸福 - 快餐窗口
  { _id: 'gzcc-xingfu-01-d01', stallId: 'gzcc-xingfu-01', canteenId: 'gzcc-xingfu', name: '炙烤照烧鸡腿饭', category: '快餐', tag: '推荐', price: '13', vibe: '高能顶饱', sort: 1, status: 'active' },
  { _id: 'gzcc-xingfu-01-d02', stallId: 'gzcc-xingfu-01', canteenId: 'gzcc-xingfu', name: '红烧牛腩饭', category: '盖饭', tag: '经典', price: '15', vibe: '稳稳续航', sort: 2, status: 'active' },
  // 感恩 - 盖饭档
  { _id: 'gzcc-ganen-01-d01', stallId: 'gzcc-ganen-01', canteenId: 'gzcc-ganen', name: '芝士鸡排焗饭', category: '焗饭', tag: '新品', price: '16', vibe: '香浓满足', sort: 1, status: 'active' },
  { _id: 'gzcc-ganen-01-d02', stallId: 'gzcc-ganen-01', canteenId: 'gzcc-ganen', name: '韩式石锅拌饭', category: '拌饭', tag: '推荐', price: '14', vibe: '热闹满满', sort: 2, status: 'active' }
]

// ====== 校园服务数据 ======
const servicesData = [
  { _id: 'gzcc-laundry', campusName: '广州商学院', icon: '🧺', name: '洗衣机服务', remark: '宿舍洗护自助预约', sort: 1, status: 'active' },
  { _id: 'gzcc-shoes', campusName: '广州商学院', icon: '👟', name: '洗鞋服务', remark: '运动鞋清洗更省心', sort: 2, status: 'active' },
  { _id: 'gzcc-storage', campusName: '广州商学院', icon: '🧸', name: '宿舍收纳', remark: '桌面衣柜整理服务', sort: 3, status: 'active' },
  { _id: 'gzcc-cleaning', campusName: '广州商学院', icon: '🧹', name: '宿舍打扫', remark: '日常清洁和深度打扫', sort: 4, status: 'active' },
  { _id: 'gzcc-repair', campusName: '广州商学院', icon: '💻', name: '电脑维修', remark: '常见软件硬件排查', sort: 5, status: 'active' }
]

// ====== 执行初始化 ======
async function initDatabase() {
  const now = Date.now()
  const timestamp = { createdAt: now, updatedAt: now }

  console.log('开始初始化数据库...')

  // 1. 校园
  for (const item of campusesData) {
    const { data: exist } = await db.collection('eat-what-campuses').doc(item._id).get()
    if (!exist || !exist.length) {
      await db.collection('eat-what-campuses').add({ ...item, ...timestamp })
      console.log(`✅ 已添加校园: ${item.name}`)
    } else {
      console.log(`⏭️ 校园已存在: ${item.name}`)
    }
  }

  // 2. 饭堂
  for (const item of canteensData) {
    const { data: exist } = await db.collection('eat-what-canteens').doc(item._id).get()
    if (!exist || !exist.length) {
      await db.collection('eat-what-canteens').add({ ...item, ...timestamp })
      console.log(`✅ 已添加饭堂: ${item.name}`)
    } else {
      console.log(`⏭️ 饭堂已存在: ${item.name}`)
    }
  }

  // 3. 档口
  for (const item of stallsData) {
    const { data: exist } = await db.collection('eat-what-stalls').doc(item._id).get()
    if (!exist || !exist.length) {
      await db.collection('eat-what-stalls').add({ ...item, ...timestamp })
      console.log(`✅ 已添加档口: ${item.name}`)
    } else {
      console.log(`⏭️ 档口已存在: ${item.name}`)
    }
  }

  // 4. 菜品
  for (const item of dishesData) {
    const { data: exist } = await db.collection('eat-what-dishes').doc(item._id).get()
    if (!exist || !exist.length) {
      await db.collection('eat-what-dishes').add({ ...item, ...timestamp })
      console.log(`✅ 已添加菜品: ${item.name}`)
    } else {
      console.log(`⏭️ 菜品已存在: ${item.name}`)
    }
  }

  // 5. 校园服务
  for (const item of servicesData) {
    const { data: exist } = await db.collection('eat-what-services').doc(item._id).get()
    if (!exist || !exist.length) {
      await db.collection('eat-what-services').add({ ...item, ...timestamp })
      console.log(`✅ 已添加服务: ${item.name}`)
    } else {
      console.log(`⏭️ 服务已存在: ${item.name}`)
    }
  }

  console.log('数据库初始化完成!')
  return { code: 0, msg: '初始化完成' }
}

// 导出为云函数入口
exports.main = async (event, context) => {
  return await initDatabase()
}
