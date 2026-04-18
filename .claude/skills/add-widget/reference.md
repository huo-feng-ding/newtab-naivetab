# Widget 开发参考手册

## 文件结构

```
src/newtab/widgets/myWidget/
├── config.ts     # WIDGET_CODE、WIDGET_CONFIG、TWidgetConfig
├── index.ts      # 注册元信息（被 registry.ts glob 扫描）
├── index.vue     # 渲染组件
└── logic.ts      # 可选：较复杂的业务逻辑
```

## 完整 index.vue 模板示例

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

<style scoped>
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

## 关键规范速查（完整说明见 `/CLAUDE.md`）

- **颜色字段**：统一使用双元素数组 `[浅色值, 深色值]`，`getStyleField` 自动处理
- **图标**：必须先在 `src/logic/icons.ts` 的 `ICONS` 定义，再从常量引用，禁止硬编码
- **Setting 原子组件**：所有表单项使用 `@/setting/fields` 中提供的 `ColorField`/`FontField`/`SliderField`/`SwitchField`/`ToggleColorField`
- **定时任务**：必须使用 `addTimerTask`/`removeTimerTask`，禁止组件内自行 `setInterval`
