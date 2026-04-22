<script setup lang="ts">
import { h } from 'vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { localConfig } from '@/logic/store'
import { defaultConfig } from '@/logic/config'
import { PRESERVE_FIELDS as COMMAND_PRESERVE_FIELDS, COMMAND_SHORTCUT_CODE } from '@/logic/globalShortcut/shortcut-command'
import { PRESERVE_FIELDS as KEYBOARD_COMMON_PRESERVE_FIELDS } from '@/logic/keyboard/keyboard-config'

const props = defineProps({
  widgetCode: {
    type: String,
    required: true,
  },
  hideReset: {
    type: Boolean,
    default: false,
  },
})

// ——— 重置逻辑 ———
const hasWidgetCode = computed(() => !!props.widgetCode && props.widgetCode in defaultConfig)

// 从各 widget config.ts 中获取需要保留的字段（自动扫描）
const preserveFieldsMap = (() => {
  const modules = import.meta.glob('../../newtab/widgets/**/config.ts', { eager: true }) as Record<string, any>
  const map: Record<string, string[]> = {}
  for (const key in modules) {
    const m = modules[key]
    if (m && m.WIDGET_CODE && Array.isArray(m.PRESERVE_FIELDS) && m.PRESERVE_FIELDS.length > 0) {
      map[m.WIDGET_CODE] = m.PRESERVE_FIELDS
    }
  }
  // 手动合并非 widget 目录的配置
  if (COMMAND_PRESERVE_FIELDS.length > 0) {
    map[COMMAND_SHORTCUT_CODE] = COMMAND_PRESERVE_FIELDS
  }
  if (KEYBOARD_COMMON_PRESERVE_FIELDS.length > 0) {
    map['keyboardCommon'] = KEYBOARD_COMMON_PRESERVE_FIELDS
  }
  return map
})()

// 当前 widget 是否有需要保留的字段（决定是否显示快速重置选项）
const hasPreserveFields = computed(() => {
  return !!preserveFieldsMap[props.widgetCode]
})

// 快速重置：保留用户数据
const handleQuickReset = () => {
  if (!hasWidgetCode.value) return
  const code = props.widgetCode as keyof typeof defaultConfig
  const current = localConfig[code] as any
  const defaultValue = JSON.parse(JSON.stringify(defaultConfig[code]))

  // 总是保留 enabled 和 layout
  const preserved: Record<string, any> = {}
  if (current.enabled !== undefined) preserved.enabled = current.enabled
  if (current.layout !== undefined) preserved.layout = JSON.parse(JSON.stringify(current.layout))

  // 额外保留 widget 特定的用户数据字段
  const preserveFields = preserveFieldsMap[props.widgetCode]
  if (preserveFields) {
    preserveFields.forEach((field) => {
      if (current[field] !== undefined) {
        preserved[field] = JSON.parse(JSON.stringify(current[field]))
      }
    })
  }

  Object.assign(localConfig[code], defaultValue, preserved)
  window.$message?.success(`${window.$t('generalSetting.resetSettingValue')} "${window.$t('setting.' + props.widgetCode)}" ${window.$t('common.success')}`)
}

// 完全重置：只保留 enabled 和 layout（原有逻辑）
const handleFullReset = () => {
  if (!hasWidgetCode.value) return
  const code = props.widgetCode as keyof typeof defaultConfig
  const current = localConfig[code] as any
  const defaultValue = JSON.parse(JSON.stringify(defaultConfig[code]))
  // 保留 enabled（开启状态）和 layout（位置信息），避免重置后意外关闭或移位
  const preserved: Record<string, any> = {}
  if (current.enabled !== undefined) preserved.enabled = current.enabled
  if (current.layout !== undefined) preserved.layout = JSON.parse(JSON.stringify(current.layout))
  Object.assign(localConfig[code], defaultValue, preserved)
  window.$message?.success(`${window.$t('generalSetting.resetSettingValue')} "${window.$t('setting.' + props.widgetCode)}" ${window.$t('common.success')}`)
}

// 渲染图标函数，和项目右键菜单保持一致用法
const renderIcon = (iconName: string) => () => h(Icon, { icon: iconName, size: 16 })

// 下拉菜单选项 - 使用 computed 保证 i18n 响应式更新
const resetOptions = computed(() => [
  {
    key: 'quick',
    icon: renderIcon(ICONS.save),
    label: () => h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px 0' } }, [
      h('div', { style: { fontSize: '14px', fontWeight: 500, lineHeight: '1.2' } }, window.$t('generalSetting.quickReset')),
      h('div', { style: { fontSize: '12px', color: 'var(--n-text-color-3)', lineHeight: '1.2' } }, window.$t('generalSetting.quickResetDesc')),
    ]),
  },
  {
    key: 'full',
    icon: renderIcon(ICONS.clearOutlined),
    label: () => h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px 0' } }, [
      h('div', { style: { fontSize: '14px', fontWeight: 500, lineHeight: '1.2' } }, window.$t('generalSetting.fullReset')),
      h('div', { style: { fontSize: '12px', color: 'var(--n-text-color-3)', lineHeight: '1.2' } }, window.$t('generalSetting.fullResetDesc')),
    ]),
  },
])

// 处理下拉菜单选择
const handleResetSelect = (key: string) => {
  if (key === 'quick') {
    handleQuickReset()
  } else if (key === 'full') {
    handleFullReset()
  }
}
</script>

<template>
  <NForm
    label-placement="left"
    :label-width="120"
    :show-feedback="false"
  >
    <template v-if="$slots.behavior">
      <NDivider title-placement="left">
        {{ $t('common.behavior') }}
      </NDivider>
      <slot name="behavior" />
    </template>

    <template v-if="$slots.size">
      <NDivider title-placement="left">
        {{ $t('common.size') }}
      </NDivider>
      <slot name="size" />
    </template>

    <template v-if="$slots.typography">
      <NDivider title-placement="left">
        {{ $t('common.typography') }}
      </NDivider>
      <slot name="typography" />
    </template>

    <template v-if="$slots.appearance">
      <NDivider title-placement="left">
        {{ $t('common.appearance') }}
      </NDivider>
      <slot name="appearance" />
    </template>

    <template v-if="$slots.footer">
      <slot name="footer" />
    </template>

    <!-- 底部重置按钮 -->
    <div
      v-if="hasWidgetCode && !props.hideReset"
      class="setting-pane-wrap__reset-wrap"
    >
      <!-- 有需要保留的字段：显示下拉菜单，可选择快速/完全重置 -->
      <NDropdown
        v-if="hasPreserveFields"
        :options="resetOptions"
        placement="top-end"
        @select="handleResetSelect"
      >
        <div class="setting-pane-wrap__reset-btn">
          <Icon
            :icon="ICONS.restoreTwotone"
            class="reset-btn__icon"
          />
          <span class="reset-btn__label">{{ $t('generalSetting.resetSettingValue') }} "{{ $t('setting.' + props.widgetCode) }}"</span>
        </div>
      </NDropdown>
      <!-- 没有需要保留的字段：只显示单个重置按钮，点击直接执行完全重置 -->
      <NPopconfirm
        v-else
        @positive-click="handleFullReset"
      >
        <template #trigger>
          <div
            class="setting-pane-wrap__reset-btn"
          >
            <Icon
              :icon="ICONS.restoreTwotone"
              class="reset-btn__icon"
            />
            <span class="reset-btn__label">{{ $t('generalSetting.resetSettingValue') }} "{{ $t('setting.' + props.widgetCode) }}"</span>
          </div>
        </template>
        <span>{{ `${$t('generalSetting.confirmReset')}` }}</span>
      </NPopconfirm>
    </div>
  </NForm>
</template>

<style scoped>
.setting-pane-wrap__reset-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-4);
  margin-bottom: var(--space-1);
}

.setting-pane-wrap__reset-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px var(--space-3);
  border-radius: var(--radius-md);
  border: 1px dashed rgba(208, 48, 80, 0.28);
  cursor: pointer;
  transition: background-color var(--transition-base), border-color var(--transition-base), color var(--transition-base), box-shadow var(--transition-base);
  color: rgba(208, 48, 80, 0.55);
  user-select: none;

  .reset-btn__icon {
    font-size: var(--text-xs);
    flex-shrink: 0;
    transition: transform var(--transition-slow);
  }

  .reset-btn__label {
    font-size: var(--text-xs);
    line-height: 1;
    letter-spacing: 0.1px;
  }

  &:hover {
    background-color: rgba(208, 48, 80, 0.06);
    border-color: rgba(208, 48, 80, 0.45);
    border-style: solid;
    color: #d03050;
    box-shadow: 0 0 0 2px rgba(208, 48, 80, 0.08);

    .reset-btn__icon {
      transform: rotate(-30deg);
    }
  }
}
</style>
