/**
 * Background 配置缓存模块
 *
 * Service Worker 无法使用 Vue 响应式状态，采用缓存模式：
 * 启动时读取一次配置到内存，后续通过 chrome.storage.onChanged 自动更新缓存。
 * 按键事件直读缓存（~0ms 响应），无需每次读取 storage + 解压。
 */
import { WIDGET_CONFIG } from '@/newtab/widgets/keyboard/config'
import { COMMAND_SHORTCUT_CONFIG } from '@/logic/globalShortcut/shortcut-command'
import { log } from '@/logic/util'
import { parseStoredData } from '@/logic/compress'

const CONFIG_LOAD_TIMEOUT_MS = 5000

// ── Keyboard 配置缓存 ─────────────────────────────────────────────────────

let cachedKeyboardConfig = JSON.parse(JSON.stringify(WIDGET_CONFIG)) as typeof WIDGET_CONFIG
cachedKeyboardConfig.keymap = {}

let configLoadingPromise: Promise<void> | null = null

// ── Command Shortcut 配置缓存 ──────────────────────────────────────────────

let cachedCommandShortcutConfig = JSON.parse(JSON.stringify(COMMAND_SHORTCUT_CONFIG)) as typeof COMMAND_SHORTCUT_CONFIG
cachedCommandShortcutConfig.keymap = {}

let commandConfigLoadingPromise: Promise<void> | null = null

// ── 监听配置变化，自动更新缓存 ─────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes) => {
  const promises: Promise<void>[] = []

  if (changes['naive-tab-keyboard']) {
    const raw = changes['naive-tab-keyboard'].newValue as string
    if (raw && raw.length > 0) {
      const p = parseStoredData(raw).then((parsed) => {
        cachedKeyboardConfig = parsed.data
        log('Keyboard config updated')
      }).catch((e) => {
        log('Update keyboard cache error', e)
      })
      promises.push(p)
    } else {
      cachedKeyboardConfig = JSON.parse(JSON.stringify(WIDGET_CONFIG))
      cachedKeyboardConfig.keymap = {}
      log('Keyboard config removed, reset to defaults')
    }
  }

  if (changes['naive-tab-commandShortcut']) {
    const raw = changes['naive-tab-commandShortcut'].newValue as string
    if (raw && raw.length > 0) {
      const p = parseStoredData(raw).then((parsed) => {
        cachedCommandShortcutConfig = parsed.data
        log('Command shortcut config updated')
      }).catch((e) => {
        log('Update command shortcut cache error', e)
      })
      promises.push(p)
    } else {
      cachedCommandShortcutConfig = JSON.parse(JSON.stringify(COMMAND_SHORTCUT_CONFIG))
      cachedCommandShortcutConfig.keymap = {}
      log('Command shortcut config removed, reset to defaults')
    }
  }

  if (promises.length > 0) {
    return Promise.all(promises).then(() => undefined)
  }
})

// ── 加载并缓存 keyboard 配置 ──────────────────────────────────────────────

export const loadAndCacheKeyboardConfig = (): Promise<void> => {
  if (configLoadingPromise) {
    return configLoadingPromise
  }
  configLoadingPromise = (async () => {
    let timeoutTimer: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutTimer = setTimeout(() => reject(new Error('Load keyboard config timeout')), CONFIG_LOAD_TIMEOUT_MS)
    })

    try {
      await Promise.race([
        chrome.storage.sync.get('naive-tab-keyboard').then(async (data) => {
          const raw = data['naive-tab-keyboard'] as string
          if (raw && raw.length > 0) {
            const parsed = await parseStoredData(raw)
            cachedKeyboardConfig = parsed.data
            log('Keyboard config cached')
          } else {
            log('No keyboard config in storage, using defaults')
          }
        }),
        timeoutPromise,
      ])
    } catch (e) {
      log('Load keyboard config error', e)
    } finally {
      clearTimeout(timeoutTimer!)
      configLoadingPromise = null
    }
  })()
  return configLoadingPromise
}

// ── 加载并缓存 command 配置 ───────────────────────────────────────────────

export const loadAndCacheCommandConfig = (): Promise<void> => {
  if (commandConfigLoadingPromise) {
    return commandConfigLoadingPromise
  }
  commandConfigLoadingPromise = (async () => {
    let timeoutTimer: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutTimer = setTimeout(() => reject(new Error('Load command shortcut config timeout')), CONFIG_LOAD_TIMEOUT_MS)
    })

    try {
      await Promise.race([
        chrome.storage.sync.get('naive-tab-commandShortcut').then(async (data) => {
          const raw = data['naive-tab-commandShortcut'] as string
          if (raw && raw.length > 0) {
            const parsed = await parseStoredData(raw)
            cachedCommandShortcutConfig = parsed.data
            log('Command shortcut config cached')
          } else {
            log('No command shortcut config in storage, using defaults')
          }
        }),
        timeoutPromise,
      ])
    } catch (e) {
      log('Load command shortcut config error', e)
    } finally {
      clearTimeout(timeoutTimer!)
      commandConfigLoadingPromise = null
    }
  })()
  return commandConfigLoadingPromise
}

// ── 读取缓存（供外部调用） ─────────────────────────────────────────────────

export const getCachedKeyboardConfig = () => cachedKeyboardConfig
export const getCachedCommandShortcutConfig = () => cachedCommandShortcutConfig
