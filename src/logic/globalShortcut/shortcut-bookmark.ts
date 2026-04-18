/**
 * 全局书签快捷键 Port 连接（newtab 页面专用）
 *
 * Content Script 不会注入扩展页面（chrome-extension://），
 * 所以 newtab 页面需要通过 addKeydownTask 注册自己的快捷键处理，
 * 通过共享 Port 将按键事件发送到 Service Worker 统一处理。
 */
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { matchShortcut } from '@/logic/globalShortcut/shortcut-utils'
import { localConfig } from '@/logic/store'
import { getSharedPort } from '@/logic/globalShortcut/shortcut-utils'

/**
 * 全局书签快捷键 keydown 处理
 *
 * 匹配修饰键后将按键事件通过共享 Port 发送到 SW，由 SW 查 keymap 并打开 URL。
 * 前置校验复用 matchShortcut（输入元素过滤、URL 黑名单、修饰键匹配、白名单）。
 *
 * 注意：isInInputElement() 检查由 matchShortcut 统一处理，
 * newtab 页面在 task.ts 的 startKeydown 中通过 isInputFocused 在更上游也有屏蔽，
 * 双重保护确保输入时不会误触发。
 */
const globalShortcutForBookmarkTask = (e: KeyboardEvent) => {
  const keyboard = localConfig.keyboard
  const code = matchShortcut(
    e,
    keyboard.isGlobalShortcutEnabled,
    keyboard.globalShortcutModifiers,
    keyboard.shortcutInInputElement,
    keyboard.urlBlacklist,
    location.hostname,
  )
  if (!code) return

  try {
    getSharedPort().postMessage({
      type: 'NAIVETAB_KEYDOWN',
      key: code,
      source: 'bookmark',
    })
    // 拦截按键，阻止默认行为和事件冒泡
    e.preventDefault()
    e.stopPropagation()
    return true
  } catch {
    // Port 连接异常时不返回 true，允许事件继续传递给其他 handler 或浏览器默认行为
    return false
  }
}

/**
 * 在 newtab 中启用全局书签快捷键监听
 */
export const setupNewtabGlobalShortcutForBookmark = () => {
  addKeydownTask('globalShortcutForBookmark', globalShortcutForBookmarkTask)
}

/**
 * 在 newtab 中移除全局书签快捷键监听
 *
 * 注意：浏览器新标签页关闭时不会触发 Vue onUnmounted，整个 JS 环境直接销毁，
 * 此函数在实际运行中几乎不会被调用。仅在开发 HMR / 扩展热重载时生效。
 * 属于防御性清理代码，无害。
 */
export const cleanupNewtabGlobalShortcutForBookmark = () => {
  removeKeydownTask('globalShortcutForBookmark')
}
