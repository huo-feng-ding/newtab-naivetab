import type { GlobalThemeOverrides } from 'naive-ui'
import { enUS, zhCN, darkTheme, useOsTheme, NButton } from 'naive-ui'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { isEdge, isFirefox } from '@/env'
import { styleConst } from '@/styles/const'
import { URL_CHROME_STORE, URL_EDGE_STORE, URL_FIREFOX_STORE, APPEARANCE_TO_CODE_MAP, DAYJS_LANG_MAP, FONT_LIST } from '@/logic/constants/index'
import { defaultConfig, defaultLocalState, defaultFocusVisibleWidgetMap } from '@/logic/config'
import type { WidgetConfigByCode } from '@/newtab/widgets/registry'
import { log, createTab, compareLeftVersionLessThanRightVersions } from '@/logic/util'
import { WIDGET_CODE_LIST } from '@/newtab/widgets/codes'

type LocalConfigRefs = {
  general: ReturnType<typeof useStorageLocal<typeof defaultConfig['general']>>
} & {
  [K in keyof WidgetConfigByCode]: ReturnType<typeof useStorageLocal<WidgetConfigByCode[K]>>
}

const useWidgetStorageLocal = <K extends keyof WidgetConfigByCode>(key: K) => {
  return useStorageLocal(`c-${key}`, defaultConfig[key])
}

const createLocalConfig = (): LocalConfigRefs => {
  const res: any = {}
  res.general = useStorageLocal('c-general', defaultConfig.general)
  const widgetNames = WIDGET_CODE_LIST
  for (const key of widgetNames) {
    res[key] = useWidgetStorageLocal(key)
  }
  return res as LocalConfigRefs
}

export const localConfig: typeof defaultConfig = reactive(createLocalConfig())

export const localState = useStorageLocal('l-state', defaultLocalState)

export const globalState = reactive({
  isSettingDrawerVisible: false,
  isGuideMode: false,
  isFullScreen: !!document.fullscreenElement,
  availableFontList: [] as string[],
  isUploadSettingLoading: false,
  isImportSettingLoading: false,
  isClearStorageLoading: false,
  isChangelogModalVisible: false,
  isSearchFocused: false,
  isInputFocused: false,
  currSettingTabCode: 'general',
  currSettingAnchor: '',
})

document.addEventListener('fullscreenchange', () => {
  globalState.isFullScreen = !!document.fullscreenElement
})

export const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else if (document.exitFullscreen) {
    document.exitFullscreen()
  }
}

// UI language
const NATIVE_UI_LOCALE_MAP = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

export const nativeUILang = ref(NATIVE_UI_LOCALE_MAP[localConfig.general.lang] || enUS)

watch(
  () => localConfig.general.lang,
  () => {
    nativeUILang.value = NATIVE_UI_LOCALE_MAP[localConfig.general.lang] || enUS
  },
)

// Theme
export const currTheme = ref()

const osTheme = useOsTheme() // light | dark | null

watch(
  [() => osTheme.value, () => localConfig.general.appearance],
  () => {
    if (localConfig.general.appearance === 'auto') {
      localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[osTheme.value as keyof typeof APPEARANCE_TO_CODE_MAP] as 0 | 1
      localState.value.currAppearanceLabel = osTheme.value || 'light'
      currTheme.value = osTheme.value === 'dark' ? darkTheme : null
      return
    }
    localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[localConfig.general.appearance] as 0 | 1
    localState.value.currAppearanceLabel = localConfig.general.appearance as 'light' | 'dark'
    currTheme.value = localConfig.general.appearance === 'dark' ? darkTheme : null
  },
  {
    immediate: true,
  },
)

export const openExtensionsStorePage = () => {
  let storeUrl = URL_CHROME_STORE
  if (isEdge) {
    storeUrl = URL_EDGE_STORE
  } else if (isFirefox) {
    storeUrl = URL_FIREFOX_STORE
  }
  createTab(storeUrl)
}

const initAvailableFontList = async () => {
  const fontCheck = new Set(FONT_LIST.sort())
  // 在所有字体加载完成后进行操作
  await document.fonts.ready
  const availableList: Set<string> = new Set()
  for (const font of fontCheck.values()) {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/FontFaceSet/check
    if (document.fonts.check(`12px "${font}"`)) {
      availableList.add(font)
    }
  }
  globalState.availableFontList = [...availableList.values()]
}

export const availableFontOptions = computed(() =>
  globalState.availableFontList.map((font: string) => ({
    label: font,
    value: font,
  })),
)

export const fontSelectRenderLabel = (option: SelectStringItem) => {
  return [
    h(
      'div',
      {
        title: option.label,
        style: {
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
        },
      },
      [
        h('span', {
          style: {
            maxWidth: '90px',
            'overflow': 'hidden',
            'whiteSpace': 'nowrap',
            'textOverflow': 'ellipsis',
          },
        }, option.label),
        h(
          'span',
          {
            style: {
              fontFamily: option.label,
            },
          },
          'abc-ABC-123',
        ),
      ],
    ),
  ]
}

export const switchSettingDrawerVisible = (status: boolean) => {
  globalState.isSettingDrawerVisible = status
  if (status && globalState.availableFontList.length === 0) {
    initAvailableFontList()
  }
}

export const currDayjsLang = computed(() => DAYJS_LANG_MAP[localConfig.general.timeLang] || 'en')

export const openChangelogModal = () => {
  globalState.isChangelogModalVisible = true
}

/**
 * 同步状态映射表增量更新
 *
 * 当新增 Widget 后，为 isUploadConfigStatusMap 增量添加新增字段的默认状态
 * 避免全量重置导致丢失已有字段的同步状态（dirty, syncTime, syncId 等）
 */
export const handleStateResetAndUpdate = () => {
  let needUpdate = false
  // 遍历默认状态，增量添加缺失的字段
  for (const [field, defaultStatus] of Object.entries(defaultLocalState.isUploadConfigStatusMap)) {
    if (!Object.prototype.hasOwnProperty.call(localState.value.isUploadConfigStatusMap, field)) {
      localState.value.isUploadConfigStatusMap[field] = { ...defaultStatus }
      needUpdate = true
      log(`isUploadConfigStatusMap add field: ${field}`)
    }
  }
  if (needUpdate) {
    log('isUploadConfigStatusMap update completed')
  }
}

const updateSuccess = () => {
  window.$notification.success({
    duration: 5000,
    title: `${window.$t('common.update')}${window.$t('common.success')}`,
    content: `${window.$t('common.version')} ${window.appVersion}`,
    action: () =>
      h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => {
            openChangelogModal()
          },
        },
        {
          default: () => window.$t('about.changelog'),
        },
      ),
  })
}

export const getIsWidgetRender = (widgetCode: WidgetCodes) => computed(() => localConfig[widgetCode].enabled)

export const getStyleConst = (field: string) => {
  return computed(() => {
    return styleConst.value[field][localState.value.currAppearanceCode] || styleConst.value[field][0]
  })
}

/**
 * e.g. getStyleField('date', 'unit.fontSize', 'px', 1.2)
 * 当unit为vmin时会自动将 ratio * 0.1
 */
export const getStyleField = (configCode: ConfigField, field: string, unit?: string, ratio?: number) => {
  return computed(() => {
    const fieldList = field.split('.')
    let targetValue: any = fieldList.reduce((r, c) => r[c], localConfig[configCode])

    if (Array.isArray(targetValue)) {
      // color
      return targetValue[localState.value.currAppearanceCode]
    }

    if (typeof targetValue !== 'number') {
      return targetValue
    }

    if (ratio) {
      targetValue *= ratio
    }
    if (unit) {
      if (unit === 'vmin') {
        // 配置值以 px 量级存储（如 fontSize: 14 ≈ 14px），×0.1 转为 vmin
        // 依赖约定：1vmin ≈ 10px（基准视口宽度 1000px 下）
        targetValue *= 0.1
      }
      targetValue = `${targetValue}${unit}`
    }
    return targetValue
  })
}

export const customPrimaryColor = getStyleField('general', 'primaryColor')

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: customPrimaryColor.value,
    primaryColorSuppl: customPrimaryColor.value,
    primaryColorHover: '#7f8c8d',
    primaryColorPressed: '#57606f',
  },
}

watch(
  () => localConfig.general.pageTitle,
  () => {
    document.title = localConfig.general.pageTitle
  },
  { immediate: true },
)

watch(
  [() => localConfig.general.backgroundColor, () => localConfig.general.fontColor, () => localState.value.currAppearanceCode],
  () => {
    document.body.style.setProperty('--bg-main', getStyleField('general', 'backgroundColor').value)
    document.body.style.setProperty('--text-color-main', getStyleField('general', 'fontColor').value)
  },
  {
    immediate: true,
    deep: true, // color is array
  },
)

/**
 * 针对Edge 设置为黑白色favicon，避免展示为纯色方块
 */
export const setEdgeFavicon = () => {
  if (!isEdge) {
    return
  }
  const link = document.createElement('link')
  link.setAttribute('rel', 'icon')
  link.setAttribute('href', '/assets/favicon-edge.svg')
  document.getElementsByTagName('head')[0].appendChild(link)
}

export const getLocalVersion = () => {
  let version = localConfig.general.version
  const settingGeneral = localStorage.getItem('c-general')
  if (settingGeneral) {
    version = JSON.parse(settingGeneral).version
  }
  return version || '0'
}

/**
 * 配置合并函数（递归）
 *
 * 合并策略说明：
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  参数说明                                                                   │
 * │  - state: 默认配置（来自 defaultConfig）                                   │
 * │  - acceptState: 待合并的配置（来自云端/导入/本地）                          │
 * │                                                                             │
 * │  合并规则（按优先级）：                                                     │
 * │  1. acceptState 为空 → 使用默认值 state                                     │
 * │  2. 类型不同 → 使用默认值 state（处理新增字段）                             │
 * │  3. 基础类型 → 直接使用 acceptState 的值                                    │
 * │  4. 数组等非纯Object → 直接使用 acceptState 的值                            │
 * │  5. keymap 特殊对象 → 直接使用 acceptState 的值（避免深合并破坏结构）        │
 * │  6. 普通对象 → 递归合并，只合并 state 中已定义的字段                        │
 * │                                                                             │
 * │  设计目标：                                                                 │
 * │  - 保留用户新版本新增字段的默认值                                           │
 * │  - 删除旧版本废弃的字段                                                     │
 * │  - 避免合并破坏特殊数据结构（如 keymap）                                    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */
export const mergeState = (state: unknown, acceptState: unknown): unknown => {
  // 规则1: acceptState 为空，使用默认值
  if (acceptState === undefined || acceptState === null) {
    return state
  }

  // 规则2: 类型不同时，使用默认值（处理新增字段的情况）
  // 例如：旧版本某字段是 string，新版本改为 object
  if (Object.prototype.toString.call(state) !== Object.prototype.toString.call(acceptState)) {
    return state
  }

  // 规则3: 基础类型，直接使用 acceptState 的值
  if (typeof acceptState === 'string' || typeof acceptState === 'number' || typeof acceptState === 'boolean') {
    return acceptState
  }

  // 规则4: 数组等非纯 Object 类型，直接使用 acceptState 的值
  // 原因：数组的合并逻辑复杂，直接替换更安全
  if (Object.prototype.toString.call(acceptState) !== '[object Object]') {
    return acceptState
  }

  // 规则5: keymap 特殊对象检测
  // keymap 是 Record<string, { url, name }> 结构，不应深合并
  // 检测逻辑：如果存在键盘码格式的 key，认为是 keymap
  const acceptObj = acceptState as Record<string, unknown>
  const stateObj = state as Record<string, unknown>
  const hasKeymapPattern = Object.keys(acceptObj).some((key) =>
    key.startsWith('Key') || key.startsWith('Digit') || key.startsWith('Numpad'),
  )
  if (hasKeymapPattern) {
    return acceptState
  }

  // 规则6: 普通对象，递归合并
  // 注意：只合并 state（默认配置）中已定义的字段，忽略 acceptState 中的未知字段
  const filterState: Record<string, unknown> = {}
  for (const field of Object.keys(stateObj)) {
    if (Object.prototype.hasOwnProperty.call(acceptObj, field)) {
      filterState[field] = mergeState(stateObj[field], acceptObj[field])
    } else {
      // acceptState 中不存在该字段，使用默认值
      filterState[field] = stateObj[field]
    }
  }

  return filterState
}

/**
 * 处理新增配置，并删除无用旧配置。默认acceptState不传递时为刷新配置数据结构
 * 以 defaultConfig 为模板与 acceptState 进行去重合并
 */
export const updateSetting = (acceptRawState = localConfig): Promise<boolean> => {
  const acceptState = acceptRawState
  return new Promise((resolve) => {
    try {
      // 只处理存在于acceptState中的配置字段，减少不必要的处理
      const configFields = Object.keys(defaultConfig).filter((field) =>
        Object.prototype.hasOwnProperty.call(acceptState, field),
      ) as ConfigField[]

      for (const configField of configFields) {
        // 获取需要更新的子字段
        const subFields = Object.keys(defaultConfig[configField])

        // 批量处理子字段，减少循环内的操作
        for (const subField of subFields) {
          if (acceptState[configField][subField] !== undefined) {
            localConfig[configField][subField] = mergeState(
              defaultConfig[configField][subField],
              acceptState[configField][subField],
            )
            // console.log(`${configField}-${subField}`, localConfig[configField][subField], '=', defaultConfig[configField][subField], '<-', acceptState[configField][subField])
          }
        }
      }

      log('UpdateSetting', localConfig)
      resolve(true)
    } catch (e) {
      log('updateSetting error', e)
      resolve(false)
    }
  })
}

export const handleAppUpdate = () => {
  const version = getLocalVersion()
  log('Version', version)
  if (!compareLeftVersionLessThanRightVersions(version, window.appVersion)) {
    return
  }
  log('Get new version', window.appVersion)
  // @@@@ 更新localConfig后需要手动处理新版本变更的本地数据结构
  if (compareLeftVersionLessThanRightVersions(version, '1.20.0')) {
    const keymapLength = Object.keys(localConfig.keyboard.keymap).length
    localConfig.keyboard.source = keymapLength === 0 ? 1 : 2
    localConfig.keyboard.defaultExpandFolder = null
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.21.0')) {
    localConfig.search.isNewTabOpen = false
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.23.1')) {
    localConfig.clockDigital.width = localConfig.clockDigital.fontSize / 2 + 8
    const clockDigitalConfig = localConfig.clockDigital as typeof localConfig.clockDigital & {
      letterSpacing?: number
    }
    delete clockDigitalConfig.letterSpacing
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.24.0')) {
    localConfig.general.timeLang = localConfig.general.lang
    localConfig.yearProgress = defaultConfig.yearProgress
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.24.3')) {
    localConfig.general.backgroundColor = structuredClone(defaultConfig.general.backgroundColor)
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.25.9')) {
    localConfig.calendar.festivalCountdown = true
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.27.0')) {
    localConfig.general.isFocusMode = false
    localConfig.general.focusVisibleWidgetMap = defaultFocusVisibleWidgetMap
    if ((localConfig.general.openPageFocusElement as any) === 'bookmarkKeyboard') {
      localConfig.general.openPageFocusElement = 'keyboard'
    }
    localConfig.calendar.backgroundBlur = defaultConfig.calendar.backgroundBlur
    localConfig.memo.backgroundBlur = defaultConfig.memo.backgroundBlur
    localConfig.news.backgroundBlur = defaultConfig.news.backgroundBlur
    localConfig.search.backgroundBlur = defaultConfig.search.backgroundBlur
    localConfig.yearProgress.backgroundBlur = defaultConfig.yearProgress.backgroundBlur
    localConfig.keyboard.shellBackgroundBlur = defaultConfig.keyboard.shellBackgroundBlur
    localConfig.keyboard.plateBackgroundBlur = defaultConfig.keyboard.plateBackgroundBlur
    localConfig.keyboard.keycapBackgroundBlur = defaultConfig.keyboard.keycapBackgroundBlur
    const oldBookmark = useStorageLocal('c-bookmark', defaultConfig.keyboard)
    for (const key of Object.keys(defaultConfig.keyboard)) {
      if (oldBookmark.value[key]) {
        localConfig.keyboard[key] = oldBookmark.value[key]
      }
    }
    localConfig.bookmarkFolder.enabled = false
  }
  if (compareLeftVersionLessThanRightVersions(version, '2.0.0')) {
    localConfig.clockFlip.enabled = false
  }
  // 更新local版本号
  localConfig.general.version = window.appVersion
  updateSuccess()

  // 异步刷新配置数据结构，不阻塞首屏渲染
  // updateSetting 会整理配置结构、补充缺失字段、删除废弃字段
  // 这些修改会触发 watch，但属于后台操作，不应阻塞初始化流程
  updateSetting()
}
