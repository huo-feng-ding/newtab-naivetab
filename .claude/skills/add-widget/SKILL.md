---
name: add-widget
description: NaiveTab 浏览器扩展的 Widget 开发指南。当用户要在 newtab-naivetab 项目中新增 Widget 组件、添加新功能组件时使用。涵盖需要修改的完整文件清单、配置规范、类型注册等，防止遗漏关键步骤。
---

# NaiveTab Add Widget

新增 Widget 需按顺序完成以下步骤。详细字段说明见 [reference.md](reference.md)。

## 必须修改的 8 个文件

### Step 1 — `src/types/global.d.ts` ⚠️ 最容易遗漏

将新 code 加入 `WidgetCodes` 联合类型。**遗漏此步会导致全项目类型报错。**

```ts
// @@@@ add widget type
type WidgetCodes = '...' | 'myWidget'
```

### Step 2 — 新建 `src/newtab/widgets/myWidget/config.ts`

```ts
export const WIDGET_CODE = 'myWidget'
export const WIDGET_CONFIG = {
  enabled: false,
  layout: { xOffsetKey: 'left', xOffsetValue: 50, xTranslateValue: -50,
            yOffsetKey: 'top',  yOffsetValue: 50,  yTranslateValue: -50 },
  // 颜色字段统一用双元素数组：[浅色值, 深色值]
  fontColor: ['rgba(255,255,255,1)', 'rgba(0,0,0,1)'],
  // ... 其他配置
}
export type TWidgetConfig = typeof WIDGET_CONFIG
```

### Step 3 — 新建 `src/newtab/widgets/myWidget/index.vue`

- 用 `WidgetWrap` 作为根容器，直接子元素必须有 `myWidget__container` 的 class
- 样式块外层 selector 为 `#myWidget`，容器需 `position: absolute`
- 用 `getStyleField(WIDGET_CODE, 'fieldName')` 读取配置（自动处理颜色双数组/单位换算）
- 用 `getIsWidgetRender(WIDGET_CODE)` + `watch` 控制定时任务生命周期

### Step 4 — 新建 `src/newtab/widgets/myWidget/index.ts`

```ts
import Index from './index.vue'
import { WIDGET_CODE, WIDGET_CONFIG } from './config'
import { WIDGET_ICON_META } from '@/logic/icons'

export default {
  code: WIDGET_CODE,
  component: Index,
  config: WIDGET_CONFIG,
  iconName: WIDGET_ICON_META[WIDGET_CODE].iconName,
  iconSize: WIDGET_ICON_META[WIDGET_CODE].widgetSize,
  widgetLabel: 'setting.myWidget',   // i18n key
}
```

### Step 5 — `src/logic/icons.ts` ⚠️ 需修改两处，缺一不可

**5-A：在 `ICONS` 对象中定义图标常量**（图标来自 [Iconify](https://icon-sets.iconify.design/)，需验证图标名存在）：

```ts
export const ICONS = {
  // ... 已有图标 ...
  myWidget: 'mdi:some-valid-icon',   // ← 先在这里定义
}
```

**5-B：在 `WIDGET_ICON_META` 中引用（使用 `ICONS.myWidget`，禁止硬编码字符串）**：

```ts
export const WIDGET_ICON_META: Record<WidgetCodes, WidgetIconMeta> = {
  // ... 已有条目 ...
  myWidget: { iconName: ICONS.myWidget, widgetSize: 30 },  // ← 引用常量
}
```

> ❌ 错误示范：`iconName: 'mdi:some-icon'`（硬编码字符串绕过了 ICONS 常量，难以统一维护）

**设置面板中引用图标也必须使用 `ICONS.xxx`**（见可选步骤）。

### Step 6 — `src/newtab/widgets/registry.ts`

```ts
// 添加 import
import type { TWidgetConfig as MyWidgetConfig } from './myWidget/config'

// 添加到 WidgetConfigByCode（@@@@ add widget registry 注释下方）
myWidget: MyWidgetConfig
```

### Step 7 — `src/newtab/widgets/codes.ts`

```ts
export const WIDGET_CODE_LIST = [
  // ...
  'myWidget',   // 顺序决定组件库抽屉中的排列顺序
] as WidgetCodes[]
```

**⚠️ 若新 Widget 与其他 Widget 共用同一个 setting pane**（如时钟类都指向 `clockDate`），需同步维护 `WIDGET_SETTING_PANE_MAP`：

```ts
export const WIDGET_SETTING_PANE_MAP: Partial<Record<WidgetCodes, settingPanes>> = {
  // ...
  myWidget: 'clockDate',   // ← 指向对应的 pane code
}
```

> 未在此 Map 中的 Widget，右键菜单会默认用自身 code 查找 pane（`myWidget` → pane `myWidget`）。

### Step 8 — i18n：`src/locales/zh-CN.json` 和 `en-US.json`

```json
"setting": {
  "myWidget": "我的组件"
}
```

---

## 可选：添加专属设置面板

1. 新建 `src/newtab/setting/XxxSetting/MyWidgetSetting.vue`，用 `SettingPaneWrap` 作为容器
2. 在 `SettingPaneWrap` 的 `#header`/`#color`/`#footer` 插槽中添加自定义表单项
3. 在对应的 `setting/XxxSetting/index.vue` 中引入并渲染，**图标必须用 `:icon="ICONS.myWidget"` 动态绑定，禁止硬编码字符串**：

```vue
<script setup lang="ts">
import { ICONS } from '@/logic/icons'
// ...其他 import
</script>

<template>
  <!-- ✅ 正确：动态绑定 ICONS 常量 -->
  <p class="setting__label">
    <Icon :icon="ICONS.myWidget" class="label__icon" />
    {{ $t('setting.myWidget') }}
  </p>

  <!-- ❌ 错误：硬编码 icon 字符串（图标名可能无效且难以维护） -->
  <!-- <Icon icon="mdi:some-icon" class="label__icon" /> -->
</template>
```

`SettingPaneWrap` 会**自动**根据 `localConfig[widgetCode]` 中存在的字段渲染通用控件（宽高、字体、颜色、阴影、边框等），见 [reference.md](reference.md)。

---

## 无需手动修改（自动处理）

| 文件 | 机制 |
|------|------|
| `src/logic/config.ts` | `import.meta.glob('**/config.ts')` 自动扫描 |
| `src/logic/store.ts` | 遍历 `WIDGET_CODE_LIST` 动态创建 storage |
| `src/logic/storage.ts` | 遍历 `defaultConfig` 处理云同步/导入导出 |
| `src/newtab/Content.vue` | 遍历 `widgetsList` 动态渲染 |
| `src/newtab/draft/DraftDrawer.vue` | 遍历 `widgetsList` 展示组件库 |
