// ! background Cannot use import statement outside a module
// import browser from 'webextension-polyfill'
import { WIDGET_CONFIG } from '~/newtab/widgets/keyboard/config'
import { log, createTab, padUrlHttps } from '@/logic/util'
import { parseStoredData } from '@/logic/compress'
import { gaProxy } from '@/logic/gtag'

// ── 调试日志 ──────────────────────────────────────────────────────────────
// 开发环境自动输出，生产环境静默。Chrome 控制台中搜索 [NaiveTab-bg] 过滤。
const debug = (...args: any[]) => {
  if (__DEV__ || (typeof self !== 'undefined' && (self as any).__naivetabDebug)) {
    console.log('[NaiveTab-bg]', ...args)
  }
}

// ── Keyboard 配置缓存 ─────────────────────────────────────────────────────
// Service Worker 无法使用 Vue 响应式状态，采用缓存模式：
// 启动时读取一次配置到内存，后续通过 chrome.storage.onChanged 自动更新缓存
// 按键事件直接读缓存（~0ms 响应），无需每次读取 storage + 解压
let cachedKeyboardConfig = WIDGET_CONFIG

/**
 * 监听配置变化，自动更新缓存
 *
 * 注意：不使用 async listener，避免 Service Worker 在异步操作完成前休眠。
 * parseStoredData 的 gzip 解压耗时通常在几毫秒内，在 SW 活跃窗口内可完成。
 */
chrome.storage.onChanged.addListener((changes) => {
  if (changes['naive-tab-keyboard']) {
    const raw = changes['naive-tab-keyboard'].newValue as string
    if (raw && raw.length > 0) {
      parseStoredData(raw).then((parsed) => {
        cachedKeyboardConfig = parsed.data
        debug('Keyboard config updated, keymap keys:', Object.keys(parsed.data.keymap || {}))
        log('Keyboard config updated')

        // 推送全局快捷键配置更新到所有已注入的 Content Script
        pushGlobalShortcutConfigToTabs()
      }).catch((e) => {
        log('Update keyboard cache error', e)
      })
    }
  }
})

/**
 * 加载并缓存 keyboard 配置
 * 启动时执行一次，后续通过 onChanged 监听更新
 */
const loadAndCacheKeyboardConfig = async () => {
  try {
    const data = await chrome.storage.sync.get('naive-tab-keyboard')
    const raw = data['naive-tab-keyboard'] as string
    if (raw && raw.length > 0) {
      const parsed = await parseStoredData(raw)
      cachedKeyboardConfig = parsed.data
      debug('Keyboard config cached, keymap keys:', Object.keys(parsed.data.keymap || {}))
      log('Keyboard config cached')
    } else {
      debug('No keyboard config in storage, using defaults')
    }
  } catch (e) {
    log('Load keyboard config error', e)
  }
}

// Service Worker 启动时初始化缓存
loadAndCacheKeyboardConfig()

// ── 动态注册全局快捷键 Content Script ──────────────────────────────

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
      runAt: 'document_idle',
      persistAcrossSessions: true,
    }])
    debug('Global shortcut content script registered')
  } catch (e) {
    log('Register content script error', e)
  }
}

registerGlobalShortcutContentScript()

/**
 * 推送配置更新到所有已注入 Content Script 的 Tab
 *
 * 触发时机：chrome.storage.onChanged 检测到 keyboard 配置变化时
 * 行为：向所有 tab 发送 NAIVETAB_UPDATE_GLOBAL_SHORTCUT_CONFIG 消息
 *
 * ⚠️ 注意：
 * - chrome.tabs.sendMessage 对没有 Content Script 的 tab 会失败（catch 忽略）
 * - 新打开的 tab 会在 loadConfig() 中主动获取最新配置
 * - 此函数不等待所有 tab 响应，是 fire-and-forget 模式
 *
 * ⚠️ 性能考虑：当打开大量 tab 时，sendMessage 调用次数 = tab 数量。
 * Chrome 对 tabs.query + 循环 sendMessage 没有批量 API，
 * 如果 tab 数 > 100 时出现性能问题，可考虑改用 chrome.runtime.connect 长连接。
 */
const pushGlobalShortcutConfigToTabs = () => {
  chrome.tabs.query({}, (tabs) => {
    const injectedTabs: number[] = []
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'NAIVETAB_UPDATE_GLOBAL_SHORTCUT_CONFIG',
          isEnabled: cachedKeyboardConfig.isListenBackgroundKeystrokes ?? false,
          globalShortcutModifier: cachedKeyboardConfig.globalShortcutModifier ?? '',
          keymap: cachedKeyboardConfig.keymap ?? {},
        }).then(() => {
          injectedTabs.push(tab.id!)
        }).catch(() => {
          // tab 可能已关闭或不支持消息，忽略
        })
      }
    }
    debug('pushed config to tabs:', injectedTabs, 'modifier:', cachedKeyboardConfig.globalShortcutModifier, 'keymap:', Object.keys(cachedKeyboardConfig.keymap || {}))
  })
}

// ── 打开 URL ─────────────────────────────────────────────────────────────
// Content Script 捕获全局快捷键后通知 Background 打开 URL

/**
 * 处理全局快捷键（来自 Content Script 的 NAIVETAB_OPEN_GLOBAL_SHORTCUT 消息）
 *
 * 安全注意：此函数直接打开传入的 URL，不做校验。URL 来自 Content Script，
 * Content Script 读取的是本地 keymap 配置，不受外部输入影响。
 */
const openGlobalShortcut = (url: string) => {
  if (!url || url.length === 0) return
  createTab(padUrlHttps(url))
}

chrome.runtime.onInstalled.addListener(() => {
  log('NaiveTab installed')
})

// ── Content Script 消息监听 ───────────────────────────────────────────────
// Content Script 通过 chrome.runtime.sendMessage 与 Background 通信
// 两种消息类型：
// 1. NAIVETAB_GET_GLOBAL_SHORTCUT_CONFIG → 返回当前缓存的快捷键配置（同步响应）
// 2. NAIVETAB_OPEN_GLOBAL_SHORTCUT → 通知 Background 打开指定 URL（单向通知）
//
// ⚠️ 注意：GET 消息使用 return true 保持通道开放，但实际 sendResponse 是同步调用。
// return true 是防御性写法，防止未来改为异步响应时消息通道被关闭。

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // 获取全局快捷键配置
  if (message.type === 'NAIVETAB_GET_GLOBAL_SHORTCUT_CONFIG') {
    debug('handling GET_GLOBAL_SHORTCUT_CONFIG')
    sendResponse({
      isEnabled: cachedKeyboardConfig.isListenBackgroundKeystrokes ?? false,
      globalShortcutModifier: cachedKeyboardConfig.globalShortcutModifier ?? '',
      keymap: cachedKeyboardConfig.keymap ?? {},
    })
    return true // 保持消息通道开放
  }

  // 打开全局快捷键 URL
  if (message.type === 'NAIVETAB_OPEN_GLOBAL_SHORTCUT') {
    debug('handling OPEN_GLOBAL_SHORTCUT, url:', message.url)
    openGlobalShortcut(message.url)
    gaProxy('press', ['global-shortcut', 'openPage'], {})
  }
})

addEventListener('unhandledrejection', async (event) => {
  gaProxy('error', ['unhandledrejection'], {
    event: JSON.stringify(event),
  })
})
