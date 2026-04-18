# 实施方案：v-bind() → :style + CSS var() 迁移

## 背景

Vue 3 的 `<style>` 中 `v-bind()` 存在 TDZ（暂时性死区）风险——当绑定变量声明在非 hoistable 代码之后时，生产模式会触发 `ReferenceError`。虽然当前项目中 v-bind 变量声明位置均正确，但：

1. `v-bind()` 的 TDZ 隐患随代码演进可能反复引入（CLAUDE.md 已强调此规范但仍有遗漏风险）
2. 已有 5 个文件迁移到 `:style` + `var()` 模式（App.vue、BackgroundImg.vue、WidgetWrap.vue、KeyboardLayout.vue、PopupConfigBookmark.vue），形成事实上的最佳实践
3. 统一为 `:style` + `var()` 可彻底消除 TDZ 隐患

## 现状盘点

### 待迁移文件（7 个，共 35 处 v-bind）

| 文件 | v-bind 数 | 绑定变量 | 复杂度 |
|------|-----------|----------|--------|
| `src/components/BookmarkManager.vue` | 2 | primaryBorder, dragHighlightBg | 低 |
| `src/components/CustomColorPicker.vue` | 1 | customEntryBackgroundColor | 低 |
| `src/setting/SettingPaneContent.vue` | 2 | settingContentHeightStyle | 低 |
| `src/setting/panes/focusMode/index.vue` | 5 | primaryBg, primaryBgHover, primaryBorder, primaryIconBg, customPrimaryColor | 中 |
| `src/setting/panes/general/index.vue` | 6 | customPrimaryColor (含 color-mix) | 中 |
| `src/setting/panes/general/BackgroundDrawerImageElement.vue` | 3 | customPrimaryColor (含 color-mix) | 中 |
| `src/components/KeyboardLayout.vue` | 16 | keycapBookmarkFontFamily, keycapPaddingCss, keycapBaseSizeCss, platePaddingCss, plateColor, plateBorderRadiusPx, plateBackgroundBlurPx, shellVPaddingCss, shellHPaddingCss, shellBorderRadiusPx, shellColor, shellBackgroundBlurPx, shellShadowColor | 高 |

### 已迁移文件（无需改动）

- `src/newtab/App.vue`
- `src/newtab/content/BackgroundImg.vue`
- `src/newtab/widgets/WidgetWrap.vue`
- `src/newtab/widgets/keyboard/index.vue`
- `src/popup/PopupConfigBookmark.vue`

### useKeyboardStyle composable 中已有 CSS var 模式

`src/composables/useKeyboardStyle.ts` 已返回 `keycapCssVars` computed（`--keycap-*` 前缀），通过 `:style` 注入到 `KeyboardKeycapDisplay`。`KeyboardLayout.vue` 中的 v-bind 变量大多也来自此 composable 的返回值，迁移方向明确。

## 方案设计

### 核心原则

1. **CSS 变量命名空间**：使用 `--nt-` 前缀（NaiveTab），与 NaiveUI 的 `--n-*` 前缀隔离，避免冲突
2. **注入元素**：`:style` 绑定到组件根 div，CSS 变量通过继承被子元素和 `<style>` 中的 `var()` 消费
3. **color-mix 处理**：在 JS 层预计算 alpha 变体值，不在 CSS 中用 `color-mix(in srgb, var(--xxx) N%, transparent)` ——因为 NaiveUI 注入的 CSS 变量可能覆盖我们的变量
4. **保持已有模式一致**：遵循 WidgetWrap.vue、App.vue 中已确立的 `:style` + `var()` 模式

### NaiveUI 冲突风险与规避

NaiveUI 组件（如 `NConfigProvider`、`NCard`、`NTabs`）会在最外层 div 注入 `--n-*` 系列 CSS 变量。我们的 `:style` 如果直接绑到 NaiveUI 组件上，可能覆盖其内部变量。

**规避策略**：
- `:style` 绑定到**自定义根 div**，不绑定到 NaiveUI 组件
- CSS 变量前缀用 `--nt-`，与 `--n-*` 完全隔离
- 对于 Setting 面板中使用了 NaiveUI 组件的场景，在组件外层包一个 div 来注入变量

### 迁移模式模板

```vue
<script setup lang="ts">
// v-bind 变量声明移到最顶部
const ntPrimaryColor = computed(() => customPrimaryColor.value)
const ntPrimaryBg = computed(() => customPrimaryColor.value.replace(/[\d.]+\)$/, '0.08)'))
const ntPrimaryBorder = computed(() => customPrimaryColor.value.replace(/[\d.]+\)$/, '0.28)'))

const cssVars = computed(() => ({
  '--nt-primary-color': ntPrimaryColor.value,
  '--nt-primary-bg': ntPrimaryBg.value,
  '--nt-primary-border': ntPrimaryBorder.value,
}))
</script>

<template>
  <div :style="cssVars"> <!-- 绑定到自定义根 div -->
    <!-- 内容 -->
  </div>
</template>

<style>
.my-component {
  background-color: var(--nt-primary-bg);
  border-color: var(--nt-primary-border);
}
</style>
```

## 逐文件迁移方案

### Phase 1：简单迁移（低风险，2 个文件）

#### 1.1 `src/components/CustomColorPicker.vue`

- 绑定：`background-color: v-bind(customEntryBackgroundColor)`
- 方案：在组件根 div 注入 `--nt-color-picker-bg`，CSS 改为 `var(--nt-color-picker-bg)`
- 注意：此组件使用了 `n-popover`，`:style` 需绑定到 `.color-picker__entry` 的父级自定义 div

#### 1.2 `src/setting/SettingPaneContent.vue`

- 绑定：`height: v-bind(settingContentHeightStyle)`（2 处）
- 方案：computed `--nt-setting-content-height`，通过 `:style` 注入到根 div
- 注意：此组件内包裹 `NTabs`，需确保 `:style` 绑定到自定义根 div 而非 NTabs

### Phase 2：中等复杂度（3 个文件，含 color-mix）

#### 2.1 `src/components/BookmarkManager.vue`

- 绑定：`outline: v-bind(primaryBorder)`、`background-color: v-bind(dragHighlightBg)`
- 均为 `customPrimaryColor` 的 alpha 变体
- 方案：注入 `--nt-bookmark-primary-border`、`--nt-bookmark-drag-highlight-bg`

#### 2.2 `src/setting/panes/focusMode/index.vue`

- 5 个 v-bind：primaryBg、primaryBgHover、primaryBorder、primaryIconBg、customPrimaryColor
- 方案：注入 5 个 `--nt-focus-*` 变量
- 注意：scoped 样式，变量注入到根 div 即可

#### 2.3 `src/setting/panes/general/index.vue`

- 6 处 v-bind，其中 3 处使用 `color-mix(in srgb, v-bind(customPrimaryColor) N%, transparent)`
- **关键问题**：`color-mix()` 内直接使用 `var()` 在部分场景下解析不稳定
- **方案**：在 JS 层预计算 color-mix 结果：
  ```ts
  const ntActiveColor = computed(() => {
    const base = customPrimaryColor.value
    return `color-mix(in srgb, ${base} 12%, transparent)`
  })
  ```
  然后注入为 `--nt-general-active-color`，CSS 直接用 `var(--nt-general-active-color)`

#### 2.4 `src/setting/panes/general/BackgroundDrawerImageElement.vue`

- 3 处 v-bind，同上含 color-mix
- 方案同上，注入 `--nt-bg-drawer-*` 变量

### Phase 3：高复杂度（1 个文件）

#### 3.1 `src/components/KeyboardLayout.vue`

- 16 处 v-bind，变量来自 `useKeyboardStyle` composable
- 这是最大的迁移目标，需要在 composable 中新增 `layoutCssVars` 返回值
- 方案：
  1. 在 `useKeyboardStyle` 中新增 `layoutCssVars` computed，汇总所有当前 v-bind 的变量
  2. 前缀用 `--nt-kb-`（keyboard layout 专用）
  3. `KeyboardLayout.vue` 中通过 `:style="layoutCssVars"` 注入
  4. CSS 中全部替换为 `var(--nt-kb-*)`

  新增的 `layoutCssVars` 示例：
  ```ts
  const layoutCssVars = computed(() => ({
    '--nt-kb-bookmark-font-family': keycapBookmarkFontFamily.value,
    '--nt-kb-keycap-padding': keycapPaddingCss.value,
    '--nt-kb-keycap-height': keycapBaseSizeCss.value,
    '--nt-kb-plate-padding': platePaddingCss.value,
    '--nt-kb-plate-color': plateColor.value,
    '--nt-kb-plate-radius': plateBorderRadiusPx.value,
    '--nt-kb-plate-blur': plateBackgroundBlurPx.value,
    '--nt-kb-shell-v-padding': shellVPaddingCss.value,
    '--nt-kb-shell-h-padding': shellHPaddingCss.value,
    '--nt-kb-shell-radius': shellBorderRadiusPx.value,
    '--nt-kb-shell-color': shellColor.value,
    '--nt-kb-shell-blur': shellBackgroundBlurPx.value,
    '--nt-kb-shell-shadow': shellShadowColor.value,
  }))
  ```

## 实施步骤

### Step 1：创建工具函数（可选）

如需统一处理 color-mix 预计算，可在 `src/logic/store.ts` 中新增辅助函数：

```ts
/**
 * 将颜色字符串转换为 color-mix 表达式
 * 例：colorMixWithAlpha('rgba(255,0,0,1)', 0.12) → 'color-mix(in srgb, rgba(255,0,0,1) 12%, transparent)'
 */
export const colorMixWithAlpha = (color: string, alpha: number): string =>
  `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
```

### Step 2-7：逐文件迁移

按 Phase 1 → Phase 2 → Phase 3 顺序，每步完成后检查 type-check 通过。

### Step 8：最终验证

1. 全局搜索确认无残留 `v-bind(`
2. `vue-tsc --noEmit` 通过
3. 检查 CSS 变量无与 NaiveUI `--n-*` 冲突
4. 验证浅色/深色模式切换正常
5. 验证各组件交互正常

## 风险与注意事项

1. **color-mix 兼容性**：`color-mix()` 是现代 CSS 特性，Chrome 115+ 支持。项目目标为现代浏览器扩展，无兼容问题。
2. **`scoped` 样式**：`<style scoped>` 中 `var()` 不受 scoped 影响（CSS 变量天然全局），只要 `:style` 注入到正确的 DOM 子树即可。
3. **KeyboardLayout scoped 样式**：`KeyboardLayout.vue` 使用 `<style scoped>`，迁移后 CSS 变量需要通过 `:style` 注入到同一组件的根元素，确保 scoped 选择器能访问到 `var()`。
4. **性能**：`:style` + `var()` 与 `v-bind()` 性能差异可忽略。`:style` 在 Vue 中是 computed → 对象 → 批量写入 CSS，与 v-bind 的 `useCssVars` 机制等价。

## Subagent 分工建议

- **Subagent A**：Phase 1（CustomColorPicker.vue + SettingPaneContent.vue）
- **Subagent B**：Phase 2（BookmarkManager.vue + focusMode/index.vue + general/index.vue + BackgroundDrawerImageElement.vue）
- **Subagent C**：Phase 3（KeyboardLayout.vue + useKeyboardStyle.ts 改造）
