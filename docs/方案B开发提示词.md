# 方案 B：后台食物池 + AI 三选一推荐

## 结论

采用方案 B，但按当前项目结构调整为：

- 普通版食物池独立维护：`eat-what-normal-dishes`
- 校园版食物池复用现有饭堂数据：`eat-what-canteens` + `eat-what-stalls` + `eat-what-dishes`
- AI 不直接生成菜品，只从前端抽出的 3 个候选里选择 1 个，并生成推荐理由
- 前端先展示模板结果，AI 成功后再平滑替换，AI 失败不影响用户体验

## 数据关系

### 普通版

普通版不属于任何学校、饭堂或档口，单独建表：

`eat-what-normal-dishes`

字段：

```json
{
  "_id": "auto",
  "name": "韩式拌饭",
  "category": "米饭",
  "price": "",
  "vibe": "热闹又满足",
  "tag": "人气",
  "sort": 0,
  "status": "active",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

普通版推荐只从 `status = active` 的普通版菜品池里抽取。云端失败或数据为空时，回退到 `common/data.js` 的 `genericFoods`。

### 校园版

校园版继续使用现有表：

```text
eat-what-canteens  饭堂
eat-what-stalls    商铺/档口
eat-what-dishes    菜品
```

关系：

```text
学校 campusName
↓
饭堂 canteenId
↓
商铺 stallId
↓
菜品 dishId
```

校园版推荐只从用户已选择饭堂里的 `eat-what-dishes.status = active` 菜品中抽取。

## 云对象接口

### `co-campus.getNormalDishCandidates(limit)`

用途：获取普通版可推荐菜品池。

返回统一候选格式：

```js
{
  id,
  name,
  category,
  price,
  vibe,
  tag,
  source: 'normal'
}
```

### `co-campus.getCampusDishCandidates(canteenIds, limit)`

用途：获取校园版可推荐菜品池。

参数：

```js
{
  canteenIds: ['gzcc-tongde', 'gzcc-xingfu'],
  limit: 80
}
```

返回统一候选格式：

```js
{
  id,
  name,
  category,
  price,
  vibe,
  tag,
  source: 'campus',
  canteenId,
  canteenName,
  stallId,
  stallName
}
```

### `co-ai.pickDishFromCandidates(token, payload)`

用途：AI 从 3 个候选里选 1 个，并生成理由。

输入：

```js
{
  mbti: 'ENFJ',
  zodiac: '白羊座',
  mode: 'campus',
  appetite: '旺盛',
  energy: '充沛',
  luck: '小吉',
  candidates: [
    { name: '猪脚饭', vibe: '扎实顶饱', category: '快餐', price: '14', canteen: '同德' },
    { name: '云吞面', vibe: '热乎清爽', category: '粉面', price: '12', canteen: '同德' },
    { name: '烧腊饭', vibe: '香口满足', category: '烧腊', price: '16', canteen: '幸福' }
  ]
}
```

输出：

```js
{
  code: 0,
  choice: 1,
  reason: '今天状态适合吃点热乎的，云吞面轻松又不压胃。'
}
```

安全要求：

- 必须传 token，未登录不调 AI
- `candidates` 最多 3 个
- 每个用户每分钟最多 2 次
- 每个用户每天最多 5 次
- AI 超时后前端保持模板结果
- AI 返回非 JSON 或 choice 越界时降级

## 前端推荐流程

```text
用户点击“吃什么”
↓
根据当前模式获取食物池
↓
随机抽 3 个候选
↓
立即展示第 1 个 + 模板理由
↓
后台异步调用 co-ai.pickDishFromCandidates
↓
AI 成功：
  choice = 0：只替换理由
  choice = 1/2：平滑替换菜品和理由
AI 失败：
  保持原结果
```

## 后台管理

uni-admin 后台需要支持：

- 校园版：继续通过“商铺&菜品管理”维护饭堂菜品
- 普通版：新增“普通版菜品池”页面，管理 `eat-what-normal-dishes`
- 后续可加“AI 设置”页面，用于配置 AI 开关、每日额度、模型和 prompt 风格

API Key 不放前端，不建议在后台明文展示。优先放云对象配置或 uniCloud 安全配置。

## 降级策略

| 场景 | 处理 |
| --- | --- |
| 普通版云端菜品为空 | 回退 `genericFoods` |
| 校园版云端菜品为空 | 回退本地校园特色菜 + `genericFoods` |
| AI 未配置 | 保持模板理由 |
| AI 调用失败 | 保持模板理由 |
| AI 返回格式错误 | 保持模板理由 |
| 用户未登录 | 不调 AI，只用模板理由 |

## 实施文件

主项目：

- `uniCloud-aliyun/database/eat-what-normal-dishes.schema.json`
- `uniCloud-aliyun/cloudfunctions/co-campus/index.obj.js`
- `uniCloud-aliyun/cloudfunctions/co-ai/index.obj.js`
- `utils/cloud.js`
- `utils/app-state.js`
- `pages/index/index.vue`

admin 项目：

- `pages/eat-what/normal-dish/list.vue`
- `pages/eat-what/normal-dish/add.vue`
- `pages/eat-what/normal-dish/edit.vue`
- `pages.json`
