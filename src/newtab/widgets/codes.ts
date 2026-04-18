export const WIDGET_CODE_LIST = [
  'news',
  'weather',
  'calendar',
  'yearProgress',
  'keyboard',
  'clockDigital',
  'clockAnalog',
  'clockFlip',
  'clockNeon',
  'date',
  'memo',
  'bookmarkFolder',
  'search',
  'countdown',
] as const

export type WidgetCodes = typeof WIDGET_CODE_LIST[number]

/**
 * 将 widget code 映射到对应的 setting pane code。
 * 未在此映射中的 widget，默认使用自身的 code 作为 pane code。
 * 新增 widget 时，若其设置面板与其他 widget 共用，需在此处补充。
 */
export const WIDGET_SETTING_PANE_MAP: Partial<Record<WidgetCodes, settingPanes>> = {
  clockDigital: 'clockDate',
  clockAnalog: 'clockDate',
  clockFlip: 'clockDate',
  clockNeon: 'clockDate',
  date: 'clockDate',
}

export const getWidgetSettingPane = (code: WidgetCodes): settingPanes => {
  return WIDGET_SETTING_PANE_MAP[code] ?? (code as settingPanes)
}

/**
 * Widget 分组定义，用于 DraftDrawer 和 FocusSetting 的分类展示。
 * 新增 Widget 时需在对应分组的 codes 数组中追加。
 */
export const WIDGET_GROUPS: Array<{
  labelKey: string
  codes: WidgetCodes[]
}> = [
  {
    labelKey: 'widgetGroup.timeAndDate',
    codes: ['clockDigital', 'clockAnalog', 'clockFlip', 'clockNeon', 'date', 'calendar', 'yearProgress', 'countdown'],
  },
  {
    labelKey: 'widgetGroup.bookmark',
    codes: ['keyboard', 'bookmarkFolder'],
  },
  {
    labelKey: 'widgetGroup.tool',
    codes: ['search', 'memo', 'weather', 'news'],
  },
]
