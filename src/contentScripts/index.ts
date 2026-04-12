// NaiveTab global shortcut Content Script
//
// 架构说明：
// 1. 此脚本通过 dynamic content script 注册到所有网页（matches: '*://*/*'）
// 2. 从 Background Service Worker 获取 keyboard 配置（isEnabled, globalShortcutModifier, keymap）
// 3. 在网页中监听 keydown 事件（capture phase），匹配修饰键 + 主键后通知 Background 打开 URL
// 4. Background 不直接监听键盘事件，而是依赖 Content Script 转发
//
// 数据流：
//   popup 修改 keymap → chrome.storage.sync.onChanged → Background 更新缓存
//   → pushGlobalShortcutConfigToTabs → Content Script 接收更新 → 快捷键生效
//
// 安全考量：
// - 特殊页面（chrome://、devtools:// 等）不注入
// - 输入框聚焦时不触发快捷键
// - 没有匹配的 URL 时不拦截事件（放行系统快捷键）
//
// ⚠️ 注意：此脚本没有 onUnmounted 清理，但因为是 content script 注入到网页中，
// 页面导航/关闭时整个 JS 环境销毁，无需手动清理。
import { buildModifierString, ALLOWED_MAIN_KEYS } from '@/logic/globalShortcutKey'

type TKeymap = Record<string, TBookmarkEntry>

const ALLOWED_SET = new Set(ALLOWED_MAIN_KEYS)

// ── 调试日志 ──────────────────────────────────────────────────────────────
// 开发环境自动输出，生产环境静默。Chrome 控制台中搜索 [NaiveTab] 过滤。
// 如需在生产环境排查，可在控制台中手动执行：window.__naivetabDebug = true
const debug = (...args: any[]) => {
  if (__DEV__ || (typeof window !== 'undefined' && (window as any).__naivetabDebug)) {
    console.log('[NaiveTab]', ...args)
  }
}

// 排除列表：特殊页面不应注入
const EXCLUDED_PROTOCOLS = ['chrome://', 'chrome-extension://', 'devtools://', 'edge://', 'about:']

// ── 初始化入口 ──────────────────────────────────────────────────────────
// 使用 IIFE 包裹，使 excluded page 可以提前 return，
// 避免监听器注册和配置请求的无效开销。
;(() => {
  if (EXCLUDED_PROTOCOLS.some((p) => location.href.startsWith(p))) {
    debug('Skipped on excluded page')
    return
  }

  // ── 运行时状态 ──────────────────────────────────────────────────────────
  // 由 background 通过 loadConfig() 或 pushGlobalShortcutConfigToTabs() 填充
  // 这些变量是纯 JavaScript 缓存，不涉及 Vue 响应式
  let isEnabled = false
  let globalShortcutModifier = ''
  let keymap: TKeymap = {}

  /**
   * 向 Background 请求初始配置
   *
   * Service Worker 可能处于休眠状态（被浏览器回收），首次 sendMessage 可能失败。
   * 通过最多 3 次指数退避重试（100ms → 200ms → 400ms）确保获取到配置。
   */
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 100

  const loadConfig = (retryCount = 0) => {
    chrome.runtime.sendMessage({ type: 'NAIVETAB_GET_GLOBAL_SHORTCUT_CONFIG' }, (response) => {
      // Service Worker 未就绪时触发错误，延迟后重试
      if (chrome.runtime.lastError) {
        debug(`loadConfig failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, chrome.runtime.lastError.message)
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => loadConfig(retryCount + 1), RETRY_DELAY_MS * Math.pow(2, retryCount))
        }
        return
      }
      if (response) {
        isEnabled = response.isEnabled
        globalShortcutModifier = response.globalShortcutModifier
        keymap = response.keymap
        debug('config loaded', { isEnabled, modifier: globalShortcutModifier, keymapKeys: Object.keys(keymap || {}) })
      }
    })
  }

  /**
   * 接收 Background 推送的配置更新
   *
   * 触发路径：
   *   popup/setting 修改 keymap → chrome.storage.sync.set
   *   → background onChanged 更新缓存 → pushGlobalShortcutConfigToTabs
   *   → chrome.tabs.sendMessage → 此处接收
   *
   * 注意：此监听器不是 return true 类型，因为配置更新是同步处理，
   * 不需要保持消息通道开放。
   */
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'NAIVETAB_UPDATE_GLOBAL_SHORTCUT_CONFIG') {
      debug('config updated', {
        isEnabled: message.isEnabled,
        globalShortcutModifier: message.globalShortcutModifier,
        keymapKeys: Object.keys(message.keymap || {}),
      })
      isEnabled = message.isEnabled
      globalShortcutModifier = message.globalShortcutModifier
      keymap = message.keymap
    }
  })

  /**
   * 键盘事件处理
   *
   * 匹配逻辑（多级提前放行，不匹配的按键零开销）：
   * 1. isEnabled = false → 直接放行（用户关闭了后台监听）
   * 2. 输入元素中 → 放行（避免干扰打字）
   * 3. 修饰键不匹配 globalShortcutModifier → 放行（放行系统快捷键）
   * 4. 主键不在 ALLOWED_MAIN_KEYS 中 → 放行
   * 5. keymap 中没有绑定该键 → 放行
   *
   * 只有上述条件全部不满足且有匹配的 URL 时，才 preventDefault + 通知 Background 打开页面
   *
   * ⚠️ 安全设计：没有绑定 URL 的按键不拦截事件，确保系统快捷键（如 ctrl+shift+tab）正常工作
   * ⚠️ 使用 capture phase (true) 确保在页面脚本之前捕获事件
   */
  const handleKeydown = (e: KeyboardEvent) => {
    // 提前缓存修饰键字符串，避免重复调用 buildModifierString
    const modifierStr = buildModifierString(e)

    debug('keydown', {
      code: e.code,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      isEnabled,
      globalShortcutModifier,
      builtModifier: modifierStr,
      keymapKeys: Object.keys(keymap),
      keymapEntry: keymap[e.code],
    })

    if (!isEnabled) return

    // 输入元素中不触发
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true') {
      return
    }

    // 检查修饰键是否匹配
    if (!modifierStr || !globalShortcutModifier) return
    if (modifierStr !== globalShortcutModifier) return

    // 检查主键是否在允许列表中
    if (!ALLOWED_SET.has(e.code)) return

    // 查找书签，没有绑定时不拦截（放行系统快捷键）
    // 这是安全设计：即使修饰键匹配（如 ctrl+shift），如果没有绑定对应 URL，
    // 也不阻止默认行为，确保系统快捷键（如 ctrl+shift+tab）正常工作
    const entry = keymap[e.code]
    if (!entry || !entry.url) return

    // 确认有匹配的 URL 后才阻止默认行为
    e.preventDefault()
    e.stopPropagation()

    debug('opening URL:', entry.url)
    chrome.runtime.sendMessage({
      type: 'NAIVETAB_OPEN_GLOBAL_SHORTCUT',
      url: entry.url,
    })
  }

  // 初始化
  debug('init', location.href)
  loadConfig()
  document.addEventListener('keydown', handleKeydown, true)
})()
