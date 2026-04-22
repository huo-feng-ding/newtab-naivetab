/**
 * Background Service Worker 入口
 *
 * Service Worker 不使用 ES module import，
 * 所有依赖通过构建打包后的 dist 文件以 CommonJS 方式引入。
 *
 * 模块职责：
 * - main.ts：Port 连接管理、消息队列、命令分发（execSwCommand 40+ 命令）
 * - config-cache.ts：配置缓存加载与 onChanged 自动更新
 * - init-guard.ts：启动编排，等待双配置加载完成后放行快捷键处理
 * - commands.ts：40+ tab 操作命令的具体实现
 */
import { type TCommandEntry, type TSwCommandName, getCommandExecEnv } from '@/logic/globalShortcut/shortcut-command'
import { log, padUrlHttps } from '@/logic/util'
import { gaProxy } from '@/logic/gtag'
import {
  getCachedKeyboardBookmarkConfig,
  getCachedKeyboardCommandConfig,
} from './config-cache'
import { waitInitialized, getIsInitialized } from './init-guard'
import {
  MSG_KEYDOWN,
  MSG_INIT_COMPLETE,
  MSG_HELLO,
  MSG_EXECUTE_COMMAND,
  type CsToSwMessage,
  type SwToCsMessage,
} from '@/types/messages'
import {
  switchTab,
  switchToEdgeTab,
  closeTabsAround,
  closeDuplicateTabs,
  reloadAllTabs,
  reloadAllTabsAllWindows,
  moveTab,
  moveToNewWindow,
  moveTabToNextWindow,
  mergeAllWindows,
  groupCurrentTab,
  ungroupCurrentTab,
  toggleGroupCollapse,
  closeGroupTabs,
} from './commands'

// ── 调试日志 ──────────────────────────────────────────────────────────────
const debug = (...args: any[]) => {
  console.log('[NaiveTab-sw]', ...args)
}

// ── 动态注册全局快捷键 Content Script ─────────────────────────────────────

/**
 * 向已打开的页面注入 Content Script。
 * 面向现在：
 * - registerContentScripts 是事件监听式注册，只对注册后加载的页面生效，
 * - 对扩展启动前已存在的标签页无效，需要此函数手动补齐。
 */
const injectToExistingTabs = async () => {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://*/*'] })
    let successCount = 0
    let skipCount = 0
    const injectPromises = tabs
      .filter((tab) => !!tab.id)
      .map(async (tab) => {
        try {
          // 前置检查：已初始化的 tab 跳过注入，避免重复加载脚本
          const alreadyInit = await chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            func: () => (window as any).__naivetabGlobalShortcutInit === true,
          })
          if (alreadyInit[0]?.result === true) {
            skipCount++
            return
          }

          await chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            files: ['dist/contentScripts/index.global.js'],
          })
          successCount++
        } catch (e) {
          debug(`Inject failed for tab ${tab.id}:`, e)
        }
      })
    await Promise.allSettled(injectPromises)
    const targetCount = tabs.length - skipCount
    debug(`Injected to ${successCount}/${targetCount} new tabs (${skipCount} already initialized)`)
  } catch (e) {
    debug('Failed to inject to existing tabs', e)
  }
}

const registerGlobalShortcutContentScript = async () => {
  try {
    // 检查是否已注册，避免重复注册抛出 "already exists" 错误
    const registered = await chrome.scripting.getRegisteredContentScripts()
    if (registered.some((s) => s.id === 'naivetab-global-shortcut')) {
      debug('content script already registered')
      return
    }

    /**
     * 注册 Content Script 规则
     * 面向未来：以后遇到符合规则的页面，自动注入脚本
     */
    await chrome.scripting.registerContentScripts([{
      id: 'naivetab-global-shortcut',
      js: ['dist/contentScripts/index.global.js'],
      matches: ['*://*/*'],
      // document_start 确保在 DOM 构建前注入，在页面脚本之前拦截按键
      runAt: 'document_start',
      // Content Script 规则在浏览器重启后仍然有效，Chrome 会自动恢复它。
      persistAcrossSessions: true,
    }])
    debug('Global shortcut content script registered')

    // 注册成功后主动向扩展启动前已打开的页面注入，补齐 registerContentScripts 的遗漏
    await injectToExistingTabs()
  } catch (e) {
    log('Register content script error', e)
  }
}

registerGlobalShortcutContentScript()

// ── Service Worker 启动时初始化缓存 ────────────────────────────────────────
// 使用 waitInitialized 确保两个配置都加载完成，后续 onConnect 可据此守卫
waitInitialized()

// ── Port 长连接：CS/newtab → SW 统一处理快捷键 ────────────────────────────

/**
 * tabId → Port 映射。每个 tabId 只保留一个 Port 引用。
 * 安全性：Content Script 注入时 allFrames: false（默认），仅注入顶层 frame，
 * 同一 tab 不会产生多个 Port 连接，因此一个 tabId 存一个 Port 是安全的。
 *
 * 冷启动容错机制：
 * SW 冷启动时配置尚未加载（waitInitialized），此期间 CS/newtab 发来的 keydown
 * 消息暂存到 pendingMessages 队列中。配置加载完成后：
 *   1. 批量处理积压消息（processKeydown）
 *   2. 显式 removeListener 暂存 handler，addListener 正常 handler
 *   3. 回传 INIT_COMPLETE 通知 CS/newtab
 */
const portMap = new Map<number, chrome.runtime.Port>()

/**
 * 初始化期间暂存的按键消息队列。
 * SW 冷启动时配置未加载完成，此期间 CS/newtab 发来的 keydown 暂存，
 * waitInitialized 完成后批量处理，避免冷启动窗口期按键被丢弃。
 */
interface PendingKeydown {
  key: string
  source: 'bookmark' | 'command'
}

const pendingMessages = new Map<number, PendingKeydown[]>()

/**
 * 处理单个按键消息（统一入口，供 onMessage 和积压队列共用）
 */
const processKeydown = (key: string, source: 'bookmark' | 'command', tabId: number) => {
  if (source === 'bookmark') {
    handleBookmarkShortcutKeydown(key, tabId)
  } else if (source === 'command') {
    handleCommandShortcutKeydown(key, tabId)
  } else {
    log('Unknown source in keydown message:', { key, source })
  }
}

/**
 * 处理书签快捷键按键事件
 */
const handleBookmarkShortcutKeydown = (key: string, _tabId: number) => {
  const config = getCachedKeyboardBookmarkConfig()
  if (!config.isGlobalShortcutEnabled) return
  const entry = config.keymap?.[key]
  if (!entry?.url) return

  const url = padUrlHttps(entry.url)
  debug('Bookmark shortcut: opening', url)
  chrome.tabs.create({ url })
}

/**
 * 处理命令快捷键按键事件
 */
const handleCommandShortcutKeydown = (key: string, tabId: number) => {
  const config = getCachedKeyboardCommandConfig()
  if (!config.isEnabled) return
  if (!config.keymap) return

  const entry = config.keymap[key] as TCommandEntry | undefined
  if (!entry?.command) return

  const execIn = getCommandExecEnv(entry.command)
  debug('Command shortcut:', entry.command, 'execIn:', execIn, 'tabId:', tabId)

  // newtab 命令由 newtab 页面本地执行，SW 无需处理
  // 若请求来自普通网页的 CS，也静默忽略（CS 没有 localConfig，无法执行）
  if (execIn === 'newtab') return

  if (execIn === 'sw') {
    execSwCommand(entry.command as TSwCommandName, tabId)
  } else {
    const port = portMap.get(tabId)
    if (port) {
      try {
        port.postMessage({
          type: MSG_EXECUTE_COMMAND,
          command: entry.command,
        })
      } catch (e) {
        log('Post command to CS error', e)
      }
    }
  }
}

/**
 * SW 端直接执行的命令分发器
 */
const execSwCommand = (command: TSwCommandName, tabId: number) => {
  switch (command) {
    case 'toggleTabPinned':
      chrome.tabs.get(tabId).then((tab) => {
        chrome.tabs.update(tabId, { pinned: !tab.pinned }).catch(logLastError)
      }).catch(logLastError)
      break
    case 'toggleTabMute':
      chrome.tabs.get(tabId).then((tab) => {
        chrome.tabs.update(tabId, { muted: !tab.mutedInfo?.muted }).catch(logLastError)
      }).catch(logLastError)
      break
    case 'duplicateTab':
      chrome.tabs.duplicate(tabId).catch(logLastError)
      break
    case 'closeTab':
      chrome.tabs.remove(tabId).catch(logLastError)
      break
    case 'closeOtherTabs':
      closeTabsAround(tabId, 'others')
      break
    case 'closeLeftTabs':
      closeTabsAround(tabId, 'left')
      break
    case 'closeRightTabs':
      closeTabsAround(tabId, 'right')
      break
    case 'nextTab':
      switchTab(tabId, 1)
      break
    case 'prevTab':
      switchTab(tabId, -1)
      break
    case 'firstTab':
      switchToEdgeTab(tabId, 'first')
      break
    case 'lastTab':
      switchToEdgeTab(tabId, 'last')
      break
    case 'reloadAllTabs':
      reloadAllTabs(tabId)
      break
    case 'reloadAllTabsAllWindows':
      reloadAllTabsAllWindows(tabId)
      break
    case 'newTab':
      chrome.tabs.create({ index: undefined }).catch(logLastError)
      break
    case 'newTabAfter':
      chrome.tabs.get(tabId).then((tab) => {
        chrome.tabs.create({ index: (tab.index ?? 0) + 1, active: true }).catch(logLastError)
      }).catch(logLastError)
      break
    case 'goBack':
      chrome.tabs.goBack(tabId).catch(logLastError)
      break
    case 'goForward':
      chrome.tabs.goForward(tabId).catch(logLastError)
      break
    case 'closeWindow':
      (async () => {
        const tab = await chrome.tabs.get(tabId).catch(logLastError)
        if (!tab?.windowId) return
        const windows = await chrome.windows.getAll().catch(logLastError)
        if (!windows) return
        const sameTypeWindows = windows.filter((w) => w.type === 'normal' && w.incognito === tab.incognito)
        if (sameTypeWindows.length <= 1) return
        await chrome.windows.remove(tab.windowId).catch(logLastError)
      })()
      break
    case 'moveTabLeft':
      moveTab(tabId, -1)
      break
    case 'moveTabRight':
      moveTab(tabId, 1)
      break
    case 'moveToNewWindow':
      moveToNewWindow(tabId)
      break
    case 'moveTabToNextWindow':
      moveTabToNextWindow(tabId)
      break
    case 'newWindow':
      chrome.windows.create().catch(logLastError)
      break
    case 'newIncognito':
      chrome.windows.create({ incognito: true }).catch(logLastError)
      break
    case 'reopenClosedTab':
      chrome.sessions.getRecentlyClosed({ maxResults: 1 }).then((sessions) => {
        if (sessions.length > 0) {
          // @ts-expect-error sessionId exists in Chrome runtime but not in @types/chrome
          const sessionId = sessions[0].sessionId as string | undefined
          if (sessionId) {
            chrome.sessions.restore(sessionId).catch(logLastError)
          }
        }
      }).catch(logLastError)
      break
    case 'closeDuplicateTabs':
      closeDuplicateTabs(tabId)
      break
    case 'mergeAllWindows':
      mergeAllWindows(tabId)
      break
    // 标签组
    case 'groupCurrentTab':
      groupCurrentTab(tabId)
      break
    case 'ungroupCurrentTab':
      ungroupCurrentTab(tabId)
      break
    case 'toggleGroupCollapse':
      toggleGroupCollapse(tabId)
      break
    case 'closeGroupTabs':
      closeGroupTabs(tabId)
      break
    default:
      command satisfies never
      log('Unknown SW command:', command)
  }
}

const logLastError = (e: Error) => {
  log('Chrome API error:', e)
}

// ── Port 连接管理 ──────────────────────────────────────────────────────────
//
// 连接生命周期：
// 1. connect() → onConnect → 存储 portMap[tabId] → 注册 onMessage
// 2. 冷启动路径：注册暂存 listener → waitInitialized() → removeListener 暂存 + addListener 正常 + INIT_COMPLETE
// 3. 正常路径：立即回传 INIT_COMPLETE → 注册正常 listener（含 HELLO 握手处理）
// 4. onDisconnect → 仅删除当前指向的 port（防快速导航误删新 Port）
//
// 双 listener 切换（冷启动场景）：
// - 第一个 listener（pendingHandler）：暂存消息到 pendingMessages
// - waitInitialized() 完成后：显式 removeListener 暂存 handler，addListener 正常 handler
// - 使用命名箭头函数便于 removeListener 精确匹配移除

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'naivetab-shortcut') return
  if (port.sender?.id !== chrome.runtime.id) return

  // BFCache / prerender 页面的 Port 不需要建立连接
  const lifecycle = (port.sender as any).documentLifecycle
  if (lifecycle && lifecycle !== 'active') {
    port.disconnect()
    return
  }

  const tabId = port.sender?.tab?.id
  if (!tabId) return

  portMap.set(tabId, port)
  debug('Port connected for tab', tabId, 'total:', portMap.size)

  // 初始化未完成时，暂存按键消息；配置加载完成后批量处理
  if (!getIsInitialized()) {
    if (!pendingMessages.has(tabId)) pendingMessages.set(tabId, [])

    // 暂存 listener（使用命名箭头函数，后续通过 removeListener 显式移除）
    const pendingHandler = (msg: CsToSwMessage) => {
      if (msg.type === MSG_KEYDOWN) {
        pendingMessages.get(tabId)!.push({ key: msg.key, source: msg.source })
      }
    }
    port.onMessage.addListener(pendingHandler)

    waitInitialized().then(() => {
      // 处理该 port 的积压消息
      const msgs = pendingMessages.get(tabId)
      if (msgs) {
        for (const { key, source } of msgs) processKeydown(key, source, tabId)
      }
      pendingMessages.delete(tabId)
      // 显式移除暂存 listener，替换为正常处理 listener
      port.onMessage.removeListener(pendingHandler)
      port.onMessage.addListener((msg: CsToSwMessage) => {
        if (msg.type === MSG_KEYDOWN) processKeydown(msg.key, msg.source, tabId)
      })
      try {
        port.postMessage({ type: MSG_INIT_COMPLETE })
      } catch {
        // port may be disconnected, ignore
      }
    })
  } else {
    try {
      port.postMessage({ type: MSG_INIT_COMPLETE })
    } catch {
      // port may be disconnected, ignore
    }
    port.onMessage.addListener((msg: CsToSwMessage) => {
      // 重连握手：CS 断线重连后发 HELLO 确认 SW 状态
      if (msg.type === MSG_HELLO) {
        if (getIsInitialized()) {
          try {
            port.postMessage({ type: MSG_INIT_COMPLETE })
          } catch {
            // port may be disconnected, ignore
          }
        }
        return
      }
      if (msg.type === MSG_KEYDOWN) processKeydown(msg.key, msg.source, tabId)
    })
  }

  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError
    // 只删除当前仍指向该 port 的条目，避免快速导航时误删新 Port
    const currentPort = portMap.get(tabId)
    if (currentPort === port) {
      portMap.delete(tabId)
    }
    debug('Port disconnected for tab', tabId, 'remaining:', portMap.size)
  })
})

addEventListener('unhandledrejection', async (event) => {
  gaProxy('error', ['unhandledrejection'], {
    reason: String(event.reason),
  })
})
