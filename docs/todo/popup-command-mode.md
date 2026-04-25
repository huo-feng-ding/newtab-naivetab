# Popup 命令键盘模式 — 技术方案

> 状态：**草案（待后续讨论确认）**

## 一、需求概述

在 popup（点击浏览器扩展图标弹出的窗口）中新增**命令执行模式**，与现有的书签配置模式互斥。用户可以：

- 在 popup 右上角切换书签/命令模式
- 记住用户上次选择的模式
- 点击键帽直接执行对应命令，**不关闭 popup**
- 其他与快捷键触发 command 一致（包括 newtab 命令限制、CS 命令提示等）

## 二、产品决策（已与用户确认）

| 决策点 | 结论 |
|--------|------|
| 书签和命令的关系 | 互斥，popup 内增加切换按钮，记住用户上次的选择 |
| 点击后行为 | 执行命令但不关闭 popup，用户可连续操作 |
| 执行方式 | 与快捷键触发命令一样路由到 SW/CS/newtab 执行 |
| newtab 命令 | 在其他页面无效，仅在 newtab 页面时生效（与快捷键行为一致） |
| CS 命令 | 正常展示，执行后增加提示反馈 |
| 命令数量与布局 | 复用现有可视化键盘，展示已绑定的命令，未绑定的键显示为灰色 |

## 三、架构设计

### 3.1 命令路由架构

```
popup 点击键帽
  ├─ SW 命令 (25个)   → chrome.runtime.sendMessage → background execSwCommand(command, tabId)
  ├─ CS 命令 (7个)    → chrome.runtime.sendMessage → background → chrome.tabs.sendMessage(activeTabId) → content script 执行
  └─ newtab 命令 (3个)→ chrome.runtime.sendMessage → background → chrome.tabs.sendMessage(newtabTabId) → newtab 页面执行
```

- popup 打开时用 `chrome.tabs.query({ active: true, currentWindow: true })` 缓存当前 `activeTabId`
- CS 命令（scrollUp/Down/Top/Bottom、reloadPage、copyPageUrl、copyPageTitle）发送到用户点击 popup **前看到的活跃网页**
- newtab 命令（toggleFocusMode、toggleDragMode、toggleSettingDrawer）需要找到已打开的 newtab tabId 再发送
- 所有命令复用现有的 `execSwCommand` 分发器，不在 popup 端重写执行逻辑

### 3.2 模式切换状态

用 `chrome.storage.local` 存储用户上次选择：
```ts
{
  popupLastMode: 'bookmark' | 'command'  // 默认 'bookmark'
}
```

popup 打开时读取并恢复。右上角用 `n-segmented` 做切换，两个选项带图标区分。

### 3.3 键帽渲染策略

- 复用 `KeyboardLayout` + `KeyboardKeycapDisplay`，与 setting 面板中命令配置区域一致
- **有绑定的键**：正常显示，点击执行命令，键帽上显示命令名（i18n）
- **未绑定的键**：显示但置灰（`opacity: 0.4`），点击后 `window.$message.warning` 提示该键未绑定命令

### 3.4 执行后反馈

- SW 命令：静默执行（与快捷键一致）
- CS 命令：成功时显示 toast（如 "页面已重新加载"、"链接已复制"）
- newtab 命令（未在 newtab 页面时）：toast 提示 "该命令仅在新标签页生效"

## 四、文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/popup/PopupCommandKeyboard.vue` | **新增** | 命令键盘组件：渲染可视化键盘 + 点击执行逻辑 |
| `src/popup/PopupConfigBookmark.vue` | 修改 | 增加模式切换按钮（n-segmented），标题动态切换 |
| `src/popup/Content.vue` | 修改 | 根据模式条件加载对应组件 |
| `src/popup/types.ts` | **新增** | popup 模式类型定义 |
| `src/background/main.ts` | 修改 | 新增 `MSG_POPUP_EXEC_COMMAND` 消息处理入口，路由到 execSwCommand / CS / newtab |
| `src/types/messages.ts` | 修改 | 新增 popup 命令执行消息类型 |
| `src/locales/zh-CN.json` | 修改 | 新增 popup 命令模式文案、命令执行提示 |
| `src/locales/en-US.json` | 修改 | 新增对应英文文案 |

## 五、关键技术细节

### 5.1 popup 端命令执行

```ts
// PopupCommandKeyboard.vue 中
const executeCommand = async (command: TCommandName) => {
  const execEnv = getCommandExecEnv(command)
  
  const resp = await chrome.runtime.sendMessage({
    type: MSG_POPUP_EXEC_COMMAND,
    command,
    tabId: activeTabId.value,  // popup 打开时缓存的活跃 tabId
  })
  
  if (resp?.error) {
    window.$message?.error(resp.error)
    return
  }
  
  // 根据执行环境显示不同提示
  if (execEnv === 'cs') {
    window.$message?.success(window.$t(`command.toast.${command}`))
  } else if (execEnv === 'newtab' && !resp?.newtabFound) {
    window.$message?.warning(window.$t('command.toast.newtabRequired'))
  }
}
```

### 5.2 background 端消息处理

```ts
// background/main.ts onMessage 中新增
case MSG_POPUP_EXEC_COMMAND: {
  const { command, tabId } = msg
  const execEnv = getCommandExecEnv(command)
  
  if (execEnv === 'sw') {
    execSwCommand(command, tabId)
    return { success: true }
  }
  
  if (execEnv === 'cs') {
    await chrome.tabs.sendMessage(tabId, { type: MSG_EXECUTE_COMMAND, command })
    return { success: true }
  }
  
  // newtab 命令：需要找到 newtab 页面
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('newtab.html') })
  if (tabs.length > 0) {
    await chrome.tabs.sendMessage(tabs[0].id!, { type: MSG_EXECUTE_COMMAND, command })
    return { success: true, newtabFound: true }
  }
  return { success: false, error: 'newtab not open' }
}
```

### 5.3 模式切换实现

```vue
<!-- PopupConfigBookmark.vue header 中 -->
<div class="popup__header">
  <span class="header__title">{{ modeTitle }}</span>
  <NSegmented v-model:value="currMode" :options="modeOptions" size="small" />
</div>
```

```ts
const currMode = ref<'bookmark' | 'command'>('bookmark')

// popup 打开时恢复上次模式
const storedMode = await chrome.storage.local.get('popupLastMode')
currMode.value = storedMode?.popupLastMode ?? 'bookmark'

// 切换时保存
watch(currMode, async (mode) => {
  await chrome.storage.local.set({ popupLastMode: mode })
})
```

## 六、待讨论的问题

### 6.1 键帽图标展示（未确认）

当前 setting 面板中命令选择是纯文字列表（`n-radio`），没有图标。popup 命令键盘中，每个键帽是否需要配置**不同的图标**？

- **方案 A**：统一使用默认键帽样式，只显示命令名称文字，零额外配置
- **方案 B**：为每个命令配置一个图标，视觉上更丰富但需要维护图标映射

### 6.2 未绑定键的交互（未确认）

未绑定的键点击后：
- 方案 A：toast 提示 "该键未绑定命令"
- 方案 B：弹出命令选择器（类似 setting 面板），允许在 popup 中直接配置
- 方案 C：静默忽略

### 6.3 newtab 命令找不到目标时（未确认）

用户不在 newtab 页面时点击 newtab 命令（如 toggleFocusMode）：
- 方案 A：toast 警告 "该命令仅在新标签页生效"
- 方案 B：自动打开新 newtab 页面并执行
- 方案 C：不展示这些命令

## 七、依赖关系

- 复用 `KeyboardLayout`、`KeyboardKeycapDisplay` 组件
- 复用 `COMMAND_CATEGORIES`、`getCommandExecEnv`、`TCommandName` 等类型
- 复用 `execSwCommand` 分发器（`src/background/command-registry.ts`）
- 复用 `localConfig.keyboardCommand.keymap` 配置数据

## 八、风险点

1. **popup 不关闭**：用户执行命令后 popup 保持打开，需确保命令执行不依赖 popup 的 DOM 上下文
2. **CS 命令目标页变更**：用户点击 popup 后切换到其他标签页再执行命令，activeTabId 可能失效——应在每次执行时重新查询或缓存时做好校验
3. **newtab tab 查找**：可能同时打开多个 newtab 页面，`chrome.tabs.query({ url: chrome.runtime.getURL('newtab.html') })` 返回多个结果时需要选择最相关的（通常是当前窗口的）
