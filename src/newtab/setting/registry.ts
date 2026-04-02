import type { DefineComponent } from 'vue'

type SettingMeta = {
  component: DefineComponent
  code: settingPanes
  iconName: string
  iconSize: number
  labelKey?: string
  labelKeys?: string[]
}

/**
 * 导航分组顺序：
 * group: 'global' → 全局配置（通用、专注模式）
 * group: 'widget' → 组件配置
 * group: 'other'  → 关于与赞助（放最后）
 */
type SettingGroup = {
  group: 'global' | 'widget' | 'other'
  items: settingPanes[]
}

export const SETTING_GROUPS: SettingGroup[] = [
  {
    group: 'global',
    items: ['general', 'focusMode'],
  },
  {
    group: 'widget',
    items: ['keyboard', 'bookmarkFolder', 'clockDate', 'calendar', 'yearProgress', 'search', 'memo', 'weather', 'news'],
  },
  {
    group: 'other',
    items: ['aboutSponsor', 'aboutIndex'],
  },
]

const SETTING_ORDER: settingPanes[] = SETTING_GROUPS.flatMap((g) => g.items)

const modules = import.meta.glob('./**/index.ts', { eager: true }) as Record<string, { default: SettingMeta }>

const registry: Record<settingPanes, SettingMeta> = {} as any

for (const path in modules) {
  const meta = modules[path].default
  registry[meta.code] = meta
}

export const settingsList = SETTING_ORDER.map((code) => registry[code]).filter(Boolean)
