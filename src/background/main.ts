/**
 * Background Service Worker 入口
 *
 * Service Worker 不使用 ES module import，
 * 所有依赖通过构建打包后的 dist 文件以 CommonJS 方式引入。
 */
import { type TCommandEntry, type TSwCommandName, getCommandExecEnv } from '@/logic/globalShortcut/shortcut-command'
import { log, createTab, padUrlHttps } from '@/logic/util'
import { gaProxy } from '@/logic/gtag'
import {
  loadAndCacheKeyboardConfig,
  loadAndCacheCommandConfig,
  getCachedKeyboardConfig,
  getCachedCommandShortcutConfig,
} from './config-cache'
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
  console.log('[NaiveTab-bg]', ...args)
}

// ── 动态注册全局快捷键 Content Script ─────────────────────────────────────

const registerGlobalShortcutContentScript = async () => {
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts()
    if (registered.some((s) => s.id === 'naivetab-global-shortcut')) {
      debug('content script already registered')
      return
    }

    await chrome.scripting.registerContentScripts([{
      id: 'naivetab-global-shortcut',
      js: ['dist/contentScripts/index.global.js'],
      matches: ['*://*/*'],
      runAt: 'document_start',
      persistAcrossSessions: true,
    }])
    debug('Global shortcut content script registered')
  } catch (e) {
    log('Register content script error', e)
  }
}

registerGlobalShortcutContentScript()

// ── Service Worker 启动时初始化缓存 ────────────────────────────────────────

loadAndCacheKeyboardConfig()
loadAndCacheCommandConfig()

// ── Port 长连接：CS/newtab → SW 统一处理快捷键 ────────────────────────────

const portMap = new Map<number, chrome.runtime.Port>()

/**
 * 处理书签快捷键按键事件
 */
const handleBookmarkShortcutKeydown = (key: string, _tabId: number) => {
  const config = getCachedKeyboardConfig()
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
  const config = getCachedCommandShortcutConfig()
  if (!config.isEnabled) return
  if (!config.keymap) return

  const entry = config.keymap[key] as TCommandEntry | undefined
  if (!entry?.command) return

  const execIn = getCommandExecEnv(entry.command)
  debug('Command shortcut:', entry.command, 'execIn:', execIn, 'tabId:', tabId)

  if (execIn === 'sw') {
    execSwCommand(entry.command as TSwCommandName, tabId)
  } else {
    const port = portMap.get(tabId)
    if (port) {
      try {
        port.postMessage({
          type: 'NAIVETAB_EXECUTE_COMMAND',
          command: entry.command,
        } satisfies GlobalShortcutCommandMessage)
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
      chrome.tabs.get(tabId).then((tab) => {
        if (!tab.windowId) return
        chrome.windows.getAll().then((windows) => {
          const sameTypeWindows = windows.filter((w) => w.incognito === tab.incognito)
          if (sameTypeWindows.length <= 1) return
          chrome.windows.remove(tab.windowId!).catch(logLastError)
        }).catch(logLastError)
      }).catch(logLastError)
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

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'naivetab-shortcut') return
  if (port.sender?.id !== chrome.runtime.id) return

  const tabId = port.sender?.tab?.id
  if (!tabId) return

  portMap.set(tabId, port)
  debug('Port connected for tab', tabId, 'total:', portMap.size)

  port.onMessage.addListener((msg: GlobalShortcutKeydownMessage) => {
    if (msg.type === 'NAIVETAB_KEYDOWN') {
      if (msg.source === 'bookmark') {
        handleBookmarkShortcutKeydown(msg.key, tabId)
      } else if (msg.source === 'command') {
        handleCommandShortcutKeydown(msg.key, tabId)
      } else {
        log('Unknown source in keydown message:', msg)
      }
    }
  })

  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError
    portMap.delete(tabId)
    debug('Port disconnected for tab', tabId, 'remaining:', portMap.size)
  })
})

// ── Content Script 消息监听 ────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ContentScriptToBackgroundMessage) => {
  if (message.type === 'NAIVETAB_OPEN_URL') {
    createTab(message.url)
    return
  }
})

addEventListener('unhandledrejection', async (event) => {
  gaProxy('error', ['unhandledrejection'], {
    event: JSON.stringify(event),
  })
})
