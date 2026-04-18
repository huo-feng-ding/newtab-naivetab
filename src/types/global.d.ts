/// <reference types="vite/client" />
/// <reference types="user-agent-data-types" />
// window.navigator

declare const __DEV__: boolean
declare const __NAME__: string //  Extension name, defined in packageJson.name

interface Window {
  appVersion: string
  __naivetabDebug: boolean
  /**
   * Content Script 初始化标志（涵盖书签快捷键 + 命令快捷键两类功能的完整初始化）
   */
  __naivetabGlobalShortcutInit: boolean
  $t: (key: string) => string
  $message: MessageApiInjection
  $notification: NotificationApiInjection
  $dialog: DialogApiInjection
  $loadingBar: LoadingBarApiInjection
}

type WidgetCodes = import('@/newtab/widgets/codes').WidgetCodes
type ConfigField = WidgetCodes | 'general' | 'commandShortcut'
type EleTargetCode = WidgetCodes | 'draft-common'
type EleTargetType = 'widget' | 'draft'

type settingPanes = 'general' | 'focusMode' | 'keyboard' | 'bookmarkFolder' | 'clockDate' | 'calendar' | 'yearProgress' | 'countdown' | 'search' | 'weather' | 'memo' | 'news' | 'aboutIndex' | 'aboutSponsor' | 'commandShortcut'

type KeydownTaskKey = 'draft-tool' | 'keyboard' | 'bookmarkFolder' | 'globalShortcutForBookmark' | 'globalShortcutForCommand'

type DatabaseHandleType = 'add' | 'put' | 'get' | 'delete'
type DatabaseStore = 'localBackgroundImages' | 'currBackgroundImages'

type DatabaseLocalBackgroundImages = {
  appearanceCode: number
  file: File
  smallBase64: string
}

type OptionsPermission = 'bookmarks'

type Placement = 'top-start' | 'top' | 'top-end' | 'right-start' | 'right' | 'right-end' | 'bottom-start' | 'bottom' | 'bottom-end' | 'left-start' | 'left' | 'left-end'

type TDrawerPlacement = 'top' | 'bottom' | 'left' | 'right'
type TPageFocusElement = 'default' | 'root' | 'search' | 'memo' | 'keyboard'

interface SelectStringItem {
  label: string
  value: string
}

/**
 * 同步数据结构
 * ⚠️ 重要：appVersion 字段用于版本感知合并策略，确保多设备多版本场景下配置兼容性
 */
interface SyncPayload {
  syncTime: number
  syncId: string // md5
  appVersion: string // 生成该数据的客户端版本
  data: any
}

/**
 * Content Script 发送消息，请求 SW 打开特殊 URL（chrome:// 等）
 */
interface CSOpenUrlMessage {
  type: 'NAIVETAB_OPEN_URL'
  url: string
}

/**
 * Content Script / newtab 页面通过 Port 发送的按键消息
 * source 区分来源：bookmark（书签快捷键） / command（命令快捷键）
 */
interface GlobalShortcutKeydownMessage {
  type: 'NAIVETAB_KEYDOWN'
  key: string
  source: 'bookmark' | 'command'
}

/**
 * Service Worker 通过 Port 回传的命令消息（仅 command shortcut 使用）
 * 用于 SW → CS 回传需要 DOM 操作的命令
 */
interface GlobalShortcutCommandMessage {
  type: 'NAIVETAB_EXECUTE_COMMAND'
  command: string
}

type ContentScriptToBackgroundMessage = CSOpenUrlMessage
