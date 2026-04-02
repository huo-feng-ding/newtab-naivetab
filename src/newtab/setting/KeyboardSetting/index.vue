<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { isFirefox } from '@/env'
import { URL_FIREFOX_EXTENSIONS_SHORTCUTS } from '@/logic/constants/index'
import { requestPermission } from '@/logic/storage'
import { state as keyboardState, getSystemBookmarkForKeyboard } from '~/newtab/widgets/keyboard/logic'
import { localConfig, openConfigShortcutsPage } from '@/logic/store'
import SettingPaneTitle from '~/newtab/setting/SettingPaneTitle.vue'
import SettingPaneWrap from '~/newtab/setting/SettingPaneWrap.vue'
import Tips from '@/components/Tips.vue'
// import BookmarkConfig from './BookmarkConfig.vue'
import PresetThemeDrawer from './PresetThemeDrawer.vue'
import KeyboardStyleSetting from './KeyboardStyleSetting.vue'
import ShellSetting from './ShellSetting.vue'
import KeycapSetting from './KeycapSetting.vue'

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

const isOpenPopupVisible = ref(!!chrome.action.openPopup)

const onOpenPopup = () => {
  if (chrome.action.openPopup) {
    chrome.action.openPopup()
  }
}
</script>

<template>
  <PresetThemeDrawer v-model:show="state.isPresetThemeDrawerVisible" />

  <SettingPaneTitle
    :title="$t('setting.keyboard')"
    widget-code="keyboard"
  />

  <!-- 通用配置（margin / borderRadius）由 SettingPaneWrap 提供 -->
  <SettingPaneWrap
    widget-code="keyboard"
    :margin-range="[0, 20]"
    :border-radius-range="[0, 40]"
  >
    <template #header>
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

      <NFormItem :label="$t('keyboard.listenBackgroundKeystrokes')">
        <div class="setting__item_wrap">
          <div class="item__box">
            <NSwitch
              v-model:value="localConfig.keyboard.isListenBackgroundKeystrokes"
              size="small"
            />
            <Tips :content="`${$t('keyboard.listenBackgroundKeystrokesTips')} ${isFirefox ? URL_FIREFOX_EXTENSIONS_SHORTCUTS : ''}`" />
          </div>
          <Transition name="setting-expand">
            <div
              v-if="localConfig.keyboard.isListenBackgroundKeystrokes && !isFirefox"
              class="item__box"
            >
              <NButton
                type="primary"
                size="small"
                secondary
                class="action-btn action-btn--primary"
                @click="openConfigShortcutsPage()"
              >
                <Icon :icon="ICONS.keyboardCmdKey" />&nbsp;{{ $t('keyboard.customKeys') }}
              </NButton>
            </div>
          </Transition>
        </div>
      </NFormItem>

      <NFormItem :label="$t('keyboard.dblclickKeyToOpen')">
        <div class="setting__item_wrap">
          <div class="item__box">
            <NSwitch
              v-model:value="localConfig.keyboard.isDblclickOpen"
              size="small"
            />
            <Tips :content="$t('keyboard.dblclickKeyToOpenTips')" />
          </div>
          <Transition name="setting-expand">
            <div
              v-if="localConfig.keyboard.isDblclickOpen"
              class="item__box"
            >
              <span class="setting__item-ele">{{ $t('keyboard.intervalTime') }}</span>
              <NInputNumber
                v-model:value="localConfig.keyboard.dblclickIntervalTime"
                class="setting__item-ele setting__input-number--unit"
                size="small"
                :min="0"
                :step="1"
              >
                <template #suffix> ms </template>
              </NInputNumber>
              <Tips :content="$t('keyboard.intervalTimeTips')" />
            </div>
          </Transition>
        </div>
      </NFormItem>

      <NFormItem :label="$t('general.newTabOpen')">
        <NSwitch
          v-model:value="localConfig.keyboard.isNewTabOpen"
          size="small"
        />
      </NFormItem>

      <NFormItem
        v-if="isOpenPopupVisible"
        :label="$t('keyboard.configBookmark')"
      >
        <NButton
          type="primary"
          size="small"
          secondary
          class="action-btn action-btn--primary"
          @click="onOpenPopup()"
        >
          <Icon :icon="ICONS.openInNew" />&nbsp;{{ `${$t('common.open')}${$t('common.config')}` }}
        </NButton>
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
    </template>

    <template #footer>
      <!-- 折叠面板：键盘风格 / 外壳 / 按键帽 -->
      <NCollapse display-directive="show">
        <!-- 书签配置（已有 NCollapseItem 包裹） ，暂时隐藏，统一使用popup配置书签-->
        <!-- <BookmarkConfig /> -->

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
  </SettingPaneWrap>
</template>

<style>
.flip-list-move {
  transition: transform 0.8s ease;
}
</style>
