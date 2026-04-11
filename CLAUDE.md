# NaiveTab 开发规范

这是NaiveTab，一个优雅的新标签页浏览器扩展项目。本文档定义了项目的开发规范，所有 AI 辅助开发必须遵守。AI阅读此文档后在回复前输出 "(-.-)已阅读CLAUDE.md"。

**强制必须遵循**：
- 所有 AI 与用户的沟通、代码注释、文档编写等，都必须使用中文。
- 编程是一个严肃场景，遇到不清楚的点不要猜测，及时与用户确认。最终修改代码前要先给出具体的实施方案让用户审阅。
- 每次修改代码后，必须审视本次改动是否涉及新的规律、约定、坑点或架构决策。若有，须在当次对话结束前将相关内容补充至本文件，不得遗留到下次。
- 每次更新本文件后，必须检查全文是否存在内容重复、表述冲突或章节错位，及时合并或删除冗余内容，保持文件规范整洁。

---

# 可用 Claude 技能

在这个项目中，当你需要新增 Widget 组件时，直接使用 `/add-widget` 技能，它包含了完整的开发步骤指导，可防止遗漏关键步骤。

---

# 编码风格

## CSS

### BEM 命名

**采用简化版 BEM：`block__element--modifier`，使用双下划线分隔元素、双连字符分隔修饰符。**

- `block`：组件级名称，使用 camelCase（如 `clockDigital`、`bookmarkFolder`）
- `block__element`：子元素使用双下划线连接（如 `time__text`、`text__digit`）
- `block__element--modifier`：状态/变体使用双连字符（如 `text__divide--dim`）
- 不使用 BEM 中的 block--modifier 形式，修饰符只作用于元素级别
- 全局公共类使用单下划线前缀（如 `.setting__label`、`.label__icon`）

### PostCSS 嵌套

**使用 PostCSS 嵌套语法，选择器直接写在父级花括号内，不使用 `&` 拼接类名。**

- Widget 样式外层使用 `#widgetCode` 作为最外层选择器（由 `WidgetWrap` 自动设置 id）
- 嵌套层级不超过 4 层，过深时拆分为独立类
- `v-bind()` 用于绑定响应式配置，返回值来自 `getStyleField()`
- `widget__wrap` div 的 style 被 `v-bind` 用于存放 CSS 变量，不可再对其进行 `:style` 绑定
- 使用 `backdrop-filter` 时必须同时加 `-webkit-backdrop-filter` 前缀
- 硬编码颜色必须同时写浅色和深色规则（`:root[data-theme='dark']` 或 `.dark` 选择器）

## Vue 组件

- 统一使用 `<script setup lang="ts">` 语法
- Props 使用 `withDefaults(defineProps<{}>(), {})` 定义默认值
- 双向绑定统一使用 `defineModel()`，多字段使用具名绑定（`defineModel<string>('fieldName')`）
- 内部多字段状态使用 `reactive`，单一状态值使用 `ref`
- 组件类型通过 `typeof` 推导，不重复定义接口
- 组件不是全局注册的，使用前必须 `import`

## 函数声明

**优先使用箭头函数，不使用 `function` 声明。**

例外：顶层导出的 Vue 组件（`.vue`）和少数需要函数提升的声明。

## 导入顺序

导入语句按以下顺序排列，用空行分隔不同分组：
1. **第三方库**（vue、naive-ui、@vueuse 等）
2. **内部框架/工具模块**（@/logic/*、@/types/* 等）
3. **本地相对路径导入**（./、../）

`import type` 与值导入分离，可合并写在一行。

## 命名规范

| 类型 | 风格 | 示例 |
|------|------|------|
| 类型/接口 | PascalCase | `SettingMeta`、`TWidgetConfig` |
| 变量/函数 | camelCase | `createSettingMeta`、`updateTime` |
| 常量 | UPPER_SNAKE_CASE | `SETTING_GROUPS`、`ICONS` |
| 文件 | kebab-case | `setting-registry.ts` |
| Vue 组件 | PascalCase | `SettingPaneContent.vue` |
| CSS 类名 | camelCase + BEM | `clockDigital__container--shadow` |

## TypeScript

- 函数参数与返回值类型必须显式标注
- 使用 `import type` 导入纯类型
- 类型注解必须显式，不依赖 implicit any
- 未使用的变量必须删除，不保留注释掉的死代码
- 一行超过 120 字符时换行

## 错误处理

- 用户可见提示统一使用 `window.$message` / `window.$notification`
- 内部异常使用 `log` 记录，不向用户暴露技术细节
- catch 块中对外返回失败标志（`resolve(false)` 或 `return`），不抛出原始异常

## Chrome API

Chrome API 回调统一包装为 Promise，不使用裸回调。

---

# 通用规范

## UI 组件使用规范

**功能实现优先使用 Naive UI 已有组件，避免重复造轮子。**

常见映射关系（先在 [Naive UI 文档](https://www.naiveui.com/zh-CN/) 中确认存在再使用）：
| 需求场景 | 应使用的 Naive UI 组件 |
|----------|----------------------|
| 开关切换 | `n-switch` |
| 滑块输入 | `n-slider` + `n-input-number`，或项目封装的 `SliderInput` |
| 颜色选择 | `n-color-picker` |
| 下拉选择 | `n-select` |
| 数字输入 | `n-input-number` |
| 文本输入 | `n-input` |
| 单选组 | `n-radio-group` + `n-radio-button` |
| 分段控制 | `n-segmented` |
| 折叠面板 | `n-collapse` + `n-collapse-item` |
| 标签页 | `n-tabs` + `n-tab-pane` |
| 弹出确认 | `n-popconfirm` |
| 工具提示 | `n-tooltip` |
| 表单布局 | `n-form` + `n-form-item` |
| 按钮 | `n-button` |

**禁止自行实现可用 Naive UI 组件完成的 UI 功能**（如自定义 toggle、手写 slider 等）。

## 图标使用规范

**禁止在模板或代码中硬编码图标字符串，必须通过 `ICONS` 常量引用。**

```ts
// ✅ 正确：先在 ICONS 中定义
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
```

```vue
<!-- ✅ 正确：动态绑定 -->
<Icon :icon="ICONS.countdownPlay" class="action__icon" />

<!-- ❌ 禁止：硬编码字符串 -->
<Icon icon="mdi:play" />
```

**规则说明：**
- 所有图标需先在 `src/logic/icons.ts` 的 `ICONS` 对象中定义
- **新增 setting 面板必须同时在 `SETTING_ICON_META` 中注册图标**
- 图标名称必须在 [Iconify](https://icon-sets.iconify.design/) 上验证存在
- `Icon` 组件不是全局注册，使用前必须手动 import
- 通过 `class` + `font-size` 控制尺寸（SVG 尺寸继承 `font-size`）

```css
/* ✅ 正确：用 font-size 控制 Icon 尺寸 */
.action__icon { font-size: 20px; }
```

## i18n 规范

- 语言文件：`src/locales/zh-CN.json` 和 `en-US.json`（两个文件必须同步更新）
- Widget 名称的 key 格式：`setting.{widgetCode}`（如 `setting.clockFlip`）
- 组件内使用 `$t('key')` 或 `window.$t('key')`（非模板中）
- 时钟类专用 key 统一放在 `clock` 命名空间下（如 `clock.showSeconds`）

### 强制要求
**所有用户可见的提示信息（message、notification、dialog 等）必须使用 i18n，禁止硬编码任何语言文本。**

```ts
// ✅ 正确：使用 i18n
window.$message.warning(window.$t('general.syncRateWarning').replace('{count}', String(count)))
```

### 添加新文案步骤
1. 在 `src/locales/zh-CN.json` 和 `en-US.json` 的 `general` 命名空间下添加 key
2. 使用 `{placeholder}` 作为变量占位符
3. 代码中使用 `.replace('{placeholder}', value)` 替换变量
4. 确保两个语言文件同步更新


---

# Widget 开发

## 扩展点标记

项目用 `@@@@` 注释标记所有关键扩展点，新增 Widget 时全局搜索 `@@@@` 确认无遗漏：

| 注释 | 文件 |
|------|------|
| `@@@@ add widget registry` | `src/newtab/widgets/registry.ts` |
| `@@@@ 更新localConfig后需要手动处理新版本变更的本地数据结构` | `src/logic/store.ts` |

新增 Widget 的完整步骤见 `.claude/skills/add-widget/SKILL.md`。

## Widget 与 Setting Pane 映射

部分 Widget 共用同一个 setting pane（如所有时钟类和 date 均指向 `clockDate`）。

**新增 Widget 后，若其设置面板与其他 Widget 共用，必须维护 `src/newtab/widgets/codes.ts` 中的 `WIDGET_SETTING_PANE_MAP`：**

```ts
export const WIDGET_SETTING_PANE_MAP: Partial<Record<WidgetCodes, settingPanes>> = {
  clockDigital: 'clockDate',
  clockAnalog: 'clockDate',
  clockFlip: 'clockDate',   // ← 新增时钟类在此追加
  clockNeon: 'clockDate',
  date: 'clockDate',
}
```

遗漏此步会导致右键菜单点击「设置」无法跳转到正确的 setting 面板。

## Widget 分组

`src/newtab/widgets/codes.ts` 中定义了 `WIDGET_GROUPS`，用于组件库抽屉和专注设置中按分类展示 Widget。**新增 Widget 必须添加到对应分组**：

```ts
export const WIDGET_GROUPS: Array<{
  labelKey: string
  codes: WidgetCodes[]
}> = [
  {
    labelKey: 'widgetGroup.time',
    codes: ['clockDigital', ... , 'myWidget'], // ← 追加到对应分组
  },
]
```

分组：`time`（时间类）、`bookmark`（书签类）、`tool`（工具类）三选一。

## 自动处理机制（无需手动修改）

以下文件通过 glob / 遍历自动扫描，**不要**手动向其中添加 Widget 条目：

| 文件 | 机制 |
|------|------|
| `src/logic/config.ts` | `import.meta.glob('**/config.ts')` 自动扫描 widget 配置 |
| `src/logic/store.ts` | 遍历 `WIDGET_CODE_LIST` 动态创建 storage key |
| `src/newtab/Content.vue` | 遍历 `widgetsList` 动态渲染所有 Widget |
| `src/newtab/draft/DraftDrawer.vue` | 遍历 `widgetsList` 展示组件库列表 |

## 快速重置保留字段

当 widget 包含**用户自定义数据**（如键盘的按键映射、书签文件夹的选中列表），这些数据在"快速重置"时需要保留，不被默认值覆盖。需要在 `config.ts` 中导出 `PRESERVE_FIELDS` 声明需要保留的字段：

```ts
export const WIDGET_CODE = 'keyboard'
export const PRESERVE_FIELDS = ['keymap']  // ← 声明需要保留的字段
export const WIDGET_CONFIG = { /* ... */ }
```

- 系统会自动扫描所有 `config.ts` 收集保留字段，无需修改别处
- `enabled` 和 `layout` 总是被保留，无需重复声明
- 只有用户通过交互生成的自定义数据才需要保留，普通配置选项不需要

## 定时任务生命周期管理

Widget 中需要定时刷新数据时（如时钟），必须使用 `src/logic/task.ts` 提供的统一任务管理系统，**不可在组件内自行 `setInterval`**。

```ts
import { addTimerTask, removeTimerTask } from '@/logic/task'

const isRender = getIsWidgetRender(WIDGET_CODE)

watch(isRender, (value) => {
  if (!value) {
    removeTimerTask(WIDGET_CODE)  // 组件禁用时必须移除任务
    return
  }
  updateTime()                    // 立即执行一次
  addTimerTask(WIDGET_CODE, updateTime)
}, { immediate: true })
```

- 全局 timer 每 **1000ms** 触发一次，所有 Widget 共享此定时器
- `addTimerTask` 会立即执行一次 task，再加入轮询列表
- 组件卸载时不需要手动移除，`WidgetWrap` 的 `isEnabled` watch 会自动处理

## WidgetWrap 机制说明

`WidgetWrap` 是所有 Widget 的根容器组件，提供：

1. **拖拽功能**：自动注册 mousedown/mousemove/mouseup 事件到全局 `moveState`
2. **启用控制**：通过 `localConfig[widgetCode].enabled` 控制渲染（`v-if`）
3. **专注模式**：通过 `localConfig.general.focusVisibleWidgetMap` 控制可见性
4. **ID 设置**：内层 div 的 `id` 自动设为 `widgetCode`，供 CSS selector 使用
5. **拖拽辅助线**：拖拽模式下自动添加边框、高亮、删除动效

Widget 根组件写法：
```vue
<WidgetWrap :widget-code="WIDGET_CODE">
  <div class="myWidget__container">
    <!-- 内容 -->
  </div>
</WidgetWrap>
```

---

# 配置 & 数据持久化

## 配置存储机制

- 每个 Widget 配置独立存储于 `localStorage`，key 为 `c-{widgetCode}`（如 `c-clockFlip`）
- 通用状态存储 key 为 `l-state`
- `useStorageLocal` 写入有 **800ms 防抖延迟**，避免频繁写入
- Chrome 云同步使用 `chrome.storage.sync`，key 为 `naive-tab-{field}`
- **云同步限制**：单个配置不超过 8KB，总量约 100KB，每分钟最多写 120 次

## 全局状态说明

```ts
// src/logic/store.ts
localConfig      // 各 Widget 配置（响应式，自动持久化）
localState       // 本地状态（currAppearanceCode 等，持久化）
globalState      // 运行时全局状态（不持久化）
  .isSettingDrawerVisible  // 设置面板是否打开
  .isGuideMode             // 引导模式
  .isSearchFocused         // 搜索框是否聚焦
  .isInputFocused          // 输入框是否聚焦
  .currSettingTabCode      // 当前激活的 setting pane
```

键盘事件在 `isSettingDrawerVisible || isSearchFocused || isInputFocused` 时会被屏蔽（仅 Escape 可用）。

## 配置字段设计规范（兼容性）

**Widget 的 `config.ts` 以及任何需要持久化到 `localStorage` / `chrome.storage` 的配置，设计时必须保证向前兼容，不能破坏现存用户的数据。**

### 新增字段
- 必须在 `config.ts` 的 `defaultConfig` 中提供合理默认值
- `useStorageLocal` 初始化做**浅层合并**，顶层新增字段可自动补全；**嵌套对象中新增字段不会自动合并**，必须在 `handleAppUpdate` 中手动补充
- 字段命名须清晰，不可与已有字段语义冲突

### 修改 / 重命名字段
- **禁止直接修改已上线字段的语义或类型**，会导致老数据反序列化异常
- 如需改变字段含义，必须：
  1. 新增替代字段（带默认值）
  2. 在 `handleAppUpdate` 中将旧字段的值迁移到新字段
  3. 在同一迁移版本号中 `delete` 旧字段

### 删除字段
- **禁止直接从 `defaultConfig` 中删除字段**（删了之后老用户本地仍有旧 key，迁移时无法判断）
- 删除字段必须先在 `handleAppUpdate` 中显式 `delete (localConfig.xxx as any).oldField`，再从 `defaultConfig` 中移除，并在同一 PR 中完成

### 嵌套对象 / 数组配置
- 嵌套对象配置修改时，必须在 `handleAppUpdate` 中对整个嵌套结构做迁移，不能依赖浅合并
- 数组类型字段新增元素时，若旧用户数组长度不足，必须在迁移中补齐缺失元素

### 版本号规范与迁移
- 每次对持久化配置结构做任何变更，都必须同步升级 `package.json` 的 `version`，并在 `handleAppUpdate` 中新增对应版本号的迁移分支
- 迁移分支使用 `compareLeftVersionLessThanRightVersions(version, 'x.y.z')` 判断，确保每个迁移只执行一次
- 同一版本内的多处迁移合并写在同一个 `if` 块中，避免重复判断

**迁移示例：**
```ts
if (compareLeftVersionLessThanRightVersions(version, 'x.y.z')) {
  // 新增字段（嵌套对象需手动补全）
  localConfig.myWidget.newField = defaultConfig.myWidget.newField
  // 删除旧字段
  delete (localConfig.myWidget as any).oldField
}
```

### 禁止的危险操作

| ❌ 危险操作 | ✅ 正确做法 |
|------------|------------|
| 直接修改字段类型 | 新增 + 迁移 + 删除旧字段 |
| 直接重命名字段 | 新增 + 迁移 + 删除旧字段 |
| 直接删除字段 | 先迁移 delete，再移除 defaultConfig |
| 依赖浅合并补全嵌套字段 | 在 handleAppUpdate 中手动补全 |
| 不升级版本号就改配置结构 | 必须同步升版本号并写迁移逻辑 |

## 云同步架构与规范

项目使用 Chrome 浏览器原生 `chrome.storage.sync` 实现跨设备配置云同步，核心架构为**版本感知的 Last-Write-Wins**策略。

### 存储架构
| 位置 | 存储方式 | 键格式 | 说明 |
|------|----------|--------|------|
| 本地 | `localStorage` | `c-{field}` | 每个配置项单独存储，响应式自动持久化 |
| 云端 | `chrome.storage.sync` | `naive-tab-{field}` | 每个配置项单独存储，遵循 Chrome 配额限制 |
| 状态 | `localState` | `isUploadConfigStatusMap[field]` | 维护每个配置项的同步状态（dirty, syncTime, syncId 等） |

### 同步策略
**版本感知的 Last-Write-Wins**:
| 条件 | 操作 |
|------|------|
| `syncId` 相同（内容一致） | 跳过，不做任何操作 |
| 本地 `dirty = false`（无未同步修改） | 使用**版本感知合并策略** |
| 本地 `dirty = true` 且 `localModifiedTime > syncTime` | 上传本地配置（本地修改优先） |
| 本地 `dirty = true` 且 `localModifiedTime <= syncTime` | 使用**版本感知合并策略** |

**版本感知合并策略**（核心原则：版本较新的一方优先）:
| 场景 | 合并方式 |
|------|----------|
| 版本相同 | 直接采用远程配置覆盖本地 |
| 本地版本较新 | 以本地结构为模板，合并远程值 → **保留本地新增字段** |
| 远程版本较新 | 以远程结构为模板，合并本地值 → **保留远程新增字段** |

### Chrome 配额限制应对
Chrome `storage.sync` 有严格的配额限制，代码中已做完整防护：
| 限制项 | 限制值 | 应对措施 |
|--------|--------|----------|
| 单 key 大小 | 8KB | - 代码留 200 字节余量，超限时拦截并告警<br>- keyboard 配置自动清理空条目 + 截断超长字段<br>- 大小超过阈值自动 gzip 压缩 |
| 总容量 | ~100KB | 当前配置项数量约 10 个，远低于限制 |
| 写入频率 | 120 次/分钟 | - 2 秒防抖写入，最大延迟 5 秒<br>- 频率超过 80% 时告警提醒用户 |

### 新增 Widget 同步注意事项
新增 Widget 时**无需手动修改同步相关代码**，系统自动处理：
1. `src/logic/config.ts` 通过 `import.meta.glob` 自动扫描，会自动加入 `defaultConfig`
2. `src/logic/store.ts` 通过遍历 `WIDGET_CODE_LIST` 自动创建本地存储
3. `src/logic/storage.ts` 会自动为新增 Widget 初始化同步状态
4. 启动时 `handleStateResetAndUpdate` 会**增量新增**缺失字段的同步状态

### 故障恢复机制
- 本地修改立即标记 `dirty = true` 并更新 `localModifiedTime`
- **只有上传成功后**才清除 `dirty` 和更新 `syncTime`/`syncId`
- 上传失败保留 `dirty` 状态，页面重新加载后 `handleMissedUploadConfig` 会自动重试
- 压缩解析失败自动降级尝试原始 JSON 解析，兼容旧格式数据

### popup 书签同步机制

**通过 `setupKeyboardSyncListener` 实现 popup 修改书签后 newtab 实时感知。**

#### 数据流
```
popup 修改 localConfig.keyboard.keymap[code]
    ↓
flushConfigSync('keyboard') → chrome.storage.sync.set（立即写入，跳过防抖）
    ↓
chrome.storage.onChanged 事件触发
    ├─ newtab: setupKeyboardSyncListener → 更新 localConfig.keyboard → Vue 渲染
    └─ Service Worker: onChanged 监听 → 更新缓存 → 快捷键生效
```

#### 关键函数
| 函数 | 文件 | 用途 |
|------|------|------|
| `setupKeyboardSyncListener` | `storage.ts` | newtab 启动时注册，监听 keyboard 配置变化 |
| `flushConfigSync` | `storage.ts` | popup 修改后强制立即同步，跳过 2 秒防抖 |
| `parseStoredData` | `compress.ts` | 自动解压 gzip 格式，兼容新旧数据格式 |

#### 为什么 popup 需要 `flushConfigSync`
- popup 关闭后 JavaScript 环境销毁，防抖回调不会执行
- 必须在 `handleCommit` 中强制同步，确保 Service Worker 能收到更新

### 后台脚本与 keyboard 配置

**后台脚本 `src/background/main.ts` 直接依赖 keyboard（书签快捷键）配置，修改该配置结构时必须同步考虑后台脚本的兼容性。**

#### 架构说明
- 后台脚本以 Service Worker 形式运行，无法使用 Vue 响应式状态
- 采用**缓存 + 监听模式**：启动时一次性读取配置到内存，按键时直接读缓存（~0ms 响应）
- 通过 `chrome.storage.onChanged` 监听配置变化，自动更新缓存
- 配置超过 4000 字节时会 gzip 压缩，后台脚本通过 `parseStoredData` 自动解压
- **onChanged 监听器必须返回 Promise**，否则 Service Worker 可能在异步 resolve 前休眠，导致缓存更新失败

#### 修改 keyboard 配置时的注意事项
| 修改类型 | 后台脚本影响 |
|----------|--------------|
| 新增字段 | 无影响（缓存自动合并新字段） |
| 重命名/删除字段 | **必须同步修改** `main.ts` 中的字段引用 |
| 修改 keymap 结构 | **必须同步修改** `main.ts` 中的 keymap 访问逻辑 |
| 修改默认值 | 无影响（后台脚本只读用户配置） |

**Why:** 后台脚本独立运行，不会随 Vue 代码同步更新，遗漏修改会导致快捷键功能异常。

---

# 样式 & 主题

## 浅色 / 深色模式

**所有涉及颜色的字段必须同时考虑两种主题，不能只写单一值。**

颜色统一使用**双元素数组** `[浅色值, 深色值]`，通过 `localState.currAppearanceCode`（`0` = 浅色，`1` = 深色）自动取对应值：

```ts
fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)']
//          ↑ index 0: 浅色              ↑ index 1: 深色
```

- `getStyleField(WIDGET_CODE, 'fontColor')` 自动读取当前主题对应值
- Setting 面板中手动读取颜色时，需用 `localConfig.xxx.fontColor[localState.currAppearanceCode]`

## 主题色派生色用法

**需要使用主题色的半透明版本（如激活态背景、边框）时，必须用以下方式，不可用其他替代方案。**

```ts
import { customPrimaryColor } from '@/logic/store'

// 通过正则替换 alpha 通道生成半透明派生色
const primaryBg      = computed(() => customPrimaryColor.value.replace(/[\d.]+\)$/, '0.08)'))
const primaryBgHover = computed(() => customPrimaryColor.value.replace(/[\d.]+\)$/, '0.14)'))
const primaryBorder  = computed(() => customPrimaryColor.value.replace(/[\d.]+\)$/, '0.28)'))
const primaryIconBg  = computed(() => customPrimaryColor.value.replace(/[\d.]+\)$/, '0.14)'))
```

```css
/* 在 <style scoped> 中通过 v-bind() 使用 */
.item--active {
  background-color: v-bind(primaryBg);
  border-color: v-bind(primaryBorder);
}
```

**为什么这样做：**
- `customPrimaryColor` 的值格式为 `rgba(r, g, b, 1)` 字符串，从 `@/logic/store` 导入，自动跟随当前外观
- Naive UI **不提供** `--n-primary-color-rgb` 这类 CSS 变量，直接用会 fallback 到 Naive UI 默认绿色（`#18a058`）
- **不能**直接拼接十六进制 alpha 后缀，格式不兼容

## CSS 变量 / Naive UI 主题变量

优先使用 Naive UI 注入的 CSS 变量，这些变量会随主题自动切换：

```css
/* ✅ 自动适配深/浅色 */
.my-item {
  color: var(--n-text-color);
  background-color: var(--n-color);
  border-color: var(--n-border-color);
}
```

常用 Naive UI CSS 变量：
| 变量名 | 含义 |
|--------|------|
| `--n-text-color` | 主文字颜色 |
| `--n-text-color-2` | 次要文字颜色 |
| `--n-text-color-3` | 辅助文字颜色（更淡）|
| `--n-color` | 组件背景色 |
| `--n-color-hover` | 悬停背景色 |
| `--n-border-color` | 边框颜色 |
| `--n-primary-color` | 主题色 |
| `--n-divider-color` | 分割线颜色 |
| `--n-card-color` | Card 背景色 |
| `--n-modal-color` | Modal 背景色 |

## 硬编码颜色必须覆盖双模式

若确实需要硬编码颜色（不依赖配置且 Naive UI 变量无法覆盖），**必须同时写浅色和深色规则**：

```css
/* ✅ 正确：浅色和深色都覆盖 */
.badge {
  background-color: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.65);
}

:root[data-theme='dark'] .badge,
.dark .badge {
  background-color: rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.75);
}
```

## CSS 样式规范

- Widget 的样式块外层 selector 为 `#widgetCode`（由 `WidgetWrap` 自动设置 id）
- Widget 容器（`.xxx__container`）必须设置 `position: absolute`，配合拖拽定位系统
- 使用 `v-bind(cssVar)` 将响应式配置注入 CSS，`cssVar` 由 `getStyleField()` 生成
- 尺寸单位优先使用 `vmin`（`getStyleField` 传 `'vmin'` 时会自动乘以 `0.1`）
- 优先使用全局 token 变量，不要写魔法数字（token 定义在 `src/styles/tokens.css` 顶部 `:root` 中）
- `rgba()` 的 alpha 通道不支持 `var()`，需写字面量（如 `rgba(0,0,0,0.85)`）
- 不要给 Naive UI 组件覆盖字号，让它继承上下文即可

全局公共 CSS 类（定义在 `src/styles/global.css`，可直接使用）：
| 类名 | 用途 |
|------|------|
| `.setting__label` | Setting 面板中的分组标题行（含图标 + 文字） |
| `.label__icon` | `.setting__label` 内的图标 |
| `.setting__item-ele setting__item-ml` | 表单项内追加的元素（加左 margin） |
| `.setting__input-number` | 数字输入框固定宽度（103px） |
| `.setting__input-number--unit` | 带单位的数字输入框（150px） |
| `.n-form-item--color` | 颜色类表单项（压缩 margin） |

## getStyleField 用法速查

```ts
// 颜色（自动取当前主题对应值）
const color = getStyleField(WIDGET_CODE, 'fontColor')           // 'rgba(...)'

// 数字 + 单位
const size  = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')   // '10vmin'（×0.1）
const px    = getStyleField(WIDGET_CODE, 'borderRadius', 'px') // '4px'

// 数字 × 倍率 + 单位
const gap   = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 0.2) // fontSize×0.2×0.1 vmin

// 嵌套字段（用 . 分隔）
const unitSize = getStyleField(WIDGET_CODE, 'unit.fontSize', 'vmin')
```

返回值是 `ComputedRef<string>`，在 `<style>` 中通过 `v-bind(customXxx)` 使用。

## 光感设计语言（Glassmorphism）

NaiveTab 的 Widget 统一使用"玻璃光感"设计语言，已在 `bookmarkFolder`、`search` 等组件中落地，**新增有背景容器的 Widget 时参考这两个组件的样式实现**。

核心要点（避坑用，具体值看源码）：
- 容器用 `backdrop-filter: blur(...) saturate(1.4)`，`::before` 做内高光渐变，`::after` 做顶部高光线
- 使用伪元素高光时，容器内的真实内容需设 `position: relative; z-index: 1`，否则会被高光层遮住
- `border-radius` 用 `inherit`，不要在伪元素上写死值

---

# Setting 面板

## 目录结构

自 v2.0.0 起，设置面板采用全新目录结构，所有设置面板统一管理：

```
src/newtab/setting/
├── components/          # 通用组件
│   ├── SettingIconGroup.vue
│   ├── SettingPaneContent.vue
│   └── SettingPaneTitle.vue
├── fields/              # 表单原子组件
│   ├── ColorField.vue
│   ├── FontField.vue
│   ├── SliderField.vue
│   ├── SwitchField.vue
│   ├── ToggleColorField.vue
│   └── index.ts
├── panes/               # 设置面板（按功能分组）
│   ├── GeneralSetting/
│   ├── ClockSetting/
│   ├── KeyboardSetting/
│   ├── CountdownSetting/
│   └── ... 其他面板
└── registry.ts          # 设置面板注册表（自动注册）
```

## 设置面板注册

新增设置面板必须在 `src/newtab/setting/registry.ts` 中注册：

在 `SETTING_GROUPS` 对应分组（`global`/`widget`/`other`）的 `items` 数组中添加配置项：
```ts
{ code: 'myWidget', labelKey: 'setting.myWidget' },
```

面板组件文件必须为 `src/newtab/setting/panes/{code}/index.vue`，通过异步组件自动加载。

**分组规则：**
- `global`: 全局功能配置（通用、专注模式）
- `widget`: 各 Widget 组件配置
- `other`: 关于、赞助等（放最后）

## Setting 原子组件

**所有 Setting 面板开发必须统一使用 `src/newtab/setting/fields` 中的原子组件，禁止自行封装或直接使用 Naive UI 组件。**

### 可用原子组件
| 组件名 | 用途 | 特点 |
|--------|------|------|
| `ColorField` | 颜色选择 | 自动处理 `currAppearanceCode`，支持字符串/数组类型 |
| `FontField` | 字体设置 | 包含字体选择 + 颜色 + 字号，自动处理双主题 |
| `SliderField` | 滑块输入 | 数值范围调节 |
| `SwitchField` | 开关切换 | 简单的布尔开关 |
| `ToggleColorField` | 开关+颜色 | 适用于边框/阴影等需要启用开关+颜色配置，支持额外显示宽度输入 |

### 使用示例

```vue
<template>
  <ColorField v-model="localConfig.xxx.color" :label="$t('common.color')" />
  <FontField
    v-model:font-family="localConfig.xxx.fontFamily"
    v-model:font-color="localConfig.xxx.fontColor"
    v-model:font-size="localConfig.xxx.fontSize"
    :label="$t('common.font')"
  />
  <SliderField v-model="localConfig.xxx.size" :label="$t('common.size')" :min="10" :max="100" />
  <SwitchField v-model="localConfig.xxx.enabled" :label="$t('common.enabled')" />
  <ToggleColorField
    v-model="localConfig.xxx.isBorderEnabled"
    v-model:color="localConfig.xxx.borderColor"
    v-model:width="localConfig.xxx.borderWidth"
    :label="$t('common.borderColor')"
    :show-width="true"
  />
</template>
<script setup>
import { ColorField, FontField, SliderField, SwitchField, ToggleColorField } from '@/newtab/setting/fields'
</script>
```

### 重要说明
- 所有颜色相关组件已内置 `currAppearanceCode` 处理逻辑，**无需在模板中手动取值**
- 传递完整数组即可，组件内部会自动读取当前主题对应的颜色值
- `ToggleColorField` 的 `width` prop 用于边框宽度，仅当 `show-width="true"` 时才显示

## 设置面板图标

每个设置面板都需要一个图标，图标元数据定义在 `src/logic/icons.ts` 的 `SETTING_ICON_META` 对象中：

```ts
export const SETTING_ICON_META: Record<settingPanes, { iconName: string; settingSize: number }> = {
  general: { iconName: ICONS.settings, settingSize: 20 },
  countdown: { iconName: ICONS.countdown, settingSize: 20 }, // 新增面板在此添加
}
```

**所有图标必须通过 `ICONS` 常量引用，禁止硬编码字符串。**

---

# 浏览器权限管理

## 可选权限机制

需要使用新的浏览器权限时，遵循以下规则：

1. **必须使用可选权限**：对于非核心功能必需的权限，声明在 `manifest.ts` 的 `optional_permissions` 中，不要放到 `permissions` 里，避免安装时就请求全量权限
2. **统一管理入口**：权限请求逻辑统一写在 `src/logic/permission.ts`，不要分散在各个组件中
3. **使用时机**：仅在用户**首次主动使用该功能**时才调用 `chrome.permissions.request()` 弹出授权，不要在页面加载时自动请求

当前已声明的可选权限：
- `bookmarks`: 书签功能
- `notifications`: 通知（用于倒计时等需要提醒的功能）

### 使用示例
```ts
import { requestNotificationsPermission, sendNotification } from '@/logic/permission'

// 请求授权
const hasPermission = await requestNotificationsPermission()
if (hasPermission) {
  // 授权成功后执行操作
  sendNotification({ title: 'Title', body: 'Notification body' })
}
```

---

# 发布流程

## 版本号更新

发布前必须同步更新以下两处，且版本号保持一致：
1. **`package.json`** → `version` 字段
2. **`CHANGELOG.md`** → 在文件顶部（已有条目之前）新增对应版本的条目

版本号遵循 `Major.Minor.Patch` 格式。

## CHANGELOG.md 格式规范

文件顶部注释说明了符号含义，新增条目时严格遵守：
```
「+」新增  「-」删除  「^」升级  「#」修复  「!」重要
```

每个版本条目格式如下：
```md
## 🌟Vx.y.x
- +: 新增功能描述
- ^: 优化 / 升级描述
- #: 修复问题描述
- !: 重要变更描述（破坏性改动必须加此前缀）
```

**注意事项：**
- 同一 Minor 版本的多次 Patch 发布，合并写在同一个 `## 🌟Vx.y.x` 条目下，不单独拆条
- 条目内容面向用户，用简洁的中文描述功能变化，不写实现细节
- 新条目始终插入在文件最顶部（`# 更新日志` 标题之后）
