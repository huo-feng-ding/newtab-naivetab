# 技术方案：Options UI 全屏设置页

## 背景与目标

当前设置面板以 NDrawer 抽屉形式打开，固定宽度 750px。其中 **BookmarkManager**（书签键盘）和 **CommandShortcut**（指令键盘）两个面板内嵌了完整可视化键盘，在 750px 宽度下需要缩到很小，观感不佳。

**目标：** 增加 Chrome `options_ui` 入口，以全屏/新标签页形式展示同样的设置面板，与现有抽屉模式共存。两种模式共享同一套 setting 内容组件，仅在容器层做差异适配。

---

## 方案概述

| 模式 | 入口 | 容器组件 | 内容组件 | 宽度 |
|------|------|----------|----------|------|
| **抽屉模式** | newtab 右键菜单 | `setting/index.vue`（NDrawer 包裹） | `setting/SettingPaneContent.vue`（公共） | 750px |
| **全屏模式** | `chrome://extensions` → 选项 / 抽屉内跳转按钮 | `options/Content.vue`（页面布局） | `setting/SettingPaneContent.vue`（公共） | 居中自适应 |

---

## 目录结构变更

### 拆分后的 setting 目录

```
src/setting/
├── components/            # 通用组件（不变）
├── fields/                # 表单原子组件（不变）
├── panes/                 # 设置面板（不变）
├── registry.ts            # 注册表（不变）
├── index.vue              # 【修改】容器层，仅负责 NDrawer 包裹 + 调用 SettingPaneContent
└── SettingPaneContent.vue # 【新增】公共内容组件，包含 NTabs + 全局样式
```

### 新增的 options 目录

```
src/options/
├── index.html             # 入口 HTML
├── main.ts                # 入口脚本
├── App.vue                # 根组件：NConfigProvider + NMessageProvider
└── Content.vue            # 页面容器：居中布局 + 引用 SettingPaneContent
```

### 职责划分

| 组件 | 职责 |
|------|------|
| `SettingPaneContent.vue` | **公共核心**：NTabs 侧边栏 + 所有 pane 渲染 + 全局样式（`.n-radio`、`.n-divider` 等覆盖） |
| `setting/index.vue` | **newtab 专用容器**：`#background__drawer`、`#preset-theme__drawer`、`NDrawer` 包裹，调用 `SettingPaneContent` |
| `options/Content.vue` | **options 专用容器**：页面级居中布局（max-width），调用 `SettingPaneContent` |

---

## 文件变更清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/setting/SettingPaneContent.vue` | 从当前 `index.vue` 提取的公共内容组件 |
| `src/options/index.html` | 入口 HTML |
| `src/options/main.ts` | 入口脚本 |
| `src/options/App.vue` | 根组件 |
| `src/options/Content.vue` | options 页面容器 |

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `src/setting/index.vue` | 简化为纯容器：仅保留 NDrawer 包裹 + teleport 目标 div，内容委托给 `SettingPaneContent` |
| `src/manifest.ts` | 启用 `options_ui` 配置 |
| `vite.config.ts` | `rollupOptions.input` 追加 options 入口 |
| `src/newtab/content/RightClickMenu.vue` | 新增「在新标签页中打开设置」菜单项 |
| `src/locales/zh-CN.json` / `en-US.json` | 新增 i18n 文案 |
| `src/logic/store.ts` | `globalState` 新增 `settingMode` 字段 |

---

## 核心组件设计

### 1. `SettingPaneContent.vue`（新增 — 公共核心）

从当前 `setting/index.vue` 的 L98-L274 提取，包含 NTabs + 全局样式，不包含任何 NDrawer 相关逻辑。

```vue
<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { Icon } from '@iconify/vue'
import { localConfig, globalState } from '@/logic/store'
import { settingsList, SETTING_GROUPS } from './registry'

const tabPaneList = computed(() => settingsList)

const onTabsChange = (tabCode: string) => {
  globalState.currSettingTabCode = tabCode
}

const settingContentHeight = ref(0)

const updateSettingContentHeightFunc = useDebounceFn((entries: ResizeObserverEntry[]) => {
  if (entries.length === 0) return
  settingContentHeight.value = entries[0].contentRect.height
}, 200)

const settingContentObserver = new ResizeObserver(updateSettingContentHeightFunc)

// 监听 content 元素出现后开始观察
onMounted(async () => {
  await nextTick()
  const targetEl = document.querySelector('#setting-tabs .setting-tabs__content') as HTMLElement
  if (targetEl) {
    settingContentObserver.observe(targetEl)
  }
})

onUnmounted(() => {
  settingContentObserver.disconnect()
})

const settingContentHeightStyle = computed(() => `${settingContentHeight.value}px`)

const groupsWithFirstItem = computed(() => {
  const result: Array<{ firstCode: settingPanes; labelKey: string }> = []
  SETTING_GROUPS.forEach((group, index) => {
    if (index > 0 && group.items.length > 0) {
      result.push({ firstCode: group.items[0].code, labelKey: group.labelKey })
    }
  })
  return result
})

const groupStartSet = computed(() => {
  const set = new Set<settingPanes>()
  groupsWithFirstItem.value.forEach((item) => set.add(item.firstCode))
  return set
})

const getGroupLabel = (code: settingPanes): string => {
  return groupsWithFirstItem.value.find((item) => item.firstCode === code)?.labelKey || ''
}
</script>

<template>
  <div id="setting-tabs">
    <NTabs
      type="line"
      :value="globalState.currSettingTabCode"
      placement="left"
      animated
      @update:value="onTabsChange"
    >
      <NTabPane
        v-for="item of tabPaneList"
        :key="item.code"
        :name="item.code"
        :tab="$t(item.labelKey || '')"
      >
        <template #tab>
          <div class="tab__title" :class="{ 'tab__title--group-start': groupStartSet.has(item.code) }">
            <template v-if="groupStartSet.has(item.code)">
              <div class="group-divider">
                <span class="group-divider__text">{{ $t(getGroupLabel(item.code)) }}</span>
              </div>
            </template>
            <div class="title__icon" :style="`font-size: ${item.iconSize}px`">
              <Icon :icon="item.iconName" />
            </div>
            <span class="title__text">{{ $t(item.labelKey || '') }}</span>
          </div>
        </template>

        <template #default>
          <component :is="item.component" />
        </template>
      </NTabPane>
    </NTabs>
  </div>
</template>

<style scoped>
/* 原 setting/index.vue 中 <style> 的全部内容迁移至此 */
/* 选择器从 #setting 改为 #setting-tabs */
#setting-tabs {
  .n-radio-group { width: 100%; }
  .n-radio { width: 20%; }
  /* ... 其余样式不变 ... */
}
</style>
```

**设计要点：**
- 不依赖 `isSettingDrawerVisible`，不涉及 NDrawer 的显隐逻辑
- ResizeObserver 直接观察 `#setting-tabs` 内的内容区，不再依赖 `isSettingDrawerVisible` 的 watch
- 所有全局样式覆盖（`.n-radio`、`.n-divider`、`.n-collapse` 等）都放在此组件的 `<style>` 中

### 2. `setting/index.vue`（修改 — newtab 容器）

简化为纯容器，剥离 NTabs 内容：

```vue
<script setup lang="ts">
import { globalState } from '@/logic/store'
import SettingPaneContent from './SettingPaneContent.vue'

watch(
  () => globalState.isSettingDrawerVisible,
  (visible) => {
    // NDrawer 关闭时的清理逻辑（如果有需要）
    if (!visible) {
      // 清理...
    }
  },
)
</script>

<template>
  <!-- Teleport 目标容器 -->
  <div id="background__drawer" />
  <div id="preset-theme__drawer" />

  <div id="setting">
    <NDrawer
      v-model:show="globalState.isSettingDrawerVisible"
      class="drawer-wrap"
      :width="750"
      :height="500"
      :placement="localConfig.general.drawerPlacement"
      show-mask="transparent"
      :trap-focus="false"
      to="#setting"
    >
      <NDrawerContent class="setting__content">
        <SettingPaneContent />
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style>
/* 仅保留 NDrawer 容器相关的样式 */
.drawer-wrap {
  box-shadow: var(--shadow-lg) !important;
}

/* NDrawerContent padding 覆盖 */
.n-drawer .n-drawer-content.n-drawer-content--native-scrollbar .n-drawer-body-content-wrapper {
  padding: 0 !important;
}
</style>
```

### 3. `options/Content.vue`（新增 — options 容器）

```vue
<script setup lang="ts">
import { globalState } from '@/logic/store'
import SettingPaneContent from '@/setting/SettingPaneContent.vue'

// 标记为 options 模式
onMounted(() => {
  globalState.settingMode = 'options'
})
</script>

<template>
  <div class="options-page">
    <div class="options-page__inner">
      <SettingPaneContent />
    </div>
  </div>
</template>

<style scoped>
.options-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  min-height: 100vh;
  background: var(--n-color);
}

.options-page__inner {
  /* SettingPaneContent 内部 NTabs placement=left 已处理布局 */
}
</style>
```

### 4. `options/App.vue`（新增）

```vue
<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { nativeUILang, currTheme, themeOverrides } from '@/logic/store'
import Content from '@/options/Content.vue'
</script>

<template>
  <NConfigProvider
    :locale="nativeUILang"
    :theme="currTheme"
    :theme-overrides="themeOverrides"
  >
    <NMessageProvider>
      <Content />
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
body {
  font-family:
    Helvetica Neue, Helvetica, Arial,
    PingFang SC, Heiti SC, Hiragino Sans GB,
    Microsoft YaHei, sans-serif;
}
</style>
```

### 5. `options/main.ts`（新增）

```ts
import '../styles/reset.css'
import { createApp } from 'vue'
import i18n from '@/lib/i18n'
import App from './App.vue'

const app = createApp(App)
app.use(i18n)
app.mount('#app')
```

### 6. `options/index.html`（新增）

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NaiveTab 设置</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

### 7. `manifest.ts`

```ts
options_ui: {
  page: '/dist/options/index.html',
  open_in_tab: true,
},
```

### 8. `vite.config.ts`

```ts
input: {
  newtab: r('src/newtab/index.html'),
  popup: r('src/popup/index.html'),
  options: r('src/options/index.html'),  // 新增
},
```

### 9. `globalState` 新增 `settingMode`

```ts
export const globalState = reactive({
  settingMode: 'drawer' as 'drawer' | 'options',  // 新增
  // ... 其余不变
})
```

### 10. 抽屉内跳转按钮

在 `RightClickMenu.vue` 的设置子菜单中新增：

```ts
openSettingInOptions: () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dist/options/index.html') })
  switchSettingDrawerVisible(false)
}
```

i18n 文案：
| Key | zh-CN | en-US |
|-----|-------|-------|
| `setting.openInNewTab` | 全屏设置页 | Open in new tab |

---

## 关键技术问题与处理

### 问题 1：ResizeObserver 的观察时机

**当前问题：** `setting/index.vue` 通过 watch `isSettingDrawerVisible` 来触发观察，因为 NDrawer 是懒渲染的。

**拆分后：** `SettingPaneContent.vue` 在 `onMounted` 时 NTabs 已经渲染（不是懒渲染），直接 `nextTick` 后观察即可。NDrawer 的懒渲染不影响内部组件的挂载时机 — NDrawer 打开时内部组件才挂载，所以 `onMounted` 触发时元素已存在。

### 问题 2：`#background__drawer` 和 `#preset-theme__drawer`

这两个是 newtab 特有的 Teleport 容器（背景图片浮层、预设主题浮层），options 页面不需要。拆分后它们留在 `setting/index.vue` 中，不会泄漏到 `SettingPaneContent`。

### 问题 3：全局样式作用域

当前 `setting/index.vue` 的 `<style>`（无 scoped）中写了 `#setting .n-radio { width: 20% }` 等全局覆盖。拆分后这些样式迁移到 `SettingPaneContent.vue` 的 `<style scoped>` 中，选择器改为 `#setting-tabs`。由于 Naive UI 组件都在此组件内渲染，scoped 样式完全能覆盖到。

### 问题 4：键盘组件兼容性

已验证 `BookmarkManager.vue` 和 `commandShortcut/index.vue` 仅依赖 `localConfig`、`currKeyboardConfig`、`useKeyboardStyle` 和纯展示组件，无 newtab 强依赖，options 模式下可安全复用。

BookmarkManager 中 `chrome.tabs.query` 在 options 页面会拿到 `chrome-extension://` URL，被正则 `^https?://` 过滤掉，`pendingUrl` 保持空字符串，行为安全。

### 问题 5：NDrawer `to="#setting"` Teleport

当前 NDrawer 用 `to="#setting"` 将弹出层挂载到 `#setting` 元素。这个逻辑只存在于 `setting/index.vue` 中，不涉及 `SettingPaneContent`，拆分后不受影响。

---

## 样式适配

### 全屏模式容器

```css
.options-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  min-height: 100vh;
  background: var(--n-color);
}
```

NTabs 的 `placement="left"` 侧边栏在 1200px 容器下视觉效果良好，无需额外调整。

### 键盘基准尺寸

首次实现**不做动态切换 baseSize**，后续如有需要可通过 `SettingPaneContent` 的 props 传入。

---

## 构建产物结构

```
extension/dist/
├── newtab/index.html
├── popup/index.html
├── options/index.html        ← 新增
└── ... (JS/CSS chunks)
```

---

## 开发调试

- `pnpm dev` 时访问 `http://localhost:3303/src/options/index.html`
- Chrome 中通过 `chrome://extensions → NaiveTab → 扩展程序选项` 打开

---

## 实施步骤

1. **提取 `SettingPaneContent.vue`** — 从 `setting/index.vue` 中剥离 NTabs + 样式
2. **简化 `setting/index.vue`** — 仅保留 NDrawer 容器逻辑
3. **创建 `src/options/` 入口** — `index.html` / `main.ts` / `App.vue` / `Content.vue`
4. **修改 `vite.config.ts`** — 追加 options 入口
5. **修改 `manifest.ts`** — 启用 `options_ui`
6. **`globalState` 新增 `settingMode`**
7. **添加跳转按钮** — `RightClickMenu.vue` 中新增菜单项
8. **补充 i18n 文案**
9. **测试验证** — 抽屉模式 / options 模式各自功能完整
