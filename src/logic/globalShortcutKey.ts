/**
 * 全局快捷键组合键工具函数
 *
 * 组合键格式: "{modifier}+...+{mainKeyCode}" (全小写)
 * 示例: "ctrl+shift+keyk", "alt+digit1", "meta+keya"
 *
 * 修饰键顺序: ctrl → shift → alt → meta
 * 必须至少包含一个修饰键
 */

import { isMacOS } from '@/env'

/**
 * 允许作为主键的 event.code 列表
 * 包含字母、数字、符号、数字小键盘、功能键、导航键
 */
export const ALLOWED_MAIN_KEYS = [
  // 字母
  'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ',
  'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT',
  'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ',
  // 数字
  'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
  // 符号
  'Comma', 'Period', 'Slash', 'Minus', 'Equal',
  'BracketLeft', 'BracketRight', 'Semicolon', 'Quote', 'Backquote', 'IntlBackslash',
  // 数字小键盘
  'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5',
  'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
  'NumpadDecimal', 'NumpadEnter',
  'NumpadAdd', 'NumpadSubtract', 'NumpadMultiply', 'NumpadDivide',
  // 功能键
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  // 导航键
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete',
]

/**
 * 格式化修饰键字符串为可读形式（不含主键）
 * "ctrl+shift" → "Ctrl+Shift" (Windows) / "Ctrl+Opt" (Mac)
 */
export function formatModifierOnly(modifier: string): string {
  if (!modifier) return ''
  const isMac = isMacOS

  const MODIFIER_LABEL_MAP: Record<string, string> = isMac
    ? { ctrl: 'Ctrl', shift: 'Shift', alt: 'Opt', meta: 'Cmd' }
    : { ctrl: 'Ctrl', shift: 'Shift', alt: 'Alt', meta: 'Win' }

  return modifier.split('+').map((part) => MODIFIER_LABEL_MAP[part] || part).join(' + ')
}

/**
 * 从 KeyboardEvent 提取当前修饰键字符串
 * 例: e.ctrlKey=true, e.shiftKey=true → "ctrl+shift"
 * 没有修饰键时返回空字符串
 *
 * 此函数被 contentScripts/index.ts 用于判断按键是否与配置的修饰键匹配。
 * 顺序固定为 ctrl → shift → alt → meta。
 */
export function buildModifierString(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('ctrl')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  if (e.metaKey) parts.push('meta')
  return parts.join('+')
}
