# 开发任务：接入后台菜品库 + AI 二选一推荐（方案 B）

## 项目背景

- 项目类型：uni-app + Vue 3 微信小程序
- 后端：uniCloud（阿里云服务空间）
- 产品："今天吃什么"美食推荐小程序，基于 MBTI + 星座做个性化推荐
- 现有云对象：`co-user`（用户）、`co-campus`（校园）、`co-content`（内容安全）、`co-ai`（通义千问 AI）
- 前端适配层：`utils/cloud.js`
- 状态管理：`utils/app-state.js`（本地存储 + 云端同步）

## 现状说明

当前食物池完全硬编码在前端 `common/data.js` 中：
- `genericFoods`：普通版只有 10 道虚构菜品
- `presetCampuses[0].specialties`：校园版只有 4 道招牌菜
- `drawMealResult()` 是同步函数，直接从池中随机抽 1 道菜返回
- AI 仅用于生成推荐理由文案（`aiGenerateReasonForMeal`），不参与选菜

## 目标

把食物池迁移到 uniCloud 数据库后台管理，同时升级为**方案 B**的 AI 推荐逻辑：

> 前端从食物池随机抽 3 个候选 → 立即展示第 1 个 + 模板理由 → 后台异步调 AI → AI 从 3 个里挑出最适合的并写推荐理由 → 如果 AI 选了另一个，平滑替换菜品和理由

## 一、数据库设计

### 集合 1：`eat-what-dishes`（菜品库）

```json
{
  "_id": "自动生成",
  "name": "番茄肥牛米线",        // 菜名
  "vibe": "热乎又治愈",          // 氛围词，用于 UI 展示
  "category": "粉面",            // 分类：粉面/米饭/轻食/小吃/甜品/饮品
  "tags": ["汤类", "牛肉"],      // 标签数组
  "mode": "campus",              // normal（普通版） | campus（校园版）
  "campusId": "gzcc",            // 校园版必填，关联学校
  "canteenId": "gzcc-tongde",    // 校园版必填，关联饭堂
  "stallName": "重庆小面档口",    // 校园版：具体档口名
  "isActive": true,              // 上架/下架
  "sortOrder": 1,
  "createdAt": "时间戳"
}
```

**普通版菜品示例**：
```json
{
  "name": "韩式石锅拌饭",
  "vibe": "热闹满满",
  "category": "米饭",
  "mode": "normal",
  "campusId": "",
  "canteenId": "",
  "stallName": "",
  "isActive": true
}
```

### 集合 2：`eat-what-canteens`（扩展已有饭堂库）

```json
{
  "_id": "gzcc-tongde",
  "campusId": "gzcc",
  "name": "同德",
  "remark": "饭堂档口区",
  "stalls": ["重庆小面档口", "烧腊档", "快餐窗口"]
}
```

## 二、云对象扩展

在 `uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js` 中新增以下方法：

### 1. `getMenuByCanteen(campusId, canteenId)`
- 查询 `eat-what-dishes` 集合
- 条件：`mode: 'campus'`, `campusId`, `canteenId`, `isActive: true`
- 返回菜品数组

### 2. `getNormalDishes()`
- 查询 `eat-what-dishes` 集合
- 条件：`mode: 'normal'`, `isActive: true`
- 返回普通版菜品数组

### 3. `getCanteensByCampus(campusName)`（已有，可复用）

## 三、前端适配层扩展

在 `utils/cloud.js` 中新增：

```js
// 获取指定饭堂的菜品列表（校园版）
export async function getCampusMenu(campusId, canteenId) {
  // 调用 co-campus.getMenuByCanteen()
  // 失败返回空数组，不抛异常
}

// 获取普通版菜品列表
export async function getNormalMenu() {
  // 调用 co-campus.getNormalDishes()
  // 失败返回空数组
}
```

## 四、核心逻辑改造

### 4.1 `utils/app-state.js` 改造要点

#### 新增云端菜品缓存
```js
let cloudMenuCache = {
  normal: null,        // { fetchedAt: timestamp, data: [] }
  campus: {}           // { 'campusId:canteenId': { fetchedAt, data } }
}
const MENU_CACHE_TTL = 1000 * 60 * 5  // 5分钟缓存
```

#### 新增 `fetchNormalFoodPool()`
- 优先从云端获取普通版菜品
- 命中缓存则直接返回
- 云端失败回退到本地 `genericFoods`

#### 新增 `fetchCampusFoodPool(campusId, canteenId)`
- 优先从云端获取指定饭堂菜品
- 命中缓存则直接返回
- 云端失败回退到本地 `buildCampusFoods()`

#### 改造 `drawMealResult()` → `drawMealResultAsync()`
- 从**同步**改为**异步**
- 根据 `state.mode` 获取对应食物池（优先云端）
- **普通版**：调 `fetchNormalFoodPool()`
- **校园版**：获取用户选中的饭堂列表，对每个饭堂调 `fetchCampusFoodPool()`，合并结果
- 从食物池中随机抽 **3 个不重复候选**
- 返回 `{ exhausted, state, candidates }`（注意不是直接返回 result）

#### 校园版候选分散策略
- 抽 3 个候选时，尽量让它们来自不同饭堂
- 避免 3 个都在同一家饭堂的情况

#### 新增 `aiPickFromCandidates({ candidates, state, fortune })`
- 构造 Prompt，传给 `co-ai`
- Prompt 包含：用户 MBTI、星座、今日运势、3 个候选的完整信息
- 要求 AI 返回 JSON 格式：`{ choice: 0|1|2, reason: "..." }`
- AI 调用失败则返回 `{ choice: 0, reason: buildReason(...), isAI: false }`

#### 保留 `buildReason()` 作为模板兜底

### 4.2 `pages/index/index.vue` 改造要点

#### 改造 `handleDrawMeal()`

**当前逻辑**：
```js
function handleDrawMeal() {
  const drawResult = drawMealResult()  // 同步
  popupResult.value = drawResult.result
  // ...
}
```

**目标逻辑**：
```js
async function handleDrawMeal() {
  // 1. 异步抽 3 个候选
  const { candidates, state: newState } = await drawMealResultAsync()
  
  // 2. 立即展示第 1 个候选 + 模板理由（用户无等待）
  popupResult.value = buildResultFromCandidate(candidates[0])
  isDrawing.value = true
  
  // 3. 动效结束后展示弹窗
  setTimeout(() => {
    isDrawing.value = false
    showResultPopup.value = true
  }, 1500)
  
  // 4. 后台异步调 AI
  const aiPick = await aiPickFromCandidates({
    candidates,
    state: newState,
    fortune: fortune.value
  })
  
  // 5. 根据 AI 结果更新展示
  if (aiPick.choice !== 0 && aiPick.isAI) {
    // AI 选了另一个候选，平滑替换
    const chosen = candidates[aiPick.choice]
    popupResult.value = {
      ...popupResult.value,
      mealName: chosen.name,
      vibe: chosen.vibe,
      canteen: chosen.canteen,
      reason: aiPick.reason
    }
  } else if (aiPick.isAI) {
    // AI 同意第 1 个，只替换理由
    popupResult.value = {
      ...popupResult.value,
      reason: aiPick.reason
    }
  }
}
```

#### AI 替换时的 UI 处理
- 如果 AI 换了菜品：加一个轻量过渡动效（如 200ms 淡入）
- 如果 AI 只换了理由：理由文本直接替换，不需要动效
- 用户感知应该是"文案变聪明了"或"AI 帮我挑了更合适的"，而不是突兀跳动

## 五、AI Prompt 设计

### 输入参数
```json
{
  "mbti": "ENFJ",
  "zodiac": "白羊座",
  "mode": "campus",
  "appetite": "旺盛",
  "energy": "充沛",
  "luck": "小吉",
  "candidates": [
    { "index": 0, "name": "番茄肥牛米线", "vibe": "热乎又治愈", "canteen": "同德" },
    { "index": 1, "name": "黑椒牛柳意面", "vibe": "松弛感在线", "canteen": "云山食堂" },
    { "index": 2, "name": "芝士鸡排焗饭", "vibe": "香浓又有仪式感", "canteen": "同心" }
  ]
}
```

### Prompt 模板
```
你是一位懂 MBTI 和星座的美食推荐助手。

用户画像：
- MBTI：{mbti}
- 星座：{zodiac}
- 今日状态：食欲{appetite}、能量{energy}、运势{luck}

候选菜品（3选1）：
{candidates[0].index}. {candidates[0].canteen} · {candidates[0].name} —— {candidates[0].vibe}
{candidates[1].index}. {candidates[1].canteen} · {candidates[1].name} —— {candidates[1].vibe}
{candidates[2].index}. {candidates[2].canteen} · {candidates[2].name} —— {candidates[2].vibe}

请结合用户画像，从3个候选里挑出最适合今天的一个。
必须返回以下JSON格式，不要加其他内容：
{"choice": 0, "reason": "40字左右的推荐理由，语气像朋友在聊天"}
```

## 六、降级策略（重要）

| 场景 | 处理 | 用户感知 |
|------|------|---------|
| 云端菜品获取成功 | 使用云端菜品 | 正常 |
| 云端菜品为空 | 回退本地 `genericFoods` / `specialties` | 正常 |
| 云端菜品获取失败 | 回退本地，console.warn | 正常 |
| AI 调用成功，选了第1个 | 只替换理由 | "理由写得更好" |
| AI 调用成功，选了第2/3个 | 平滑切换菜品+理由 | "AI 帮我换了更好的" |
| AI 调用失败 | 保持第1个 + 模板理由 | 完全无感知 |
| AI 返回格式错误 | 同上 | 完全无感知 |

## 七、文件改动清单

### 后端（uniCloud）
1. `uniCloud-aliyun/database/eat-what-dishes.schema.json` — 新增数据库 schema
2. `uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js` — 新增 `getMenuByCanteen`、`getNormalDishes`

### 前端
3. `utils/cloud.js` — 新增 `getCampusMenu()`、`getNormalMenu()`
4. `utils/app-state.js` — 
   - 新增云端菜品缓存
   - 新增 `fetchNormalFoodPool()`、`fetchCampusFoodPool()`
   - 改造 `drawMealResult()` → `drawMealResultAsync()`
   - 新增 `aiPickFromCandidates()`
5. `pages/index/index.vue` — 改造 `handleDrawMeal()` 支持异步 + AI 替换
6. `common/data.js` — 保留 `genericFoods` 作为最终兜底

## 八、初始化数据

开发完成后，需要把现有的本地菜品数据导入数据库：

- `genericFoods`（10 道）→ 以 `mode: 'normal'` 导入
- `presetCampuses[0].specialties`（4 道）→ 以 `mode: 'campus'`、`campusId: 'gzcc'` 导入，绑定到对应饭堂

## 九、约束条件

1. **命名规范**：变量用 camelCase，常量用 UPPER_SNAKE_CASE
2. **错误处理**：云端失败必须 soft fail，用 `console.warn`，不要弹窗阻塞用户
3. **缓存策略**：菜品缓存 5 分钟，避免频繁请求
4. **不要阻塞 UI**：`drawMealResultAsync()` 可以异步，但用户看到的弹窗必须在 1.5 秒内出现
5. **主题色**：普通版保持暖橙，校园版保持薄荷绿
6. **文案语气**：轻松、像朋友聊天，不要像后台系统
