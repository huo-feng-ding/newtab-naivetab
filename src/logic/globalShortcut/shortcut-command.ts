/**
 * 全局命令快捷键配置 + 定义
 *
 * COMMAND_CATEGORIES 是单一数据源，同时携带命令的执行环境信息。
 * SW_COMMANDS / CS_COMMANDS 从中派生，避免多处声明遗漏。
 *
 * 与 bookmark 共享 Port 通道（name='naivetab-shortcut'），
 * 使用不同的修饰键和独立的 keymap 存储。
 *
 * 注意：这不是一个 Widget，没有视觉组件，仅有 Setting 面板。
 * 因此使用 COMMAND_SHORTCUT_CODE 而非 WIDGET_CODE。
 */

import type { TShortcutModifier } from './shortcut-utils'

/**
 * 命令执行环境
 * - 'sw'：Service Worker 直接执行（Chrome API 操作）
 * - 'cs'：Content Script 执行（DOM 操作，由 SW 回传 EXECUTE_COMMAND）
 * - 'newtab'：NaiveTab 页面本地执行（localConfig / globalState 操作，CS 侧忽略）
 */
export type TCommandExecEnv = 'sw' | 'cs' | 'newtab'

/**
 * keymap 中的命令条目
 */
export interface TCommandEntry {
  /** 命令唯一标识 */
  command: TCommandName
}

/**
 * 分类内命令条目
 * 默认 execEnv = 'sw'，非 SW 命令需要显式标注 execEnv
 */
export interface TCategoryCommand {
  command: TCommandName
  execEnv?: TCommandExecEnv
}

/**
 * 命令分类（单一数据源，用于 Setting 面板分组展示）
 * 非 SW 命令需要显式标注 execEnv（'cs' 或 'newtab'），其余默认 'sw'
 */
export const COMMAND_CATEGORIES = [
  {
    categoryKey: 'commandCategory.naiveTabControl',
    commands: [
      { command: 'toggleFocusMode', execEnv: 'newtab' },
      { command: 'toggleDragMode', execEnv: 'newtab' },
      { command: 'toggleSettingDrawer', execEnv: 'newtab' },
    ] as const,
  },
  {
    categoryKey: 'commandCategory.tabAction',
    commands: [
      'toggleTabPinned', 'duplicateTab', 'closeTab', 'toggleTabMute',
      'reloadAllTabs', 'reloadAllTabsAllWindows', 'newTab', 'closeWindow',
      'nextTab', 'prevTab', 'firstTab', 'lastTab',
      'moveTabLeft', 'moveTabRight', 'moveToNewWindow',
      'newWindow', 'newIncognito', 'newTabAfter',
      'goBack', 'goForward',
      'closeOtherTabs', 'closeLeftTabs', 'closeRightTabs',
      'closeDuplicateTabs', 'mergeAllWindows',
      'moveTabToNextWindow',
      'reopenClosedTab',
    ] as const,
  },
  {
    categoryKey: 'commandCategory.tabGroup',
    commands: [
      'groupCurrentTab', 'ungroupCurrentTab',
      'toggleGroupCollapse', 'closeGroupTabs',
    ] as const,
  },
  {
    categoryKey: 'commandCategory.pageAction',
    commands: [
      { command: 'reloadPage', execEnv: 'cs' },
      { command: 'copyPageUrl', execEnv: 'cs' },
      { command: 'copyPageTitle', execEnv: 'cs' },
    ] as const,
  },
  {
    categoryKey: 'commandCategory.pageScroll',
    commands: [
      { command: 'scrollUp', execEnv: 'cs' },
      { command: 'scrollDown', execEnv: 'cs' },
      { command: 'scrollToTop', execEnv: 'cs' },
      { command: 'scrollToBottom', execEnv: 'cs' },
    ] as const,
  },
] as const

/**
 * 从 COMMAND_CATEGORIES 派生的命令名称联合类型。
 * 覆盖所有字符串命令和对象命令的 command 字段。
 */
export type TCommandName = (typeof COMMAND_CATEGORIES)[number]['commands'][number] extends infer Cmd
  ? Cmd extends string
    ? Cmd
    : Cmd extends { command: string }
      ? Cmd['command']
      : never
  : never

/**
 * CS 命令名称（与 COMMAND_CATEGORIES 中 execEnv: 'cs' 的条目一致）
 * scroll 系列和 copy 系列只能在 content script 中执行。
 */
type TCsCommandName
  = | 'scrollUp' | 'scrollDown' | 'scrollToTop' | 'scrollToBottom'
    | 'reloadPage' | 'copyPageUrl' | 'copyPageTitle'

/**
 * NaiveTab 页面本地命令（与 COMMAND_CATEGORIES 中 execEnv: 'newtab' 的条目一致）
 * 依赖 localConfig / globalState，只能在 newtab 页面执行；CS 侧静默忽略。
 */
export type TNewtabCommandName
  = | 'toggleFocusMode' | 'toggleDragMode' | 'toggleSettingDrawer'

/**
 * SW 命令名称（TCommandName 排除 CS 命令和 newtab 命令）
 */
export type TSwCommandName = Exclude<TCommandName, TCsCommandName | TNewtabCommandName>

/**
 * 从单一数据源派生 CS 命令列表（运行时值）
 */
export const CS_COMMANDS = COMMAND_CATEGORIES.flatMap((c) =>
  c.commands
    .filter((cmd) => typeof cmd === 'object' && 'execEnv' in cmd && cmd.execEnv === 'cs')
    .map((cmd) => (cmd as { command: string }).command),
) as unknown as readonly TCommandName[]

/**
 * NaiveTab 本地命令列表（运行时值）
 */
export const NEWTAB_COMMANDS = COMMAND_CATEGORIES.flatMap((c) =>
  c.commands
    .filter((cmd) => typeof cmd === 'object' && 'execEnv' in cmd && cmd.execEnv === 'newtab')
    .map((cmd) => (cmd as { command: string }).command),
) as unknown as readonly TNewtabCommandName[]

/**
 * 从 SW 命令列表派生运行时值
 */
export const SW_COMMANDS = COMMAND_CATEGORIES.flatMap((c) =>
  c.commands
    .filter((cmd) => {
      if (typeof cmd === 'string') return true
      if (!('execEnv' in cmd)) return true
      return cmd.execEnv !== 'cs' && cmd.execEnv !== 'newtab'
    })
    .map((cmd) => (typeof cmd === 'string' ? cmd : cmd.command)),
) as readonly TSwCommandName[]

/**
 * 从单一数据源派生所有命令名称（用于运行时校验）
 */
const ALL_COMMANDS = COMMAND_CATEGORIES.flatMap((c) =>
  c.commands.map((cmd) => (typeof cmd === 'string' ? cmd : cmd.command)),
)

/**
 * 各执行环境命令实现说明
 *
 * CS 命令（execEnv: 'cs'）：
 *   由 SW 通过 Port 回传 NAIVETAB_EXECUTE_COMMAND，CS 和 NewTab 各自在本地执行器中实现。
 *
 * | 命令            | CS 端实现 | NewTab 端实现 | 差异原因 |
 * |-----------------|-----------|---------------|----------|
 * | scrollUp        | ✅ 滚动容器 | ❌ 忽略       | NewTab 页面无可滚动内容 |
 * | scrollDown      | ✅ 滚动容器 | ❌ 忽略       | 同上 |
 * | scrollToTop     | ✅ 滚动容器 | ❌ 忽略       | 同上 |
 * | scrollToBottom  | ✅ 滚动容器 | ❌ 忽略       | 同上 |
 * | reloadPage      | ✅ location.reload() | ✅ location.reload() | 实现一致 |
 * | copyPageUrl     | ✅ clipboard API + fallback textarea | ✅ clipboard API + $message | CS 端需 fallback 兼容旧环境 |
 * | copyPageTitle   | ✅ clipboard API + fallback textarea | ✅ clipboard API + $message | 同上 |
 *
 * NaiveTab 本地命令（execEnv: 'newtab'）：
 *   由 shortcut-executor.ts 中 newtabControlExecutors 直接执行，不经过 SW。
 *   CS 侧收到此类命令时静默忽略（没有 localConfig，无法执行）。
 *   SW 侧收到此类命令时也静默忽略（防御性保护）。
 *
 * | 命令                 | NewTab 端实现          | CS 端实现 |
 * |----------------------|------------------------|-----------|
 * | toggleFocusMode      | ✅ localConfig 切换    | ❌ 忽略   |
 * | toggleDragMode       | ✅ toggleIsDragMode()  | ❌ 忽略   |
 * | toggleSettingDrawer  | ✅ switchSettingDrawerVisible() | ❌ 忽略 |
 *
 * 新增 CS 命令时，必须在此表追加对应行并在 shortcut-executor.ts 的
 * newtabCommandExecutors 中补充实现（或明确标注忽略）。
 * 新增 newtab 命令时，必须同步更新 newtabControlExecutors 和 TNewtabCommandName。
 */

/**
 * 从命令标识推导执行环境
 * 遍历 COMMAND_CATEGORIES 查找，默认返回 'sw'
 */
export function getCommandExecEnv(command: TCommandName): TCommandExecEnv {
  for (const category of COMMAND_CATEGORIES) {
    for (const cmd of category.commands) {
      if (typeof cmd === 'object' && 'command' in cmd && cmd.command === command) {
        return ('execEnv' in cmd ? cmd.execEnv : null) ?? 'sw'
      }
      if (typeof cmd === 'string' && cmd === command) {
        return 'sw'
      }
    }
  }
  return 'sw'
}

export const COMMAND_SHORTCUT_CODE = 'keyboardCommand'

export const PRESERVE_FIELDS = ['isEnabled', 'modifiers', 'keymap']

export const KEYBOARD_COMMAND_CONFIG = {
  isEnabled: true,
  shortcutInInputElement: true,
  urlBlacklist: [] as string[],
  modifiers: ['shift', 'alt'] as TShortcutModifier[],
  keymap: {
    // 标签页位置
    Digit1: { command: 'firstTab' },
    Digit2: { command: 'lastTab' },
    KeyQ: { command: 'moveTabLeft' },
    KeyE: { command: 'moveTabRight' },
    KeyA: { command: 'prevTab' },
    KeyD: { command: 'nextTab' },
    KeyF: { command: 'moveTabToNextWindow' },
    KeyG: { command: 'moveToNewWindow' },
    KeyH: { command: 'mergeAllWindows' },
    KeyT: { command: 'newTabAfter' },
    // 页面滚动
    KeyW: { command: 'scrollToTop' },
    KeyS: { command: 'scrollToBottom' },
    // 标签页管理
    KeyR: { command: 'reloadAllTabsAllWindows' },
    KeyZ: { command: 'toggleTabPinned' },
    KeyX: { command: 'closeTab' },
    KeyC: { command: 'duplicateTab' },
    // 标签组
    KeyV: { command: 'toggleGroupCollapse' },
    KeyB: { command: 'groupCurrentTab' },
    KeyN: { command: 'ungroupCurrentTab' },
    KeyM: { command: 'closeGroupTabs' },
    // 批量关闭
    KeyJ: { command: 'closeLeftTabs' },
    KeyL: { command: 'closeRightTabs' },
    KeyK: { command: 'closeOtherTabs' },
    KeyP: { command: 'closeDuplicateTabs' },
    // 导航
    ArrowLeft: { command: 'goBack' },
    ArrowRight: { command: 'goForward' },
    // 页面控制
    KeyU: { command: 'copyPageUrl' },
    KeyI: { command: 'copyPageTitle' },
  } as Record<string, TCommandEntry>,
}

export type TCommandShortcutConfig = typeof KEYBOARD_COMMAND_CONFIG

/**
 * 运行时断言：所有在 keymap 中使用的命令必须在 COMMAND_CATEGORIES 中声明
 */
if (__DEV__) {
  const knownCommands = new Set(ALL_COMMANDS)
  const missing = Object.values(KEYBOARD_COMMAND_CONFIG.keymap)
    .map((e) => e.command)
    .filter((cmd) => !knownCommands.has(cmd))
  if (missing.length > 0) {
    console.error('[NaiveTab] Commands used in keymap but missing from COMMAND_CATEGORIES:', missing)
  }
}
