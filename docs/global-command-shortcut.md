# 快捷指令（全局命令快捷键）

## 概述

首先明确定义以及命名：
- **全局书签快捷键**（`globalShortcutForBookmark`）：修饰键+Key → 打开书签 URL，已迁移至 Port 架构
- **全局命令快捷键**（`globalShortcutForCommand`）：修饰键+Key → 执行浏览器命令（标签页管理、页面控制等）
- 二者通用的逻辑的命名前缀为`globalShortcut` 或 `global-shortcut`，视具体情况
- 配置存储字段名：`commandShortcut`（localStorage key: `c-commandShortcut`）
- 面向用户名称：「快捷指令」（代码内部命名保持 `commandShortcut` / `globalShortcutForCommand`）

两套快捷键共享 Port 通道，使用不同的修饰键和独立的 keymap 存储，在 SW 端通过 `source` 字段区分处理。

---

## 架构设计

### 数据流

```
┌───────────────────────────────────────────────────────────────┐
│  Content Script (*://*/* 页面)                                 │
│                                                               │
│  keydown → 书签修饰键匹配 → Port.postMessage({key, source:'bookmark'})  │
│  keydown → 命令修饰键匹配 → Port.postMessage({key, source:'command'})   │
│                                                               │
│  接收 SW 回传的 DOM 命令并执行（双向通信）：                     │
│  port.onMessage → {type:'NAIVETAB_EXECUTE_COMMAND',command}   │
│  → commandExecutors[command]()                                 │
│  - scrollUp/Down → window.scrollBy()                          │
│  - reloadPage → location.reload()                             │
│  - copyPageUrl → navigator.clipboard.writeText()              │
│  ─────────────────────────────────────────                     │
│  Port 长连接 (chrome.runtime.connect, name='naivetab-shortcut')│
│  - 双向通信: CS→SW 发送按键, SW→CS 回传命令                     │
│  - 保持 SW 活跃，消除快捷键冷启动延迟                           │
│  - 连接断开 1s 自动重连                                        │
└──────────────────────────┬────────────────────────────────────┘
                           │ Port 消息 (双向)
                           ▼
┌───────────────────────────────────────────────────────────────┐
│  newtab 页面 (chrome-extension://)                             │
│                                                               │
│  task.ts startKeydown → keydownTaskMap 遍历派发                │
│  - globalShortcutForBookmarkTask: 匹配书签修饰键               │
│    → Port.postMessage({key, source:'bookmark'})               │
│  - globalShortcutForCommandTask: 匹配命令修饰键                │
│    → Port.postMessage({key, source:'command'})                │
│  - 接收 SW 回传的 DOM 命令（与 CS 共享 Port，复用执行器）       │
└──────────────────────────┬────────────────────────────────────┘
                           │ Port 消息 (双向)
                           ▼
┌───────────────────────────────────────────────────────────────┐
│  Service Worker                                                │
│                                                               │
│  1. 维护 portMap: tabId → Port                                │
│  2. 缓存两套配置: keyboard + commandShortcut                   │
│  3. 接收消息，按 source 路由：                                 │
│     - source='bookmark': 校验 isEnabled → 查 bookmark keymap  │
│                        → chrome.tabs.create(URL)              │
│     - source='command': 校验 isEnabled → 查 command keymap    │
│                        → execIn='sw': SW 直接执行              │
│                        → execIn='cs': portMap[tabId].postMsg  │
│  4. 命令执行：                                                 │
│     - SW 命令（chrome.tabs.*）：SW 直接执行，不依赖 CS          │
│     - CS 命令（DOM 操作）：回传到发起按键的 tab 执行             │
│  5. source 校验：只允许 'bookmark' 或 'command'                │
└───────────────────────────────────────────────────────────────┘
```

### 为什么使用 Port 长连接

| 方案 | SW 冷启动 | 内存占用 | 代码复杂度 | 扩展性 |
|------|-----------|----------|------------|--------|
| 纯 CS 本地匹配 | ✅ 无需冷启动 | 极低 | 低 | ❌ 无法执行 chrome.tabs API |
| sendMessage 每次请求 | ❌ 200-1000ms | 低 | 低 | ❌ 同上 |
| **Port 长连接** | ✅ 保持活跃 | 中 | 中 | ✅ 完整 chrome API 访问 |

由于命令需要 `chrome.tabs` API（固定标签页、复制 tab 等 CS 不可用的 API），必须将匹配和执行交给 SW。Port 长连接在正常浏览时保持 SW 活跃，消除冷启动延迟。

### 已实现状态

- [x] `globalShortcutForBookmark` 已迁移至 Port 架构
- [x] `globalShortcutForCommand` 配置定义 + SW 缓存 + 命令分发
- [x] Port 双向通信：CS → SW 发送按键，SW → CS 回传命令
- [x] CS 端命令执行器：scrollUp/Down、reloadPage、copyPageUrl、toggleReaderMode
- [x] SW 端命令执行器：pinTab、duplicateTab、closeTab、next/prevTab 等
- [x] SW 独立校验 `isEnabled`（bookmark + command 双重校验）
- [x] CS 端命令快捷键监听（`source: 'command'` 发送路径）
- [x] newtab 端命令快捷键 task（`globalShortcutForCommandTask.ts`）
- [x] SW 端 `source` 字段安全校验（只允许 `'bookmark'` 或 `'command'`）
- [x] SW 端 Chrome API 调用错误处理（`.catch(logLastError)`）

---

## 命令设计

### 命令分类

命令按执行环境分为两类：

#### SW 命令（`execIn: 'sw'`）

需要 Chrome Extension API，只能在 Service Worker 中执行。

| 命令 key | 名称 | 描述 | API |
|----------|------|------|-----|
| `pinTab` | 固定标签页 | 将当前标签页固定/取消固定 | `chrome.tabs.update({pinned})` |
| `duplicateTab` | 复制标签页 | 在当前标签页后创建一个副本 | `chrome.tabs.duplicate()` |
| `closeTab` | 关闭标签页 | 关闭当前标签页 | `chrome.tabs.remove()` |
| `closeOtherTabs` | 关闭其他标签页 | 关闭同窗口中除当前标签页外的所有页 | `chrome.tabs.query + chrome.tabs.remove` |
| `closeLeftTabs` | 关闭左侧标签页 | 关闭同窗口中当前标签页左侧的所有页 | `chrome.tabs.query + chrome.tabs.remove` |
| `closeRightTabs` | 关闭右侧标签页 | 关闭同窗口中当前标签页右侧的所有页 | `chrome.tabs.query + chrome.tabs.remove` |
| `nextTab` | 下一个标签页 | 切换到右侧相邻标签页（循环） | `chrome.tabs.query + chrome.tabs.update` |
| `prevTab` | 上一个标签页 | 切换到左侧相邻标签页（循环） | `chrome.tabs.query + chrome.tabs.update` |
| `firstTab` | 首个标签页 | 切换到窗口第一个标签页 | `chrome.tabs.query + chrome.tabs.update` |
| `lastTab` | 末尾标签页 | 切换到窗口最后一个标签页 | `chrome.tabs.query + chrome.tabs.update` |
| `muteTab` | 静音/取消静音 | 切换当前标签页静音状态 | `chrome.tabs.update({muted})` |
| `reloadAllTabs` | 刷新当前窗口所有标签页 | 刷新当前窗口所有标签页 | `chrome.tabs.query + chrome.tabs.reload` |
| `reloadAllTabsAllWindows` | 刷新全部窗口所有标签页 | 刷新全部窗口所有标签页 | `chrome.tabs.query + chrome.tabs.reload` |
| `newTab` | 新建标签页 | 在当前标签页后新建空白页 | `chrome.tabs.create()` |

#### CS 命令（`execIn: 'cs'`）

需要操作页面 DOM，只能在 Content Script 中执行。

| 命令 key | 名称 | 描述 | API |
|----------|------|------|-----|
| `scrollUp` | 向上滚动 | 向上滚动一屏 | `window.scrollBy(0, -window.innerHeight)` |
| `scrollDown` | 向下滚动 | 向下滚动一屏 | `window.scrollBy(0, window.innerHeight)` |
| `scrollToTop` | 滚动到顶部 | 滚动到页面顶部 | `window.scrollTo(0, 0)` |
| `scrollToBottom` | 滚动到底部 | 滚动到页面底部 | `window.scrollTo(0, document.body.scrollHeight)` |
| `reloadPage` | 刷新页面 | 重新加载当前页面 | `location.reload()` |
| `copyPageUrl` | 复制页面链接 | 将当前页面 URL 复制到剪贴板 | `navigator.clipboard.writeText()` |
| `toggleReaderMode` | 阅读模式 | 进入/退出简化阅读视图 | 自定义 DOM 操作 |

### 命令数据结构

```ts
interface TCommandEntry {
  /** 命令唯一标识 */
  command: string
}
```

**执行环境推导**：`execIn` 不在 keymap 中冗余存储，而是通过 `getCommandExecEnv(command)` 函数从 `SW_COMMANDS` / `CS_COMMANDS` 列表中自动判断。这避免了 keymap 中的冗余数据，同时确保新增命令时必须在对应列表中声明执行环境。

---

## 数据存储

### 架构定位

**全局命令快捷键没有实际的 Widget 组件，只有 Setting 面板。**
（面向用户名称为「快捷指令」，以下文档为技术描述仍用"全局命令快捷键"）

它是一个「纯配置型」功能：
- 无 widget 不需要 `WidgetWrap`、拖拽、专注模式等 Widget 生命周期
- 仅有 Setting 面板用于配置 keymap 和修饰键
- 配置独立存储，与 keyboard widget 完全解耦

### 配置结构

```ts
// src/logic/globalShortcutForCommand.ts
export const COMMAND_SHORTCUT_CODE = 'commandShortcut'
export const PRESERVE_FIELDS = ['keymap']

export const COMMAND_SHORTCUT_CONFIG = {
  isEnabled: true,
  modifiers: ['shift', 'alt'] as string[],
  shortcutInInputElement: false,
  urlBlacklist: [] as string[],
  keymap: { ... } as Record<string, TCommandEntry>,
}
```

然后在 `src/logic/config.ts` 中导入并挂载到 `defaultConfig`：

```ts
export const defaultConfig = {
  general: generalConfig,
  commandShortcut: COMMAND_SHORTCUT_CONFIG,
  ...widgetsDefaultConfig,
}
```

### 存储机制

```
localStorage key:  c-commandShortcut
chrome.storage sync key:  naive-tab-commandShortcut
```

**已修改的位置：**

| 文件 | 操作 |
|------|------|
| `src/logic/globalShortcutForCommand.ts` | 定义配置 + PRESERVE_FIELDS + 命令常量 |
| `src/logic/globalShortcutForCommandTask.ts` | **新建**：newtab 页面命令快捷键 task，匹配修饰键后发送 `source: 'command'` |
| `src/logic/config.ts` | 导入挂载到 defaultConfig |
| `src/types/global.d.ts` | ConfigField 追加 'commandShortcut' |
| `src/types/global.d.ts` | settingPanes 追加 'commandShortcut' |
| `src/types/global.d.ts` | KeydownTaskKey 追加 'globalShortcutForCommand' |
| `src/types/global.d.ts` | 新增 GlobalShortcutCommandMessage 类型 |
| `src/logic/store.ts` | LocalConfigRefs 追加 commandShortcut |
| `src/logic/store.ts` | createLocalConfig 创建 commandShortcut storage |
| `src/logic/store.ts` | handleAppUpdate v2.2.0 迁移 |
| `src/setting/registry.ts` | SETTING_GROUPS 注册 pane |
| `src/logic/icons.ts` | SETTING_ICON_META 注册图标 |
| `src/newtab/App.vue` | onMounted 注册 command task，onUnmounted 清理 |
| `src/background/main.ts` | SW 缓存 + onChanged 监听 + 命令分发 + source 校验 + 错误处理 + bookmark isEnabled 校验 |
| `src/contentScripts/index.ts` | 命令快捷键配置加载 + 监听 + 修饰键匹配发送 `source: 'command'` |
| `src/setting/panes/commandShortcut/index.vue` | 设置面板 UI |

**不需要修改：**
- `WIDGET_CODE_LIST`：不是 Widget，不加入
- `WIDGET_GROUPS`：不是 Widget，不参与分组
- `src/newtab/widgets/registry.ts`：不需要 Widget 注册

---

## i18n

在 `src/locales/zh-CN.json` 和 `en-US.json` 中新增：
- `commandShortcut` 命名空间：面板文案
- `command` 命名空间：命令名称

---

## 与现有快捷键的隔离

| 维度 | 全局书签快捷键 | 全局命令快捷键 |
|------|----------------|----------------|
| 配置字段 | `keyboard` | `commandShortcut` |
| 存储 key | `c-keyboard` | `c-commandShortcut` |
| 云同步 key | `naive-tab-keyboard` | `naive-tab-commandShortcut` |
| 启用开关 | `keyboard.isGlobalShortcutEnabled` | `commandShortcut.isEnabled` |
| 修饰键 | `keyboard.globalShortcutModifiers`（默认 `['alt']`，数组） | `commandShortcut.modifiers`（默认 `['shift', 'alt']`，数组） |
| Keymap | `keyboard.keymap: Record<string, TBookmarkEntry>` | `commandShortcut.keymap: Record<string, TCommandEntry>` |
| 功能 | 打开书签 URL | 执行浏览器命令 |
| 是否有 Widget | ✅ 有键盘 UI 组件 | ❌ 无 UI，纯配置 |

**修饰键必须不同**，否则同一按键会同时触发书签打开和命令执行。默认修饰键设计：
- 书签快捷键：`['alt']`（单修饰键，快速操作）
- 命令快捷键：`['shift', 'alt']`（双修饰键，降低误触）

---

## 实现健壮性

### ✅ 已覆盖的场景

| 场景 | 处理方式 | 状态 |
|------|----------|------|
| 按键按住不放（repeat 事件） | `e.repeat` 过滤 | ✅ |
| 未启用全局快捷键 | CS/SW 双重 `isEnabled` 校验 | ✅ |
| 输入元素中误触发 | CS: `isInInputElement()` + `isGlobalShortcutInInput`<br>newtab: `isInputFocused` 上游屏蔽 | ✅ |
| 修饰键不匹配 | `eventMask !== configMask` 位掩码严格相等 | ✅ |
| 主键不在白名单 | `ALLOWED_SET.has(e.code)` | ✅ |
| keymap 中无对应命令 | `entry?.command` 可选链 | ✅ |
| Service Worker 冷启动 | Port 长连接保持活跃 | ✅ |
| Port 断连 | CS: 1s 自动重连<br>newtab: `getPort()` 懒重建 | ✅ |
| Content Script 重复注入 | `window.__naivetabGlobalShortcutForBookmarkInit` guard | ✅ |
| 配置异步加载期间按键 | `keymap` 初始为空对象，查不到不触发 | ✅ |
| 修饰键冲突（多 task 同时注册） | 各自内部修饰键过滤，互不干扰 | ✅ |
| prototype 污染攻击 | `keymap[key]` 直接查找，非原型属性返回 undefined | ✅ |
| gzip 压缩数据解析 | `parseStoredData` 自动解压，降级兼容原始 JSON | ✅ |
| SW 信任发送方 | SW 独立校验 `isEnabled`，不完全信任发送方 | ✅ |
| CS 命令回传 | Port 双向通信，SW → CS 回传 DOM 命令 | ✅ |

### ⚠️ 已知边界行为

| 行为 | 影响 | 说明 |
|------|------|------|
| Port 断连后首次按键可能丢失 | 极低 | SW 休眠时重建连接需要时间，首次 `postMessage` 可能在连接建立前发出，被 `try/catch` 静默吞掉。下次按键自动恢复 |
| `onUnmounted` 清理几乎不会执行 | 无 | 标签页关闭时 JS 环境直接销毁，不触发 Vue 生命周期。清理代码仅在 HMR / 热重载时生效 |
