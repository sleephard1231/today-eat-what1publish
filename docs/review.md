# 代码 Review 记录

审查时间：2026-04-29

## 审查范围

- 前端源码：`pages`、`utils`、`common`、`pages.json`
- 云函数与数据库 schema：`uniCloud-aliyun/cloudfunctions`、`uniCloud-aliyun/database`
- 未重点审查：`unpackage/dist` 编译产物

## 已修复问题

### 1. 微信 AppSecret 硬编码

- 严重级别：严重
- 涉及文件：`uniCloud-aliyun/cloudfunctions/co-user/index.obj.js`
- 原问题：`WX_APPSECRET` 直接写在源码里，提交仓库后等同于泄露。
- 当前处理：改为读取云函数环境变量 `WX_APPSECRET`，未配置时微信登录安全失败。
- 后续动作：需要在微信公众平台轮换已泄露的 AppSecret，并在云函数环境变量中重新配置。

### 2. 后台默认账号硬编码

- 严重级别：严重
- 涉及文件：`uniCloud-aliyun/cloudfunctions/co-user/index.obj.js`
- 原问题：后台账号密码为 `admin/admin123`，任何能调用云对象的人都可能登录后台。
- 当前处理：改为读取 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD_SHA256` 环境变量。
- 后续动作：部署前配置强密码的 SHA-256 值。

### 3. Admin 接口缺少鉴权

- 严重级别：严重
- 涉及文件：`uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js`、`uniCloud-aliyun/cloudfunctions/co-user/index.obj.js`
- 原问题：申请列表、审核、饭堂/档口增删改、用户列表、用户统计等后台接口缺少统一鉴权。
- 当前处理：增加后台 token 鉴权，Admin 方法需要传 `token` / `adminToken` / `accessToken`。
- 当前处理：小程序端审核接口增加 `ADMIN_OPENIDS` 白名单校验，未配置时默认拒绝。

### 4. 空缓存使用字符串导致渲染风险

- 严重级别：高
- 涉及文件：`utils/app-state.js`
- 原问题：饭堂/档口空结果缓存为字符串 `'empty'`，后续调用可能把字符串当数组使用。
- 当前处理：空结果缓存为 `[]`，读取缓存时使用 `Array.isArray` 判断。

### 5. 默认饭堂重复初始化

- 严重级别：高
- 涉及文件：`uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js`
- 原问题：`canteenCol.count()` 返回字段为 `total`，代码误取 `count`，导致每次初始化都认为表为空并重复插入。
- 当前处理：改为读取 `total`，并按 `campusName + name` 做幂等检查。
- 当前处理：新增 `cleanupDuplicateCanteens` 管理接口，可预览并删除重复饭堂数据。

## 待处理问题

### 1. 切换校园后饭堂页可能显示旧学校数据

- 严重级别：中
- 涉及文件：`pages/canteen/canteen.vue`
- 问题描述：云端饭堂列表只在 `onLoad` 请求，`onShow` 只刷新本地状态。用户切换校园后返回饭堂页，`cloudCanteenList` 可能仍是上一个学校的数据。
- 建议修复：在 `onShow` 根据当前校园名重新拉取云端饭堂，并在校园变化时清空旧的 `cloudCanteenList`。

### 2. 审核通过的云端校园不会进入前台校园列表

- 严重级别：中
- 涉及文件：`utils/app-state.js`、`pages/campus/select.vue`
- 问题描述：已导入 `cloudGetApprovedCampuses`，但 `getCampusList()` 仍只合并预设校园和本地申请，云端审核通过的校园不会展示到前台选择页。
- 建议修复：增加云端校园列表缓存与刷新入口，`pages/campus/select.vue` 在加载时拉取并合并。

### 3. AI 推荐理由未实际接入首页抽餐流程

- 严重级别：中
- 涉及文件：`utils/app-state.js`、`pages/index/index.vue`
- 问题描述：已有 `aiGenerateReasonForMeal()`，但 `drawMealResult()` 仍同步调用模板 `buildReason()`，首页展示的推荐理由不是云端 AI 生成。
- 建议修复：抽餐先展示模板兜底理由，再异步请求 AI 理由并更新弹窗/历史记录。

### 4. 内容安全检查云函数未接入提交入口

- 严重级别：中
- 涉及文件：`utils/app-state.js`、`pages/campus/join.vue`、`uniCloud-aliyun/cloudfunctions/co-content/index.obj.js`
- 问题描述：已封装 `cloudCheckText`，但校园入驻申请的学校名、联系人等文本提交前未调用内容安全检查。
- 建议修复：在提交云端申请前校验文本；云函数侧也应再次校验，避免绕过前端。

### 5. 部分云函数配置仍是占位符

- 严重级别：中
- 涉及文件：`uniCloud-aliyun/cloudfunctions/co-content/index.obj.js`、`uniCloud-aliyun/cloudfunctions/co-ai/index.obj.js`
- 问题描述：内容安全和 AI 云函数仍包含占位配置，如 `你的AppSecret填这里`、`你的DashScope_API_Key填这里`。
- 建议修复：统一改为环境变量读取，并在未配置时安全失败或返回明确错误。

### 6. 管理接口参数与前端/后台调用约定需要统一

- 严重级别：中
- 涉及文件：`docs/uni-admin后台管理开发规范.md`、`uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js`
- 问题描述：当前 Admin 接口增加了 `token` / `adminToken` 校验，后台调用方需要确保所有请求都带上 token。
- 建议修复：统一封装后台请求层，在每个 Admin 请求中自动注入 token，并更新文档示例。

### 7. 云端状态和历史只同步不上拉

- 严重级别：低
- 涉及文件：`utils/app-state.js`、`utils/user-state.js`
- 问题描述：已实现 `cloudSyncState` / `cloudSyncHistory`，但登录成功后没有拉取 `cloudGetState` / `cloudGetHistory` 合并到本地。
- 建议修复：云端登录成功后拉取云端状态和历史，设计本地/云端冲突合并策略。

### 8. 构建产物进入工作区变更

- 严重级别：低
- 涉及目录：`unpackage/dist`
- 问题描述：`git status` 中存在大量 `unpackage/dist` 编译产物变更，容易干扰 review 和提交。
- 建议修复：确认是否应加入 `.gitignore`；如果确实不需要版本管理，后续提交中排除该目录。

## 部署与配置 Checklist

- 配置 `WX_APPSECRET`，并轮换已经泄露的旧 AppSecret。
- 配置 `ADMIN_USERNAME`。
- 配置 `ADMIN_PASSWORD_SHA256`。
- 配置 `ADMIN_OPENIDS`，多个 openid 用英文逗号分隔。
- 后台所有 Admin 请求携带 `token` / `adminToken` / `accessToken`。
- 部署更新后的 `co-user` 和 `co-campus` 云函数。
- 先 dry run 清理重复饭堂：`cleanupDuplicateCanteens({ token, campusName: '广州商学院', dryRun: true })`。
- 确认重复数量后执行清理：`cleanupDuplicateCanteens({ token, campusName: '广州商学院', dryRun: false })`。

## 已执行验证

- `node --check uniCloud-aliyun/cloudfunctions/co-user/index.obj.js`
- `node --check uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js`
- `node --check utils/cloud.js`
- `git diff --check`
- 敏感字符串扫描：未再发现旧 `WX_APPSECRET`、`admin123`、`'empty'` 缓存标记。
