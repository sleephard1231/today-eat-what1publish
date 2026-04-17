# PROJECT_SPEC

## 项目概览

- 项目类型：`uni-app` + `Vue 3` 微信小程序
- 运行方式：以页面为核心的微信小程序项目
- 当前数据模式：本地优先、配置驱动
- 当前入口文件：
  - `App.vue`
  - `main.js`
  - `pages.json`
- 关键业务文件：
  - `common/data.js`
  - `utils/app-state.js`

### 当前项目的几个真实现状

- 当前还没有正式启用后端接口层
- `api/index/index.js` 已经预留，但目前为空
- 业务状态和交互逻辑目前主要依赖：
  - 本地存储
  - 静态配置
  - 页面级计算状态

## 架构模式判断

### 当前架构更接近什么

这个项目**不是典型 MVC**，也**不是完整意义上的领域驱动设计**。

它目前更接近以下组合：

- **页面驱动架构**
- **配置驱动 + 业务工具层集中管理**
- **本地状态集中编排模式**

### 实际结构职责

- `pages/*`
  - 负责页面 UI
  - 负责页面交互
  - 负责页面自己的动画和显示逻辑
- `common/data.js`
  - 存放静态业务配置
  - 例如：
    - MBTI 数据
    - 星座数据
    - 学校数据
    - 饭堂数据
    - 校园服务数据
    - 主题配置
- `utils/app-state.js`
  - 是当前项目最核心的业务状态文件
  - 负责：
    - 本地存储封装
    - app 状态初始化
    - 每日重置逻辑
    - 运势生成
    - 吃什么推荐逻辑
    - 历史记录存储
    - 校园申请存储
    - 饭堂选择存储
    - tabBar 主题切换
- `components/*`
  - 放可复用 UI 组件
  - 当前使用量不大

### 推荐的架构描述方式

以后如果要对外描述这个项目，建议统一说法为：

> 这是一个以页面为中心的 uni-app 微信小程序项目，静态业务配置集中在 `common/data.js`，本地业务状态和核心逻辑集中在 `utils/app-state.js`。

## 目录规范

### 当前目录结构

```text
vue3+uniapp/
├─ App.vue
├─ main.js
├─ manifest.json
├─ pages.json
├─ uni.scss
├─ api/
├─ common/
├─ components/
├─ pages/
├─ static/
├─ utils/
├─ uni_modules/
└─ unpackage/
```

### 各目录职责

- `pages/`
  - 页面级功能目录
  - 一个功能页一般一个子目录
- `common/`
  - 放共享静态配置和共享业务常量
- `utils/`
  - 放共享业务逻辑和本地状态处理
- `components/`
  - 放复用组件
- `api/`
  - 预留给后端请求层
  - 当前尚未正式启用
- `static/`
  - 放静态资源
  - 如图片、图标、tabBar 资源等
- `unpackage/`
  - 编译产物目录
  - 不是源码目录

## 命名偏好

### 文件命名习惯

当前项目的命名倾向比较明确：

- 页面目录：小写
  - 例如：`pages/index/`
  - 例如：`pages/canteen/`
- 页面文件名：与目录同名，小写
  - 例如：`pages/index/index.vue`
  - 例如：`pages/canteen/canteen.vue`
- 工具文件 / 配置文件：小写或 kebab-case
  - 例如：`common/data.js`
  - 例如：`utils/app-state.js`
- 可复用组件：PascalCase
  - 例如：`components/CustomTabBar.vue`

### 标识符命名习惯

- 变量 / 函数 / 计算属性：`camelCase`
  - 例如：`currentCampus`
  - 例如：`handleDrawMeal`
  - 例如：`selectionStateStyle`
- 常量：`UPPER_SNAKE_CASE`
  - 例如：`STATE_KEY`
  - 例如：`DAILY_LIMIT`
- 本地存储 key：字符串常量，小写风格
  - 例如：`'eat-what-state'`
  - 例如：`'selectedCanteen'`

### 建议继续保持的命名规则

- 页面文件保持小写
- 共享工具文件保持小写或 kebab-case
- 只有真正可复用的组件才使用 PascalCase
- JS 标识符统一用 camelCase
- 常量统一用 UPPER_SNAKE_CASE

## 核心逻辑范式

### 状态管理方式

当前项目**没有使用 Pinia / Vuex**。

状态管理主要依赖：

- `ref`
- `computed`
- `onLoad`
- `onShow`
- `utils/app-state.js`

也就是说，这个项目当前采用的是：

> **工具函数集中管理状态，而不是状态库集中管理状态**

### 业务状态中心

`utils/app-state.js` 当前承担的是项目级“轻量状态中心”的角色。

它负责的内容包括：

- app 状态初始化
- 本地存储读写
- 学校列表生成
- 当日状态重置
- 今日运势生成
- 今日吃什么推荐结果生成
- 历史记录持久化
- 校园申请持久化
- 已选饭堂持久化
- tabBar 主题切换

### 错误处理习惯

当前项目更倾向于“温和失败”而不是“强中断”。

常见做法：

- 用安全封装避免异常直接炸页面
  - 例如：
    - `safeRead`
    - `safeWrite`
- 出错时优先：
  - 返回兜底值
  - `console.warn(...)`
  - 用 toast 给用户轻提示

可以概括为：

> **优先保体验，尽量不让页面因为一个异常直接中断**

### API 请求范式

当前状态：

- 还没有正式接入请求层
- `api/` 目录已经存在，但暂未使用
- 目前业务逻辑几乎全部是本地模式

后续推荐做法：

- 后端请求统一进入 `api/*`
- 页面文件里不要直接四处散写 `uni.request(...)`
- 接口数据的整理和转换，尽量放在 `utils/` 或单独的 service 层

### 页面交互范式

当前页面的典型逻辑流大多是：

1. 页面加载或显示时执行 `refreshState()` / `refreshPage()`
2. 从 `utils/app-state.js` 取状态
3. 通过 `computed` 生成展示层数据
4. 用户操作后调用业务工具函数保存
5. 用 `uni.showToast` / `uni.showModal` 给反馈

这是当前项目非常典型的交互模式。

## UI / CSS 规范

### 当前样式体系

项目当前使用的是：

- 原生 SFC 样式
- `<style lang="scss">`
- 无 Tailwind
- 无 CSS Modules
- 无 CSS-in-JS

### 主题机制

主题由 `common/data.js` 里的 `themeMap` 驱动。

目前主题 token 包括：

- `accent`
- `accentDeep`
- `accentSoft`
- `pageStart`
- `pageEnd`
- `card`
- `cardStrong`
- `border`
- `shadow`

页面通常通过两种方式消费这些 token：

- `computed` 生成内联样式对象
- 页面内 SCSS 类负责布局和结构

这说明当前项目采用的是：

> **JS 配置驱动主题 + 页面内联样式绑定的主题系统**

### 当前界面风格习惯

从现有代码能看出这些明显倾向：

- 大量使用 `rpx`
- 喜欢大圆角卡片
- 喜欢柔和阴影
- 主题色通过动态内联样式控制
- 布局间距和页面结构主要用 SCSS 类名
- 页面动画 keyframes 通常写在页面自身内部
- 大部分页面使用 `navigationStyle: custom`

### 全局样式行为

目前已经形成的全局样式习惯：

- `uni.scss`
  - 放共享点击反馈等全局样式
- `App.vue`
  - 放全局 reset 和基础元素样式

后续建议继续保持：

- 共享交互反馈放 `uni.scss`
- 共享主题 token 放 `common/data.js`
- 页面动画优先保留在页面内部，除非被多个页面复用

## 协作建议

### 功能扩展建议

以后新增功能时，建议默认按这个顺序思考：

1. 先判断是不是静态业务配置
   - 是的话放 `common/data.js`
2. 再判断是不是共享业务逻辑
   - 是的话放 `utils/app-state.js`
3. 页面只负责：
   - UI
   - 页面交互
   - 页面级计算展示
4. 真正重复出现的 UI 再抽组件

### 不建议轻易引入的东西

除非项目规模真的进入下一阶段，否则不建议随意引入：

- Pinia / Vuex
- 局部半吊子 TypeScript 改造
- Tailwind
- 页面里散落的 `uni.request(...)`
- 每个页面自己复制主题变量

### 文案管理建议

当前项目的产品文案很多直接写在页面里，这在现阶段是可以接受的。

后续协作时建议：

- 页面专属短文案继续直接写页面里
- 跨多个页面复用的文案或术语，逐步提炼进共享配置

### 构建目录规则

- `unpackage/` 只看，不改
- 源码修改一律以根目录下真实源码为准

## 当前风险与技术备注

这些问题不一定马上阻塞开发，但需要长期注意：

1. 部分文件仍有中文乱码
   - 特别是：
     - `pages.json`
     - `common/data.js`
     - `utils/app-state.js`
     - 部分页文件
   - 后续建议逐步做文本和编码统一清理

2. `api/` 已预留但尚未启用
   - 当前是纯本地逻辑
   - 后续接后端时要有意识地做层次划分

3. `components/CustomTabBar.vue` 存在，但当前实际走的是 `pages.json` 原生 tabBar
   - 说明项目里有“预留 / 实验过但未启用”的痕迹
   - 后续应避免继续堆积这类未启用结构

## 给未来协作者的简版总结

如果只需要一句话版本，可以用这段：

> 这是一个基于 uni-app 和 Vue 3 的微信小程序项目，采用页面驱动架构，静态配置集中在 `common/data.js`，本地业务状态和核心逻辑集中在 `utils/app-state.js`。页面主要负责展示与交互，不直接承担复杂持久化逻辑。命名上保持页面文件小写、复用组件 PascalCase、变量 camelCase、常量 UPPER_SNAKE_CASE。样式上使用 SCSS 和主题 token，不使用 Tailwind 或 CSS Modules。后续协作应优先保持本地优先、主题统一、结构轻量。

