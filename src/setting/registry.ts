import type { DefineComponent } from 'vue'
import { SETTING_ICON_META } from '@/logic/icons'

/**
 * 设置面板中键盘组件的基准尺寸（px），options 页面会放大 40%
 */
export const SETTING_KEYBOARD_BASE_SIZE = 35

/**
 * 设置面板元数据
 */
type SettingMeta = {
  component: DefineComponent
  code: settingPanes
  iconName: string
  iconSize: number
  labelKey?: string
}

/**
 * 设置面板配置项
 */
type SettingItem = {
  code: settingPanes
  labelKey: string
}

/**
 * 设置面板分组
 * - labelKey: 分组标题多语言key（会显示在分割线位置）
 * - items: 分组下的设置面板
 */
type SettingGroup = {
  labelKey: string
  items: SettingItem[]
}

// @@@@ add widget setting  registry
/**
 * 设置面板配置（按分组组织，集中管理）
 * 分组结构与 WIDGET_GROUPS 完全一致
 */
export const SETTING_GROUPS: SettingGroup[] = [
  {
    labelKey: 'widgetGroup.global',
    items: [
      { code: 'general', labelKey: 'setting.general' },
      { code: 'focusMode', labelKey: 'setting.focusMode' },
    ],
  },
  {
    labelKey: 'widgetGroup.keyboardAndBookmark',
    items: [
      { code: 'keyboardCommon', labelKey: 'setting.keyboardCommon' },
      { code: 'keyboardCommand', labelKey: 'setting.keyboardCommand' },
      { code: 'keyboardBookmark', labelKey: 'setting.keyboardBookmark' },
      { code: 'bookmarkFolder', labelKey: 'setting.bookmarkFolder' },
    ],
  },
  {
    labelKey: 'widgetGroup.timeAndDate',
    items: [
      { code: 'clockDate', labelKey: 'setting.clockDate' },
      { code: 'calendar', labelKey: 'setting.calendar' },
      { code: 'yearProgress', labelKey: 'setting.yearProgress' },
      { code: 'countdown', labelKey: 'setting.countdown' },
    ],
  },
  {
    labelKey: 'widgetGroup.tool',
    items: [
      { code: 'search', labelKey: 'setting.search' },
      { code: 'memo', labelKey: 'setting.memo' },
      { code: 'weather', labelKey: 'setting.weather' },
      { code: 'news', labelKey: 'setting.news' },
    ],
  },
  {
    labelKey: 'widgetGroup.other',
    items: [
      { code: 'aboutSponsor', labelKey: 'setting.aboutSponsor' },
      { code: 'aboutIndex', labelKey: 'setting.aboutIndex' },
    ],
  },
]

const SETTING_ORDER: settingPanes[] = SETTING_GROUPS.flatMap((g) =>
  g.items.map((i) => i.code),
)

/**
 * 面板 code 与目录名的映射（当目录名与 code 不一致时使用）
 */
const PANE_DIR_MAP: Partial<Record<settingPanes, string>> = {
  keyboardBookmark: 'keyboardBookmark',
  keyboardCommand: 'keyboardCommand',
}

// 创建设置面板元数据
const createSettingMeta = (item: SettingItem): SettingMeta => {
  const { code, labelKey } = item
  const iconMeta = SETTING_ICON_META[code]
  const dirName = PANE_DIR_MAP[code] ?? code
  return {
    code,
    iconName: iconMeta.iconName,
    iconSize: iconMeta.settingSize,
    labelKey,
    component: defineAsyncComponent({
      loader: async () => {
        const label = `setting-pane-load-${code}`
        console.time(label)
        const m = await import(`./panes/${dirName}/index.vue`)
        console.timeEnd(label)
        return m
      },
      delay: 0,
      suspensible: false,
    }),
  }
}

const registry: Record<settingPanes, SettingMeta> = {} as any

for (const group of SETTING_GROUPS) {
  for (const item of group.items) {
    registry[item.code] = createSettingMeta(item)
  }
}

export const settingsList = SETTING_ORDER.map((code) => registry[code]).filter(
  Boolean,
)
