<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { requestPermission } from '@/logic/storage'
import { state as keyboardState, getSystemBookmarkForKeyboard } from '@/newtab/widgets/keyboard/logic'
import { localConfig, getSettingKeyboardSize } from '@/logic/store'
import { toModifierMask } from '@/logic/globalShortcut/shortcut-utils'
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import Tips from '@/components/Tips.vue'
import PresetThemeDrawer from './PresetThemeDrawer.vue'
import KeyboardStyleSetting from './KeyboardStyleSetting.vue'
import ShellSetting from './KeyboardShellSetting.vue'
import KeycapSetting from './KeyboardKeycapSetting.vue'
import BookmarkManager from '@/components/BookmarkManager.vue'
import GlobalShortcutRecorder from '@/components/GlobalShortcutRecorder.vue'
import UrlBlacklistInput from '@/components/UrlBlacklistInput.vue'

const state = reactive({
  isPresetThemeDrawerVisible: false,
})

const bookmarkSourceList = computed(() => [
  { label: window.$t('keyboard.systemBrowser'), value: 1 },
  { label: window.$t('keyboard.thisExtension'), value: 2 },
])

const handleBookmarkSourceChange = async (source: number) => {
  if (source === 2) {
    return
  }
  const granted = await requestPermission('bookmarks')
  if (!granted) {
    localConfig.keyboard.source = 2
    return
  }
  getSystemBookmarkForKeyboard()
}

const defaultFolderOptions = computed(() => {
  return keyboardState.systemBookmarks
    .filter((item) => Object.prototype.hasOwnProperty.call(item, 'children'))
    .map((item) => ({
      label: item.title,
      value: item.title,
    }))
})

const handleDefaultFolderTitleChange = (value: string) => {
  keyboardState.selectedFolderTitleStack = value ? [value] : []
}

// options 页面更宽，使用更大的键盘基准尺寸
const keyboardBaseSize = computed(() => getSettingKeyboardSize())

/**
 * 修饰键冲突警告：当书签快捷键和指令键盘使用相同修饰键时提示
 */
const modifierConflictWarning = computed(() => {
  const bookmarkModifiers = localConfig.keyboard.globalShortcutModifiers
  const cmdModifiers = localConfig.commandShortcut.modifiers
  if (bookmarkModifiers.length > 0 && cmdModifiers.length > 0
    && toModifierMask(bookmarkModifiers) === toModifierMask(cmdModifiers)) {
    return window.$t('keyboard.modifierConflict')
  }
  return ''
})
</script>

<template>
  <PresetThemeDrawer v-model:show="state.isPresetThemeDrawerVisible" />

  <SettingHeaderBar
    :title="$t('setting.keyboard')"
    widget-code="keyboard"
  />

  <SettingFormWrap widget-code="keyboard">
    <!-- 功能配置 -->
    <template #behavior>
      <!-- 书签数据源 -->
      <NFormItem :label="$t('keyboard.bookmarkSource')">
        <NRadioGroup
          v-model:value="localConfig.keyboard.source"
          size="small"
          @update:value="handleBookmarkSourceChange"
        >
          <NRadioButton
            v-for="item in bookmarkSourceList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NRadioButton>
        </NRadioGroup>
      </NFormItem>

      <NFormItem
        v-if="localConfig.keyboard.source === 1"
        :label="$t('keyboard.defaultDisplayFolderTitle')"
      >
        <NSelect
          v-model:value="localConfig.keyboard.defaultExpandFolder"
          :options="defaultFolderOptions"
          :placeholder="$t('keyboard.rootDirectory')"
          clearable
          @update:value="handleDefaultFolderTitleChange"
        />
      </NFormItem>

      <NFormItem :label="$t('keyboard.presetTheme')">
        <NButton
          type="primary"
          size="small"
          secondary
          class="action-btn action-btn--primary"
          @click="state.isPresetThemeDrawerVisible = true"
        >
          <Icon :icon="ICONS.selectFinger" />&nbsp;{{ $t('common.select') }}
        </NButton>
      </NFormItem>

      <NFormItem :label="$t('general.newTabOpen')">
        <NSwitch
          v-model:value="localConfig.keyboard.isNewTabOpen"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('keyboard.listenBackgroundKeystrokes')">
        <div class="setting__item_wrap">
          <div class="item__box">
            <NSwitch
              v-model:value="localConfig.keyboard.isGlobalShortcutEnabled"
              size="small"
            />
            <Tips :content="`${$t('keyboard.shortcutNote')}`" />
          </div>
        </div>
      </NFormItem>

      <template v-if="localConfig.keyboard.isGlobalShortcutEnabled">
        <!-- 输入框中触发快捷键 -->
        <NFormItem :label="$t('keyboard.shortcutInInputElement')">
          <div class="setting__item_wrap">
            <div class="item__box">
              <NSwitch
                v-model:value="localConfig.keyboard.shortcutInInputElement"
                size="small"
              />
              <Tips :content="`${$t('keyboard.shortcutInInputElementNote')}`" />
            </div>
          </div>
        </NFormItem>

        <!-- 域名黑名单 -->
        <NFormItem :label="$t('keyboard.urlBlacklist')">
          <UrlBlacklistInput v-model="localConfig.keyboard.urlBlacklist" />
        </NFormItem>

        <!-- 全局快捷键修饰键 -->
        <NFormItem :label="$t('keyboard.globalModifier')">
          <GlobalShortcutRecorder v-model="localConfig.keyboard.globalShortcutModifiers" />
        </NFormItem>

        <NFormItem
          v-if="modifierConflictWarning"
          :show-label="false"
        >
          <span class="modifier-conflict-warning">⚠️ {{ modifierConflictWarning }}</span>
        </NFormItem>
      </template>

      <!-- 全局快捷键/书签管理 -->
      <BookmarkManager :base-size="keyboardBaseSize" />
    </template>

    <!-- 底部扩展 -->
    <template #footer>
      <!-- 折叠面板：键盘风格 / 外壳 / 按键帽 -->
      <NCollapse display-directive="show">
        <NCollapseItem name="keyboardStyle">
          <template #header>
            <span class="setting__label setting__label--collapse">
              <Icon
                :icon="ICONS.keyboardLabel"
                class="label__icon"
              />
              {{ `${$t('keyboard.keyboard')}${$t('common.config')}` }}
            </span>
          </template>
          <KeyboardStyleSetting />
        </NCollapseItem>

        <NCollapseItem name="keycapSetting">
          <template #header>
            <span class="setting__label setting__label--collapse">
              <Icon
                :icon="ICONS.keyboardKeycapLabel"
                class="label__icon"
              />
              {{ `${$t('keyboard.keycap')}${$t('common.config')}` }}
            </span>
          </template>
          <KeycapSetting />
        </NCollapseItem>

        <NCollapseItem name="shellSetting">
          <template #header>
            <span class="setting__label setting__label--collapse">
              <Icon
                :icon="ICONS.keyboardShellLabel"
                class="label__icon"
              />
              {{ `${$t('keyboard.shell')} / ${$t('keyboard.plate')}${$t('common.config')}` }}
            </span>
          </template>
          <ShellSetting />
        </NCollapseItem>
      </NCollapse>
    </template>
  </SettingFormWrap>
</template>

<style>
.flip-list-move {
  transition: transform 0.8s ease;
}

.modifier-conflict-warning {
  font-size: 12px;
  color: rgba(208, 48, 80, 0.9);
  padding: 4px 0;
}
</style>
