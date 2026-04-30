# uniCloud 云函数/云对象调用量与风险审查报告

审查日期：2026-04-30

审查范围：

- 前端云调用封装：`utils/cloud.js`、`utils/app-state.js`
- 页面调用点：`pages/index/index.vue`、`pages/canteen/*.vue`、`pages/my/my.vue`、`pages/campus/*.vue`
- 云对象：`co-user`、`co-campus`、`co-content`、`co-ai`
- 数据库 schema：`uniCloud-aliyun/database/*.schema.json`

## 总体结论

当前代码在普通用户低频使用时，调用量不会特别夸张。项目已经做了一些正确的优化，例如：

- 用户状态同步有 3 秒防抖。
- 历史记录同步有 5 秒防抖。
- 饭堂、档口数据在前端有内存缓存。
- 内容安全检查的 `access_token` 有云对象内存缓存。
- 查询档口时批量查菜品，没有在每个档口里循环单独查菜品。

但是目前还不能说已经优化好，主要风险不是“正常用户点几次会很贵”，而是以下几类问题：

- 部分写接口没有鉴权，可能被任意调用，导致数据库写入量和云对象调用量失控。
- AI 云对象没有强鉴权，未来一旦前端接上，可能成为最贵的成本入口。
- 抽餐流程会分别同步 state 和 history，慢速连续点击时会产生两次云对象调用。
- 部分页面首屏会重复请求。
- 部分列表接口没有分页、TTL 缓存和索引规划，数据量变大后查询成本会上升。
- 部分代码绕过了统一云调用层，后续很难统一加缓存、限流和埋点。

建议优先级：

1. 先修鉴权：所有写接口、AI 接口必须校验 token 或管理员身份。
2. 再降调用量：合并抽餐后的 state/history 同步。
3. 再补数据库优化：给高频查询字段建索引，给公开列表加缓存。
4. 最后整理架构：所有前端云调用统一走 `utils/cloud.js`。

## 风险 1：档口和菜品写接口没有鉴权

风险等级：严重

修复状态：已修复。写接口已改为 token + 管理员 openid 校验，前端管理入口也会根据管理员身份显示或隐藏。

相关位置：

- `uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js`
- `pages/canteen/detail.vue`
- `pages/canteen/stall.vue`

涉及方法：

- `addStall(token, canteenId, stallData)`
- `updateStall(token, canteenId, stallId, stallData)`
- `deleteStall(token, canteenId, stallId)`
- `addDish(token, stallId, canteenId, dishData)`
- `updateDish(token, stallId, dishId, dishData)`
- `deleteDish(token, stallId, dishId)`

问题说明：

这些接口目前没有传入 token，也没有调用 `_verifyToken`，更没有校验管理员权限。也就是说，只要有人能调用你的云对象，就可能直接添加、修改或软删除档口和菜品数据。

为什么会影响调用量：

- 恶意脚本可以循环调用 `addDish`、`addStall`，快速制造大量数据库写入。
- 恶意脚本可以循环调用 `deleteDish`、`deleteStall`，造成大量更新操作。
- 每次新增接口还会先查询当前最大 `sort`，例如新增档口会先查一次，再写一次，因此一次恶意新增至少消耗一次读和一次写。
- 删除档口会先查档口，再更新档口，再查询该档口下所有菜品，然后批量更新菜品，单次调用可能放大成多次数据库操作。

触发场景：

- 页面被普通用户打开后，用户可以直接在前端调用新增和删除逻辑。
- 如果云对象接口名暴露，被脚本批量调用，会直接产生写入量。
- 如果小程序上线后被抓包或逆向，接口参数很容易被复用。

建议修复：

- 所有写接口统一增加 `token` 参数。
- 在云对象内部调用 `_verifyToken(token)`。
- 再校验 `ADMIN_OPENIDS.includes(openid)`，或者引入更细的角色权限。
- 前端调用 `cloudAddStall`、`cloudUpdateStall`、`cloudDeleteStall`、`cloudAddDish`、`cloudUpdateDish`、`cloudDeleteDish` 时传入当前用户 token。
- 非管理员用户页面上也不要展示新增、编辑、删除入口。

建议接口形态：

```js
async addStall(token, canteenId, stallData = {}) {
  const openid = await this._verifyToken(token)
  if (!openid || !ADMIN_OPENIDS.includes(openid)) {
    return { code: -1, msg: '无管理权限' }
  }

  // 原有新增逻辑
}
```

## 风险 2：AI 云对象缺少强鉴权，可能成为费用黑洞

风险等级：严重

相关位置：

- `uniCloud-aliyun/cloudfunctions/co-ai/index.obj.js`
- `utils/cloud.js`
- `utils/app-state.js`

涉及方法：

- `generateReason(context)`
- `batchGenerateReasons(contexts)`
- `generateFortuneText(context)`
- 前端封装：`aiGenerateReason`、`aiBatchGenerateReasons`、`aiGenerateFortuneText`

问题说明：

`co-ai.generateReason` 当前没有要求前端传 token，也没有验证用户身份。它只通过 `this.getClientInfo()` 取 `OPENID`，再用内存对象 `userCallLog` 做限流。

这个限流不够可靠：

- 如果 `clientInfo.OPENID` 为空，所有匿名调用可能共用空字符串作为限流 key。
- 云函数如果扩容到多个实例，每个实例都有自己的 `userCallLog`，限流无法全局生效。
- 内存限流重启后会清空。
- 没有按用户、按天、按总量记录真实消耗。

为什么会影响调用量和费用：

- AI 接口不是普通数据库读写，它会额外调用 DashScope 通义千问 API。
- 一次 `generateReason` 就是一次外部 AI API 请求。
- `batchGenerateReasons` 内部会循环调用最多 5 次 `generateReason`，一次云对象调用可能放大成 5 次外部 AI 调用。
- 如果以后把 AI 推荐理由接入抽餐按钮，用户每抽一次都可能产生 AI 费用。

触发场景：

- 用户连续抽餐，每次都生成 AI 文案。
- 恶意脚本绕过前端直接调用 `co-ai.generateReason`。
- 批量接口被滥用，一次请求触发多次 AI 调用。

当前好消息：

`utils/app-state.js` 中虽然有 `aiGenerateReasonForMeal`，但 `pages/index/index.vue` 目前调用的是 `drawMealResult()`，没有真正等待或调用 AI 文案生成。所以当前版本暂时不会因为首页抽餐大量消耗 AI。

建议修复：

- `generateReason`、`batchGenerateReasons`、`generateFortuneText` 都要求传 token。
- 在 `co-ai` 中复用用户 token 校验逻辑，或者单独查 `eat-what-users` 验证 token。
- 按 openid 在数据库中记录每日 AI 调用次数。
- 设置每日免费额度，例如每人每天最多 5 次 AI 文案。
- 批量接口默认关闭，或者只允许管理员调用。
- 同一个用户、同一天、同一个食物和 MBTI/星座组合可以缓存结果，避免重复生成。

建议策略：

```text
普通用户：
- 每天最多 5 次 AI 文案
- 超额后直接返回本地模板文案

管理员：
- 可以更高额度

匿名/无 token：
- 不允许调用 AI
```

## 风险 3：抽餐后 state 和 history 分开同步，调用量可以合并

风险等级：中高

相关位置：

- `utils/app-state.js`
- `uniCloud-aliyun/cloudfunctions/co-user/index.obj.js`

涉及方法：

- 前端：`saveAppState`
- 前端：`saveHistoryList`
- 前端：`syncStateToCloud`
- 前端：`syncHistoryToCloud`
- 云端：`syncState`
- 云端：`syncHistory`

问题说明：

用户点击抽餐后，`drawMealResult()` 会做两件事：

- 调用 `saveAppState()`，触发 state 同步。
- 调用 `saveHistoryList()`，触发 history 同步。

虽然前端已经做了防抖：

- state 同步防抖 3 秒。
- history 同步防抖 5 秒。

但对于慢速点击来说，每次抽餐仍然可能产生两次云对象调用。

为什么会影响调用量：

一次完整抽餐可能产生：

- 1 次 `co-user.syncState`
- 1 次 `co-user.syncHistory`

每个云端方法内部又会：

- 先通过 token 查询用户。
- 再查询 state/history 是否存在。
- 再执行 update 或 add。

也就是说，一次用户行为可能变成多次数据库读写。

触发场景：

- 用户隔 6 秒点一次抽餐，防抖无法合并。
- 用户每天允许抽 10 次，理论上可能产生 20 次同步云对象调用。
- 多用户同时使用时，调用量会线性上涨。

建议修复：

新增一个云对象方法，例如：

```js
syncAppData(token, { stateData, historyList })
```

云端一次 token 校验后，同时更新：

- `eat-what-state`
- `eat-what-history`

这样一次抽餐后最多只需要一次云对象调用。

进一步优化：

- 历史记录不必每次全量覆盖 30 条，可以只追加最新一条。
- state 中的 `lastResult` 已经包含最近结果，history 可以延迟同步。
- 用户退出页面或达到一定数量后再批量同步 history。

## 风险 4：token 验证每次都查 users 表，读放大明显

风险等级：中高

相关位置：

- `uniCloud-aliyun/cloudfunctions/co-user/index.obj.js`
- `uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js`

涉及方法：

- `_verifyToken(token)`
- `syncState`
- `syncHistory`
- `getState`
- `getHistory`
- `submitApplication`
- `getMyApplications`
- 管理员审核相关接口

问题说明：

每个需要登录的云对象方法都会调用 `_verifyToken(token)`，而 `_verifyToken` 通过 `usersCollection.where({ token }).limit(1).get()` 查询用户。

这意味着每次业务调用都会先产生一次用户表查询。

为什么会影响调用量：

如果一次抽餐分成 `syncState` 和 `syncHistory`，就会查两次 token。  
如果用户进入多个页面，每个页面都请求云数据，也会重复查 token。

触发场景：

- 抽餐同步。
- 获取我的申请列表。
- 提交入驻申请。
- 后台管理审核。
- 更新用户资料。

建议修复：

- 给 `eat-what-users.token` 建索引。
- 尽量合并多个需要 token 的操作，减少重复校验。
- token 不建议只通过 `updatedAt` 判断过期，因为用户资料更新会刷新 `updatedAt`，等于延长 token 生命周期。
- 更好的做法是保存 `tokenExpireAt` 字段，验证时直接判断。

建议数据库字段：

```js
{
  token,
  tokenExpireAt,
  updatedAt
}
```

## 风险 5：饭堂详情页首次进入可能重复拉取档口数据（未完全修复）

风险等级：中

修复状态：部分修复。`onShow` 中已增加 `if (canteenId.value)` 判空（`detail.vue:137`），但首次进入时 `onLoad` 已设置 `canteenId.value`，因此 `onShow` 仍会触发第二次 `loadStalls()`，未实现 review 建议的 `hasLoaded` 标记。

相关位置：

- `pages/canteen/detail.vue:128-141`

当前代码：

```js
onLoad(async (options) => {
  canteenId.value = options?.canteenId || ''
  // ...
  await loadStalls()  // 第一次请求
})

onShow(async () => {
  if (canteenId.value) {  // onLoad 已赋值，此条件为 true
    await loadStalls()    // 第二次请求（重复）
  }
})
```

为什么会影响调用量：

`loadStalls()` 会调用 `cloudGetStallsByCanteen()`。  
云端 `getStallsByCanteen()` 又会查：

- `eat-what-stalls`
- `eat-what-dishes`

一次重复请求就不是单纯多一次云对象调用，还会多两次数据库查询。

触发场景：

- 每次用户从饭堂列表进入饭堂详情页。
- 用户频繁返回和进入不同饭堂。

建议修复：

添加 `hasLoaded` 或 `shouldRefresh` 标记：

```js
let hasLoaded = false

onLoad(async () => {
  await loadStalls()
  hasLoaded = true
})

onShow(async () => {
  if (!hasLoaded) return
  if (needRefreshAfterEdit) {
    await loadStalls()
  }
})
```

更好的做法：

- 从菜品编辑页返回时通过事件通知刷新。
- 新增、编辑、删除后本地更新列表，减少重新整表拉取。

## 风险 6：前端缓存只存在内存里，页面重启后会重新请求

风险等级：中

相关位置：

- `utils/app-state.js`

涉及变量：

- `cloudCanteensCache`
- `cloudStallsCache`

问题说明：

饭堂和档口数据现在只缓存在 JS 内存变量中。小程序冷启动、页面进程回收、用户重新打开后，缓存会消失。

为什么会影响调用量：

- 用户每次冷启动后进入饭堂页，都会重新请求云对象。
- 如果用户每天多次打开小程序，会重复请求同一份低频变化的数据。
- 饭堂、档口、菜品这类数据通常不需要实时更新，可以缓存更久。

触发场景：

- 小程序被微信后台回收后重新打开。
- 用户切换学校后再切回来。
- 用户多次进入饭堂页。

建议修复：

- 使用 `uni.setStorageSync` 增加本地 TTL 缓存。
- 饭堂列表缓存 6 到 24 小时。
- 档口和菜品缓存 5 到 30 分钟，后台编辑后可手动刷新。
- 缓存结构中保存 `updatedAt` 或 `expireAt`。

建议缓存结构：

```js
{
  data: [],
  expireAt: Date.now() + 6 * 60 * 60 * 1000
}
```

## 风险 7：公开列表接口没有服务端缓存

风险等级：中

相关位置：

- `uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js`

涉及方法：

- `getApprovedCampuses`
- `getCanteensByCampus`
- `getStallsByCanteen`
- `getCanteenFullData`
- `getServicesByCampus`

问题说明：

这些接口读取的是公开数据，变化频率一般很低。但当前每次调用都会直接查数据库。

为什么会影响调用量：

公开接口会被所有用户共用访问。用户越多，读库次数越多。  
这些数据又不是用户私有数据，很适合做服务端缓存或 CDN/静态化。

触发场景：

- 用户进入校园选择页。
- 用户进入饭堂页。
- 用户进入饭堂详情页。
- 用户进入校园服务页。

建议修复：

- 云对象内部做短 TTL 内存缓存。
- 对学校、饭堂、档口、菜品数据使用版本号。
- 后台编辑数据后更新版本号，前端发现版本变化再重新拉取。
- 对全量菜单数据可以生成一个聚合集合，例如 `eat-what-menu-cache`，前端一次读取。

适合缓存的接口：

```text
getApprovedCampuses: 10-60 分钟
getCanteensByCampus: 10-60 分钟
getStallsByCanteen: 5-30 分钟
getServicesByCampus: 10-60 分钟
```

## 风险 8：列表接口缺少分页，数据量变大后会变重

风险等级：中

相关位置：

- `co-campus.getApprovedCampuses`
- `co-campus.getCanteensByCampus`
- `co-campus.getStallsByCanteen`
- `co-campus.getCanteenFullData`
- `co-campus.getServicesByCampus`

问题说明：

当前很多接口都是 `.get()` 直接取全部匹配数据，没有 `limit` 或分页参数。

为什么会影响调用量和性能：

- 数据库返回数据越多，云函数执行时间越长。
- 响应体越大，网络传输越慢。
- 小程序端解析和渲染也会变慢。
- 如果未来一个学校有很多饭堂、档口、菜品，`getCanteenFullData` 会一次返回大量嵌套数据。

触发场景：

- 后台录入多个学校。
- 一个学校录入很多档口和菜品。
- 用户进入完整菜单页时请求全量数据。

建议修复：

- 普通列表接口增加 `page` 和 `pageSize`。
- 详情页只查当前饭堂或当前档口。
- 首页推荐不需要完整菜单时，不要调用 `getCanteenFullData`。
- `getCanteenFullData` 只用于确实需要全量展示的页面。

## 风险 9：数据库索引规划不足

风险等级：中

相关位置：

- `uniCloud-aliyun/database/*.schema.json`
- 所有 `.where(...)` 查询

高频查询字段：

- `eat-what-users.token`
- `eat-what-users.openid`
- `eat-what-state.openid`
- `eat-what-history.openid`
- `eat-what-applications.openid`
- `eat-what-applications.status`
- `eat-what-applications.campusName`
- `eat-what-campuses.status`
- `eat-what-canteens.campusName`
- `eat-what-canteens.status`
- `eat-what-stalls.canteenId`
- `eat-what-stalls.status`
- `eat-what-dishes.stallId`
- `eat-what-dishes.canteenId`
- `eat-what-dishes.status`
- `eat-what-services.campusName`
- `eat-what-services.status`

问题说明：

当前 schema 主要定义了字段和权限，没有看到明确索引配置。随着数据量增加，where 查询会越来越慢。

为什么会影响调用量：

索引不足不一定增加调用次数，但会增加每次调用的执行时间和数据库扫描成本。  
云函数执行时间变长，也可能增加费用和超时概率。

建议索引：

```text
eat-what-users:
- openid
- token

eat-what-state:
- openid

eat-what-history:
- openid

eat-what-applications:
- openid + createdAt
- status + createdAt
- openid + campusName + campusTag + status

eat-what-canteens:
- campusName + status + sort

eat-what-stalls:
- canteenId + status + sort

eat-what-dishes:
- stallId + status + sort
- canteenId + status

eat-what-services:
- campusName + status + sort
```

## 风险 10：内容安全检查会额外调用微信接口

风险等级：中

相关位置：

- `co-campus.submitApplication`
- `co-content.checkText`
- `co-content.checkTextBatch`

问题说明：

提交校园入驻申请时，会通过 `co-content.checkText` 调用微信 `msg_sec_check`。这本身是必要的合规动作，但它会额外消耗一次云对象内部调用和一次微信接口请求。

当前优化点：

- `co-content` 对微信 `access_token` 做了内存缓存。
- `submitApplication` 把多个字段合并成一次文本检查，没有逐字段检查。

仍然存在的问题：

- `checkTextBatch` 内部是串行循环调用 `checkText`，批量检查 N 条就是 N 次微信接口调用。
- `submitApplication` 如果被恶意频繁调用，会频繁触发内容安全检查。
- 内容安全检查失败时当前策略偏向放行，安全上偏宽松。

为什么会影响调用量：

- 入驻申请接口每次提交至少会触发一次内容安全检查。
- 内容安全检查是外部接口，不只是数据库读写。

建议修复：

- `submitApplication` 先做基础频率限制，再做内容安全检查。
- 每个用户每天限制提交次数，例如 3 次。
- 对重复内容做 hash 缓存，短时间内重复提交不重复检查。
- `checkTextBatch` 限制最大数量，例如最多 5 条。

## 风险 11：提交入驻申请缺少用户级频率限制

风险等级：中

修复状态：未修复。云端 `co-campus.submitApplication` 和前端 `pages/campus/join.vue` 均未实现用户级频率限制。

相关位置：

- `co-campus.submitApplication`
- `pages/campus/join.vue:285-320` — `submitForm` 无防重复提交、无每日次数限制

问题说明：

`submitApplication` 会检查同一个 openid、同一个 campusName、同一个 campusTag 是否已有待审核或已通过申请。但它没有限制用户每天可以提交多少不同学校申请。

为什么会影响调用量：

恶意用户可以不断换学校名提交申请。每次提交会产生：

- token 查询。
- 内容安全检查。
- 重复申请查询。
- 数据库写入。

触发场景：

- 脚本批量提交随机学校名。
- 用户误操作或恶意测试。

建议修复：

- 每个 openid 每天最多提交 3 次。
- 每个 openid 未审核申请最多保留 5 条。
- 对手机号/联系方式做格式校验。
- 对 campusName 做长度限制和字符限制。

## 风险 12：部分云调用绕过 `utils/cloud.js`

风险等级：中低

修复状态：未修复。以下 3 处 `app-state.js` 中的函数仍直接调用 `uniCloud.importObject('co-campus')`，未走 `utils/cloud.js` 统一封装。

具体位置：

1. `utils/app-state.js:638` — `fetchCloudCanteens` 内直接 `uniCloud.importObject('co-campus')`，调用 `getCanteensByCampus`
2. `utils/app-state.js:867` — `fetchCloudStalls` 内直接 `uniCloud.importObject('co-campus')`，调用 `getStallsByCanteen`
3. `utils/app-state.js:893` — `fetchCanteenFullData` 内直接 `uniCloud.importObject('co-campus')`，调用 `getCanteenFullData`

相关位置：

- `utils/app-state.js:638,867,893`

问题说明：

项目文档里写了”所有云对象调用统一通过 `utils/cloud.js`，页面里不要直接 `uniCloud.importObject`”。但 `utils/app-state.js` 里仍然直接调用。

为什么会影响调用量治理：

- 后续想统一加缓存时，会漏掉这些直接调用点。
- 后续想统一打日志、统计调用次数时，会漏掉这些直接调用点。
- 后续想统一处理失败降级、重试、限流时，会出现两套逻辑。

建议修复：

- 在 `utils/cloud.js` 中补齐：
  - `cloudGetCanteensByCampus`
  - `cloudGetCanteenFullData`
  - `cloudGetServicesByCampus`
- `utils/app-state.js` 只调用 `utils/cloud.js`。
- 页面层不要直接 `uniCloud.importObject`。

## 风险 13：新增和删除后总是重新拉取整份列表

风险等级：中低

相关位置：

- `pages/canteen/detail.vue`
- `pages/canteen/stall.vue`

问题说明：

新增、编辑、删除档口或菜品成功后，页面会重新调用 `loadStalls()` 或 `loadDishes()` 拉取整份列表。

为什么会影响调用量：

- 新增一次：先调用新增接口，再调用列表接口。
- 编辑一次：先调用更新接口，再调用列表接口。
- 删除一次：先调用删除接口，再调用列表接口。
- 如果用户连续录入很多菜品，调用量会明显增加。

触发场景：

- 管理员批量录入菜单。
- 管理员连续编辑多个菜品。

建议修复：

- 新增成功后，把返回的数据直接插入本地列表。
- 编辑成功后，直接更新本地数组中的对应项。
- 删除成功后，直接从本地数组移除对应项。
- 只在用户手动下拉刷新或页面重新进入时全量拉取。

## 风险 14：云端初始化和诊断接口不应暴露给普通用户

风险等级：中

相关位置：

- `co-campus.initAdminMenus`
- `co-campus.fixAdminMenusUrl`
- `co-campus.runDiagnostics`
- `co-campus.initBaseData`
- `utils/cloud.js` 中对应封装

问题说明：

这些接口属于部署、后台维护或诊断用途。如果没有管理员鉴权，普通用户或外部调用者可能触发大量数据库查询和写入。

为什么会影响调用量：

- `runDiagnostics` 会 count 多个集合。
- `initBaseData` 会循环查库并可能写入多个集合。
- `initAdminMenus` 会循环查询和写入菜单。
- `fixAdminMenusUrl` 会循环查询和更新菜单。

建议修复：

- 这些接口必须要求管理员 token。
- 或者仅保留在开发环境，生产环境直接返回禁止调用。
- 前端普通包不要暴露这些封装。

## 风险 15：用户头像使用临时路径，可能导致后续反复更新

风险等级：低

相关位置：

- `pages/my/my.vue`
- `utils/user-state.js`
- `co-user.updateProfile`

问题说明：

当前头像来自 `uni.chooseImage` 或微信头像临时路径，云端只是保存这个路径，没有上传到云存储。

为什么可能影响调用量：

- 临时路径失效后，用户可能反复重新选择头像。
- 每次更新头像会触发 `saveAppState` 和 `syncProfileToCloud`。
- `saveAppState` 还可能触发 state 同步。

建议修复：

- 使用 `uniCloud.uploadFile` 上传头像到云存储。
- 云端保存永久 fileID 或 URL。
- 头像未变化时不要重复同步。

## 风险 16：AI 推荐文案如果接入首页，要避免每次抽餐都调用

风险等级：中高

相关位置：

- `utils/app-state.js`
- `pages/index/index.vue`

问题说明：

`aiGenerateReasonForMeal` 的设计是先生成本地模板文案，再异步调用 AI。这个方向是对的。但如果以后在首页每次抽餐都调用它，调用量会明显上升。

为什么会影响调用量：

每次抽餐可能产生：

- state 同步。
- history 同步。
- AI 云对象调用。
- 外部 DashScope API 调用。

如果用户每天抽 10 次，一个用户每天就可能产生 10 次 AI 费用。

建议接入方式：

- 默认使用本地模板文案。
- 只有用户点击“生成更有趣理由”时才调用 AI。
- 每天给用户 3 到 5 次 AI 次数。
- AI 失败时不要重试太多次，直接使用模板文案。
- 对相同上下文缓存 AI 结果。

## 推荐整改顺序

### 第一阶段：必须先修

1. 给档口、菜品所有写接口加 token 和管理员校验。
2. 给 `co-ai` 所有接口加 token 校验和每日额度。
3. 给部署/诊断类接口加管理员校验。
4. 给 `submitApplication` 增加用户级频率限制。

### 第二阶段：降低正常调用量

1. 合并 `syncState` 和 `syncHistory` 为一次 `syncAppData`。
2. 修复 `detail.vue` 首屏重复 `loadStalls`。
3. 新增、编辑、删除后优先本地更新列表，减少整表重拉。
4. 饭堂、档口、菜品增加本地 TTL 缓存。

### 第三阶段：数据量增长前补齐

1. 给高频查询字段建索引。
2. 公开列表接口增加服务端 TTL 缓存。
3. 大列表增加分页。
4. 菜单数据考虑预聚合到缓存集合。

### 第四阶段：架构整理

1. 所有前端云调用统一走 `utils/cloud.js`。
2. 增加统一调用日志。
3. 增加错误降级和限流提示。
4. 建立云对象调用统计，观察真实用户行为。

## 建议的最终调用模型

普通用户日常使用：

```text
登录：
- 1 次 wxLogin

进入饭堂页：
- 有缓存：0 次云调用
- 无缓存：1 次 getCanteensByCampus

进入饭堂详情：
- 有缓存：0 次云调用
- 无缓存：1 次 getStallsByCanteen

抽餐：
- 默认：1 次 syncAppData
- AI 文案：按用户主动触发，且每日限额
```

管理员维护菜单：

```text
新增/编辑/删除：
- 1 次写接口
- 本地更新 UI
- 不立即整表重拉
```

公开数据：

```text
饭堂/档口/菜品：
- 前端 TTL 缓存
- 云端 TTL 缓存
- 必要时版本号刷新
```

## 最后判断

当前项目已经有基础的防抖和缓存意识，方向是对的。真正需要马上处理的是“权限”和“AI 成本入口”。这两个不修，即使普通用户调用量不高，也可能因为接口被滥用导致云函数调用量、数据库写入量、AI 费用突然上升。

如果按本报告的优先级整改，调用量会从“靠用户自觉不乱点”变成“系统本身能抗住正常增长和一定恶意调用”。
