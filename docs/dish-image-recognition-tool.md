# 菜品图片识别本地工具开发文档

## 1. 背景与目标

校园版菜品录入目前主要依赖人工填写。遇到菜单图、价目表、单道菜图片时，手动整理菜名、分类、价格和氛围标签会比较慢，也容易出现同一类菜品命名不统一的问题。

本工具定位为一个独立的本地网页工具：

```text
上传菜品图/菜单图
  -> DashScope 视觉模型识别
  -> 本地可编辑表格校对
  -> 导出 Excel + JSON
  -> 人工导入后台
```

第一版只做识别和整理，不直接写入 uniCloud、不直接改后台数据库、不接入小程序页面。这样可以先验证识别效果和导入格式，避免把 AI 误识别结果直接写进正式菜品池。

## 2. 第一版范围

### 2.1 要做

- 支持本地网页上传多张图片。
- 支持菜品照片、菜单图、价目表图片。
- 调用 DashScope 视觉理解模型识别菜品信息。
- 将多张图片的识别结果合并成一个可编辑表格。
- 支持在表格里修改、删除、补全识别结果。
- 支持导出 `.xlsx` 和 `.json`。
- API Key 只放在本地 Node 服务端环境变量里，不出现在前端页面。

### 2.2 暂不做

- 不直接写入 `eat-what-dishes`。
- 不直接调用当前项目的 `co-campus.addDish`。
- 不做校园、饭堂、档口选择。
- 不做用户登录和权限体系。
- 不做识别历史云端保存。
- 不把工具代码固定放进当前仓库，本文档只沉淀设计。

## 3. 推荐产品形态

第一版建议做成本地网页工具：

```text
本地 Node 服务
  - 保存 DASHSCOPE_API_KEY
  - 接收图片
  - 调用 DashScope
  - 清洗识别结果

本地网页前端
  - 上传图片
  - 显示识别进度
  - 展示可编辑表格
  - 导出 Excel / JSON
```

相比桌面软件，本地网页开发更轻，后续也容易扩展成后台导入页。相比命令行脚本，本地网页更适合人工校对，能明显降低 AI 识别错误进入正式数据的概率。

## 4. 数据字段设计

第一版只导出菜品字段，不包含校园、饭堂、档口归属。

| 字段 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- |
| `name` | 是 | 菜品名称 | `蜜汁叉烧饭` |
| `category` | 否 | 菜品分类 | `烧腊饭`、`粉面`、`小炒` |
| `tag` | 否 | 展示标签 | `人气`、`新品`、`推荐`、`招牌` |
| `price` | 否 | 价格文本，不带货币符号也可以 | `12`、`12-15` |
| `vibe` | 否 | 氛围标签，用于推荐文案 | `甜甜满足`、`酸甜开胃` |

这些字段贴合现有 `eat-what-dishes` 的业务字段，但刻意不包含：

- `stallId`
- `canteenId`
- `sort`
- `status`
- `createdAt`
- `updatedAt`

这些字段应该由后台导入流程或正式数据库写入逻辑生成。

## 5. JSON 导出格式

推荐 JSON 顶层使用对象，方便后续加版本号、来源信息和后台导入辅助字段：

```json
{
  "version": "2.0",
  "source": "dish-image-recognition-tool",
  "exportedAt": "2026-05-04T13:00:00.000Z",
  "meta": {
    "toolVersion": "0.1.0",
    "imageCount": 6,
    "operator": "",
    "notes": ""
  },
  "dishes": [
    {
      "localId": "img_001_dish_001",
      "imageName": "menu-01.jpg",
      "sourceType": "menu",
      "name": "蜜汁叉烧饭",
      "category": "烧腊",
      "tag": "人气",
      "price": "15",
      "vibe": "甜咸满足"
    },
    {
      "localId": "img_001_dish_002",
      "imageName": "menu-01.jpg",
      "sourceType": "menu",
      "name": "番茄肥牛米线",
      "category": "粉面",
      "tag": "推荐",
      "price": "13",
      "vibe": "酸甜开胃"
    }
  ]
}
```

后台如果后续做一键导入，可以只读取 `dishes` 数组；`meta` 用来展示来源信息，`localId/imageName/sourceType` 用来辅助预检和人工校对，不进入正式菜品表。

## 6. Excel 导出模板

Excel 第一行固定为字段名：

| name | category | tag | price | vibe |
| --- | --- | --- | --- | --- |
| 蜜汁叉烧饭 | 烧腊饭 | 人气 | 15 | 甜甜满足 |
| 番茄肥牛米线 | 粉面 | 推荐 | 13 | 酸甜开胃 |

校对规则：

- `name` 为空的行不能导入。
- `price` 保持文本格式，避免 `12-15` 被 Excel 误处理。
- `tag` 建议控制在一个短标签内，不要写成长句。
- `vibe` 建议 2 到 8 个中文字符，保持和现有推荐文案一致。
- 菜名重复时不自动删除，先标记或提示，由人工确认。

## 7. 识别流程

### 7.1 页面流程

```text
打开本地网页
  -> 选择或拖拽多张图片
  -> 点击开始识别
  -> 前端逐张上传到本地服务
  -> 服务端调用 DashScope
  -> 返回结构化菜品数组
  -> 前端合并到表格
  -> 人工修改、删除、补全
  -> 导出 Excel / JSON
```

### 7.2 状态设计

建议每张图片都有独立状态：

| 状态 | 说明 |
| --- | --- |
| `pending` | 已选择，等待识别 |
| `recognizing` | 正在调用模型 |
| `success` | 识别成功 |
| `failed` | 识别失败 |

表格中的每道菜建议保留一个内部临时 ID，方便前端编辑和删除：

```js
{
  localId: "img_001_dish_001",
  imageName: "menu-01.jpg",
  name: "蜜汁叉烧饭",
  category: "烧腊饭",
  tag: "人气",
  price: "15",
  vibe: "甜甜满足"
}
```

导出给后台预检时建议保留 `localId`、`imageName` 和 `sourceType`；正式写入 `eat-what-dishes` 时再移除这些辅助字段。

## 8. 服务端接口草案

### 8.1 `POST /api/recognize`

用途：识别单张图片。

请求：

```text
multipart/form-data
- image: File
```

返回：

```json
{
  "code": 0,
  "data": {
    "imageName": "menu-01.jpg",
    "dishes": [
      {
        "name": "蜜汁叉烧饭",
        "category": "烧腊饭",
        "tag": "人气",
        "price": "15",
        "vibe": "甜甜满足"
      }
    ]
  }
}
```

失败返回：

```json
{
  "code": -1,
  "msg": "这张图暂时没识别出来，可以换张更清晰的试试"
}
```

### 8.2 `POST /api/export/xlsx`

用途：服务端生成 Excel。

也可以不做这个接口，直接由前端用 `xlsx` 类库生成 Excel。第一版推荐前端导出，服务端只负责识别，职责更轻。

## 9. DashScope 调用设计

### 9.1 模型选择

推荐优先使用 DashScope 视觉理解模型。它比普通 OCR 更适合单道菜图片，因为它不仅能读文字，也能根据图片内容推断菜名、分类和氛围标签。

官方参考：

- DashScope 视觉理解：https://help.aliyun.com/zh/model-studio/vision/

### 9.2 API Key 管理

本地服务读取环境变量：

```text
DASHSCOPE_API_KEY=你的_dashscope_key
DASHSCOPE_VL_MODEL=qwen-vl-max
```

前端页面不能出现 API Key。即使是本地工具，也不要把 Key 写进浏览器代码里。

### 9.3 Prompt 草案

服务端调用模型时，建议使用强约束 Prompt：

```text
你是一个校园饭堂菜品录入助手。
请根据图片识别菜品信息，返回 JSON 数组。

只返回 JSON，不要解释，不要 Markdown。

字段要求：
- name: 菜品名称，必须是中文短名称，不能为空。
- category: 菜品分类，例如 盖饭、粉面、烧腊、小炒、饮品、甜品、小吃。
- tag: 只能从 人气、新品、推荐、招牌、限时 中选择一个；不确定则为空字符串。
- price: 价格文本，只保留数字、区间或起售价，例如 "12"、"12-15"、"8起"；不确定则为空字符串。
- vibe: 2 到 8 个中文字符，描述吃起来的感觉，例如 酸甜开胃、香浓满足、稳稳续航；不确定则根据菜品合理生成。

如果图片是菜单或价目表，请尽量识别所有菜品。
如果图片是单道菜照片，请识别 1 到 3 个最可能的菜品。
如果无法判断菜品，请返回空数组 []。
```

### 9.4 返回清洗

服务端必须做二次清洗：

- 非 JSON 返回时尝试截取 JSON 数组。
- `name` 为空的项删除。
- 字段统一转成字符串。
- `tag` 不在允许列表时置空。
- `price` 去掉明显无关字符，如 `￥`、`元`。
- 单张图最多保留 50 道菜，防止模型异常输出。

## 10. 前端页面设计

第一版页面建议分 4 个区域：

1. 图片上传区
   - 支持点击选择和拖拽上传。
   - 展示图片文件名、大小、识别状态。

2. 识别操作区
   - 开始识别。
   - 清空结果。
   - 失败图片可重试。

3. 可编辑表格区
   - 每行一份菜品。
   - 字段可直接编辑。
   - 支持删除行。
   - 可新增空白行。

4. 导出区
   - 导出 Excel。
   - 导出 JSON。
   - 显示当前可导出菜品数量。

文案保持轻松、干净，不要写成后台系统提示。例如：

- `把菜单图放进来，我先帮你整理一版。`
- `这几道菜还可以再看一眼。`
- `已整理好，可以导出了。`

## 11. 错误处理与降级

| 场景 | 处理 |
| --- | --- |
| 未配置 API Key | 页面提示 `还没配置识别 Key，先检查本地环境变量` |
| 图片太大 | 前端压缩或提示换小图 |
| 模型超时 | 单图标记失败，允许重试 |
| 模型返回非 JSON | 服务端尝试修复，失败则返回友好提示 |
| 识别为空 | 返回空数组，提示 `这张图没看清，可以换张更清楚的` |
| 部分图片失败 | 不影响其他图片结果导出 |

## 12. 成本与频率控制

即使是本地工具，也建议第一版加轻量限制：

- 单次最多上传 10 张图片。
- 单张图片大小建议不超过 5 MB。
- 单张图识别超时时间建议 30 秒。
- 逐张排队识别，避免并发过高。
- 页面显示本次已调用图片数量，方便感知成本。

后续如果工具给多人使用，再加入更严格的调用次数统计和账号权限。

## 13. 后续扩展方向

- 增加 `campusName`、`canteenName`、`stallName` 字段，直接生成后台导入模板。
- 增加重复菜品检测，按菜名相似度提醒人工合并。
- 增加图片识别历史，只保存在本地浏览器或本地数据库。
- 增加后台 JSON 一键导入功能。
- 增加导入前预检查，提示缺少必填字段、重复菜名和异常价格。
- 增加批量生成 `vibe` 的独立功能，用于整理已有菜品。

## 14. 测试清单

- 单道菜照片：能识别出 `name`、`category`、`tag`、`vibe`。
- 菜单图：能识别多道菜和价格。
- 价目表：能保留价格区间和起售价。
- 模糊图片：失败提示友好，不影响其他图片。
- 多图批量：识别结果能合并到一个表格。
- 表格编辑：修改、删除、新增行后导出内容正确。
- Excel 导出：列名正确，价格保持文本格式。
- JSON 导出：结构符合 `version/source/exportedAt/dishes`。
- 后台人工导入：导出字段能继续映射到 `eat-what-dishes` 的菜品字段。

## 15. 默认决策

- 第一版只写工具方案，不改当前小程序代码。
- 第一版工具不直接连接 uniCloud。
- 第一版识别结果必须人工校对后再进入后台。
- 第一版导出只包含 `name`、`category`、`tag`、`price`、`vibe`。
- 第一版优先保证结果可检查、可编辑、可导出，不追求全自动入库。

## 16. 第二阶段对接方案

第一阶段工具稳定后，第二阶段建议接入 admin 后台，但仍然保持“先预检、再导入”的双步骤，不做上传后直接写库。

### 16.1 目标

- 本地识别工具继续负责：识别、人工初步校对、导出 JSON。
- admin 后台负责：选择档口、预检、二次修正、正式导入。
- `co-campus` 负责：管理员鉴权、字段校验、重复检查、正式写入 `eat-what-dishes`。

### 16.2 数据流

```text
本地识别工具导出 JSON
  -> admin 导入页上传 JSON
  -> co-campus.previewImportDishes()
  -> admin 展示预检结果并允许人工修正
  -> co-campus.batchImportDishes()
  -> 正式写入 eat-what-dishes
```

### 16.3 admin 导入页建议

建议新增页面：

- `pages/eat-what/dish/import`

页面职责分为 4 块：

1. 归属选择
   - 选择当前校园
   - 选择当前饭堂
   - 选择当前档口
2. 文件上传
   - 上传 `dish-image-recognition-tool` 导出的 JSON
   - 显示 `version`、`source`、`exportedAt`
3. 预检概览
   - 总条数
   - 可导入
   - 需确认
   - 不可导入
   - 批内重名
   - 库内重名
4. 可编辑表格
   - `name`
   - `category`
   - `tag`
   - `price`
   - `vibe`
   - `imageName`
   - `status`
   - `issues`

### 16.4 推荐的字段枚举

为了减少同义词分裂，后台预检建议优先按固定枚举校验：

`tag` 允许值：

- `人气`
- `新品`
- `推荐`
- `招牌`
- `限时`

`category` 建议值：

- `主食`
- `粉面`
- `烧腊`
- `小炒`
- `面食`
- `饮品`
- `甜品`
- `小吃`

### 16.5 云对象接口

建议在 `co-campus` 新增两个管理员接口：

1. `previewImportDishes(token, payload)`
2. `batchImportDishes(token, payload)`

#### 16.5.1 `previewImportDishes`

用途：

- 校验导入目标档口是否正确
- 校验 JSON 行结构
- 标记批内重名和库内重名
- 返回给 admin 可编辑预检表格

请求示例：

```json
{
  "canteenId": "gzcc-tongde",
  "stallId": "gzcc-tongde-shaola",
  "dishes": [
    {
      "localId": "img_001_dish_001",
      "imageName": "menu-01.jpg",
      "sourceType": "menu",
      "name": "蜜汁叉烧饭",
      "category": "烧腊",
      "tag": "人气",
      "price": "15",
      "vibe": "甜咸满足"
    }
  ]
}
```

返回示例：

```json
{
  "code": 0,
  "data": {
    "summary": {
      "total": 20,
      "valid": 14,
      "warning": 4,
      "invalid": 2,
      "duplicateInBatch": 1,
      "duplicateInDb": 2
    },
    "rows": [
      {
        "localId": "img_001_dish_001",
        "name": "蜜汁叉烧饭",
        "category": "烧腊",
        "tag": "人气",
        "price": "15",
        "vibe": "甜咸满足",
        "imageName": "menu-01.jpg",
        "status": "valid",
        "issues": []
      }
    ]
  }
}
```

#### 16.5.2 `batchImportDishes`

用途：

- 对 admin 调整后的数据做最终校验
- 按档口批量写入 `eat-what-dishes`
- 统一生成 `sort`、`status`、`createdAt`、`updatedAt`

请求示例：

```json
{
  "canteenId": "gzcc-tongde",
  "stallId": "gzcc-tongde-shaola",
  "importMode": "skip_duplicate",
  "dishes": [
    {
      "name": "蜜汁叉烧饭",
      "category": "烧腊",
      "tag": "人气",
      "price": "15",
      "vibe": "甜咸满足"
    }
  ]
}
```

返回示例：

```json
{
  "code": 0,
  "data": {
    "added": 15,
    "skipped": 3,
    "failed": 2,
    "items": [
      {
        "name": "蜜汁叉烧饭",
        "result": "added",
        "id": "dish-001"
      },
      {
        "name": "叉烧饭",
        "result": "skipped",
        "reason": "同档口已存在同名菜"
      }
    ]
  },
  "msg": "这批菜品已经整理进档口里了"
}
```

### 16.6 预检规则建议

文件级：

- 顶层必须是对象
- 必须包含 `version/source/dishes`
- `dishes` 必须是数组
- 单次建议不超过 `300` 条

请求级：

- `token` 必须是管理员
- `canteenId` 必填
- `stallId` 必填
- `stallId` 必须属于 `canteenId`

行级：

- `name` 必填，建议不超过 30 字
- `category` 可空，但若填写应尽量在枚举内
- `tag` 可空，但若填写必须在允许列表内
- `price` 可空，建议只允许数字、区间或 `x起`
- `vibe` 可空，建议 2 到 8 个中文字符

重复级：

- 同一批 `name` 完全一致时，标记 `duplicate_in_batch`
- 当前档口下已有同名菜时，标记 `duplicate_in_db`
- 重复默认先提示，不自动删除

### 16.7 正式入库字段

正式写入 `eat-what-dishes` 时，建议只保留这些字段：

- `stallId`
- `canteenId`
- `name`
- `category`
- `tag`
- `price`
- `vibe`
- `sort`
- `status`
- `createdAt`
- `updatedAt`

以下字段只用于导入过程，不进入正式库：

- `localId`
- `imageName`
- `sourceType`
- `issues`
- `status`（预检状态）
