// NaiveTab global shortcut Content Script
//
// Port 长连接架构：
// - CS 采集按键 -> 修饰键匹配 -> Port.postMessage 发送到 SW
// - SW 查 keymap -> chrome.tabs.create 打开 URL
// - Port 连接保持 SW 活跃，消除快捷键冷启动延迟
//
// 注入范围：*://*/*（仅 HTTP/HTTPS 页面，不注入 chrome-extension:// 等新标签页）
// 注入时机：document_start（DOM 构建前即可拦截按键）
// 注册方式：background/main.ts 动态注册（chrome.scripting.registerContentScripts）
//
// 配置同步：
// - chrome.storage.onChanged 监听配置变化，更新本地修饰键和启用状态
// - 首次加载直接从 chrome.storage.sync 读取初始配置（~5-20ms）
//
// 生命周期：
// - 无 onUnmounted 清理，页面导航/关闭时整个 JS 环境自动销毁
// - Port 断开后 1s 自动重连
//
import { matchShortcut, toModifierMask, type TShortcutModifier } from '@/logic/globalShortcut/shortcut-utils'
import { parseStoredData } from '@/logic/compress'
import type { TCommandEntry } from '@/logic/globalShortcut/shortcut-command'
import { showToast, t } from './toast'

// -- 调试日志 --
const debug = (...args: any[]) => {
  if (__DEV__ || (typeof window !== 'undefined' && (window as any).__naivetabDebug)) {
    console.log('[NaiveTab-cs]', ...args)
  }
}

// -- 初始化入口 --
const initMain = () => {
  // 防止重复注入（Service Worker 回收重建、extension reload 等边界场景）
  // Content Script 通过 chrome.scripting.registerContentScripts 动态注册，
  // runAt: 'document_start' 确保在 DOM 构建前注入。
  // 在极少数情况下（如 SW 休眠后唤醒、扩展热重载），同一页面可能被注入多次，
  // 此 guard 确保只执行一次初始化逻辑。
  if (window.__naivetabGlobalShortcutInit) {
    debug('Already initialized, skipping')
    return
  }
  window.__naivetabGlobalShortcutInit = true

  // -- 运行时状态 --
  let keymap: Record<string, TBookmarkEntry> = {}
  let isEnabled = false
  let globalShortcutModifiers: TShortcutModifier[] = []
  let shortcutInInputElement = false
  let urlBlacklist: string[] = []

  // -- 命令快捷键运行时状态 --
  let commandKeymap: Record<string, TCommandEntry> = {}
  let commandIsEnabled = false
  let commandModifiers: TShortcutModifier[] = []
  let commandShortcutInInputElement = false
  let commandUrlBlacklist: string[] = []

  /**
   * 更新本地配置缓存（书签快捷键）
   */
  const updateConfig = (cfg: {
    isEnabled?: boolean
    globalShortcutModifiers?: TShortcutModifier[]
    shortcutInInputElement?: boolean
    keymap?: Record<string, TBookmarkEntry>
    urlBlacklist?: string[]
  }) => {
    if (cfg.isEnabled !== undefined) isEnabled = cfg.isEnabled
    if (cfg.globalShortcutModifiers !== undefined) globalShortcutModifiers = cfg.globalShortcutModifiers
    if (cfg.shortcutInInputElement !== undefined) shortcutInInputElement = cfg.shortcutInInputElement
    if (cfg.keymap !== undefined) keymap = cfg.keymap
    if (cfg.urlBlacklist !== undefined) urlBlacklist = cfg.urlBlacklist
    debug('bookmark config updated', { isEnabled, globalShortcutModifiers, keymapCount: Object.keys(keymap).length })
  }

  /**
   * 更新命令快捷键本地配置缓存
   */
  const updateCommandConfig = (cfg: {
    isEnabled?: boolean
    modifiers?: TShortcutModifier[]
    shortcutInInputElement?: boolean
    keymap?: Record<string, TCommandEntry>
    urlBlacklist?: string[]
  }) => {
    if (cfg.isEnabled !== undefined) commandIsEnabled = cfg.isEnabled
    if (cfg.modifiers !== undefined) commandModifiers = cfg.modifiers
    if (cfg.shortcutInInputElement !== undefined) commandShortcutInInputElement = cfg.shortcutInInputElement
    if (cfg.keymap !== undefined) commandKeymap = cfg.keymap
    if (cfg.urlBlacklist !== undefined) commandUrlBlacklist = cfg.urlBlacklist
    debug('command config updated', { isEnabled: commandIsEnabled, modifiers: commandModifiers, keymapCount: Object.keys(commandKeymap).length })
  }

  /**
   * 直接从 chrome.storage.sync 读取初始配置（书签快捷键 + 命令快捷键）
   *
   * chrome.storage API 在 Content Script 中可用（manifest 已有 storage 权限），
   * 读取响应 ~5-20ms，无需唤醒 Service Worker。
   * 如果读取失败或配置为空，保持禁用状态直到 storage.onChanged 触发更新。
   */
  const loadConfig = async () => {
    // 加载书签快捷键配置
    try {
      const keyboardData = await chrome.storage.sync.get('naive-tab-keyboard')
      const raw = keyboardData['naive-tab-keyboard'] as string | undefined
      if (raw) {
        const parsed = await parseStoredData(raw)
        updateConfig({
          isEnabled: parsed.data.isGlobalShortcutEnabled ?? false,
          globalShortcutModifiers: parsed.data.globalShortcutModifiers ?? [],
          shortcutInInputElement: parsed.data.shortcutInInputElement ?? false,
          keymap: parsed.data.keymap ?? {},
          urlBlacklist: parsed.data.urlBlacklist ?? [],
        })
        debug('bookmark config loaded from storage', { isEnabled, globalShortcutModifiers, keymapCount: Object.keys(keymap).length })
      } else {
        debug('No keyboard config in storage, keeping shortcuts disabled')
      }
    } catch (e) {
      debug('read/parse keyboard storage error', e)
    }

    // 加载命令快捷键配置
    try {
      const commandData = await chrome.storage.sync.get('naive-tab-commandShortcut')
      const raw = commandData['naive-tab-commandShortcut'] as string | undefined
      if (raw) {
        const parsed = await parseStoredData(raw)
        updateCommandConfig({
          isEnabled: parsed.data.isEnabled ?? false,
          modifiers: parsed.data.modifiers ?? [],
          shortcutInInputElement: parsed.data.shortcutInInputElement ?? false,
          keymap: parsed.data.keymap ?? {},
          urlBlacklist: parsed.data.urlBlacklist ?? [],
        })
        debug('command config loaded from storage', { isEnabled: commandIsEnabled, modifiers: commandModifiers, keymapCount: Object.keys(commandKeymap).length })
      } else {
        debug('No commandShortcut config in storage, keeping command shortcuts disabled')
      }
    } catch (e) {
      debug('read/parse commandShortcut storage error', e)
    }
  }

  /**
   * 监听 chrome.storage.onChanged，自动同步配置更新（书签快捷键 + 命令快捷键）
   *
   * Content Script 直接监听 storage 变化，解析后更新本地 keymap 缓存。
   * parseStoredData 自动处理 gzip 压缩数据（>4000 字节时压缩）。
   * 监听器无需清理：页面导航/关闭时 JS 环境销毁，自动回收。
   */
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return

    // 书签快捷键配置变化
    const keyboardRaw = changes['naive-tab-keyboard']?.newValue as string | undefined
    if (keyboardRaw) {
      parseStoredData(keyboardRaw).then((parsed) => {
        updateConfig({
          isEnabled: parsed.data.isGlobalShortcutEnabled ?? false,
          globalShortcutModifiers: parsed.data.globalShortcutModifiers ?? [],
          shortcutInInputElement: parsed.data.shortcutInInputElement ?? false,
          keymap: parsed.data.keymap ?? {},
          urlBlacklist: parsed.data.urlBlacklist ?? [],
        })
      }).catch((e) => {
        debug('parse keyboard storage error', e)
      })
    } else if (changes['naive-tab-keyboard']) {
      // 配置被删除，重置为默认状态
      updateConfig({
        isEnabled: false,
        globalShortcutModifiers: [],
        shortcutInInputElement: false,
        keymap: {},
        urlBlacklist: [],
      })
      debug('bookmark config removed, reset to defaults')
    }

    // 命令快捷键配置变化
    const commandRaw = changes['naive-tab-commandShortcut']?.newValue as string | undefined
    if (commandRaw) {
      parseStoredData(commandRaw).then((parsed) => {
        updateCommandConfig({
          isEnabled: parsed.data.isEnabled ?? false,
          modifiers: parsed.data.modifiers ?? [],
          shortcutInInputElement: parsed.data.shortcutInInputElement ?? false,
          keymap: parsed.data.keymap ?? {},
          urlBlacklist: parsed.data.urlBlacklist ?? [],
        })
      }).catch((e) => {
        debug('parse command storage error', e)
      })
    } else if (changes['naive-tab-commandShortcut']) {
      // 配置被删除，重置为默认状态
      updateCommandConfig({
        isEnabled: false,
        modifiers: [],
        shortcutInInputElement: false,
        keymap: {},
        urlBlacklist: [],
      })
      debug('command config removed, reset to defaults')
    }
  })

  // -- Port 长连接 --
  /**
   * Port 连接到 SW，用于发送按键事件。
   * Port 保持 SW 活跃，消除快捷键冷启动延迟。
   * 断连后 1s 自动重连。
   *
   * 双向通信：
   * - CS → SW：发送按键事件（NAIVETAB_KEYDOWN）
   * - SW → CS：回传需要 DOM 执行的命令（NAIVETAB_EXECUTE_COMMAND）
   */
  let port: chrome.runtime.Port | null = null

  /**
   * 查找页面上真正的滚动容器
   * 算法灵感来自 Vimium C (github.com/gdh1995/vimium-c) 的 findScrollable，
   * 优先返回 document.scrollingElement，如果它不可滚动则遍历 DOM 查找
   */
  const findScrollContainer = (): Element => {
    const scrollingEl = document.scrollingElement ?? document.documentElement
    // 如果 scrollingElement 本身有滚动空间，直接返回
    if (scrollingEl.scrollHeight > scrollingEl.clientHeight + 1) {
      return scrollingEl
    }

    // 从视口中心元素出发，向上查找有 overflow 且可滚动的祖先
    const centerEl = document.elementFromPoint(
      window.innerWidth / 2,
      window.innerHeight / 2,
    )
    if (centerEl) {
      let cur: Element | null = centerEl
      while (cur) {
        const style = window.getComputedStyle(cur)
        const overflowY = style.overflowY
        if (
          (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
          && cur.scrollHeight > cur.clientHeight + 1
        ) {
          return cur
        }
        cur = cur.parentElement
      }
    }

    // 兜底：遍历所有子元素，找面积最大的可见可滚动容器
    let best: Element | null = null
    let bestArea = 0
    const walk = (el: Element) => {
      try {
        const style = window.getComputedStyle(el)
        const overflowY = style.overflowY
        if (
          (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
          && el.scrollHeight > el.clientHeight + 1
        ) {
          const rect = el.getBoundingClientRect()
          const area = rect.width * rect.height
          if (area > bestArea && rect.width > 100 && rect.height > 100) {
            bestArea = area
            best = el
          }
        }
      } catch { /* cross-origin 等异常情况 */ }
      for (const child of el.children) {
        walk(child)
      }
    }
    // 只遍历 body 下的直接子树，避免全 DOM 遍历太慢
    if (document.body) {
      for (const child of document.body.children) {
        walk(child)
      }
    }
    return best ?? scrollingEl
  }

  /** 缓存上次找到的滚动容器，提升后续调用性能 */
  let cachedScrollContainer: Element | null = null

  /**
   * 获取当前滚动容器（优先返回缓存，失效时重新查找）
   */
  const getScrollContainer = (): Element => {
    return cachedScrollContainer ?? (cachedScrollContainer = findScrollContainer())
  }

  /**
   * 使滚动容器缓存失效（在 DOM 结构变化或用户手动滚动后调用）
   */
  const invalidateScrollCache = () => {
    cachedScrollContainer = null
  }

  // 滚动结束后自动失效缓存，下次滚动时重新查找容器
  // scrollend 事件：Chrome 77+ / Firefox 115+ / Safari 16+
  document.addEventListener('scrollend', invalidateScrollCache, { capture: true, passive: true })

  // 监听 DOM 变化：当页面结构变化（SPA 导航、动态加载）时使缓存失效
  // 只关注 body 的子树增减和 class/style 属性变化
  const scrollCacheObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList' || m.attributeName === 'class' || m.attributeName === 'style') {
        invalidateScrollCache()
        break
      }
    }
  })
  if (document.body) {
    scrollCacheObserver.observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['class', 'style'] })
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) {
      scrollCacheObserver.observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['class', 'style'] })
    }
  }, { once: true })

  /**
   * 快速平滑滚动辅助函数（200ms，ease-out）
   * 智能查找实际滚动容器，兼容 SPA / 内部滚动容器的页面
   */
  const fastSmoothScrollTo = (targetY: number) => {
    const el = getScrollContainer()
    const startY = el.scrollTop
    const maxScroll = el.scrollHeight - el.clientHeight
    const clampedTarget = Math.max(0, Math.min(targetY, maxScroll))
    const delta = clampedTarget - startY
    if (delta === 0) return
    const duration = 200
    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out: 先快后慢
      const ease = 1 - (1 - progress) ** 3
      el.scrollTop = startY + delta * ease
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  /**
   * CS 端命令执行器
   * 仅处理 execIn='cs' 的命令，需要 DOM 操作
   */
  const commandExecutors: Record<string, () => void> = {
    scrollUp: () => {
      const el = getScrollContainer()
      fastSmoothScrollTo(el.scrollTop - el.clientHeight)
    },
    scrollDown: () => {
      const el = getScrollContainer()
      fastSmoothScrollTo(el.scrollTop + el.clientHeight)
    },
    scrollToTop: () => fastSmoothScrollTo(0),
    scrollToBottom: () => {
      fastSmoothScrollTo(getScrollContainer().scrollHeight)
    },
    reloadPage: () => location.reload(),
    copyPageUrl: () => {
      navigator.clipboard.writeText(location.href).then(() => {
        showToast(t('commandShortcut.toast.copyPageUrl'))
      }).catch(() => {
        fallbackCopyText(location.href)
        showToast(t('commandShortcut.toast.copyPageUrl'))
      })
    },
    copyPageTitle: () => {
      navigator.clipboard.writeText(document.title).then(() => {
        showToast(t('commandShortcut.toast.copyPageTitle'))
      }).catch(() => {
        fallbackCopyText(document.title)
        showToast(t('commandShortcut.toast.copyPageTitle'))
      })
    },
  }

  /**
   * 降级复制方案：当 clipboard API 不可用时使用
   */
  const fallbackCopyText = (text: string) => {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    } catch {
      // 完全失败时静默忽略
    }
  }

  const connectPort = () => {
    try {
      port = chrome.runtime.connect({ name: 'naivetab-shortcut' })
      port.onMessage.addListener((msg: GlobalShortcutCommandMessage) => {
        if (msg.type === 'NAIVETAB_EXECUTE_COMMAND') {
          const executor = commandExecutors[msg.command]
          if (executor) {
            debug('executing CS command:', msg.command)
            executor()
          }
        }
      })
      port.onDisconnect.addListener(() => {
        // Chrome 后退/前进缓存或 Service Worker 休眠会导致 port 异常关闭，
        // chrome.runtime.lastError 此时可能有值，需显式消费避免 "Unchecked runtime.lastError"
        void chrome.runtime.lastError
        port = null
        debug('Port disconnected, scheduling reconnect')
        setTimeout(connectPort, 1000)
      })
      debug('Port connected')
    } catch (e) {
      debug('Port connect failed, retrying in 1s', e)
      setTimeout(connectPort, 1000)
    }
  }

  /**
   * 键盘事件处理
   *
   * 匹配修饰键后，通过 Port 将按键事件发送到 SW 统一处理。
   * SW 负责查 keymap 并分发执行（书签打开 URL / 命令路由到 SW 或 CS）。
   * 使用 capture phase (true) 确保在页面脚本之前捕获事件。
   *
   * 两套快捷键共享同一个 handler，根据匹配的修饰键决定 source：
   * - 匹配书签修饰键 → source: 'bookmark'
   * - 匹配命令修饰键 → source: 'command'
   * - 两者修饰键相同时 → 书签优先（老功能），只发送一条消息，避免双重执行
   */
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.repeat) return

    const hostname = location.hostname

    // 使用 matchShortcut 复用匹配逻辑（内置输入元素 + urlBlacklist 检查）
    const bookmarkCode = matchShortcut(e, isEnabled, globalShortcutModifiers, shortcutInInputElement, urlBlacklist, hostname)
    const commandCode = matchShortcut(e, commandIsEnabled, commandModifiers, commandShortcutInInputElement, commandUrlBlacklist, hostname)

    if (!bookmarkCode && !commandCode) return

    // 修饰键冲突互斥：当书签和命令使用相同修饰键时，只发送书签消息
    // （书签是老功能，优先保留；用户看到 Setting 面板的冲突警告后可自行调整）
    const bmMask = toModifierMask(globalShortcutModifiers)
    const cmdMask = toModifierMask(commandModifiers)
    const hasModifierConflict = bookmarkCode && commandCode && bmMask === cmdMask

    // 通过 Port 发送按键事件到 SW
    let sent = false
    try {
      if (bookmarkCode) {
        port?.postMessage({
          type: 'NAIVETAB_KEYDOWN',
          key: e.code,
          source: 'bookmark',
        })
        sent = true
      }
      if (commandCode && !hasModifierConflict) {
        port?.postMessage({
          type: 'NAIVETAB_KEYDOWN',
          key: e.code,
          source: 'command',
        })
        sent = true
      }
      // 只有在至少一条消息成功发出时才拦截按键，
      // 避免 Port 断开窗口期内用户按键被吞却无任何响应
      if (sent) {
        e.preventDefault()
        e.stopPropagation()
      }
    } catch {
      // Port 异常时静默忽略，重连机制会自动恢复，不拦截按键
    }
  }

  // 初始化
  debug('init')
  loadConfig()
  connectPort()

  // 使用 capture phase 捕获事件，快捷键优先于页面逻辑响应
  document.addEventListener('keydown', handleKeydown, true)
}

initMain()
