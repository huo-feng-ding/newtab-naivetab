<script setup lang="ts">
import { requestPermission } from '@/logic/storage'
import { state as keyboardState, getSystemBookmarkForKeyboard } from '@/newtab/widgets/keyboardBookmark/logic'
import { localConfig, getSettingKeyboardSize } from '@/logic/store'
import { toModifierMask } from '@/logic/globalShortcut/shortcut-utils'
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import BookmarkManager from '@/components/BookmarkManager.vue'
import GlobalShortcutRecorder from '@/components/GlobalShortcutRecorder.vue'
import UrlBlacklistInput from '@/components/UrlBlacklistInput.vue'

const bookmarkSourceList = computed(() => [
  { label: window.$t('keyboardBookmark.thisExtension'), value: 2 },
  { label: window.$t('keyboardBookmark.systemBrowser'), value: 1 },
])

const handleBookmarkSourceChange = async (source: number) => {
  if (source === 2) {
    return
  }
  const granted = await requestPermission('bookmarks')
  if (!granted) {
    localConfig.keyboardBookmark.source = 2
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
  const bookmarkModifiers = localConfig.keyboardBookmark.globalShortcutModifiers
  const cmdModifiers = localConfig.keyboardCommand.modifiers
  if (bookmarkModifiers.length > 0 && cmdModifiers.length > 0
    && toModifierMask(bookmarkModifiers) === toModifierMask(cmdModifiers)) {
    return window.$t('keyboardBookmark.modifierConflict')
  }
  return ''
})
</script>

<template>
  <SettingHeaderBar
    :title="$t('setting.keyboardBookmark')"
    widget-code="keyboardBookmark"
  />

  <SettingFormWrap widget-code="keyboardBookmark">
    <!-- 功能配置 -->
    <template #behavior>
      <!-- 书签数据源 -->
      <NFormItem :label="$t('keyboardBookmark.bookmarkSource')">
        <NRadioGroup
          v-model:value="localConfig.keyboardBookmark.source"
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
        v-if="localConfig.keyboardBookmark.source === 1"
        :label="$t('keyboardBookmark.defaultDisplayFolderTitle')"
      >
        <NSelect
          v-model:value="localConfig.keyboardBookmark.defaultExpandFolder"
          :options="defaultFolderOptions"
          :placeholder="$t('keyboardBookmark.rootDirectory')"
          clearable
          @update:value="handleDefaultFolderTitleChange"
        />
      </NFormItem>

      <NFormItem :label="$t('generalSetting.newTabOpen')">
        <NSwitch
          v-model:value="localConfig.keyboardBookmark.isNewTabOpen"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('keyboardBookmark.listenBackgroundKeystrokes')">
        <div class="setting__item_wrap">
          <div class="item__box">
            <NSwitch
              v-model:value="localConfig.keyboardBookmark.isGlobalShortcutEnabled"
              size="small"
            />
            <Tips :content="`${$t('keyboardBookmark.shortcutNote')}`" />
          </div>
        </div>
      </NFormItem>

      <template v-if="localConfig.keyboardBookmark.isGlobalShortcutEnabled">
        <!-- 输入框中触发快捷键 -->
        <NFormItem :label="$t('keyboardBookmark.shortcutInInputElement')">
          <div class="setting__item_wrap">
            <div class="item__box">
              <NSwitch
                v-model:value="localConfig.keyboardBookmark.shortcutInInputElement"
                size="small"
              />
              <Tips :content="`${$t('keyboardBookmark.shortcutInInputElementNote')}`" />
            </div>
          </div>
        </NFormItem>

        <!-- 域名黑名单 -->
        <NFormItem :label="$t('keyboardBookmark.urlBlacklist')">
          <UrlBlacklistInput v-model="localConfig.keyboardBookmark.urlBlacklist" />
        </NFormItem>

        <!-- 全局快捷键修饰键 -->
        <NFormItem :label="$t('keyboardBookmark.globalModifier')">
          <GlobalShortcutRecorder v-model="localConfig.keyboardBookmark.globalShortcutModifiers" />
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
