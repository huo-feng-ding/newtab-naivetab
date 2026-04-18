/**
 * 全局命令快捷键 Port 连接（newtab 页面专用）
 *
 * Content Script 不会注入扩展页面（chrome-extension://），
 * 所以 newtab 页面需要通过 addKeydownTask 注册自己的快捷键处理，
 * 通过共享 Port 将按键事件发送到 Service Worker 统一处理。
 *
 * 同时监听 SW 回传的 NAIVETAB_EXECUTE_COMMAND（CS 命令在 newtab 中的执行器），
 * 保持与 Content Script 端的能力一致。
 */
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { matchShortcut } from '@/logic/globalShortcut/shortcut-utils'
import { localConfig } from '@/logic/store'
import { getSharedPort } from '@/logic/globalShortcut/shortcut-utils'

/**
 * 全局命令快捷键 keydown 处理
 *
 * 匹配修饰键后将按键事件通过共享 Port 发送到 SW，由 SW 查 command keymap 并分发执行。
 * 前置校验复用 matchShortcut（输入元素过滤、URL 黑名单、修饰键匹配、白名单）。
 *
 * 双重输入元素保护：
 * - 第一层：globalState.isInputFocused（Vue 响应式，task.ts startKeydown 上游屏蔽）
 * - 第二层：isInInputElement()（直接检测 activeElement，防止 Vue 状态遗漏）
 */
const globalShortcutForCommandTask = (e: KeyboardEvent) => {
  const config = localConfig.commandShortcut
  const code = matchShortcut(
    e,
    config.isEnabled,
    config.modifiers,
    config.shortcutInInputElement,
    config.urlBlacklist,
    location.hostname,
  )
  if (!code) return

  try {
    getSharedPort().postMessage({
      type: 'NAIVETAB_KEYDOWN',
      key: code,
      source: 'command',
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
 * newtab 端 CS 命令执行器
 * 处理 CS_COMMANDS 中可在扩展页面执行的命令。
 *
 * scrollUp / scrollDown / scrollToTop / scrollToBottom 未在此实现，
 * 因为 newtab 页面（chrome-extension:// 协议）无可滚动内容，
 * 这些命令在 newtab 中被 setupPortCommandListener 静默忽略，符合预期。
 */
const newtabCommandExecutors: Record<string, () => void> = {
  reloadPage: () => location.reload(),
  copyPageUrl: () => {
    navigator.clipboard.writeText(location.href).then(() => {
      window.$message.success(window.$t('commandShortcut.toast.copyPageUrl'))
    }).catch(() => {})
  },
  copyPageTitle: () => {
    navigator.clipboard.writeText(document.title).then(() => {
      window.$message.success(window.$t('commandShortcut.toast.copyPageTitle'))
    }).catch(() => {})
  },
}

/**
 * 注册共享 Port 的 CS 命令回传监听（newtab 端）
 *
 * Port 是书签/命令快捷键共享的，此函数可能被多次调用，
 * addListener 是幂等追加的，不会覆盖已有监听器。
 */
const setupPortCommandListener = () => {
  const port = getSharedPort()
  port.onMessage.addListener((msg: GlobalShortcutCommandMessage) => {
    if (msg.type === 'NAIVETAB_EXECUTE_COMMAND') {
      const executor = newtabCommandExecutors[msg.command]
      if (executor) {
        executor()
      }
      // 未在 newtabCommandExecutors 中的命令（如 scrollUp）静默忽略
    }
  })
}

/**
 * 在 newtab 中启用全局命令快捷键监听
 */
export const setupNewtabGlobalShortcutForCommand = () => {
  addKeydownTask('globalShortcutForCommand', globalShortcutForCommandTask)
  setupPortCommandListener()
}

/**
 * 在 newtab 中移除全局命令快捷键监听
 *
 * 注意：浏览器新标签页关闭时不会触发 Vue onUnmounted，整个 JS 环境直接销毁，
 * 此函数在实际运行中几乎不会被调用。仅在开发 HMR / 扩展热重载时生效。
 * 属于防御性清理代码，无害。
 */
export const cleanupNewtabGlobalShortcutForCommand = () => {
  removeKeydownTask('globalShortcutForCommand')
}
