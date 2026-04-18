/**
 * 全局快捷键模块统一导出
 */

// 工具函数
export {
  isUrlInBlacklist,
  ALLOWED_MAIN_KEYS,
  ALLOWED_SET,
  MODIFIER_BIT,
  toModifierMask,
  buildModifierKeys,
  formatModifierKeys,
  isInInputElement,
  matchShortcut,
  getSharedPort,
} from './shortcut-utils'

// 命令快捷键配置 + 定义
export {
  COMMAND_CATEGORIES,
  CS_COMMANDS,
  getCommandExecEnv,
  COMMAND_SHORTCUT_CODE,
  PRESERVE_FIELDS,
  COMMAND_SHORTCUT_CONFIG,
} from './shortcut-command'
export type { TCommandExecEnv, TCommandEntry, TCategoryCommand, TCommandShortcutConfig } from './shortcut-command'

// 命令快捷键任务管理（newtab 页面）
export {
  setupNewtabGlobalShortcutForCommand,
  cleanupNewtabGlobalShortcutForCommand,
} from './shortcut-executor'

// 书签快捷键任务管理（newtab 页面）
export {
  setupNewtabGlobalShortcutForBookmark,
  cleanupNewtabGlobalShortcutForBookmark,
} from './shortcut-bookmark'
