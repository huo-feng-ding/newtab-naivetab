/**
 * 全局书签快捷键 Port 连接（newtab 页面专用）
 *
 * Content Script 不会注入扩展页面（chrome-extension://），
 * 所以 newtab 页面需要通过 addKeydownTask 注册自己的快捷键处理，
 * 通过共享 Port 将按键事件发送到 Service Worker 统一处理。
 *
 * 共享 Port 机制：
 * - 书签快捷键与命令快捷键共用同一个 Port（name='naivetab-shortcut'）
 * - 避免两个独立 Port 连接到 SW 时，SW 的 portMap[tabId] 被后连接的覆盖
 * - 共享 Port 在 shortcut-utils.ts 的 getSharedPort() 中管理
 *
 * 架构约束：
 * - 冲突防护：contentScripts/index.ts 有 hasModifierConflict 拦截，
 *   newtab 端依赖修饰键天然不同（书签 alt, 命令 shift+alt），
 *   如果用户手动改成相同修饰键，newtab 端会发送两条 keydown 到 SW
 * - SW 冷启动 fallback：Port 异常时弹出 toast 提示用户稍后重试（不拦截按键）
 * - 详见 docs/architecture/messaging.md
 */
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { matchShortcut, isSwReady } from '@/logic/globalShortcut/shortcut-utils'
import { localConfig } from '@/logic/store'
import { getSharedPort } from '@/logic/globalShortcut/shortcut-utils'
import { MSG_KEYDOWN } from '@/types/messages'

/**
 * 全局书签快捷键 keydown 处理
 *
 * 匹配修饰键后将按键事件通过共享 Port 发送到 SW，由 SW 查 keymap 并打开 URL。
 * 前置校验复用 matchShortcut（输入元素过滤、URL 黑名单、修饰键匹配、白名单）。
 *
 * SW 就绪防护：
 * - 通过 isSwReady() 检查 SW 初始化是否完成
 * - 未就绪时弹出 toast 提示，不发送消息，不拦截按键
 * - 与命令快捷键共享同一就绪状态
 *
 * 注意：isInInputElement() 检查由 matchShortcut 统一处理，
 * newtab 页面在 task.ts 的 startKeydown 中通过 isInputFocused 在更上游也有屏蔽，
 * 双重保护确保输入时不会误触发。
 */
const globalShortcutForBookmarkTask = (e: KeyboardEvent) => {
  const keyboardBookmark = localConfig.keyboardBookmark
  const code = matchShortcut(
    e,
    keyboardBookmark.isGlobalShortcutEnabled,
    keyboardBookmark.globalShortcutModifiers,
    keyboardBookmark.shortcutInInputElement,
    keyboardBookmark.urlBlacklist,
    location.hostname,
  )
  if (!code) return

  if (!isSwReady()) {
    window.$message?.warning(window.$t('common.swInitializing'))
    return false
  }

  try {
    getSharedPort().postMessage({
      type: MSG_KEYDOWN,
      key: code,
      source: 'bookmark',
    })
    // 拦截按键，阻止默认行为和事件冒泡
    e.preventDefault()
    e.stopPropagation()
    return true
  } catch {
    // Port 异常时不返回 true，允许事件继续传递
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
