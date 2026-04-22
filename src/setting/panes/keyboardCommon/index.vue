<script setup lang="ts">
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import PresetThemeDrawer from './PresetThemeDrawer.vue'
import KeyboardStyleSetting from './KeyboardStyleSetting.vue'
import KeycapSetting from './KeyboardKeycapSetting.vue'
import KeyboardShellSetting from './KeyboardShellSetting.vue'

const state = reactive({
  isPresetThemeDrawerVisible: false,
})
</script>

<template>
  <PresetThemeDrawer v-model:show="state.isPresetThemeDrawerVisible" />

  <SettingHeaderBar
    :title="$t('setting.keyboardCommon')"
    widget-code="keyboardCommon"
  />

  <SettingFormWrap widget-code="keyboardCommon">
    <!-- 功能配置 -->
    <template #behavior>
      <NFormItem :label="$t('keyboardCommon.presetTheme')">
        <NButton
          type="primary"
          size="small"
          secondary
          class="setting__item-ele setting__item-ml action-btn action-btn--primary"
          @click="state.isPresetThemeDrawerVisible = true"
        >
          {{ $t('common.select') }}
        </NButton>
      </NFormItem>

      <NCollapse display-directive="show">
        <NCollapseItem name="keyboardStyle">
          <template #header>
            <span class="setting__label setting__label--collapse">
              {{ `${$t('keyboardCommon.keyboard')}${$t('common.config')}` }}
            </span>
          </template>
          <KeyboardStyleSetting />
        </NCollapseItem>

        <NCollapseItem name="keycapSetting">
          <template #header>
            <span class="setting__label setting__label--collapse">
              {{ `${$t('keyboardCommon.keycap')}${$t('common.config')}` }}
            </span>
          </template>
          <KeycapSetting />
        </NCollapseItem>

        <NCollapseItem name="shellSetting">
          <template #header>
            <span class="setting__label setting__label--collapse">
              {{ `${$t('keyboardCommon.shell')} / ${$t('keyboardCommon.plate')}${$t('common.config')}` }}
            </span>
          </template>
          <KeyboardShellSetting />
        </NCollapseItem>
      </NCollapse>
    </template>
  </SettingFormWrap>
</template>
