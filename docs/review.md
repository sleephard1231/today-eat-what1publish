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

- 档口、菜品写接口已加管理员鉴权，但上线前必须确认 `ADMIN_OPENIDS` 已填真实 openid。
- AI 云对象已加 token 鉴权、每日额度和用量记录，但需要上传 `co-ai` 与 `eat-what-ai-usage` schema 后才会在云端生效。
- 抽餐主流程已合并为一次 `syncAppData` 同步，但通用 `syncState` / `syncHistory` 路径仍保留在其他场景中。
- 部分页面仍存在 `onLoad` / `onShow` 连续触发的重复本地刷新，不过涉及云调用放大的主要页面已经修过一轮。
- 部分列表接口分页仍未补齐；TTL 缓存和索引已补到基础版，但需要确认索引与云函数都已上传到 uniCloud。
- 部分代码绕过了统一云调用层，后续很难统一加缓存、限流和埋点。

建议优先级：

1. 先修鉴权：所有写接口、AI 接口必须校验 token 或管理员身份。（主要项已处理，需上传云端）
2. 再降调用量：合并抽餐后的 state/history 同步。
3. 再补数据库优化：继续完善分页，并确认索引与缓存配置都已上传云端生效。
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

## 风险 2：AI 云对象鉴权和额度控制

风险等级：严重

修复状态：已修复。`co-ai` 已要求 AI 生成接口传入 token；批量生成接口已限制为管理员调用；已新增 `eat-what-ai-usage` 集合按用户和日期记录调用次数与 token 用量。

相关位置：

- `uniCloud-aliyun/cloudfunctions/co-ai/index.obj.js`
- `utils/cloud.js`
- `utils/app-state.js`
- `uniCloud-aliyun/database/eat-what-ai-usage.schema.json`

涉及方法：

- `generateReason(token, context)`
- `batchGenerateReasons(token, contexts)`
- `generateFortuneText(token, context)`
- `pickDishFromCandidates(token, payload)`
- 前端封装：`aiGenerateReason`、`aiBatchGenerateReasons`、`aiGenerateFortuneText`

问题说明：

原先 `co-ai.generateReason` 没有要求前端传 token，也没有验证用户身份，只通过 `this.getClientInfo()` 取 `OPENID`，再用内存对象 `userCallLog` 做限流。

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

已处理：

- `generateReason`、`generateFortuneText`、`pickDishFromCandidates` 都要求传 token。
- `batchGenerateReasons` 只允许管理员 token 调用。
- 按 openid + 日期写入 `eat-what-ai-usage`，记录每日 `calls` 和 token 用量。
- 每日额度读取后台 AI 配置中的 `dailyLimit`，默认 5 次。
- 分钟限流读取后台 AI 配置中的 `minuteLimit`。

仍建议后续优化：

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

## 风险 3：抽餐主流程的 state / history 同步已合并，但通用同步路径仍并存

风险等级：中高

修复状态：已修复基础版。抽餐主流程与结果更新流程已改为走 `syncAppData(token, { stateData, historyList })` 一次同步；但 `saveAppState()` 与 `saveHistoryList()` 的通用路径仍分别保留 `syncStateToCloud()`、`syncHistoryToCloud()`，用于其他独立场景。

相关位置：

- `utils/app-state.js`
- `uniCloud-aliyun/cloudfunctions/co-user/index.obj.js`

涉及方法：

- 前端：`saveAppState`
- 前端：`saveHistoryList`
- 前端：`syncStateToCloud`
- 前端：`syncHistoryToCloud`
- 前端：`syncAppDataToCloud`
- 云端：`syncState`
- 云端：`syncHistory`
- 云端：`syncAppData`

问题说明：

旧问题是：用户点击抽餐后，会分别触发 state 同步和 history 同步。

当前代码已经把这条高频路径收敛了：

- `drawMealResultAsync()` 在本地保存 state / history 时使用 `skipCloudSync: true`
- 然后统一调用一次 `syncAppDataToCloud(nextState, nextHistory)`
- `updateLatestMealResult()` 更新最近结果时也同样走合并同步

当前仍保留的现状：

- `syncStateToCloud` 仍有 3 秒防抖。
- `syncHistoryToCloud` 仍有 5 秒防抖。
- `syncAppDataToCloud` 也有独立的 3 秒防抖。

所以“每次抽餐必然打两次云对象”的问题已经不成立；剩下的是架构层面还存在两套同步入口。

为什么会影响调用量：

旧实现里，一次完整抽餐可能产生：

- 1 次 `co-user.syncState`
- 1 次 `co-user.syncHistory`

现在抽餐主流程通常是：

- 1 次 `co-user.syncAppData`

每个云端方法内部又会：

- 先通过 token 查询用户。
- 再查询 state/history 是否存在。
- 再执行 update 或 add。

也就是说，调用量最大的主用户路径已经压缩过，但通用同步 API 仍有继续收敛的空间。

触发场景：

- 用户通过其他设置项单独改 profile / state，再单独改 history。
- 某些非抽餐场景仍分别调用 `saveAppState()` 或 `saveHistoryList()`。
- 如果后续继续扩展同步逻辑，可能再次出现两套入口并存。

已处理：

- 前端已新增 `syncAppDataToCloud()`。
- 云端 `co-user` 已新增 `syncAppData(token, payload)`。
- 抽餐主流程和最新结果更新流程已切换到合并同步。

后续建议：

- 历史记录不必每次全量覆盖 30 条，可以只追加最新一条。
- state 中的 `lastResult` 已经包含最近结果，history 可以延迟同步。
- 用户退出页面或达到一定数量后再批量同步 history。
- 评估是否逐步收敛 `syncState` / `syncHistory` 的直接使用场景，减少重复维护。

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

## 风险 5：饭堂详情页首次进入可能重复拉取档口数据

风险等级：中

修复状态：已修复。`pages/canteen/detail.vue` 已增加 `skipNextShow` 标记，首次进入时只执行 `onLoad` 的 `loadStalls()`，从商铺菜品页返回时才由 `onShow` 刷新。

相关位置：

- `pages/canteen/detail.vue:128-141`

旧代码问题：

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

已处理方式：

```js
const skipNextShow = ref(true)

onLoad(async (options) => {
  await loadStalls()
})

onShow(async () => {
  if (skipNextShow.value) {
    skipNextShow.value = false
    return
  }
  await loadStalls()
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

## 风险 7：公开列表接口服务端缓存

风险等级：中

修复状态：已修复基础版。`co-campus` 已为公开读接口增加 60 秒云对象内存缓存，写操作、审核操作后会清空缓存。

相关位置：

- `uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js`

涉及方法：

- `getApprovedCampuses`
- `getCanteensByCampus`
- `getStallsByCanteen`
- `getCanteenFullData`
- `getServicesByCampus`

原问题说明：

这些接口读取的是公开数据，变化频率一般很低。但当前每次调用都会直接查数据库。

为什么会影响调用量：

公开接口会被所有用户共用访问。用户越多，读库次数越多。  
这些数据又不是用户私有数据，很适合做服务端缓存或 CDN/静态化。

触发场景：

- 用户进入校园选择页。
- 用户进入饭堂页。
- 用户进入饭堂详情页。
- 用户进入校园服务页。

已处理：

- 云对象内部已做 60 秒 TTL 内存缓存。
- 缓存覆盖 `getApprovedCampuses`、`getCanteensByCampus`、`getStallsByCanteen`、`getNormalDishCandidates`、`getCampusDishCandidates`、`getCanteenFullData`、`getServicesByCampus`、`getDishesByStall`。
- 新增、编辑、删除档口/菜品和审核申请后会清空缓存。

后续可继续优化：

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

修复状态：部分修复。`getApprovedCampuses(page, pageSize)` 已补入参，但当前实现仍需确认返回结果是否真正按分页裁切；`getCanteensByCampus`、`getStallsByCanteen`、`getDishesByStall`、`getServicesByCampus` 仍未补分页参数。

相关位置：

- `co-campus.getApprovedCampuses`
- `co-campus.getCanteensByCampus`
- `co-campus.getStallsByCanteen`
- `co-campus.getDishesByStall`
- `co-campus.getCanteenFullData`
- `co-campus.getServicesByCampus`

问题说明：

当前这组公开读接口里，分页处理还不一致。`getApprovedCampuses` 已新增 `page`、`pageSize` 入参，但其余列表接口大多仍是一次性返回全部匹配数据；`getCanteenFullData` 本身也是聚合接口，仍会一次返回整份饭堂/档口/菜品结构。

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

- 普通列表接口统一增加 `page` 和 `pageSize`，并在云端真实应用 `skip/limit`。
- 详情页只查当前饭堂或当前档口。
- 首页推荐不需要完整菜单时，不要调用 `getCanteenFullData`。
- `getCanteenFullData` 只用于确实需要全量展示的页面。

## 风险 9：数据库索引规划不足

风险等级：中

修复状态：已修复基础版。项目中已新增主要集合的 `.index.json` 索引文件，但仍需要确认这些索引已经上传到 uniCloud 控制台并成功生效。

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

这个问题在源码层面已经补了基础索引：`users`、`applications`、`state`、`history`、`canteens`、`stalls`、`dishes`、`services`、`ai-usage` 等集合都已有对应 `.index.json`。当前更大的风险已经不是“代码里完全没配索引”，而是上线时如果没有把这些索引一并上传，云端实际查询性能仍会退回到未优化状态。

为什么会影响调用量：

索引不足不一定增加调用次数，但会增加每次调用的执行时间和数据库扫描成本。  
云函数执行时间变长，也可能增加费用和超时概率。

当前已补的关键索引：

```text
eat-what-users:
- openid
- token

eat-what-state:
- openid + updatedAt

eat-what-history:
- openid + updatedAt

eat-what-applications:
- openid + createdAt
- status + createdAt
- openid + status + createdAt

eat-what-campuses:
- name + status

eat-what-canteens:
- campusName + status + sort
- status + updatedAt

eat-what-stalls:
- canteenId + status + sort
- status + updatedAt

eat-what-dishes:
- stallId + status + sort
- canteenId + status + sort
- status + updatedAt

eat-what-services:
- campusName + status + sort

eat-what-ai-usage:
- openid + dateKey
- dateKey + updatedAt
```

上线检查：

- 在 HBuilderX / uniCloud 控制台确认所有 `.index.json` 都已上传。
- 索引上传后再观察慢查询和云函数耗时，避免“代码有索引、线上没生效”。

## 当前代码状态同步

- `co-ai` 的 API Key 占位字符串问题已修复，当前优先读取后台 AI 配置；环境变量兜底支持 `AI_API_KEY`、`KIMI_API_KEY`、`DEEPSEEK_API_KEY`、`GLM_API_KEY`，并兼容旧的 `DASHSCOPE_API_KEY`。
- `co-ai` 与 `co-campus` 的 `ADMIN_OPENIDS` 空数组问题也已修复，当前都支持环境变量，并带有 fallback 管理员 openid。
- AI 默认模型不一致问题已修复：`co-ai` 默认配置与 `eat-what-ai-config.schema.json` 当前都默认指向 Kimi 官方接口，模型为 `kimi-k2.5`。后台仍可随时切换到 DeepSeek 官方、GLM 官方或 OpenAI 兼容中转站。
- 这几项虽然源码已对齐，但上线前仍要确认真实环境变量、后台 AI 配置和云函数部署都已完成。

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

## 风险 11：提交入驻申请用户级频率限制

风险等级：中

修复状态：已修复。云端 `co-campus.submitApplication` 已限制每个用户每天最多提交 3 次、最多保留 5 条待审核申请；前端 `pages/campus/join.vue` 已增加提交中状态，防止连点重复提交。

相关位置：

- `co-campus.submitApplication`
- `pages/campus/join.vue:285-320` — `submitForm` 无防重复提交、无每日次数限制

原问题说明：

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

已处理：

- 每个 openid 每天最多提交 3 次。
- 每个 openid 未审核申请最多保留 5 条。
- 限流检查放在内容安全检查之前，避免刷提交先消耗微信内容安全接口。
- 云端提交失败时，前端不再静默降级成本地保存，会直接提示失败原因。

仍建议后续优化：

- 对手机号/联系方式做格式校验。
- 对 campusName 做长度限制和字符限制。

## 风险 12：部分云调用绕过 `utils/cloud.js`

风险等级：中低

修复状态：已修复。当前前端业务代码中的云对象调用已经统一通过 `utils/cloud.js` 封装，不再在 `utils/app-state.js` 中直接 `uniCloud.importObject('co-campus')`。

当前状态：

- `fetchCloudCanteens()` → `cloudGetCanteensByCampus()`
- `fetchCloudStalls()` → `cloudGetStallsByCanteen()`
- `fetchCanteenFullData()` → `cloudGetCanteenFullData()`

相关位置：

- `utils/app-state.js`
- `utils/cloud.js`

问题说明：

项目文档里写了“所有云对象调用统一通过 `utils/cloud.js`，页面里不要直接 `uniCloud.importObject`”。这一点在当前前端源码里已经对齐。

为什么会影响调用量治理：

- 统一加缓存时不会再漏掉这些高频调用点。
- 统一打日志、统计调用次数会更容易落地。
- 统一处理失败降级、重试、限流时不会再分两套入口。

已处理：

- `utils/cloud.js` 已提供相关云调用封装。
- `utils/app-state.js` 已切回只调用 `utils/cloud.js`。
- 当前项目里剩余的 `uniCloud.importObject(...)` 仅位于 `utils/cloud.js` 和云函数内部调用，不属于这个风险项。

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

修复状态：已修复。`initAdminMenus`、`fixAdminMenusUrl`、`runDiagnostics`、`initBaseData` 已统一增加 `token` 参数，并调用 `_verifyAdmin(token)` 校验管理员 openid。

相关位置：

- `co-campus.initAdminMenus`
- `co-campus.fixAdminMenusUrl`
- `co-campus.runDiagnostics`
- `co-campus.initBaseData`
- `utils/cloud.js` 中对应封装

原问题说明：

这些接口属于部署、后台维护或诊断用途。如果没有管理员鉴权，普通用户或外部调用者可能触发大量数据库查询和写入。

为什么会影响调用量：

- `runDiagnostics` 会 count 多个集合。
- `initBaseData` 会循环查库并可能写入多个集合。
- `initAdminMenus` 会循环查询和写入菜单。
- `fixAdminMenusUrl` 会循环查询和更新菜单。

已处理：

- 这些接口已要求管理员 token。
- `utils/cloud.js` 中对应封装也已改为自动传入当前用户 token。

仍建议后续优化：

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

## 风险 17：多页面存在 onLoad + onShow 重复刷新（审查补充）

风险等级：中

修复状态：部分修复。此前会放大云调用或状态刷新的主要页面已经做了一轮处理，但文档里列举的页面列表和影响程度已经落后于当前代码。

已确认修复的页面：

- `pages/index/index.vue` 已增加 `hasLoaded`，首次 `onShow` 不再重复执行 `refreshState()`。
- `pages/my/my.vue` 已增加 `hasLoaded`，首次 `onShow` 不再重复执行 `refreshState()`。
- `pages/service/service.vue` 已增加 `hasLoaded`，首次 `onShow` 不再重复执行 `refreshPage()`。

### 17a. `pages/canteen/canteen.vue`

相关位置：`pages/canteen/canteen.vue`

```js
onLoad(async () => {
  refreshPage()
  // 额外执行一次 fetchCloudCanteens()
})

onShow(refreshPage)
```

现状说明：这里仍有首次 `onLoad -> onShow` 的双刷新，但 `onShow` 只会做本地 `refreshPage()`，不会再次触发 `fetchCloudCanteens()`，所以“首屏重复云调用”这一点已经不准确。

### 17b. `pages/history/index.vue`

相关位置：`pages/history/index.vue`

```js
onLoad(() => {
  refreshData()
})

onShow(() => {
  refreshData()
})
```

现状说明：这里仍有首次重复刷新，但主要是本地状态与历史记录读取，不涉及额外云对象请求，影响比原审查结论要轻。

### 17c. `pages/my/my.vue`

相关位置：`pages/my/my.vue`

```js
onLoad(() => {
  refreshState()
  openLoginSheetIfNeeded()
  uni.$on('user-state-changed', onUserStateChange)
  uni.$on('app-state-changed', refreshState)
})

onShow(() => {
  if (!hasLoaded) {
    hasLoaded = true
    return
  }
  refreshState()
})
```

现状说明：`pages/my/my.vue` 已增加 `hasLoaded` 防重入逻辑，这一项应视为已修复。

问题说明：当前剩余的主要问题是“少数页面仍有首次双刷新”，但它们多数已经降为重复本地读状态，而不是重复打云端。

建议修复：

- 对 `pages/canteen/canteen.vue`、`pages/history/index.vue` 也统一采用 `hasLoaded` 标记模式。
- 审查时优先区分“重复本地刷新”和“重复云调用”两类影响，避免把风险等级写得过重。

---

## 风险 18：校园入驻入口显示与实际功能不一致（审查补充）

风险等级：低

修复状态：已修复。校园选择页的入驻入口已经改为通过登录校验后跳转到 `/pages/campus/join`，不再停留在“待开放”提示。

相关位置：
- `pages/campus/select.vue` — `goJoinPage()` 先调用 `requireLogin({ cloudOnly: true })`，通过后跳转到 `/pages/campus/join`
- `pages/campus/join.vue` — 已完整实现入驻申请表单、云端提交、隐私协议等功能

问题说明：这个问题原本是“页面做完了，但入口没放开”。当前代码已经把入口接通，所以文档里的旧结论需要撤掉。

已处理：

- 校园选择页和“我的”页都已接通入驻申请入口。
- 未登录或本地登录用户会先经过 `requireLogin({ cloudOnly: true })` 校验。

---

## 风险 19：AI 调用在本地登录模式下静默失败（审查补充）

风险等级：低

相关位置：
- `utils/cloud.js:444-454` — `aiPickDishFromCandidates` 要求 token，无 token 直接返回 `{ code: -1, msg: '请先登录' }`
- `utils/app-state.js:804` — `aiPickFromCandidates` 调用 `aiPickDishFromCandidates`
- `pages/index/index.vue:343-353` — `handleDrawMeal` 中 `aiPickFromCandidates` 被 catch 捕获，静默失败

问题说明：`aiPickDishFromCandidates` 内部调用 `getStoredUserToken()`，如果用户是本地登录模式（`loginMode: 'local'`），`getStoredUserToken()` 返回空字符串，AI 调用直接失败返回 `{ code: -1 }`。前端用 `.catch()` 捕获后只 `console.warn`，用户无感知。好消息是当前首页 `handleDrawMeal` 先展示了模板结果，AI 失败不会影响用户体验。但这是一个已知的静默降级路径，值得在文档中明确记录。

建议：当前行为是合理的降级策略（AI 失败 → 保持模板推荐），无需紧急修改。后续若想优化，可在 `aiPickFromCandidates` 中对本地用户直接返回 fallback，跳过不必要的云对象调用尝试。

---

## 推荐整改顺序

### 第一阶段：必须先修

1. 给档口、菜品所有写接口加 token 和管理员校验。（已完成，需确认 `ADMIN_OPENIDS`）
2. 给 `co-ai` 所有接口加 token 校验和每日额度。（已完成，需上传 `co-ai` 与 `eat-what-ai-usage` schema）
3. 给部署/诊断类接口加管理员校验。（已完成，需上传 `co-campus`）
4. 给 `submitApplication` 增加用户级频率限制。（已完成，需上传 `co-campus`）

### 第二阶段：降低正常调用量

1. 合并 `syncState` 和 `syncHistory` 为一次 `syncAppData`。（抽餐主流程已完成，通用同步路径仍可继续收敛）
2. 修复 `detail.vue` 首屏重复 `loadStalls`。（已完成）
3. 新增、编辑、删除后优先本地更新列表，减少整表重拉。
4. 饭堂、档口、菜品增加本地 TTL 缓存。

### 第三阶段：数据量增长前补齐

1. 给高频查询字段建索引。
2. 公开列表接口增加服务端 TTL 缓存。
3. 大列表增加分页。
4. 菜单数据考虑预聚合到缓存集合。

### 第四阶段：架构整理

1. 所有前端云调用统一走 `utils/cloud.js`。（已完成）
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

---

## 追加审查：数据库查询调用量异常排查

排查时间：2026-04-30

结论：

数据库读写确实有几个可能放大调用量的点，但它们更容易影响“数据库读/写次数”和“云对象调用次数”，不一定直接解释 GBs 暴涨。GBs 更常见的来源仍然是定时云函数、长耗时请求、超时时间过长或内存配置偏大。

### 风险 1：`co-campus` 公开读接口每次都直接查库

风险等级：中

相关位置：

- `uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js`

涉及接口：

- `getApprovedCampuses()`
- `getCanteensByCampus(campusName)`
- `getStallsByCanteen(canteenId)`
- `getNormalDishCandidates(limit)`
- `getCampusDishCandidates(canteenIds, limit)`
- `getCanteenFullData(campusName)`
- `getServicesByCampus(campusName)`
- `getDishesByStall(stallId)`

问题说明：

这些接口属于读多写少的数据。尤其校园版推荐池 `getCampusDishCandidates` 一次会查饭堂、商铺、菜品三张表；饭堂详情 `getStallsByCanteen` 一次会查商铺和菜品两张表。如果页面反复进入、后台频繁刷新，数据库读次数会被放大。

已处理：

- 已给上述公开读接口增加 60 秒云对象内存缓存。
- 同参数 60 秒内再次调用，会直接返回缓存结果，不再打数据库。
- 档口、菜品、申请审核等写操作完成后会清空缓存，避免后台改完数据后长期看不到新内容。

剩余注意：

- 云对象内存缓存不是永久缓存，云函数实例重启后会失效。
- 这是为了削峰，不是替代数据库索引。
- 上线后仍建议给高频字段建索引：`status`、`campusName`、`canteenId`、`stallId`、`openid`、`createdAt`、`updatedAt`。

### 风险 2：饭堂详情页首屏可能重复查商铺

风险等级：中

相关位置：

- `pages/canteen/detail.vue`

问题说明：

页面原来在 `onLoad` 里执行一次 `loadStalls()`，同时 `onShow` 里也会执行一次 `loadStalls()`。uni-app 页面首次进入时通常会先触发 `onLoad`，随后触发 `onShow`，这会导致首次进入饭堂详情页可能连续请求两次商铺和菜品数据。

已处理：

- 已增加 `skipNextShow` 标记。
- 首次进入页面时只走 `onLoad` 的 `loadStalls()`。
- 从商铺菜品页返回详情页时，`onShow` 仍然会刷新数据。

### 风险 3：用户状态和历史同步会产生额外读写

风险等级：中

相关位置：

- `utils/app-state.js`
- `uniCloud-aliyun/cloudfunctions/co-user/index.obj.js`

问题说明：

用户每次抽餐后，前端会保存本地状态，并异步同步：

- `syncState`
- `syncHistory`

原逻辑里每次同步都需要先验证 token，再查询状态/历史记录是否存在，然后再更新或新增。一次抽餐可能拆成多次数据库读写。

已处理：

- `co-user` 已增加 60 秒 token 验证缓存，同一云函数实例内短时间多次同步可以少查一次用户表。
- `syncState` 和 `syncHistory` 已改成先按 `openid` 更新，更新不到再新增，减少一次“先查是否存在”的数据库读取。

后续建议：

- 更进一步可以把 `syncState` 和 `syncHistory` 合成一个 `syncAppData` 接口。
- 或者只在用户退出页面、抽餐结束后合并同步一次，减少写频率。

### 风险 4：后台首页统计查询较重

风险等级：中

相关位置：

- `E:\AWeApptext\吃什么新版\admin\pages\index\index.vue`

问题说明：

后台首页会统计校园、饭堂、商铺、菜品、普通版菜品、用户、待审核申请，还会加载趋势图和最近记录。一次首页刷新会产生多次 `count()` 和 `get()`。如果你频繁回首页或点击刷新，数据库读次数会明显增加。

已处理：

- 后台首页已有本地缓存。
- 缓存时间已从 60 秒调整为 5 分钟。
- 手动点击“刷新”仍然会强制重新查询，适合你确实要看最新统计时使用。

后续建议：

- 如果数据量上来，可以做一个专门的云对象接口，例如 `co-admin.getDashboardSummary()`，由云端统一聚合并缓存。
- 趋势数据可以每天定时汇总到统计表，首页只读汇总结果。

### 风险 5：本地删除云函数不等于云端已停用

风险等级：严重

修复状态：本地已清理，云端需人工确认。当前本地 admin 项目中已不存在 `uni-stat-cron` 和 `uni-analyse-searchhot` 目录；但如果它们曾经上传到 uniCloud，仍必须在 DCloud / uniCloud 控制台手动删除或停用。

相关位置：

- `E:\AWeApptext\吃什么新版\admin\uniCloud-aliyun\cloudfunctions\uni-stat-cron`
- `E:\AWeApptext\吃什么新版\admin\uniCloud-aliyun\cloudfunctions\uni-analyse-searchhot`

问题说明：

本地已经删除统计相关云函数目录，但如果它们之前已经上传部署到 uniCloud，云端仍可能继续存在并运行。定时云函数会在你“不操作前端和后台”的情况下继续消耗云函数资源。

建议：

- 到 DCloud / uniCloud 控制台确认 `uni-stat-cron` 和 `uni-analyse-searchhot` 是否仍存在。
- 如果存在，手动删除或停用。
- 再观察 24 小时用量曲线，看 GBs 是否明显下降。

操作路径：

```text
DCloud 控制台 / uniCloud 控制台
→ 选择当前服务空间
→ 云函数/云对象
→ 搜索 uni-stat-cron、uni-analyse-searchhot
→ 如果存在，删除或停用
```
