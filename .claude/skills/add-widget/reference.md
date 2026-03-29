# Widget 开发参考手册

## 配置字段规范

### 颜色字段
所有颜色值统一使用**双元素数组** `[浅色值, 深色值]`：
```ts
fontColor: ['rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 1)']
//          ↑ index 0: 浅色       ↑ index 1: 深色
```
`getStyleField` 和 `SettingPaneWrap` 自动按 `localState.currAppearanceCode` 取对应值。

### getStyleField 用法
```ts
// 颜色（返回当前主题的颜色字符串）
const color = getStyleField(WIDGET_CODE, 'fontColor')

// 数字 + 单位（vmin 会自动乘以 0.1）
const size  = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')   // "10vmin"
const px    = getStyleField(WIDGET_CODE, 'borderRadius', 'px') // "4px"

// 数字 * 倍率 + 单位
const gap   = getStyleField(WIDGET_CODE, 'cardGap', 'px', 0.5)

// 嵌套字段（用 . 访问）
const unitSize = getStyleField(WIDGET_CODE, 'unit.fontSize', 'vmin')
```

---

## SettingPaneWrap 自动识别字段

`SettingPaneWrap` 通过检测 `localConfig[widgetCode]` 中是否存在对应 key，自动渲染通用控件：

| 字段名 | 渲染控件 |
|--------|----------|
| `width` | 宽度滑块 |
| `height` | 高度滑块 |
| `margin` | 外边距滑块 |
| `padding` | 内边距滑块 |
| `borderRadius` | 圆角滑块 |
| `backgroundBlur` | 模糊度滑块 |
| `fontFamily` | 字体选择 + 颜色 + 字号（同时需要 `fontSize`、`fontColor`） |
| `letterSpacing` | 字间距滑块 |
| `primaryColor` | 主题色选择器 |
| `backgroundColor` | 背景色选择器 |
| `isBorderEnabled` | 边框开关（同时需要 `borderColor`、`borderWidth`） |
| `isShadowEnabled` | 阴影开关（同时需要 `shadowColor`） |

---

## Widget 文件结构

```
src/newtab/widgets/myWidget/
├── config.ts     # WIDGET_CODE、WIDGET_CONFIG、TWidgetConfig
├── index.ts      # 注册元信息（被 registry.ts glob 扫描）
├── index.vue     # 渲染组件
└── logic.ts      # 可选：较复杂的业务逻辑
```

## index.vue 模板结构

```vue
<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { localConfig, localState, getIsWidgetRender, getStyleField } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

const updateTime = () => { /* 定时逻辑 */ }

watch(isRender, (value) => {
  if (!value) { removeTimerTask(WIDGET_CODE); return }
  updateTime()
  addTimerTask(WIDGET_CODE, updateTime)
}, { immediate: true })

// CSS 变量（在 <style> 的 v-bind 中使用）
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize  = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div class="myWidget__container">
      <!-- 内容 -->
    </div>
  </WidgetWrap>
</template>

<style>
/* id 由 WidgetWrap 自动设为 WIDGET_CODE */
#myWidget {
  .myWidget__container {
    z-index: 10;
    position: absolute;  /* 必须：配合拖拽定位 */
    /* 在此使用 v-bind(customFontColor) 等 CSS 变量 */
  }
}
</style>
```

---

## 代码中的扩展点标记

项目使用 `@@@@` 注释标记关键扩展点，可全局搜索快速定位：

| 注释 | 文件 |
|------|------|
| `@@@@ add widget type` | `src/types/global.d.ts` |
| `@@@@ add widget registry` | `src/newtab/widgets/registry.ts` |
| `@@@@ 更新localConfig后需要手动处理新版本变更的本地数据结构` | `src/logic/store.ts` |
