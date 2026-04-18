import type { WidgetConfigByCode } from '@/newtab/widgets/registry'
import { WIDGET_CODE_LIST } from '@/newtab/widgets/codes'
import pkg from '../../package.json'
import { COMMAND_SHORTCUT_CONFIG } from '@/logic/globalShortcut/shortcut-command'

const UI_LANGUAGE = chrome.i18n.getUILanguage()
const CURR_LANG = UI_LANGUAGE || 'en-US'

export const defaultFocusVisibleWidgetMap = {
  ...Object.fromEntries(WIDGET_CODE_LIST.map((code) => [code, false])) as Record<WidgetCodes, boolean>,
  clockDigital: true,
  clockAnalog: true,
  clockFlip: true,
  clockNeon: true,
  date: true,
  search: true,
}

const generalConfig = {
  isFirstOpen: true,
  version: pkg.version,
  showBreakingChangeNotice: false, // 破坏性变更通知
  appearance: 'auto' as 'light' | 'dark' | 'auto',
  pageTitle: CURR_LANG === 'zh-CN' ? '新标签页' : 'NaiveTab',
  lang: CURR_LANG,
  timeLang: CURR_LANG,
  drawerPlacement: 'right' as TDrawerPlacement,
  openPageFocusElement: 'default' as TPageFocusElement,
  isLoadPageAnimationEnabled: true,
  loadPageAnimationType: 'fade-in' as 'fade-in' | 'zoom-in',
  isFocusMode: false,
  focusVisibleWidgetMap: defaultFocusVisibleWidgetMap,
  isBackgroundImageEnabled: true,
  backgroundImageSource: 1 as 0 | 1 | 2, // 0 localFile, 1 network, 2 bing Photo of the Day
  backgroundNetworkSourceType: 1 as 1 | 2, // 1 Bing, 2 Pexels
  backgroundImageHighQuality: false,
  backgroundImageNames: ['DarwinsArch_ZH-CN9740478501', 'DolomitesMW_ZH-CN3307894335'],
  isBackgroundImageCustomUrlEnabled: false,
  backgroundImageCustomUrls: ['https://cn.bing.com/th?id=OHR.DarwinsArch_ZH-CN9740478501_1920x1080.jpg', 'https://cn.bing.com/th?id=OHR.DolomitesMW_ZH-CN3307894335_1920x1080.jpg'],
  favoriteImageList: [
    { networkSourceType: 1, name: 'DarwinsArch_ZH-CN9740478501' },
    { networkSourceType: 1, name: 'ChukchiSea_ZH-CN7218471261' },
    { networkSourceType: 1, name: 'DolomitesMW_ZH-CN3307894335' },
    { networkSourceType: 1, name: 'YosemiteNightSky_ZH-CN5864740024' },
    { networkSourceType: 1, name: 'LavaTube_ZH-CN5458469336' },
    { networkSourceType: 1, name: 'YurisNight_ZH-CN5738817931' },
    { networkSourceType: 1, name: 'PrathameshJaju_ZH-CN2207606082' },
    { networkSourceType: 1, name: 'AthensAcropolis_ZH-CN9942357439' },
    { networkSourceType: 1, name: 'Balsamroot_ZH-CN9456182640' },
    { networkSourceType: 1, name: 'ChurchillBears_ZH-CN1430090934' },
    { networkSourceType: 1, name: 'WinterHalo_ZH-CN0666553211' },
    { networkSourceType: 2, name: '19161535' },
  ] as {
    networkSourceType: 1 | 2
    name: string
  }[],
  layout: {
    xOffsetKey: 'right',
    xOffsetValue: 1,
    xTranslateValue: 0,
    yOffsetKey: 'top',
    yOffsetValue: 50,
    yTranslateValue: -50,
  },
  fontFamily: 'system',
  fontSize: 14,
  fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
  primaryColor: ['rgba(92, 150, 220, 1)', 'rgba(92, 150, 220, 1)'],
  backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(53, 54, 58, 1)'],
  bgOpacity: 1,
  bgBlur: 0,
  isParallaxEnabled: true,
  parallaxIntensity: 5,
  swatcheColors: [
    'rgba(255, 255, 255, 1)',
    'rgba(15, 23, 42, 1)',
    'rgba(44, 62, 80, 1)',
    'rgba(16, 152, 173, 1)',
    'rgba(92, 150, 220, 1)',
  ],
}

const widgetsDefaultConfig = (() => {
  const modules = import.meta.glob('../newtab/widgets/**/config.ts', { eager: true }) as Record<string, any>
  const map: Record<string, any> = {}
  for (const key in modules) {
    const m = modules[key]
    if (m && m.WIDGET_CODE && m.WIDGET_CONFIG) {
      map[m.WIDGET_CODE] = m.WIDGET_CONFIG
    }
  }
  return map as WidgetConfigByCode
})()

export const defaultConfig = {
  general: generalConfig,
  commandShortcut: COMMAND_SHORTCUT_CONFIG,
  ...widgetsDefaultConfig,
}

export const defaultUploadStatusItem = {
  loading: false,
  syncTime: 0,
  syncId: '', // MD5
  localModifiedTime: 0, // 本地最后修改时间
  dirty: false, // 本地是否有未同步的修改
}

const genUploadConfigStatusMap = () => {
  const statusMap = {} as {
    [key in ConfigField]: {
      loading: boolean
      syncTime: number
      syncId: string
      localModifiedTime: number
      dirty: boolean
    }
  }
  for (const widget in defaultConfig) {
    statusMap[widget as ConfigField] = { ...defaultUploadStatusItem }
  }
  return statusMap
}

export const defaultLocalState = {
  currAppearanceLabel: 'light' as 'light' | 'dark',
  currAppearanceCode: 0 as 0 | 1, // 0:light | 1:dark
  isUploadConfigStatusMap: genUploadConfigStatusMap(),
}
