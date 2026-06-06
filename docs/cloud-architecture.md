# 云端架构设计文档

> 基于项目代码审查，为「今天吃什么」小程序设计完整的云函数、云对象和数据表方案。

---

## 一、数据表设计（9 张表）

### 1. `eat-what-users` — 用户表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | 系统ID |
| openid | string | ✅ | 微信openid |
| unionid | string | | 微信unionid |
| sessionKey | string | | 微信会话密钥 |
| token | string | | 自定义登录态 |
| nickname | string | | 昵称 |
| avatar | string | | 头像URL |
| profile | object | | `{ mbti, zodiac }` |
| loginMode | string | | `cloud` / `local` |
| createdAt | timestamp | 自动 | 创建时间 |
| updatedAt | timestamp | 自动 | 更新时间 |

### 2. `eat-what-state` — 应用状态表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | 系统ID |
| openid | string | ✅ | 用户openid |
| mode | string | | `normal` / `campus` |
| campusId | string | | 当前校园ID |
| profile | object | | `{ nickname, mbti, zodiac, avatar, openId }` |
| daily | object | | `{ dateKey, remaining, lastResult }` |
| stats | object | | `{ servedCount }` |
| selectedCanteen | object | | `{ campusId: [{id,name}] }` |
| updatedAt | timestamp | 自动 | 更新时间 |

### 3. `eat-what-history` — 历史记录表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | 系统ID |
| openid | string | ✅ | 用户openid |
| records | array | | 历史记录列表（最多30条） |
| updatedAt | timestamp | 自动 | 更新时间 |

### 4. `eat-what-applications` — 入驻申请表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | 系统ID |
| openid | string | ✅ | 申请人openid |
| campusId | string | | 生成的校园ID |
| campusName | string | ✅ | 学校名称 |
| campusTag | string | | 校区标志 |
| city | string | | 所在城市 |
| contactName | string | | 联系人网名 |
| contactPhone | string | | 联系邮箱 |
| status | string | | `待审核`/`已通过`/`已拒绝` |
| reviewNote | string | | 审核备注 |
| reviewedBy | string | | 审核人 |
| reviewedAt | timestamp | | 审核时间 |

### 5. `eat-what-campuses` — 校园表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | ✅ | 校园ID，如 `gzcc` |
| name | string | ✅ | 学校全称 |
| shortName | string | | 简称 |
| campusTag | string | | 校区标志 |
| district | string | | 区域/城市 |
| specialties | array | | 特色菜列表 |
| status | string | | `active` / `inactive` |

### 6. `eat-what-canteens` — 饭堂表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | ✅ | 饭堂ID，如 `gzcc-tongde` |
| campusName | string | ✅ | 所属学校名称 |
| name | string | ✅ | 饭堂名称 |
| remark | string | | 备注 |
| sort | int | | 排序 |
| status | string | | `active` / `inactive` |

### 7. `eat-what-stalls` — 档口表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | 档口ID |
| canteenId | string | ✅ | 所属饭堂ID |
| name | string | ✅ | 档口名称 |
| category | string | | 分类 |
| remark | string | | 备注 |
| sort | int | | 排序 |

### 8. `eat-what-dishes` — 菜品表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | 菜品ID |
| stallId | string | ✅ | 所属档口ID |
| canteenId | string | | 所属饭堂ID（冗余） |
| name | string | ✅ | 菜品名称 |
| category | string | | 分类 |
| tag | string | | 标签（人气/新品/推荐） |
| price | string | | 价格 |
| vibe | string | | 氛围标签 |
| sort | int | | 排序 |

### 9. `eat-what-services` — 校园服务表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | ✅ | 服务ID |
| campusName | string | ✅ | 所属学校名称 |
| icon | string | | 图标emoji |
| name | string | ✅ | 服务名称 |
| remark | string | | 服务说明 |
| externalUrl | string | | 外部链接 |
| sort | int | | 排序 |

---

## 二、云对象接口一览

### co-user
- `wxLogin(code, userInfo)` — 微信登录
- `getProfile(token)` — 获取用户资料
- `updateProfile(token, profileData)` — 更新用户资料
- `syncState(token, stateData)` — 同步应用状态
- `getState(token)` — 获取应用状态
- `syncHistory(token, historyList)` — 同步历史记录
- `getHistory(token)` — 获取历史记录

### co-campus
- `submitApplication(token, formData)` — 提交入驻申请
- `getMyApplications(token)` — 获取我的申请列表
- `getApprovedCampuses()` — 获取已入驻校园列表（公开）
- `getCanteensByCampus(campusName)` — 获取饭堂列表
- `getStallsByCanteen(canteenId)` — 获取档口列表（含菜品）
- `getCanteenFullData(campusName)` — 获取完整饭堂数据
- `getServicesByCampus(campusName)` — 获取校园服务列表
- `getPendingApplications(token)` — 获取待审核列表（管理员）
- `reviewApplication(token, applicationId, action, note)` — 审核申请（管理员）

### co-content
- `checkText(content, scene, openid)` — 单条文本安全检查
- `checkTextBatch(contents, scene, openid)` — 批量文本安全检查

### co-ai
- `generateReason(context)` — AI生成推荐理由
- `batchGenerateReasons(contexts)` — 批量生成
- `generateFortuneText(context)` — AI生成运势文案

---

## 三、上线前必须修改的配置

| 配置项 | 文件位置 | 说明 |
|--------|----------|------|
| `WX_APPID` | `co-user/index.obj.js` | 微信小程序 AppID |
| `WX_APPSECRET` | `co-user/index.obj.js` | 微信小程序 AppSecret |
| `WX_APPID` | `co-content/index.obj.js` | 微信小程序 AppID |
| `WX_APPSECRET` | `co-content/index.obj.js` | 微信小程序 AppSecret |
| `AI_API_KEY` / `KIMI_API_KEY` / `DEEPSEEK_API_KEY` / `GLM_API_KEY` | `co-ai/index.obj.js` | AI API Key 兜底配置；优先使用后台“AI 推荐设置”保存的密钥 |
| `ADMIN_OPENIDS` | `co-campus/index.obj.js` | 管理员 openid 数组 |

---

## 四、部署步骤

1. **创建 uniCloud 服务空间**：在 HBuilderX 中创建阿里云服务空间
2. **上传数据库 Schema**：右键 `uniCloud-aliyun/database/` → 上传所有 DB Schema
3. **创建数据库集合**：uniCloud 控制台确认 9 个集合已自动创建
4. **上传云函数/云对象**：右键 `uniCloud-aliyun/cloudfunctions/` → 上传所有云函数
5. **运行初始化**：右键 `db-init/index.js` → 上传运行，初始化基础数据
6. **开通内容安全**：微信公众平台 → 开发管理 → 接口设置 → 内容安全
7. **填写配置**：修改各云对象中的配置项，重新上传
