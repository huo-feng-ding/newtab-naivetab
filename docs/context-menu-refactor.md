# 技术方案：右键菜单原生实现（移除 NDropdown 依赖）

## 背景与目标

当前 `RightClickMenu.vue` 使用 Naive UI 的 `NDropdown` 组件实现右键菜单，但需要 **16 条 `!important` 覆盖规则**来完全重写样式（背景、边框、阴影、圆角、间距、hover、图标、分割线、动画等），存在以下问题：

1. **维护成本高** — 大量 `!important` 覆盖，Naive UI 版本升级或内部 DOM 结构变化时容易失效
2. **全局样式污染** — 无 scoped 的 `.n-dropdown-menu` 等类会影响项目中其他 NDropdown 实例
3. **布局受限** — 无法优雅实现底部图标行（赞助/关于并排展示），NDropdown 的列表式结构不支持自定义区域
4. **过渡依赖内部类** — 连 `.popover-transition-*` 内部类都要覆盖，动画完全由外部控制

**目标：** 用 `<Transition>` + `<Teleport to="body">` + 原生 div 实现，获得完全样式控制，同时将赞助和关于合并为底部纯图标行。

---

## 方案概述

| 对比项 | NDropdown（现有） | 原生实现（新方案） |
|--------|-------------------|-------------------|
| 组件依赖 | `n-dropdown` | 无第三方依赖 |
| 样式覆盖 | 16 条 `!important` | 0 条，完全自控 |
| 底部图标行 | 不支持 / 需 hack | 原生 div 自然实现 |
| 全局污染 | 是（无 scoped） | 否（Teleport + 独立类名） |
| 动画 | 覆盖内部 popover-transition | 自定义 `<Transition name="context-menu">` |
| 键盘导航 | 自动支持 | 不支持（上下文菜单场景可接受） |

---

## 文件变更

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `src/newtab/content/RightClickMenu.vue` | 移除 NDropdown，改用原生 div + Transition + Teleport |
| `src/styles/const.ts` | 新增 `contextMenuFooterIcon` 颜色 token（底部图标颜色） |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `src/newtab/Content.vue` | 仅 import RightClickMenu，内部实现变更不影响 |
| `src/styles/tokens.css` | 圆角、过渡、阴影等静态 token 已足够，无需新增 |
| `src/locales/*.json` | 文案不变，i18n key 不变 |

---

## 详细实现

### 1. 模板结构

```vue
<Teleport to="body">
  <Transition name="context-menu">
    <div
      v-if="state.isMenuVisible"
      class="ctx-menu"
      :style="{ left: state.posX + 'px', top: state.posY + 'px' }"
      @click.stop="handleMenuClick"
    >
      <!-- 主操作列表 -->
      <div class="ctx-menu__list">
        <div class="ctx-menu__item" data-key="setting">...</div>
        <div class="ctx-menu__item" data-key="openSettingInNewTab">...</div>
        <div class="ctx-menu__item" data-key="editLayout">...</div>
        <div class="ctx-menu__divider" />
        <div class="ctx-menu__item" data-key="focusMode">...</div>
        <div class="ctx-menu__item" data-key="editFocusMode">...</div>
        <div class="ctx-menu__item" data-key="fullscreen">...</div>
        <div class="ctx-menu__item" data-key="downloadWallpaper">...</div>
        <div class="ctx-menu__divider" />
        <div class="ctx-menu__item ctx-menu__item--danger" data-key="deleteWidget">...</div>
      </div>

      <!-- 底部图标行 -->
      <div class="ctx-menu__footer">
        <n-tooltip placement="top">
          <Icon :icon="ICONS.sponsor" class="ctx-menu__footer-icon" @click.stop="onSelectMenu('aboutSponsor')" />
          <template #trigger>{{ $t('setting.aboutSponsor') }}</template>
        </n-tooltip>
        <n-tooltip placement="top">
          <Icon :icon="ICONS.info" class="ctx-menu__footer-icon" @click.stop="onSelectMenu('aboutIndex')" />
          <template #trigger>{{ $t('setting.aboutIndex') }}</template>
        </n-tooltip>
      </div>
    </div>
  </Transition>
</Teleport>
```

### 2. 菜单项渲染

菜单项改为用 `v-for` 遍历，数据逻辑保持 `buildMenuList()` 不变，仅从 `ref + watch` 冻结模式改为 `computed`（原生实现不存在 NDropdown 的选项重算问题）：

```ts
const menuItems = computed(() => {
  // 复用现有 buildMenuList() 逻辑，返回数组
  return buildMenuList()
})
```

### 3. 边界检测

菜单弹出后在 `nextTick` 中检测是否超出视口边界，超出则调整位置：

```ts
const openMenu = (e: MouseEvent) => {
  state.posX = e.clientX
  state.posY = e.clientY
  state.currTargetCode = getTargetDataFromEvent(e).code
  state.isMenuVisible = true

  // 下一帧检测边界并修正
  nextTick(() => {
    const el = document.querySelector('.ctx-menu') as HTMLElement
    if (!el) return
    const rect = el.getBoundingClientRect()
    const margin = 8
    if (state.posX + rect.width > window.innerWidth) {
      state.posX = window.innerWidth - rect.width - margin
    }
    if (state.posY + rect.height > window.innerHeight) {
      state.posY = window.innerHeight - rect.height - margin
    }
  })
}
```

### 4. 点击外部关闭

替换 NDropdown 的 `@clickoutside`，手动监听 `mousedown`：

```ts
const handleOutsideClick = (e: MouseEvent) => {
  state.isMenuVisible = false
}

watch(() => state.isMenuVisible, (visible) => {
  if (visible) {
    setTimeout(() => document.addEventListener('mousedown', handleOutsideClick), 0)
  } else {
    document.removeEventListener('mousedown', handleOutsideClick)
  }
})
```

用 `setTimeout(0)` 延迟注册，避免本次触发的 mousedown 事件被立即消费导致菜单闪开闪关。

### 5. 主题颜色处理

将 `applyDropdownThemeVars` 的逻辑改为通过 CSS 类切换（`data-theme` 属性），而非 JS 注入 CSS 变量：

```vue
<div class="ctx-menu" :class="{ dark: localState.value.currAppearanceLabel === 'dark' }">
```

CSS 中通过 `.ctx-menu.dark` 选择器覆盖主题色，利用 `tokens.css` 的 `--gray-alpha-xx` 变量和 `const.ts` 中的 `styleConst` 颜色。

### 6. 样式设计

**核心原则：**
- 使用 `tokens.css` 中的静态 token（`--radius-*`、`--transition-*`、`--shadow-*`、`--gray-alpha-*`、`--text-*`）
- 动态颜色（背景、边框、文字）通过 `.ctx-menu` / `.ctx-menu.dark` 双模式 CSS 规则定义
- 零 `!important`

**颜色映射（来自 `styleConst`）：**

| 用途 | Light | Dark |
|------|-------|------|
| 背景 | `rgba(252, 252, 253, 0.92)` | `rgba(28, 28, 32, 0.82)` |
| 边框 | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.12)` |
| 阴影 | `rgba(0, 0, 0, 0.14)` | `rgba(0, 0, 0, 0.36)` |
| 文字 | `rgba(30, 30, 35, 0.9)` | `rgba(255, 255, 255, 0.88)` |
| 图标 | `rgba(30, 30, 35, 0.4)` | `rgba(255, 255, 255, 0.5)` |
| 图标悬停 | `rgba(30, 30, 35, 0.85)` | `rgba(255, 255, 255, 0.9)` |
| 悬停背景 | `rgba(0, 0, 0, 0.055)` | `rgba(255, 255, 255, 0.1)` |
| 分割线 | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.1)` |
| 危险文字 | `#d93025` | `#ff6b6b` |
| 危险悬停 | `rgba(217, 48, 37, 0.08)` | `rgba(255, 80, 80, 0.15)` |
| 底部图标 | 同图标色 | 同图标色 |

**动画：**

```css
.context-menu-enter-active {
  transition: opacity 0.18s cubic-bezier(0.34, 1.1, 0.64, 1),
              transform 0.18s cubic-bezier(0.34, 1.1, 0.64, 1);
}
.context-menu-leave-active {
  transition: opacity 0.08s ease-in,
              transform 0.08s ease-in;
}
.context-menu-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(-4px);
}
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.94) translateY(-2px);
}
```

---

## 验证

1. `pnpm dev` 启动开发服务器
2. **基础功能**：右键空白区域 → 菜单弹出，各选项点击正常
3. **Widget 右键**：右键组件 → 显示「删除」项（红色），点击后组件隐藏
4. **专注模式**：开启专注模式后右键 → 显示「退出专注模式」+「编辑专注模式」
5. **全屏模式**：右键 → 全屏切换正常
6. **下载壁纸**：启用背景图片后右键 → 显示「下载壁纸」，点击正常下载
7. **编辑布局**：右键进入编辑布局后再次右键 → 退出编辑布局
8. **底部图标行**：赞助/关于图标显示在底部，hover 有 tooltip，点击跳转设置面板
9. **边界检测**：在屏幕右下角右键 → 菜单不超出视口
10. **主题切换**：切换浅/深色模式 → 菜单颜色正确跟随
11. **点击外部关闭**：点击菜单外任意位置 → 菜单关闭
12. **快速连续右键**：在菜单已打开时再次右键 → 关闭旧菜单后重新打开
