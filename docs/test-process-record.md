# 后台与云对象测试过程记录

记录时间：2026-05-04

## 测试目标

这次测试主要围绕后台管理系统和 uniCloud 云对象是否打通，重点看：

- 后台管理端页面是否能正常打开。
- `co-campus`、`co-ai`、`co-user`、`co-content` 云对象配置是否完整。
- 数据库集合、schema、基础数据是否能被云对象读取。
- 校园、饭堂、档口、菜品之间的数据关联是否正确。
- 管理端写接口是否有 token 和管理员权限保护。
- 首页 AI、抽餐记录同步、后台写入是否会造成不必要调用量。
- 上线前还剩哪些配置风险。

## 测试方式

### 1. 静态云函数连通性检查

在小程序项目根目录执行：

```powershell
node scripts\cloud-connectivity-check.js
```

检查内容包括：

- 云函数/云对象 JS 语法。
- 云函数内存配置和触发器配置。
- `utils/cloud.js` 前端适配层是否能对应到正确云对象方法。
- 数据库 schema 文件是否存在。
- 小程序路由文件是否存在。
- 关键上线配置是否还是空值或占位值。

最新检查结果：

```text
81 passed, 1 warning, 0 failed
```

唯一警告：

```text
ADMIN_OPENIDS is empty
```

含义是：管理员 openid 还没有填入 `co-campus`，所以管理端写接口会默认返回无权限。这是安全默认值，不是代码错误，但上线前必须配置。

### 2. 本地后台管理系统只读检查

本地后台地址：

```text
http://localhost:5173/admin/#/
```

测试时用户已经完成后台登录。后续检查以只读为主，不主动点击保存、提交、删除、审核、初始化、测试连接等会写入云端或数据库的按钮。

重点检查页面：

- 首页：`/pages/index/index`
- 校园列表：`/pages/eat-what/campus/list`
- 饭堂列表：`/pages/eat-what/canteen/list`
- 档口列表：`/pages/eat-what/stall/list`
- 菜品列表：`/pages/eat-what/dish/list`
- 入驻申请列表：`/pages/eat-what/application/list`
- 服务列表：`/pages/eat-what/service/list`
- 普通版菜品：`/pages/eat-what/normal-dish/list`
- AI 配置页：`/pages/eat-what/ai-config/index`

辅助脚本包括：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\admin-cdp-readonly.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\admin-cdp-debug-readonly.ps1 -Route '/pages/eat-what/dish/edit?id=dish-dz-01'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\admin-cdp-route-smoke-readonly.ps1 -DelayMs 1200
```

这些脚本用于通过本地浏览器调试端口读取后台页面状态，不用于写入数据。

### 3. 云对象读流程检查

重点关注这些云对象方法：

- `co-campus.getApprovedCampuses()`
- `co-campus.getCanteensByCampus(campusName)`
- `co-campus.getStallsByCanteen(canteenId)`
- `co-campus.getDishesByStall(stallId)`
- `co-campus.getCanteenFullData(campusName)`
- `co-campus.getCampusDishCandidates(canteenIds, limit)`
- `co-ai.getAiConfig(token)`

检查目标：

- 校园列表能读到已审核校园。
- 饭堂能按校园名读取。
- 档口能按饭堂 ID 读取。
- 菜品能按档口 ID 读取。
- 校园抽餐候选菜品必须按饭堂 ID 数组读取，不能把校园名误传进去。
- AI 配置页没有配置或关闭时，不应触发高成本 AI 调用。

## 当前测试数据情况

上一次完整测试中观察到的健康数据量：

| 数据类型 | 数量 | 说明 |
| --- | ---: | --- |
| 已入驻校园 | 1 | 校园读取正常 |
| 饭堂 | 8 | 可通过校园关联读取 |
| 档口 | 7 | 可通过饭堂 ID 关联读取 |
| 校园菜品 | 23 | 可参与校园版抽餐 |
| 校园服务 | 5 | 服务列表可读 |
| 普通版菜品 | 0 | 当前普通版菜品库为空 |
| 用户 | 0 | 测试时没有真实用户数据 |
| 历史记录 | 0 | 测试时没有真实历史数据 |
| 入驻申请 | 0 | 测试时没有真实申请数据 |
| AI 配置 | 已检查 | 需要以后台配置为准 |

补充说明：

- 旧数据里可能存在部分菜品缺少 `canteenId` 的情况。
- 当前 `co-campus` 已经做了兼容，可以通过 `stallId` 推导饭堂信息。
- 如需清理历史数据，建议先用 `scripts/normalize-campus-dishes.js` 预览模式检查，再确认是否执行写入修复。

## 已发现并处理的问题

### 1. 档口和菜品写接口缺少管理员鉴权

风险：

- 普通用户或脚本可能绕过前端直接调用云对象写接口。
- 恶意新增、修改、软删除档口和菜品会造成数据库写入量上升。

处理：

- 已为 `co-campus` 中档口、菜品写接口增加 token 和管理员 openid 校验。
- 未配置 `ADMIN_OPENIDS` 时默认拒绝写入，这是安全默认值。

上线提醒：

- 必须把管理员微信 openid 填入 `ADMIN_OPENIDS`。
- 修改云函数后要在 HBuilderX 上传云函数，线上才会生效。

### 2. 抽餐后 state/history 分开同步，可能放大云调用

风险：

- 一次抽餐后同时同步状态和历史，如果分成多个云调用，会增加云函数调用次数。
- 用户高频抽餐时，调用量和数据库写入量会被放大。

处理：

- 已将抽餐后的 state/history 合并同步到统一的 `syncAppData` 流程。
- 保留本地优先和防抖同步策略，避免每次状态变化都立刻打到云端。

### 3. 首页 AI 不应自动触发

风险：

- AI 调用是外部 API 成本点。
- 如果首页进入、刷新、抽餐后自动调用 AI，用户量上来后容易造成费用压力。

处理：

- 首页 AI 改为用户主动点击后触发。
- 没有云端登录时，AI 再挑一次会先提示登录。
- AI 未配置或调用失败时，保持模板推荐理由，不阻断用户体验。

### 4. 校园入驻提交不应本地假提交

风险：

- 未登录或云端不可用时，如果把申请保存到本地，用户可能误以为已经进入后台审核流程。
- 后台管理端实际看不到本地保存的数据。

处理：

- 校园入驻可以先本地保存草稿。
- 正式提交必须云端登录。
- `submitCampusApplication()` 现在没有云端登录会直接拒绝提交。

### 5. 必要功能缺少统一登录判定

风险：

- 历史记录、AI、校园入驻这类功能如果不加登录判定，用户体验和数据同步状态会不一致。
- 有些功能依赖云端 token，不登录时继续操作会产生失败或本地假数据。

处理：

- 新增统一 `requireLogin()` 守卫。
- 已接入：
  - 首页 AI 再挑一次。
  - 校园入驻入口。
  - 校园入驻正式提交。
  - 历史记录入口。
  - 历史记录页面直达。
- 从受限功能跳到“我的”页时，会自动打开登录面板。

## 当前仍需上线前处理

### 1. 填入 `ADMIN_OPENIDS`

位置：

```text
uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js
```

不填的结果：

- 管理员写接口全部返回无权限。
- 后台审核、饭堂、档口、菜品等写操作无法正常生效。

### 2. 上传云函数

如果本地改了云对象，必须在 HBuilderX 中上传：

```text
uniCloud-aliyun/cloudfunctions/
```

否则本地代码改了，但线上云函数仍然是旧版本。

### 3. 检查普通版菜品数据

当前普通版菜品数量为 0。

影响：

- 普通版如果完全依赖云端普通菜品库，可能没有可抽数据。
- 如果前端还有本地 mock 菜品，则短期不阻塞，但上线前最好补齐数据库数据。

### 4. 谨慎处理 `unpackage/`

测试和运行小程序后，`unpackage/dist/...` 会出现编译产物变化。

处理建议：

- 不把它当源码编辑。
- 提交代码时通常不要提交 `unpackage/`。
- 重点提交 `pages/`、`utils/`、`uniCloud-aliyun/`、`docs/`、`scripts/` 里的真实源码和文档。

## 后续建议测试流程

每次上线前建议按这个顺序走：

1. 执行静态检查：

```powershell
node scripts\cloud-connectivity-check.js
```

2. 打开后台首页和核心列表页，确认页面不报错。

3. 只读检查数据关联：

- 校园 → 饭堂
- 饭堂 → 档口
- 档口 → 菜品
- 校园饭堂 → 抽餐候选菜品

4. 用无 token 或普通 token 测写接口拒绝逻辑，确认不会产生测试数据。

5. 用管理员账号测试真实写流程：

- 新增/编辑/删除档口。
- 新增/编辑/删除菜品。
- 审核校园入驻申请。
- 修改 AI 配置。

6. 小程序端测试：

- 未登录时点历史记录，应提示登录。
- 未登录时点 AI 再挑一次，应提示登录。
- 未登录时提交校园入驻，应提示登录。
- 登录后提交入驻，后台能看到申请。
- 抽餐后历史记录能本地保存，并按合并同步逻辑同步云端。

## 当前结论

目前静态连通性检查结果健康，云对象、数据库 schema、前端适配层和页面路由没有发现阻断问题。

主要上线阻塞点是：

- `ADMIN_OPENIDS` 仍为空。
- 需要上传最新云函数。
- 普通版菜品数据为空，需要确认是否补数据。

登录限制、AI 主动触发、抽餐同步合并、写接口鉴权这些关键风险已经做过修复或加固。
