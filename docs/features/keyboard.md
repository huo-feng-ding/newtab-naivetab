# 键盘系统架构

## 概述

键盘系统负责在 NaiveTab 新标签页中渲染可定制的虚拟键盘，支持 16 种布局、3 种键帽视觉风格、80+ 预设配色方案。键盘与书签 Widget（`keyboardBookmark`）和全局命令快捷键共享视觉渲染逻辑。

**业务范围：** 本文档描述通用键盘引擎（布局、渲染、主题、拖拽）。Widget 专属内容（书签绑定、keymap、事件处理）详见 [keyboard-bookmark-widget.md](../widgets/keyboard-bookmark-widget.md)。

---

## 配置命名空间

| 命名空间 | 配置文件 | 用途 |
|----------|----------|------|
| `keyboardCommon` | `src/logic/keyboard/keyboard-config.ts` | 键盘视觉样式（布局、键帽、外壳、配色） |
| `keyboardBookmark` | `src/newtab/widgets/keyboardBookmark/config.ts` | Widget 业务数据（keymap、位置、来源模式） |

另有 `keyboardCommand` 配置在 `src/logic/globalShortcut/shortcut-command.ts` 中——**不是可视 Widget**，是全局命令快捷键系统。

---

## 键盘布局系统

### 文件

- `src/logic/keyboard/keyboard-layout.ts` — 布局定义与运行时转换
- `src/logic/keyboard/keyboard-constants.ts` — 按键默认配置（label、size、textAlign）
- `src/logic/keyboard/keyboard-config.ts` — `keyboardCommon` 默认配置
- `src/logic/keyboard/keycap-themes.ts` — 80+ 预设配色方案

### 可用布局（16 种）

`key33`, `key45`, `key47`, `key53`, `key61`, `key64`, `key66`, `key67`（默认）, `key68`, `key80`, `key81a`, `key81b`, `key84`, `key87`, `hhkb`

### 布局数据结构

```ts
{
  list: string[][]                        // 二维数组，每行 key codes
  emphasisOneKeys: string[]               // 强调色组 1（修饰键、功能键等）
  emphasisTwoKeys: string[]               // 强调色组 2（Escape、Enter、方向键等）
  custom: Record<string, KeyboardConfigItem>  // 按键级覆盖
  customSpace2?: Record<string, ...>      // 空格分两段的配置
  customSpace3?: Record<string, ...>      // 空格分三段的配置
}
```

### 运行时转换

1. **Mac 自动替换**：布局标记 `isMacOS: false` 但用户为 macOS 时，自动交换最后一行 `AltLeft <-> MetaLeft` 和 `AltRight <-> MetaRight`
2. **空格分割**：`localConfig.keyboardCommon.splitSpace` 为 `'space2'` 或 `'space3'` 时，在最后一行 `Space` 后插入 `SpaceSplit1`（和 `SpaceSplit2`），并合并对应的 `customSpace2`/`customSpace3` 到 `custom`

### 核心导出

```ts
/** 当前布局的完整配置（结构化深拷贝，避免修改冻结的默认配置） */
const currKeyboardConfig: ComputedRef<{
  isMacOS: boolean
  list: string[][]
  emphasisOneKeys: string[]
  emphasisTwoKeys: string[]
  custom: Record<string, KeyboardConfigItem>
  customSpace2?: Record<string, KeyboardConfigItem>
  customSpace3?: Record<string, KeyboardConfigItem>
}>

/** 当前布局所有按键的一维数组 */
const keyboardCurrentModelAllKeyList: ComputedRef<string[]>
```

---

## 按键映射与标签

### `KEYBOARD_CODE_TO_DEFAULT_CONFIG`（`keyboard-constants.ts`）

将每个 `KeyboardEvent.code` 映射到 `{ label, textAlign, size }`：

- **OS 感知标签**：Mac 显示小写 `esc`/`delete`/`return`/`caps lock`/`shift`/`control`/`fn`，Windows 显示大写 `Esc`/`Delete`/`Enter`/`Caps Lock`/`Shift`/`Ctrl`/`Fn`
- **Mac 修饰键符号**：`control` → `^`，`MetaLeft` → `⌘`，`AltLeft` → `⌥`
- 部分按键有 `alias` 属性（如 `ShiftLeft.alias = 'LShift'`）
- `size` 表示按键宽度（相对于标准 1u 键）

### 自定义覆盖解析（`useKeyboardStyle.ts`）

```ts
getCustomLabel(code)     // custom[code]?.label ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].label
getCustomTextAlign(code) // custom[code]?.textAlign ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].textAlign
getKeycapWidthValue(code) // custom[code]?.size ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].size
```

### 键盘 Widget 屏蔽的按键

`KEYBOARD_NOT_ALLOW_KEYCODE_LIST_FOR_WIDGET` 屏蔽修饰键（Shift、Ctrl、Meta、Alt）和 Space，这些键透传给浏览器默认行为。

---

## 键帽渲染系统

### 三层组件架构

```
KeyboardLayout（容器）
  └── KeyboardKeycapWidget（单键包装，使用 useKeyboardStyle）
        └── KeyboardKeycapDisplay（纯展示组件）
```

#### 1. KeyboardKeycapDisplay（纯展示）

`src/components/KeyboardKeycapDisplay.vue`

Props: `keyCode`, `label`, `name`, `visualType`, `bookmarkType`, `iconSrc`, 样式字符串, 可见性开关。

**视觉层次（从外到内）：**
```
row__keycap（基础边框/阴影，按类型差异化：flat/gmk/dsa）
  keycap__stage（顶面，类型差异化渐变/内阴影）
    keycap__label  （键位标识，如 'A' / 'Enter'）
    keycap__img    （favicon 或文件夹/返回图标）
    keycap__name   （书签名称）
```

#### 2. 三种键帽视觉类型（KeycapVisualType）

| 类型 | 特征 |
|------|------|
| `gmk` | Cherry 轮廓模拟——非对称边框（底部更厚）、多层内阴影、顶面负边距收窄 |
| `dsa` | 球形等高——四面均匀边框、径向渐变顶面、圆角 +2px |
| `flat` | 极简——微妙内渐变、顶部高光线、标准边框 |

**按下动画**：`row__keycap--active` 应用 `translateY(var(--nt-kb-active-translate-y))`（约 4.3%）+ `brightness(0.92)`，GMK 阴影从 3px 降至 1px。

#### 3. KeyboardLayout（容器）

`src/components/KeyboardLayout.vue`

渲染三层视觉结构：
- **Shell**：外壳，玻璃模糊、渐变高光、顶部高光线、投影
- **Plate**：内板（PCB 底板），在键帽间可见，延伸 `platePadding` 超出键帽边界，`z-index: -1`
- **Keycaps**：通过 `#keycap` 插槽渲染

暴露 `#keycap` 插槽，参数 `{ code, rowIndex }`。

#### 4. useKeyboardStyle（可组合函数）

`src/composables/useKeyboardStyle.ts`

```ts
function useKeyboardStyle(unit: 'vmin' | 'px', baseSizeOverride?: number)
```

**返回值：**
| 返回值 | 作用 |
|--------|------|
| `base: ComputedRef<number>` | 根据 `keycapSize` 计算（vmin 模式）或使用覆盖值（px 模式） |
| `keycapCssVars` / `layoutCssVars` | CSS 变量名 → 值的映射对象 |
| `getCustomLabel(code)` | 解析标签文本 |
| `getKeycapWrapStyle(code)` | 宽度 + 自定义边距的内联样式 |
| `getKeycapStageStyle(code)` | GMK/DSA 立体偏移 |
| `getKeycapTextStyle(code)` | text-align + 条件 padding |
| `getKeycapIconStyle(code)` | justify-content + 条件 padding |
| `getEmphasisGroup(code)` | 返回 0/1/2（普通/强调1/强调2） |
| `getEmphasisStyle(code)` | 强调背景 + 字体颜色内联样式 |

**单位转换**：`toUnit(value, unit)` — vmin 模式乘以 0.1，px 模式追加 'px'。约定 `1vmin ~ 10px`（1000px 视口）。

**CSS 变量前缀**：所有键盘变量使用 `--nt-kb-*` 前缀。

**键帽尺寸单位约定**：配置值以 **px 量级**存储（如 `keycapSize: 58`）。vmin 模式下 `value / keycapSize * base * 0.1` 生成比例 vmin 值，确保所有维度随 `keycapSize` 等比缩放。

---

## 键帽主题预设

`src/logic/keyboard/keycap-themes.ts` — 80+ 预设主题，分 4 组：

| 分组 | 数量 | 示例 |
|------|------|------|
| `KEYCAP_CLASSIC_MAP` | 30 | Light, White on Black, Dolch, Godspeed |
| `KEYCAP_ATMOSPHERE_MAP` | 22 | Nord, Sakura, Mocha, Aurora |
| `KEYCAP_STUDIO_MAP` | 20 | Dracula, Gruvbox, Tokyo Night, Catppuccin |
| `KEYCAP_PREMIUM_MAP` | 8 | Cashmere, Titanium, Obsidian |

每个主题定义 7 个颜色字段：`shellColor`, `mainFontColor`, `mainBackgroundColor`, `emphasisOneFontColor`, `emphasisOneBackgroundColor`, `emphasisTwoFontColor`, `emphasisTwoBackgroundColor`。

**注意：** 主题为单色（非双主题数组）。`PresetThemeDrawer` 设置组件写入双主题数组的 `[0]`（浅色）和 `[1]`（深色）索引。

---

## keyboardCommon 配置字段

```
keyboardCommon 配置（约 30 个字段）：
├── 布局类
│   ├── keyboardType          // 布局类型
│   ├── splitSpace             // 空格分割 ('none' | 'space2' | 'space3')
│   └── keycapType             // 键帽视觉风格 ('gmk' | 'dsa' | 'flat')
├── 键帽类
│   ├── keycapPadding / keycapSize / keycapBorderRadius
│   ├── isKeycapBorderEnabled / keycapBorderWidth / keycapBorderColor
│   └── keycapBackgroundBlur
├── 外壳类
│   ├── isShellVisible
│   ├── shellVerticalPadding / shellHorizontalPadding / shellBorderRadius
│   ├── shellColor
│   └── isShellShadowEnabled / shellShadowColor
├── 内板类
│   ├── isPlateVisible / platePadding / plateBorderRadius
│   ├── plateColor / plateBackgroundBlur
├── 内容类
│   ├── isCapKeyVisible / keycapKeyFontFamily / keycapKeyFontSize
│   ├── isNameVisible / keycapBookmarkFontFamily / keycapBookmarkFontSize
│   ├── isFaviconVisible / faviconSize
│   └── isTactileBumpsVisible
├── 颜色类（双模式数组 [浅色, 深色]）
│   ├── mainFontColor / mainBackgroundColor
│   ├── emphasisOneFontColor / emphasisOneBackgroundColor
│   └── emphasisTwoFontColor / emphasisTwoBackgroundColor
└── 覆盖类
    └── emphasisKeyOverrides: Record<string, 0 | 1 | 2>  // 用户自定义强调分组
```

**PRESERVE_FIELDS** = `['keyboardType', 'keycapType', 'emphasisKeyOverrides']`

---

## moveable 拖拽系统

`src/logic/moveable.ts`

### 核心状态

```ts
const isDragMode: Ref<boolean>            // 编辑模式开关
const isDraftDrawerVisible: Ref<boolean>  // 组件库抽屉开关
const moveState = reactive({
  isDragActive: boolean,
  currDragTarget: Element | null,
  currDragType: string | null,
  mouseDownTaskMap: Map<string, Function>,
  mouseMoveTaskMap: Map<string, Function>,
  mouseUpTaskMap: Map<string, Function>,
  isGuidelineVisible: boolean,
})
```

### 架构：任务映射鼠标事件系统

1. `WidgetWrap` 挂载时注册 `startDrag`、`onDragging`、`stopDrag` 到对应 Map
2. 全局 `mousedown`/`mousemove`/`mouseup`/`mouseleave` 监听器根据 `currDragTarget` 分发任务
3. `mousemove` 使用 `requestAnimationFrame` 节流渲染
4. Widget 通过 `data-target-type` / `data-target-code` 属性识别

### Widget 定位

- 位置存储在 `localConfig[code].layout`：
  ```ts
  {
    xOffsetKey: 'left' | 'right',
    xOffsetValue: number,    // vw 单位
    yOffsetKey: 'top' | 'bottom',
    yOffsetValue: number,    // vh 单位
    xTranslateValue: number,  // CSS translate 百分比（居中）
    yTranslateValue: number,
  }
  ```
- 拖拽时在 `mouseup` 时写入 `localConfig`（非拖拽过程中），避免过多存储写入
- 拖到右上角（x > width-100, y < 100）触发删除，`animateDeleteWidget` 动画后设置 `enabled = false`

---

## 重要设计模式与避坑

1. **计算属性深拷贝**：`currKeyboardConfig` 使用 `structuredClone(target)` 避免修改冻结的默认配置。直接修改返回值无效。

2. **Mac 自动替换是原地修改**：Alt/Meta 交换在克隆后的 `target.list[lastRowIndex]` 上执行，通过 `target.isMacOS`（非全局 `isMacOS`）判断——已设 `isMacOS: true` 的布局（如 `hhkb`）跳过交换。

3. **CSS 变量 TDZ**：`--nt-kb-*` CSS 变量由 `useKeyboardStyle` 的计算引用驱动，必须在键帽组件挂载前可用（在 setup 时调用 composable 保证）。

4. **强调覆盖优先级**：`emphasisKeyOverrides`（用户自定义）优先于布局定义的 `emphasisOneKeys`/`emphasisTwoKeys`。

5. **空格分割配置合并**：启用 `splitSpace` 时，`customSpace2`/`customSpace3` 对象**展开合并到** `target.custom`，可覆盖已有键位配置。

6. **KeyboardLayout 内板渲染**：内板 div（`keyboard-layout__keycap-plate`）渲染在每个 `__keycap-wrap` 内部，而非单个横跨元素。因此仅覆盖单个键帽区域。

7. **拖拽坐标系统**：Widget 位置使用 `vw`/`vh` 百分比，非像素。这使它们对视口变化具有响应性。

8. **KeyboardKeycapDisplay 是纯组件**：所有样式通过 CSS 变量和内联样式传入。不包含业务逻辑（URL 获取、事件分发）。

9. **键帽尺寸单位约定**：配置值以 px 等效整数存储（如 `keycapSize: 58`）。`toUnit()` 转换：`58 * 0.1 = 5.8vmin`。1000px 视口下 5.8vmin = 58px。修改 `keycapSize` 会等比缩放所有派生维度（padding、border-width、font-size 等）。
