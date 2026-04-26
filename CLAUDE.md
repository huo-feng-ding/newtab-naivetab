# NaiveTab 开发规范

这是NaiveTab，一个浏览器新标签页扩展项目。本文档定义了项目的开发规范，所有 AI 辅助开发必须遵守。AI阅读此文档后在回复前输出 "(-.-)已阅读CLAUDE.md"。

**强制必须遵循 MUST**：
- 所有 AI 的输出要方便中文用户理解，例如：思考过程、与用户的沟通、代码注释、文档编写、等等，都**必须使用中文**，只有关键的技术名词保持英文。
- 编程是一个严肃场景，遇到不清楚的点**不要猜测**，及时与用户确认。最终修改代码前要先给出具体的实施方案让用户审阅。
- 本文件须持续维护：代码改动涉及的新规律/约定/坑点要及时补充；更新后须检查重复、冲突和错位，保持整洁；发现过时描述要及时修正或删除。

---

# 可用 Claude 技能

在这个项目中，当你需要新增 Widget 组件时，直接使用 `/add-widget` 技能，它包含了完整的开发步骤指导，可防止遗漏关键步骤。

---

# 设计文档

项目架构和技术决策的详细文档存放在 `./docs` 目录下。做相关开发前应先查阅对应文档，避免重复造轮子或违背既有设计。有新增或修改要及时维护对应文档。

| 文档 | 主题 |
|------|------|
| [config.md](docs/architecture/config.md) | 三层配置架构、配置迁移、主题系统、mergeState 合并 |
| [storage.md](docs/architecture/storage.md) | 存储与同步：useStorageLocal、防抖写入、Gzip 压缩、版本感知同步、配额管理 |
| [testing.md](docs/architecture/testing.md) | 测试架构：Vitest 配置、Mock 策略、Pre-commit Hook、新增测试指南 |
| [messaging.md](docs/architecture/messaging.md) | 背景脚本消息传递架构 |
| [background-image.md](docs/features/background-image.md) | 背景图系统架构、文件索引、核心流程 |
| [global-shortcut.md](docs/features/global-shortcut.md) | 全局命令快捷键设计与实现 |
| [bookmark.md](docs/features/bookmark.md) | 书签系统架构、双模式运行、同步机制、权限处理 |
| [keyboard.md](docs/features/keyboard.md) | 键盘布局系统、键帽渲染、拖拽定位、主题预设 |
| [widget-dev.md](docs/widgets/widget-dev.md) | Widget 生命周期、WidgetWrap 解析、拖拽系统、定时任务、快速上手 |
| [keyboard-bookmark-widget.md](docs/widgets/keyboard-bookmark-widget.md) | KeyboardBookmark Widget：书签绑定、双模式、事件处理 |
| [search-widget.md](docs/widgets/search-widget.md) | Search Widget 架构、设计决策、错误处理、踩坑点 |

---

**发布材料**（`docs/app-store/`）

| 文档 | 主题 |
|------|------|
| [store-description-zh.txt](docs/app-store/store-description-zh.txt) | 应用商店中文描述 |
| [store-description-en.txt](docs/app-store/store-description-en.txt) | 应用商店英文描述 |

# 编码风格

## CSS

### BEM 命名

**必须采用BEM命名规范：`block__element--modifier`，使用双下划线分隔元素、双连字符分隔修饰符。**

- `block`：组件级名称，使用 camelCase（如 `clockDigital`、`bookmarkFolder`）
- `block__element`：子元素使用双下划线连接（如 `time__text`、`text__digit`）
- `block__element--modifier`：状态/变体使用双连字符（如 `text__divide--dim`）
- 不使用 BEM 中的 block--modifier 形式，修饰符只作用于元素级别
- 全局公共类使用单下划线前缀（如 `.setting__label`、`.label__icon`）

### PostCSS 嵌套

**必须使用 PostCSS 嵌套语法，选择器直接写在父级花括号内，不使用 `&` 拼接类名。**

- Widget 样式外层使用 `#widgetCode` 作为最外层选择器（由 `WidgetWrap` 自动设置 id）
- 嵌套层级不超过 4 层，过深时拆分为独立类
- `v-bind()` 用于绑定响应式配置，返回值来自 `getStyleField()`
- `widget__wrap` div 的 style 被 `v-bind` 用于存放 CSS 变量，不可再对其进行 `:style` 绑定

## Vue 组件

- 统一使用 `<script setup lang="ts">` 语法
- Props 使用 `withDefaults(defineProps<{}>(), {})` 定义默认值
- 双向绑定统一使用 `defineModel()`，多字段使用具名绑定（`defineModel<string>('fieldName')`）
- 内部多字段状态使用 `reactive`，单一状态值使用 `ref`
- 组件类型通过 `typeof` 推导，不重复定义接口
- 组件不是全局注册的，使用前必须 `import`

### v-bind 变量声明顺序（TDZ 陷阱）

**所有 CSS `v-bind()` 引用的变量声明，必须放在 `<script setup>` 的最顶部——imports 之后、任何逻辑代码（函数调用、`watch`、`onMounted`、`reactive` 等）之前。**

**根因：** Vue SFC 编译器会将 `<script setup>` 编译为 `setup()` 函数，并在顶部生成 `useCssVars()` 调用，该调用同步引用所有 `v-bind()` 变量。如果这些变量声明在非 hoistable 代码之后，生产模式下会触发 `ReferenceError: Cannot access 'xxx' before initialization`（TDZ 错误）。dev 模式因 ES modules 的特殊 TDZ 处理不会暴露此问题。

```vue
<script setup lang="ts">
import { getStyleField } from '@/logic/store'

// ✅ 正确：v-bind 变量在最顶部
const WIDGET_CODE = 'myWidget'
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')

// 之后才能写 onMounted、watch、函数声明等
onMounted(() => { ... })
</script>
```

```vue
<script setup lang="ts">
import { getStyleField } from '@/logic/store'

// ❌ 错误：v-bind 变量声明在 onMounted 之后
onMounted(() => { ... })

const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
</script>
```

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

## 模块拆分规范

**当从模块 A 提取代码到新模块 B 后，禁止在 A 中写 `export { xxx } from './B'` 做兼容重导出。**

有更新就要立即修改所有调用方的 import 语句，不留过渡层。这样做避免增加维护成本、模糊模块边界。

**正确做法：** 提取代码后，搜索所有引用了被提取符号的文件，逐一修改其 import 指向新模块，确认 type-check 通过即完成。

## TypeScript

- 函数参数与返回值类型必须显式标注
- 使用 `import type` 导入纯类型
- 类型注解必须显式，不依赖 implicit any
- 未使用的变量必须删除，不保留注释掉的死代码
- 一行超过 120 字符时换行

## 注释规范

**多行注释必须使用 `/** ... */` 格式，禁止用 `//` 逐行拼接。**

```ts
// ❌ 禁止：// 拼接多行
// 架构说明：
// 1. 本地缓存 keymap
// 2. 直接调用 chrome.tabs.create

/**
 * 架构说明
 * 1. 本地缓存 keymap
 * 2. 直接调用 chrome.tabs.create
 */
```

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
2. 使用 `__xxx__` 作为变量占位符（如 `__field__`、`__count__`），不可用 `{xxx}` 会被 vue-i18n 解析为空
3. 代码中使用 `.replace('__xxx__', value)` 替换变量
4. 确保两个语言文件同步更新


---

# Widget 开发

详细架构见 [widget-dev.md](docs/widgets/widget-dev.md)，新增 Widget 使用 `/add-widget` 技能。

## 必须遵守的硬规则

- **扩展点标记**：新增 Widget 时全局搜索 `@@@@` 确认无遗漏（`registry.ts`、`store.ts`）
- **共用 Setting 面板时**：必须维护 `codes.ts` 中的 `WIDGET_SETTING_PANE_MAP`，遗漏会导致右键「设置」无法跳转
- **添加到分组**：必须在 `WIDGET_GROUPS` 的对应分组（`time`/`bookmark`/`tool`）中追加 code
- **保留字段**：包含用户自定义数据时，在 `config.ts` 导出 `PRESERVE_FIELDS`
- **定时任务**：必须使用 [task.ts](src/logic/task.ts) 的 `addTimerTask`/`removeTimerTask`，禁止自行 `setInterval`
- **WidgetWrap**：根组件必须用 `<WidgetWrap :widget-code="WIDGET_CODE">` 包裹

---

# 配置 & 数据持久化

详细架构见 [config.md](docs/architecture/config.md)（三层架构、迁移、主题系统）和 [storage.md](docs/architecture/storage.md)（存储、同步、压缩、配额）。

## 全局状态速查

```ts
// src/logic/store.ts
localConfig      // 各 Widget 配置（响应式，自动持久化）
localState       // 本地状态（currAppearanceCode 等，持久化）
globalState      // 运行时全局状态（不持久化）
  .settingMode              // 'drawer' | 'options'，设置面板展示模式
  .isSettingDrawerVisible   // 设置面板是否打开
  .isGuideMode              // 引导模式
  .isSearchFocused          // 搜索框是否聚焦
  .isInputFocused           // 输入框是否聚焦
  .currSettingTabCode       // 当前激活的 setting pane
```

键盘事件在 `isSettingDrawerVisible || isSearchFocused || isInputFocused` 时会被屏蔽（仅 Escape 可用）。

## 配置字段兼容性（必须遵守）

**任何持久化到 `localStorage` / `chrome.storage` 的配置修改，都不能破坏老用户数据。**

| 操作 | 规则 |
|------|------|
| 新增字段 | `defaultConfig` 提供默认值；顶层字段自动补全，**嵌套对象必须在 `handleAppUpdate` 中手动补全** |
| 修改/重命名 | 禁止直接改语义；必须：新增替代字段 → 迁移旧值 → delete 旧字段 |
| 删除字段 | 先在 `handleAppUpdate` 中 `delete` 旧 key，再从 `defaultConfig` 移除 |
| 嵌套对象 | 必须在 `handleAppUpdate` 中对整个结构做迁移，不能依赖浅合并 |
| 数组字段 | 旧用户数组长度不足时，迁移中补齐缺失元素 |

**每次改配置结构都必须同步升 `package.json` version，并在 `handleAppUpdate` 中新增迁移分支。**

## 后台脚本与 keyboard 配置

后台脚本 `src/background/main.ts` 以 Service Worker 运行，采用**缓存 + 监听模式**。修改 keyboard 配置时：

| 修改类型 | 后台脚本影响 |
|----------|--------------|
| 新增字段 | 无影响 |
| 重命名/删除字段 | **必须同步修改** `main.ts` 中的字段引用 |
| 修改 keymap 结构 | **必须同步修改** `main.ts` 中的访问逻辑 |

`onChanged` 监听器必须返回 `Promise`，否则 Service Worker 可能在异步 resolve 前休眠。

## 必须遵守的硬规则

- **popup 书签同步**：popup 修改书签后必须调用 `flushConfigSync` 强制同步，否则 popup 销毁后防抖回调不会执行

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

需要使用主题色半透明版本时，通过 `customPrimaryColor`（来自 `@/logic/store`）正则替换 alpha 通道生成。详见 [store.ts](src/logic/store.ts) `customPrimaryColor`。

**注意：** Naive UI 不提供 `--n-primary-color-rgb` CSS 变量；**不能**直接拼接十六进制 alpha 后缀，格式不兼容。

## CSS 变量 / Naive UI 主题变量

优先使用 Naive UI CSS 变量（`--n-text-color`、`--n-color`、`--n-border-color` 等），自动跟随主题切换。

常用变量见 [tokens.css](src/styles/tokens.css) 和 Naive UI 文档。

## 中性灰色 Token

**禁止硬编码 `rgba(128, 128, 128, 0.xx)` 或 `rgba(255, 255, 255, 0.xx)`，必须使用 `--gray-alpha-xx` 系列变量。** 浅色模式为 `128` 通道，深色模式自动切换为 `255` 通道。

完整 token 列表见 [tokens.css](src/styles/tokens.css) `--gray-alpha-xx`（共 13 个层级：03/05/06/08/10/12/15/20/35/55/65/70/75/85）。

新增透明度层级时先检查 tokens.css 是否已有近似值。

## 硬编码颜色必须覆盖双模式

确实需要硬编码颜色时，**必须同时写浅色和深色规则**（`:root[data-theme='dark']` 或 `.dark`），优先使用 `--gray-alpha-xx` token 替代。

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

## 双模式架构

设置面板支持两种展示模式，共享同一套内容组件 `SettingPaneContent.vue`：

| 模式 | 入口 | 容器 | 宽度 |
|------|------|------|------|
| **抽屉模式** | newtab 右键菜单 | `setting/index.vue`（NDrawer 包裹） | 750px |
| **全屏模式** | `chrome://extensions` → 选项 | `options/Content.vue`（页面布局） | 居中自适应 |

`globalState.settingMode` 区分当前模式（`'drawer'` / `'options'`）。

## 目录结构

自 v2.0.0 起，设置面板采用全新目录结构，所有设置面板统一管理：

```
src/setting/
├── components/          # 通用组件
│   ├── SettingIconGroup.vue
│   ├── SettingFormWrap.vue
│   └── SettingHeaderBar.vue
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

新增设置面板必须在 `src/setting/registry.ts` 中注册：

在 `SETTING_GROUPS` 对应分组（`global`/`widget`/`other`）的 `items` 数组中添加配置项：
```ts
{ code: 'myWidget', labelKey: 'setting.myWidget' },
```

面板组件文件必须为 `src/setting/panes/{code}/index.vue`，通过异步组件自动加载。

**分组规则：**
- `global`: 全局功能配置（通用、专注模式）
- `widget`: 各 Widget 组件配置
- `other`: 关于、赞助等（放最后）

## Setting 原子组件

**所有 Setting 面板必须使用 `src/setting/fields` 中的原子组件，禁止自行封装或直接使用 Naive UI 组件。**

| 组件 | 用途 |
|------|------|
| `ColorField` | 颜色选择 |
| `FontField` | 字体设置（字体+颜色+字号） |
| `SliderField` | 滑块输入 |
| `SwitchField` | 布尔开关 |
| `ToggleColorField` | 开关+颜色（支持附加宽度输入） |

详见 [fields/index.ts](src/setting/fields/index.ts)。

- 所有颜色组件已内置 `currAppearanceCode`，**无需手动取值**，传递完整数组即可
- `ToggleColorField` 的 `width` 仅当 `show-width="true"` 时才显示

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

**`package.json` 中的 `version` 字段只能由用户手动修改，AI 禁止自行变更版本号。**

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
