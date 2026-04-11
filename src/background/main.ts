// ! background Cannot use import statement outside a module
// import browser from 'webextension-polyfill'
import { WIDGET_CONFIG } from '~/newtab/widgets/keyboard/config'
import { log, createTab, padUrlHttps } from '@/logic/util'
import { parseStoredData } from '@/logic/compress'
import { gaProxy } from '@/logic/gtag'
import { ALL_COMMAND_KEYCODE } from './config'

// 缓存 keyboard 配置，避免每次按键都读取 storage + 解压
let cachedKeyboardConfig = WIDGET_CONFIG

/**
 * 监听配置变化，自动更新缓存
 *
 * 重要：返回 Promise 让 Chrome 等待异步操作完成
 * 否则 Service Worker 可能在 Promise resolve 前休眠，导致缓存更新失败
 */
chrome.storage.onChanged.addListener((changes) => {
  if (changes['naive-tab-keyboard']) {
    const raw = changes['naive-tab-keyboard'].newValue as string
    if (raw && raw.length > 0) {
      // 返回 Promise，Chrome 会等待其完成
      return parseStoredData(raw)
        .then((parsed) => {
          cachedKeyboardConfig = parsed.data
          log('Keyboard config updated')
        })
        .catch((e) => {
          log('Update keyboard cache error', e)
        })
    }
  }
})

/**
 * 加载并缓存 keyboard 配置
 * 启动时执行一次，后续通过 onChanged 监听更新
 */
const loadAndCacheKeyboardConfig = async () => {
  try {
    const data = await chrome.storage.sync.get('naive-tab-keyboard')
    const raw = data['naive-tab-keyboard'] as string
    if (raw && raw.length > 0) {
      const parsed = await parseStoredData(raw)
      cachedKeyboardConfig = parsed.data
      log('Keyboard config cached')
    }
  } catch (e) {
    log('Load keyboard config error', e)
  }
}

// Service Worker 启动时初始化缓存
loadAndCacheKeyboardConfig()

let dblclickTimer: ReturnType<typeof setTimeout>

let lastCommand = ''

const handleKeyboard = async (command: string) => {
  const keycode = command
  if (!ALL_COMMAND_KEYCODE.includes(keycode)) {
    return
  }
  // 直接使用缓存，无需每次读取 storage
  if (!cachedKeyboardConfig.isListenBackgroundKeystrokes) {
    return
  }

  let url: string = cachedKeyboardConfig.keymap[keycode] ? cachedKeyboardConfig.keymap[keycode].url : ''
  if (url.length === 0) {
    return
  }
  url = padUrlHttps(url)
  if (!cachedKeyboardConfig.isDblclickOpen) {
    createTab(url)
    return
  }
  clearTimeout(dblclickTimer)
  if (lastCommand === keycode) {
    createTab(url)
  } else {
    lastCommand = keycode
    dblclickTimer = setTimeout(() => {
      lastCommand = ''
    }, cachedKeyboardConfig.dblclickIntervalTime)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  log('NaiveTab installed')
})

chrome.commands.onCommand.addListener((command) => {
  log(`onCommand: ${command}`)
  handleKeyboard(command)
  gaProxy('press', ['service', 'command'], {
    command,
  })
})

addEventListener('unhandledrejection', async (event) => {
  gaProxy('error', ['unhandledrejection'], {
    event: JSON.stringify(event),
  })
})
