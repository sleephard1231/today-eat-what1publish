# CLAUDE

## 目的

这份文件用于约定这个项目的长期协作方式。

以后无论是继续开发新功能、调整页面、补后端，还是做代码整理，都默认优先遵守这份文档。

如果需要了解项目结构分析和架构背景，请同时参考：

- [PROJECT_SPEC.md](./PROJECT_SPEC.md)

## 项目定位

- 项目类型：`uni-app` + `Vue 3` 微信小程序
- 产品风格：暖奶油风、轻松感、偏生活化
- 当前双主题模式：
  - `普通版`
  - `校园版`
- 当前数据模式：
  - 本地优先
  - 配置驱动
  - 暂未正式接入后端

## 代码真相来源

### 页面层

- `pages/*`
- 页面文件负责：
  - 页面结构
  - 页面交互
  - 页面动画
  - 页面自己的计算状态

### 静态配置层

- `common/data.js`
- 这里放：
  - 主题色配置
  - MBTI / 星座静态数据
  - 预置学校
  - 饭堂 mock 数据
  - 校园服务 mock 数据
  - 其他共享静态业务内容

### 业务状态层

- `utils/app-state.js`
- 这里放：
  - 本地存储读写
  - app 状态初始化
  - 每日重置逻辑
  - 运势生成
  - 吃什么推荐逻辑
  - 历史记录持久化
  - 校园申请持久化
  - 饭堂选择持久化
  - tabBar 主题切换逻辑

### 用户状态层

- `utils/user-state.js`
- 这里放：
  - 用户登录态管理
  - 本地用户信息存储（openId、token、头像、昵称）
  - 用户状态变更通知（`uni.$emit('user-state-changed')`）

### 第三方插件

- `uni_modules/pyh-nv/` — 自定义导航栏组件，所有页面均使用 `navigationStyle: "custom"` + 此组件
- `uni_modules/uni-icons/` — 官方图标库
- `uni_modules/uni-scss/` — 官方 SCSS 变量库

### 构建产物

- `unpackage/`
- 只当成编译结果看待
- 不要把这里当源码编辑

## 必须遵守

### DO

- 要让页面文件主要负责 UI 和交互，不承担过重业务逻辑
- 要把共享业务逻辑收进 `utils/app-state.js`
- 要把共享静态数据收进 `common/data.js`
- 要保持当前项目已有命名风格
- 要用 `camelCase` 命名变量、函数、计算属性
- 要用 `UPPER_SNAKE_CASE` 命名常量
- 要保持页面路由文件小写
- 要只在真正可复用组件里使用 `PascalCase` 文件名
- 要保持暖奶油风格不跑偏
- 要保持双主题逻辑稳定：
  - 普通版偏暖橙
  - 校园版偏薄荷绿
- 要优先复用 `themeMap`，不要到处手写颜色
- 要优先保证用户体验顺滑，不要轻易抛异常中断流程
- 要合理使用 `uni.showToast` 和 `uni.showModal` 做交互反馈
- 要把共享按压反馈、共享基础样式收敛到 `uni.scss`
- 要让文案保持轻松、简洁、像产品，而不是像后台提示
- 要有明确的空状态设计（图标 + 简短文案），不要让用户看到空白或加载失败时困惑
- 动效要克制：单页同类动效不超过 2 个并发，卡片内优先保留 1 个核心动效，不要 3-4 个同时跑

### DON'T

- 不要随意引入 Pinia / Vuex
- 不要随意引入 Tailwind、CSS Modules、CSS-in-JS
- 不要在页面里四处直接写 `uni.request(...)`
- 不要把主题色硬编码在很多页面里
- 不要手改 `unpackage/`
- 不要为了一个小效果引入很重的依赖
- 不要把后端请求逻辑和页面 UI 杂糅在一起
- 不要为了“看起来规范”就过度抽组件
- 不要让同一个产品概念在不同页面用不同叫法
- 不要留下语气不统一、像占位符一样的文案

## 命名规范

### 文件命名

- 页面路由文件：
  - `pages/index/index.vue`
  - `pages/my/my.vue`
- 共享工具文件：
  - `utils/app-state.js`
  - `utils/user-state.js`
- 共享配置文件：
  - `common/data.js`
- 可复用组件文件：
  - `components/CustomTabBar.vue`

### 代码命名

- 变量：
  - `currentCampus`
  - `selectionStateStyle`
- 事件处理函数：
  - `handleDrawMeal`
  - `handleSaveSelection`
- 刷新类函数：
  - `refreshState`
  - `refreshPage`
- 常量：
  - `STATE_KEY`
  - `DAILY_LIMIT`

## 样式规范

### 基础方式

- 使用 `<style lang="scss">`
- 布局、间距、结构主要用 SCSS 类名
- 主题相关的颜色、边框、阴影优先用 `computed` 内联样式对象

### 主题规范

- 所有主题色优先从 `themeMap` 获取
- 普通版要保持：
  - 暖
  - 橙
  - 奶油感
- 校园版要保持：
  - 薄荷绿
  - 柔和
  - 不能做成冷冰冰的功能页

### UI 一致性

- 卡片保持大圆角、柔和阴影
- 标签、小 badge、按钮圆角要统一语言
- 按压反馈要统一
- 不要出现一页一个风格的情况
- 除非非常必要，不要引入和当前奶油风冲突的视觉体系

## 文案规范

### 文案语气

整个项目的文案应该是：

- 轻一点
- 干净一点
- 友好一点
- 不要太像后台系统
- 不要太长

### 推荐语气参考

- `今天想去哪家饭堂吃饭？`
- `按你的性格和星座，给今天挑一口更对味的。`
- `会按你当前选择的学校，自动展示对应的校园服务。`

### 避免

- 太生硬的说明文
- 太像技术提示或管理后台的话
- 同一个东西多个名字
- 卡片里堆太长的一段说明

### 术语统一

这些词后续尽量固定：

- 普通版
- 校园版
- 当前校园
- 校园饭堂
- 校园专属服务
- 历史记录
- 校园入驻申请

## 新增页面规范

以后新增页面，默认按这个顺序：

1. 在 `pages.json` 注册路由
2. 在 `pages/<feature>/` 下创建页面目录
3. 页面内部用 `ref` / `computed` 管理本地状态
4. 共享业务逻辑优先从 `utils/app-state.js` 调
5. 用户身份相关逻辑优先从 `utils/user-state.js` 调
6. 共享静态数据优先从 `common/data.js` 调
7. 所有主题相关样式优先接入 `themeMap`
8. 页面要有空状态设计，尤其是依赖模式或依赖数据时
9. 文案要像产品文案，不要像临时占位

## 后端接入规范

当前状态：

- 已接入 uniCloud（阿里云服务空间）
- 云对象：`co-user`（微信登录/用户资料/状态同步）、`co-campus`（校园入驻申请/审核）、`co-content`（内容安全检查）
- 前端适配层：`utils/cloud.js`
- 数据库集合：`eat-what-users`、`eat-what-state`、`eat-what-history`、`eat-what-applications`
- 数据库 schema：`uniCloud-aliyun/database/*.schema.json`

### 云端架构

```
前端页面
  ↓ 调用
utils/cloud.js（云端适配层，封装云对象调用 + 降级策略）
  ↓ 调用
uniCloud 云对象
  ├── co-user      → 微信登录(openId) / 用户资料 / 状态同步 / 历史同步
  ├── co-campus    → 校园入驻申请 / 审核 / 已入驻校园列表
  ├── co-content   → 文本内容安全检查(微信 msgSecCheck)
  └── co-ai        → AI 推荐理由生成（通义千问 DashScope API）
  ↓ 读写 / 调外部 API
uniCloud 数据库          外部 AI 服务
  ├── eat-what-users         ─┐
  ├── eat-what-state          │  通义千问 (qwen-turbo)
  ├── eat-what-history       ←┘  DashScope API
  └── eat-what-applications
```

**AI 推荐理由流程：**
1. 用户点「吃什么」→ 立即显示模板理由（<100ms，无感）
2. 后台异步调 `co-ai.generateReason()` → 通义千问生成个性化文案（~1-2s）
3. AI 返回后平滑替换理由文本
4. AI 失败则保持模板理由不变（用户无感知降级）

### 降级策略

- 云端登录失败 → 自动降级为本地模拟登录（`local_openid_xxx`）
- 云端同步失败 → 仅本地存储，不阻塞用户操作
- 内容安全检查失败 → 暂时放行，不阻塞提交
- 用户可通过 `isCloudUser()` 判断是否为云端登录用户

### 上线前必须修改

1. **WX_APPSECRET**：在 `co-user/index.obj.js` 和 `co-content/index.obj.js` 中填入真实的 AppSecret
2. **DASHSCOPE_API_KEY**：在 `co-ai/index.obj.js` 中填入通义千问 API Key（阿里云 DashScope 控制台获取）
3. **ADMIN_OPENIDS**：在 `co-campus/index.obj.js` 中填入管理员 openid
4. **开通内容安全能力**：微信公众平台 → 开发管理 → 接口设置 → 内容安全
5. **上传云函数**：在 HBuilderX 中右键 `uniCloud-aliyun/cloudfunctions/` → 上传所有云函数
6. **创建数据库集合**：在 uniCloud 控制台创建 4 个集合，或上传 schema 自动创建

### 开发规范

- 所有云对象调用统一通过 `utils/cloud.js`，页面里不要直接 `uniCloud.importObject`
- 云函数错误优先 `console.warn`，不要直接弹窗阻塞用户
- 保持当前页面结构稳定，不要让页面因为接后端而变得很重

## 错误处理规范

- 优先软失败，不要轻易让页面崩掉
- 本地存储优先走安全包装
- 可降级的问题优先 `console.warn(...)`
- 只有真的影响用户流程时再做提示
- 不要把原始技术错误直接展示给用户

## 代码评审清单

每次改完，至少检查这些：

- 文件命名有没有破坏当前习惯
- 业务逻辑是不是又堆回页面里了
- 主题色是不是优先复用了 `themeMap`
- 普通版还是不是暖橙调
- 校园版还是不是薄荷绿调
- 文案语气是不是和现有页面一致
- 有没有误改生成目录
- 交互反馈有没有和现有页面统一

## 提交前检查清单

- `pages.json` 路由是否正确
- 新页面路径是否和实际文件一致
- 有没有误改 `unpackage/`
- 有没有新增没用的大文件
- 有没有留下没引用的占位资源
- 普通版 / 校园版 两套主题都看过
- 中文字符串有没有继续乱码
- mock 数据和 UI 文案有没有统一口径

## 当前技术债

这些不是立刻阻塞，但要长期记着：

1. `components/CustomTabBar.vue` 存在但未被任何页面引用，当前实际仍用 `pages.json` 原生 tabBar
2. `uni_modules/pyh-nv/` 组件内部使用了 `uni.getSystemInfoSync()`（已弃用），但这是第三方组件暂不修改
3. 头像上传目前用 `uni.chooseImage` 的临时路径，云端用户头像需要对接云存储（uniCloud.uploadFile）实现永久存储
4. 云函数中的 `ADMIN_OPENIDS` 为空数组，审核功能需要填入管理员 openid 才能使用
5. AI 推荐理由目前是"先显示模板、后台替换"模式；后续可考虑加 loading 态或骨架屏让用户感知到正在 AI 生成
6. 通义千问 API 有免费额度（qwen-turbo 约 100万 token/月），超量后需付费

## 默认决策顺序

如果一个问题有多种写法，优先按这个顺序选：

1. 改动更小
2. 更贴合当前项目结构
3. 云端优先 + 本地降级的数据模式
4. 更能复用现有主题 token
5. 更符合当前奶油风界面

