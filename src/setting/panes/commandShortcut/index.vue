<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { localConfig, getSettingKeyboardSize } from '@/logic/store'
import { currKeyboardConfig } from '@/logic/keyboard'
import { formatModifierKeys, toModifierMask } from '@/logic/globalShortcut/shortcut-utils'
import { COMMAND_CATEGORIES, type TCommandName } from '@/logic/globalShortcut/shortcut-command'
import { ICONS } from '@/logic/icons'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import KeyboardKeycapDisplay from '@/components/KeyboardKeycapDisplay.vue'
import GlobalShortcutRecorder from '@/components/GlobalShortcutRecorder.vue'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import { SwitchField } from '@/setting/fields'
import { NFormItem, NPopconfirm } from 'naive-ui'
import UrlBlacklistInput from '@/components/UrlBlacklistInput.vue'

const keyboardBaseSize = computed(() => getSettingKeyboardSize())

/**
 * 键盘样式 composable（与 BookmarkManager 共享同一套样式计算）
 */
const commandKeyboardStyle = useKeyboardStyle('px', keyboardBaseSize.value)
const { keycapCssVars, getEmphasisStyle, getCustomLabel, getKeycapStageStyle, getKeycapTextStyle } = commandKeyboardStyle

/**
 * 键帽视觉配置（跟随 keyboard widget 偏好，保持一致性）
 */
const keycapVisualType = computed(() => localConfig.keyboard.keycapType)
const isCapKeyVisible = computed(() => localConfig.keyboard.isCapKeyVisible)
const isNameVisible = computed(() => localConfig.keyboard.isNameVisible)

/**
 * 命令分类数据（用于 Setting 面板分组展示）
 */
const commandCategories = computed(() => {
  return COMMAND_CATEGORIES.map((cat) => ({
    categoryKey: cat.categoryKey,
    commands: [
      // 不需要无命令选项，用户可以通过删除取消绑定
      // { label: window.$t('common.none'), value: '' },
      ...cat.commands.map((cmd) => {
        const commandName = (typeof cmd === 'string' ? cmd : cmd.command) as TCommandName
        return {
          label: window.$t(`command.${commandName}`),
          value: commandName,
        }
      }),
    ],
  }))
})

/**
 * 格式化修饰键 + 主键为可读形式
 */
const formatBinding = (code: string): string => {
  const modifier = formatModifierKeys(localConfig.commandShortcut.modifiers)
  const key = getCustomLabel(code)
  return `${modifier} + ${key}`
}

/**
 * 已绑定的按键集合（用于高亮显示）
 */
const boundKeySet = computed(() => {
  const keymap = localConfig.commandShortcut.keymap || {}
  return new Set(Object.keys(keymap).filter((code) => keymap[code]?.command))
})

/**
 * 获取按键已绑定的命令
 */
const getBoundCommand = (code: string): string => {
  return localConfig.commandShortcut.keymap?.[code]?.command || ''
}

/**
 * 获取按键的绑定标签
 */
const getBoundLabel = (code: string): string => {
  const cmd = getBoundCommand(code)
  return cmd ? window.$t(`command.${cmd}`) || cmd : ''
}

/**
 * 当前选中的按键（用于弹出命令选择）
 */
const selectedKeyCode = ref<string | null>(null)

/**
 * 修饰键冲突警告：当命令快捷键和书签快捷键使用相同修饰键时提示
 */
const modifierConflictWarning = computed(() => {
  const cmdModifiers = localConfig.commandShortcut.modifiers
  const bookmarkModifiers = localConfig.keyboard.globalShortcutModifiers
  if (cmdModifiers.length > 0 && bookmarkModifiers.length > 0
    && toModifierMask(cmdModifiers) === toModifierMask(bookmarkModifiers)) {
    return window.$t('commandShortcut.modifierConflict')
  }
  return ''
})

/**
 * 选中/取消选中按键
 */
const toggleSelectKey = (code: string) => {
  selectedKeyCode.value = selectedKeyCode.value === code ? null : code
}

/**
 * 删除指定按键的绑定
 */
const handleDeleteBinding = () => {
  if (!selectedKeyCode.value) return
  delete localConfig.commandShortcut.keymap[selectedKeyCode.value]
  const keyLabel = getCustomLabel(selectedKeyCode.value)
  window.$message?.success(`${keyLabel} → ${window.$t('common.none')}`)
  selectedKeyCode.value = null
}

/**
 * 选择命令
 */
const handleCommandSelect = (cmd: TCommandName) => {
  if (!selectedKeyCode.value) return
  if (!cmd) {
    delete localConfig.commandShortcut.keymap[selectedKeyCode.value]
  } else {
    localConfig.commandShortcut.keymap[selectedKeyCode.value] = { command: cmd }
  }
  // 不关闭选择面板，让用户看到绑定结果并可以继续选择
  const keyLabel = getCustomLabel(selectedKeyCode.value)
  const cmdLabel = cmd ? window.$t(`command.${cmd}`) : window.$t('common.none')
  window.$message?.success(`${keyLabel} → ${cmdLabel}`)
}
</script>

<template>
  <SettingHeaderBar
    :title="$t('setting.commandShortcut')"
    widget-code="commandShortcut"
  />

  <SettingFormWrap widget-code="commandShortcut">
    <!-- 基础设置 -->
    <template #behavior>
      <SwitchField
        v-model="localConfig.commandShortcut.isEnabled"
        :label="$t('commandShortcut.enabled')"
      />

      <SwitchField
        v-model="localConfig.commandShortcut.shortcutInInputElement"
        :label="$t('commandShortcut.shortcutInInputElement')"
      />

      <NFormItem :label="$t('commandShortcut.urlBlacklist')">
        <UrlBlacklistInput v-model="localConfig.commandShortcut.urlBlacklist" />
      </NFormItem>

      <NFormItem :label="$t('commandShortcut.modifier')">
        <GlobalShortcutRecorder v-model="localConfig.commandShortcut.modifiers" />
      </NFormItem>

      <NFormItem
        v-if="modifierConflictWarning"
        :show-label="false"
      >
        <span class="modifier-conflict-warning">⚠️ {{ modifierConflictWarning }}</span>
      </NFormItem>

      <!-- 可视化键盘绑定区域 -->
      <div class="command-binding">
        <div class="command-binding__keyboard-wrap">
          <KeyboardLayout
            unit="px"
            :base-size="keyboardBaseSize"
            :rows="currKeyboardConfig.list"
          >
            <template #keycap="{ code }">
              <div
                class="command-binding__keycap-wrap"
                @click="toggleSelectKey(code)"
              >
                <KeyboardKeycapDisplay
                  :key-code="code"
                  :label="getCustomLabel(code)"
                  :name="getBoundLabel(code)"
                  :visual-type="keycapVisualType"
                  :stage-style="getKeycapStageStyle(code)"
                  :text-style="getKeycapTextStyle(code)"
                  :show-cap-key="isCapKeyVisible"
                  :show-name="isNameVisible"
                  :show-favicon="false"
                  :show-tactile-bumps="false"
                  :is-selected="selectedKeyCode === code"
                  :is-border-enabled="boundKeySet.has(code)"
                  :style="[keycapCssVars, getEmphasisStyle(code)]"
                />
              </div>
            </template>
          </KeyboardLayout>
        </div>

        <!-- 底部区域：tips 或命令选择面板 -->
        <div class="command-binding__footer">
          <div
            v-if="!selectedKeyCode"
            class="command-binding__tip"
          >
            {{ $t('commandShortcut.bindingTip') }}
          </div>

          <!-- 命令选择面板 -->
          <div
            v-else
            class="command-binding__selector"
          >
            <div class="selector__header">
              <span class="selector__key">{{ getCustomLabel(selectedKeyCode) }}</span>
              <span class="selector__binding">{{ formatBinding(selectedKeyCode) }}</span>
              <NPopconfirm @positive-click="handleDeleteBinding">
                <template #trigger>
                  <NButton
                    quaternary
                    size="tiny"
                    class="selector__close"
                  >
                    <Icon
                      :icon="ICONS.deleteBin"
                      class="close__icon"
                    />
                  </NButton>
                </template>
                {{ $t('commandShortcut.confirmDelete').replace('__key__', getCustomLabel(selectedKeyCode)) }}
              </NPopconfirm>
            </div>

            <div class="selector__categories">
              <div
                v-for="cat in commandCategories"
                :key="cat.categoryKey"
                class="category-group"
              >
                <div class="category-group__label">{{ $t(cat.categoryKey) }}</div>
                <NRadioGroup
                  :value="getBoundCommand(selectedKeyCode)"
                  class="category-group__options"
                  @update:value="handleCommandSelect"
                >
                  <NRadio
                    v-for="cmd in cat.commands"
                    :key="cmd.value"
                    :value="cmd.value"
                    :label="cmd.label"
                    size="small"
                  />
                </NRadioGroup>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </SettingFormWrap>
</template>

<style scoped>
.command-binding {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .command-binding__keyboard-wrap {
    display: flex;
    justify-content: center;
  }

  .command-binding__footer {
    min-height: 40px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}

.command-binding__tip {
  font-size: 12px;
  color: var(--n-text-color-3);
  text-align: center;
  padding: 10px 0;
}

.command-binding__keycap-wrap {
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

/* 覆盖浏览器默认的 :focus-visible 焦点环 */
.command-binding__keycap-wrap:focus,
.command-binding__keycap-wrap:focus-visible {
  outline: none;
}

.command-binding__selector {
  padding: 12px;
  border-radius: 8px;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
}

.selector__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: var(--gray-alpha-05);
  border: 1px solid var(--gray-alpha-08);
}

.selector__categories {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-group__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--n-text-color-2);
  margin-bottom: 4px;
}

/* 覆盖 setting/index.vue 全局的 .n-radio { width: 20% } 规则，
   命令选择器使用 3 列网格，radio 撑满每个格子 */
:deep(.category-group__options .n-radio) {
  width: auto !important;
}

.category-group__options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.selector__key {
  font-size: 13px;
  font-weight: 700;
  color: var(--n-primary-color);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--gray-alpha-06);
  letter-spacing: 0.5px;
}

.selector__binding {
  font-size: 12px;
  color: var(--n-text-color-3);
  font-family: var(--n-font-family), monospace;
  letter-spacing: 0.3px;
}

.selector__close {
  margin-left: auto;
  padding: 0;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
}

.selector__close:hover {
  background-color: var(--gray-alpha-10);
}

.close__icon {
  font-size: 16px;
  color: var(--n-text-color-3);
  transition: color var(--transition-fast);
}

.selector__close:hover .close__icon {
  color: var(--n-text-color);
}

.modifier-conflict-warning {
  font-size: 12px;
  color: rgba(208, 48, 80, 0.9);
  padding: 4px 0;
}
</style>
