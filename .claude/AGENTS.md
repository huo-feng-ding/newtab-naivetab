# NaiveTab 项目开发规范

> 此文件记录项目级开发规范与避坑经验，AI 在开发过程中必须遵守。
> 踩到新坑后随时追加。
>
> **【强制】每次修改代码后，必须审视本次改动是否涉及新的规律、约定、坑点或架构决策。若有，须在当次对话结束前将相关内容补充至本文件对应章节（或新增章节），不得遗留到下次。**
>
> **【强制】每次更新本文件后，必须检查全文是否存在内容重复、表述冲突或章节错位，及时合并或删除冗余内容，保持文件规范整洁。**

---

# 一、Widget 开发

## Widget 开发的扩展点标记

项目用 `@@@@` 注释标记所有关键扩展点，新增 Widget 时全局搜索 `@@@@` 确认无遗漏：

| 注释 | 文件 |
|------|------|
| `@@@@ add widget type` | `src/types/global.d.ts` |
| `@@@@ add widget registry` | `src/newtab/widgets/registry.ts` |
| `@@@@ 更新localConfig后需要手动处理新版本变更的本地数据结构` | `src/logic/store.ts` |

新增 Widget 的完整步骤见 `.claude/skills/add-widget/SKILL.md`。

---

## Widget 与 Setting Pane 的映射

部分 Widget 共用同一个 setting pane（如所有时钟类和 date 均指向 `clockDate`）。

**新增 Widget 后，若其设置面板与其他 Widget 共用，必须维护 `src/newtab/widgets/codes.ts` 中的 `WIDGET_SETTING_PANE_MAP`：**

```ts
// src/newtab/widgets/codes.ts
export const WIDGET_SETTING_PANE_MAP: Partial<Record<WidgetCodes, settingPanes>> = {
  clockDigital: 'clockDate',
  clockAnalog: 'clockDate',
  clockFlip: 'clockDate',   // ← 新增时钟类在此追加
  clockNeon: 'clockDate',
  date: 'clockDate',
}
```

遗漏此步会导致右键菜单点击「设置」无法跳转到正确的 setting 面板。

---

## 自动处理机制（无需手动修改）

以下文件通过 glob / 遍历自动扫描，**不要**手动向其中添加 Widget 条目：

| 文件 | 机制 |
|------|------|
| `src/logic/config.ts` | `import.meta.glob('**/config.ts')` 自动扫描 widget 配置 |
| `src/logic/store.ts` | 遍历 `WIDGET_CODE_LIST` 动态创建 storage key |
| `src/newtab/Content.vue` | 遍历 `widgetsList` 动态渲染所有 Widget |
| `src/newtab/draft/DraftDrawer.vue` | 遍历 `widgetsList` 展示组件库列表 |

---

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
- 组件卸载（`onUnmounted`）时不需要手动移除，`WidgetWrap` 的 `isEnabled` watch 会自动处理

---

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

# 二、配置 & 数据持久化

## 配置存储机制

- 每个 Widget 配置独立存储于 `localStorage`，key 为 `c-{widgetCode}`（如 `c-clockFlip`）
- 通用状态存储 key 为 `l-state`
- `useStorageLocal` 写入有 **800ms 防抖延迟**，避免频繁写入
- Chrome 云同步使用 `chrome.storage.sync`，key 为 `naive-tab-{field}`
- **云同步限制**：单个配置不超过 8KB，总量约 100KB，每分钟最多写 120 次

---

## 全局状态说明

```ts
// src/logic/store.ts

localConfig      // 各 Widget 配置（响应式，自动持久化）
localState       // 本地状态（currAppearanceCode 等，持久化）
globalState      // 运行时全局状态（不持久化）
  .isSettingDrawerVisible  // 设置面板是否打开
  .isGuideMode             // 引导模式
  .isSearchFocused         // 搜索框是否聚焦
  .isMemoFocused           // 备忘录是否聚焦
  .currSettingTabCode      // 当前激活的 setting pane
```

键盘事件在 `isSettingDrawerVisible || isSearchFocused || isMemoFocused` 时会被屏蔽（仅 Escape 可用）。

---

## 配置字段设计规范（兼容性）

**Widget 的 `config.ts` 以及任何需要持久化到 `localStorage` / `chrome.storage` 的配置，在设计时必须保证向前兼容，不能破坏现存用户的数据。**

### 新增字段

- 新增字段时必须在 `config.ts` 的 `defaultConfig` 中提供合理的默认值。
- `useStorageLocal` 初始化时会做**浅层合并**，因此顶层新增字段可自动补全；**嵌套对象中新增字段不会自动合并**，必须同时在 `handleAppUpdate` 中手动补充（见「版本升级数据迁移」章节）。
- 字段命名须清晰、不可与已有字段语义冲突，避免后续产生歧义。

### 修改 / 重命名字段

- **禁止直接修改已上线字段的语义或类型**（例如把 `number` 改为 `string[]`），这会导致老数据反序列化异常。
- 如需改变字段含义，必须：
  1. 新增替代字段（带默认值）。
  2. 在 `handleAppUpdate` 中将旧字段的值迁移到新字段。
  3. 在同一迁移版本号中 `delete` 旧字段。

### 删除字段

- **禁止直接从 `defaultConfig` 中删除字段**（删了之后老用户本地仍有旧 key，且迁移时无法判断）。
- 删除字段时必须先在 `handleAppUpdate` 中显式 `delete (localConfig.xxx as any).oldField`，再从 `defaultConfig` 中移除，并在同一 PR 中完成。

### 嵌套对象 / 数组配置

- 嵌套对象配置（如颜色数组 `[light, dark]`）修改时，必须在 `handleAppUpdate` 中对整个嵌套结构做迁移，不能依赖浅合并。
- 数组类型字段新增元素时，若旧用户数组长度不足，必须在迁移中补齐缺失元素。

### 版本号规范

- 每次对持久化配置结构做任何变更，都必须同步升级 `package.json` 的 `version`，并在 `handleAppUpdate` 中新增对应版本号的迁移分支。
- 迁移分支使用 `compareLeftVersionLessThanRightVersions(version, 'x.y.z')` 判断，确保每个迁移只执行一次。
- 同一版本内的多处迁移合并写在同一个 `if` 块中，避免重复判断。

### 禁止的危险操作

| ❌ 危险操作 | ✅ 正确做法 |
|------------|------------|
| 直接修改字段类型 | 新增字段 + 迁移旧值 + 删除旧字段 |
| 直接重命名字段 | 新增字段 + 迁移旧值 + 删除旧字段 |
| 直接删除字段 | 先在迁移中 delete，再移除 defaultConfig |
| 依赖浅合并补全嵌套字段 | 在 handleAppUpdate 中手动补全 |
| 不升级版本号就改配置结构 | 必须同步升版本号并写迁移逻辑 |

---

## 版本升级数据迁移

**修改任意 Widget 的 config.ts 配置结构（新增/删除/重命名字段）时，必须在 `src/logic/store.ts` 的 `handleAppUpdate` 函数中添加版本迁移逻辑：**

```ts
// @@@@ 更新localConfig后需要手动处理新版本变更的本地数据结构
if (compareLeftVersionLessThanRightVersions(version, 'x.y.z')) {
  // 示例：新增字段
  localConfig.myWidget.newField = defaultConfig.myWidget.newField
  // 示例：删除旧字段
  delete (localConfig.myWidget as any).oldField
  // 示例：重置整个 widget 配置
  localConfig.myWidget = defaultConfig.myWidget
}
```

`useStorageLocal` 在初始化时会做**浅层合并**（`{ ...defaultValue, ...storedValue }`），可自动补全新增的顶层字段；但**嵌套对象字段不会自动合并**，需手动处理。

---

# 三、样式 & 主题

## 浅色 / 深色模式

**所有涉及颜色的字段必须同时考虑两种主题，不能只写单一值。**

颜色统一使用**双元素数组** `[浅色值, 深色值]`，通过 `localState.currAppearanceCode`（`0` = 浅色，`1` = 深色）自动取对应值：

```ts
fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)']
//          ↑ index 0: 浅色              ↑ index 1: 深色
```

- `getStyleField(WIDGET_CODE, 'fontColor')` 自动读取当前主题对应值
- `SettingPaneWrap` 的通用颜色控件也自动处理双数组
- Setting 面板中手动读取颜色时，需用 `localConfig.xxx.fontColor[localState.currAppearanceCode]`

---

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
- Naive UI **不提供** `--n-primary-color-rgb` 这类 CSS 变量，直接用它会 fallback 到 Naive UI 默认绿色（`#18a058`）
- **不能**直接拼接十六进制 alpha 后缀（如 `+ '1a'`），格式不兼容

---

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

---

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

/* ❌ 错误：只写了一种模式 */
.badge {
  background-color: #f0f0f0;  /* 深色模式下会很突兀 */
}
```

---

## CSS 样式规范

- Widget 的样式块外层 selector 为 `#widgetCode`（由 `WidgetWrap` 自动设置 id）
- Widget 容器（`.xxx__container`）必须设置 `position: absolute`，配合拖拽定位系统
- 使用 `v-bind(cssVar)` 将响应式配置注入 CSS，`cssVar` 由 `getStyleField()` 生成
- 尺寸单位优先使用 `vmin`（`getStyleField` 传 `'vmin'` 时会自动乘以 `0.1`）
- **`widget__wrap` div 的 style 被 `v-bind` 用于存放 CSS 变量，不可再对其进行 `:style` 绑定操作**
- 优先使用全局 token 变量，不要写魔法数字（token 定义在 `src/styles/main.css` 顶部 `:root {}` 中）
- `rgba()` 的 alpha 通道不支持 `var()`，需写字面量（如 `rgba(0,0,0,0.85)`）
- 不要给 Naive UI 组件（如 collapse header、tab text）覆盖字号，让它继承上下文即可
- 使用 `backdrop-filter` 时必须同时加 `-webkit-backdrop-filter` 前缀

全局公共 CSS 类（定义在 `src/styles/main.css`，可直接使用）：

| 类名 | 用途 |
|------|------|
| `.setting__label` | Setting 面板中的分组标题行（含图标 + 文字） |
| `.label__icon` | `.setting__label` 内的图标 |
| `.setting__item-ele` | 表单项内追加的元素（加左 margin） |
| `.setting__input-number` | 数字输入框固定宽度（103px） |
| `.setting__input-number--unit` | 带单位的数字输入框（150px） |
| `.n-form-item--color` | 颜色类表单项（压缩 margin） |

---

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

---

## 光感设计语言（Glassmorphism）

NaiveTab 的 Widget 统一使用"玻璃光感"设计语言，已在 `bookmarkFolder`、`search` 等组件中落地，**新增有背景容器的 Widget 时参考这两个组件的样式实现**。

核心要点（避坑用，具体值看源码）：
- 容器用 `backdrop-filter: blur(...) saturate(1.4)`，`::before` 做内高光渐变，`::after` 做顶部高光线
- 使用伪元素高光时，容器内的真实内容需设 `position: relative; z-index: 1`，否则会被高光层遮住
- `border-radius` 用 `inherit`，不要在伪元素上写死值

---

# 四、Setting 面板

## SettingPaneWrap 通用控件机制

`SettingPaneWrap` 通过检测 `localConfig[widgetCode]` 中是否存在对应字段名来**自动渲染通用控件**，无需手动写表单：

| 配置字段 | 自动渲染的控件 | 依赖字段 |
|----------|--------------|----------|
| `width` | 宽度滑块 | - |
| `height` | 高度滑块 | - |
| `margin` | 外边距滑块 | - |
| `padding` | 内边距滑块 | - |
| `borderRadius` | 圆角滑块 | - |
| `backgroundBlur` | 模糊度滑块 | - |
| `letterSpacing` | 字间距滑块 | - |
| `fontFamily` | 字体选择 + 颜色 + 字号 | `fontSize`、`fontColor` |
| `primaryColor` | 主题色选择器 | - |
| `backgroundColor` | 背景色选择器 | - |
| `borderColor` | 边框开关 + 颜色 + 宽度 | `isBorderEnabled`、`borderWidth` |
| `shadowColor` | 阴影开关 + 颜色 | `isShadowEnabled` |

自定义控件放在插槽中：
- `#header`：基础功能开关（放在样式区上方）
- `#style`：紧跟样式分割线后的自定义样式控件
- `#size`：尺寸控件区后的自定义控件
- `#color`：通用颜色控件后的自定义颜色控件
- `#footer`：全部控件之后

---

# 五、通用规范

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

---

## 图标使用规范

**禁止在模板或代码中硬编码图标字符串，必须通过 `ICONS` 常量引用。**

```ts
// ✅ 正确
import { ICONS } from '@/logic/icons'
// 模板中：:icon="ICONS.clockFlip"

// ❌ 错误
// :icon="'mdi:card-text-outline'"
```

新增图标需在 `src/logic/icons.ts` 的 `ICONS` 对象中先定义，再在 `WIDGET_ICON_META` 或模板中引用。

图标名称必须在 [Iconify](https://icon-sets.iconify.design/) 上验证存在，否则渲染为空。

### Icon 尺寸控制方式

**`@iconify/vue` 的 `<Icon>` 组件渲染为 SVG，其尺寸跟随 `font-size` 继承。控制尺寸的正确做法是给 `<Icon>` 加 `class`，然后用 `font-size` 设置大小。**

```vue
<!-- ✅ 正确：通过 class + font-size 控制 -->
<NButton quaternary size="small">
  <Icon icon="ic:round-keyboard-arrow-up" class="action__icon" />
</NButton>
```

```css
/* ✅ 正确：用 font-size 控制 Icon 尺寸 */
.action__icon {
  font-size: 20px;
}
```

```vue
<!-- ❌ 错误：直接在模板传 :width / :height prop，在 NButton 内部会被覆盖 -->
<Icon icon="ic:round-keyboard-arrow-up" :width="20" />
```

```css
/* ❌ 错误：用 :deep() 穿透覆盖 svg 宽高，语义混乱且不可靠 */
.item__actions :deep(.n-button svg) {
  width: 20px !important;
  height: 20px !important;
}
```

---

## i18n 规范

- 语言文件：`src/locales/zh-CN.json` 和 `en-US.json`（两个文件必须同步更新）
- Widget 名称的 key 格式：`setting.{widgetCode}`（如 `setting.clockFlip`）
- 组件内使用 `$t('key')` 或 `window.$t('key')`（非模板中）
- 时钟类专用 key 统一放在 `clock` 命名空间下（如 `clock.showSeconds`）

---

# 六、发布流程

## 版本号更新

发布前必须同步更新以下两处，且版本号保持一致：

1. **`package.json`** → `version` 字段
2. **`CHANGELOG.md`** → 在文件顶部（已有条目之前）新增对应版本的条目

版本号遵循 `Major.Minor.Patch` 格式，当前示例：`1.27.4`。

---

## CHANGELOG.md 格式规范

文件顶部注释说明了符号含义，新增条目时严格遵守：

```
「+」新增  「-」删除  「^」升级  「#」修复  「!」重要
```

每个版本条目格式如下（以 `x` 代表 Patch 号）：

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
