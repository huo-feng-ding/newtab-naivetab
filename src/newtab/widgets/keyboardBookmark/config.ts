export const WIDGET_CODE = 'keyboardBookmark'

import type { TShortcutModifier } from '@/logic/globalShortcut/shortcut-utils'

export const PRESERVE_FIELDS = ['source', 'globalShortcutModifiers', 'keymap']

export const WIDGET_CONFIG = {
  enabled: true,
  source: 2,
  isGlobalShortcutEnabled: true,
  shortcutInInputElement: true,
  globalShortcutModifiers: ['alt'] as TShortcutModifier[],
  urlBlacklist: [] as string[],
  isNewTabOpen: false,
  defaultExpandFolder: null as null | string,
  keymap: {
    KeyQ: {
      url: 'www.baidu.com',
    },
    KeyW: {
      url: 'www.google.com',
    },
    KeyE: {
      url: 'www.bing.com',
    },
    KeyA: {
      url: 'https://gxfg.github.io/naivetab-doc/',
      name: 'welcome',
    },
  } as Record<string, TBookmarkEntry>,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'top',
    yOffsetValue: 1,
    yTranslateValue: 0,
  },
}

export type TWidgetConfig = typeof WIDGET_CONFIG
