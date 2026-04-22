# SW / CS / NewTab 消息架构

本文档描述 NaiveTab 扩展中 Service Worker (SW)、Content Script (CS) 和 NewTab 页面三者的消息通信架构。

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                     Service Worker (background/)                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ config-cache │  │ init-guard   │  │ execSwCommand         │  │
│  │ (keyboard +  │  │ (启动编排     │  │ (40+ tab commands)    │  │
│  │  command)    │  │  版本感知     │  │                       │  │
│  │  缓存加载)    │  │  等待双配置)  │  │                       │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                 │                       │              │
│         ▼                 ▼                       ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           chrome.runtime.onConnect (Port)                │   │
│  │  name='naivetab-shortcut'                                 │   │
│  │  - 冷启动消息队列 (pendingMessages)                       │   │
│  │  - 初始化后批量处理 + 回传 INIT_COMPLETE                  │   │
│  └───────────────────────┬──────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────────┘
                           │ Port (双向通信)
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────┐    ┌──────────────────────────┐
│  Content Script       │    │  NewTab Page             │
│  (*://*/* HTTP页面)   │    │  (chrome-extension://)   │
│                      │    │                          │
│  • index.ts: 按键采集 │    │  • task.ts keydownTaskMap│
│  • scroll.ts: 滚动    │    │  • shortcut-bookmark.ts  │
│  • toast 提示        │    │  • shortcut-executor.ts  │
│  • 本地 fallback      │    │  • getSharedPort() 单例  │
│    (SW未就绪时)       │    │  • 冷启动 toast 提示      │
└──────────────────────┘    └──────────────────────────┘
```

## 三者角色

### Service Worker (background/)

**职责**：消息中枢 + 命令执行

| 组件 | 文件 | 说明 |
|------|------|------|
| `main.ts` | `background/main.ts` | Port 连接管理、消息队列、命令分发（`execSwCommand` 40+ 命令） |
| `config-cache.ts` | `background/config-cache.ts` | 配置缓存加载与更新，`onChanged` 自动刷新内存缓存 |
| `init-guard.ts` | `background/init-guard.ts` | 启动编排：等待双配置加载完成，暴露 `isInitialized` 守卫（10s 超时兜底） |

**启动流程**：
1. 注册 Content Script（`chrome.scripting.registerContentScripts`）
2. 向已有标签页注入 CS（`injectToExistingTabs`）
3. `waitInitialized()` 加载 keyboard + command 配置（由 `init-guard.ts` 编排，10s 超时兜底）
4. 监听 `onConnect` 处理 Port 连接

### Content Script (contentScripts/)

**职责**：按键采集 + DOM 命令执行

- 注入范围：`*://*/*` HTTP/HTTPS 页面，不注入 `chrome-extension://` 等扩展页面
- 注入时机：`document_start`，确保在页面脚本之前拦截按键
- 直接读取 `chrome.storage.sync` 获取初始配置（~5-20ms）
- 通过 `chrome.storage.onChanged` 实时同步配置更新

**模块结构**：
- `index.ts`：初始化入口、配置加载与监听、Port 连接管理、按键分发、命令执行器
- `scroll.ts`：滚动容器查找（`findScrollContainer`）、缓存失效、平滑滚动（`fastSmoothScrollTo`）
- `toast.ts`：轻量提示组件

**本地 fallback 机制**：当 `swReady === false` 时，书签快捷键直接使用本地 keymap 打开 URL，避免 SW 冷启动期间按键丢失。

### NewTab Page (newtab/)

**职责**：扩展新标签页的快捷键响应

- `task.ts` 的 `keydownTaskMap` 注册各模块的按键处理
- `shortcut-bookmark.ts` 和 `shortcut-executor.ts` 注册 keydownTask
- 通过 `getSharedPort()` 共享 Port 发送按键到 SW
- SW 未就绪时书签快捷键会弹出 toast 提示「扩展正在初始化，请稍后再试」

## 消息类型

详见 [src/types/messages.ts](../../types/messages.ts)

| 方向 | 消息类型 | 接口 | 用途 |
|------|---------|------|------|
| CS/NewTab → SW | `NAIVETAB_KEYDOWN` | `CsToSwKeydownMessage` | 按键事件（`key` + `source`） |
| CS/NewTab → SW | `NAIVETAB_HELLO` | `CsToSwHello` | 握手/状态确认 |
| SW → CS/NewTab | `NAIVETAB_INIT_COMPLETE` | `SwToCsInitComplete` | SW 初始化完成 |
| SW → CS/NewTab | `NAIVETAB_EXECUTE_COMMAND` | `SwToCsExecuteCommand` | 回传需要 DOM 执行的命令 |

## Port 长连接

### 为什么用 Port 而非 sendMessage

`chrome.runtime.sendMessage` 每次调用都会触发 SW 唤醒，对于高频按键场景有明显延迟。Port 长连接保持持久通信通道，消除冷启动延迟。

### 连接生命周期

```
CS/NewTab: chrome.runtime.connect({ name: 'naivetab-shortcut' })
    ↓
SW: onConnect → portMap.set(tabId, port)
    ↓
    ├── 冷启动路径（!isInitialized）：
    │   ├── 注册暂存 listener（命名箭头函数）
    │   ├── waitInitialized() resolve 后：
    │   │   ├── 批量处理积压消息
    │   │   ├── removeListener 暂存 handler
    │   │   ├── addListener 正常 handler
    │   │   └── postMessage INIT_COMPLETE
    │
    └── 正常路径（isInitialized）：
        ├── 立即 postMessage INIT_COMPLETE
        └── 注册正常 listener（含 HELLO 握手处理）
```

### 共享 Port 机制

书签快捷键和命令快捷键**共用同一个 Port**（`name='naivetab-shortcut'`），避免两个独立 Port 连接到 SW 时，SW 的 `portMap[tabId]` 被后连接的覆盖。

共享 Port 管理：`src/logic/globalShortcut/shortcut-utils.ts` 的 `getSharedPort()` 单例。

### 重连策略

- 初始延迟：100ms
- 指数退避：`delay = Math.min(delay * 2, 1000)`
- 上限：1000ms

## 命令执行路由

命令按执行环境分为两类：

### SW 命令（execIn: 'sw'）

大部分 tab 操作命令，由 SW 直接调用 `chrome.tabs.*` API 执行。

### CS 命令（execIn: 'cs'）

需要 DOM 操作的命令，由 SW 通过 Port 回传 `NAIVETAB_EXECUTE_COMMAND` 消息，CS/NewTab 各自执行。

| 命令 | 说明 |
|------|------|
| `scrollUp` / `scrollDown` | 页面滚动 |
| `scrollToTop` / `scrollToBottom` | 滚动到顶部/底部 |
| `reloadPage` | 刷新页面 |
| `copyPageUrl` / `copyPageTitle` | 复制 URL/标题 |

命令单一数据源：`src/logic/globalShortcut/shortcut-command.ts` 的 `COMMAND_CATEGORIES`，只有 CS 命令需要显式标注 `execEnv: 'cs'`，其余默认 `'sw'`。

## 冷启动容错

### CS 端

CS 在 `swReady === false` 时有本地 fallback：直接使用本地 keymap 打开 URL。本地 keymap 通过 `chrome.storage.sync.get()` 在 CS 初始化时读取。

### NewTab 端

NewTab 端**无本地 fallback**，完全依赖 Port 连接。但书签和命令快捷键在 SW 未就绪时都会弹出 toast 提示「扩展正在初始化，请稍后再试」，避免用户感到按键静默失效。

### SW 端

SW 通过 `pendingMessages` 暂存冷启动期间的按键消息，配置加载完成后批量处理。冷启动路径使用命名箭头函数 + `removeListener`/`addListener` 显式切换 listener，避免双 listener 共存。

## 快捷键冲突防护

### CS 端（有防护）

`contentScripts/index.ts` 有 `hasModifierConflict` 机制：当书签和命令使用相同修饰键时，只发送书签消息（老功能优先）。

### NewTab 端（天然隔离）

依赖修饰键天然不同：
- 书签快捷键：modifiers = `['alt']` → mask = 4
- 命令快捷键：modifiers = `['shift', 'alt']` → mask = 6

如果用户手动改成相同修饰键，两个 handler 都会发送 keydown 到 SW，**不会被拦截**。

## 已知风险

1. **NewTab 命令快捷键无本地 fallback** — SW 未就绪时书签和命令快捷键均有 toast 提示，但 CS 端书签快捷键有本地 keymap fallback 可直接打开 URL，命令快捷键在 CS 端也有本地执行器。NewTab 端两者都完全依赖 SW 响应。
2. **NewTab 端缺冲突拦截** — 修饰键相同时两个 handler 都发 keydown，CS 端有 `hasModifierConflict` 但 newtab 端没有。setting 面板会避免修饰键冲突，所以无需额外处理
