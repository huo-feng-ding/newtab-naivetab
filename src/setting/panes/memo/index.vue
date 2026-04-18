<script setup lang="ts">
import { localConfig } from '@/logic/store'
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import { SliderField, ColorField, FontField, SwitchField, ToggleColorField } from '@/setting/fields'
</script>

<template>
  <SettingHeaderBar
    :title="$t('setting.memo')"
    widget-code="memo"
  />

  <SettingFormWrap widget-code="memo">
    <template #behavior>
      <SwitchField
        v-model="localConfig.memo.countEnabled"
        :label="$t('memo.wordCount')"
      />
    </template>

    <template #size>
      <SliderField
        v-model="localConfig.memo.width"
        :label="$t('common.width')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.memo.height"
        :label="$t('common.height')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.memo.borderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="100"
        :step="1"
      />
    </template>

    <template #typography>
      <FontField
        v-model:font-family="localConfig.memo.fontFamily"
        v-model:font-color="localConfig.memo.fontColor"
        v-model:font-size="localConfig.memo.fontSize"
        :label="$t('common.font')"
      />
    </template>

    <template #appearance>
      <ColorField
        v-model="localConfig.memo.backgroundColor"
        :label="$t('common.backgroundColor')"
      />

      <SliderField
        v-model="localConfig.memo.backgroundBlur"
        :label="$t('common.blur')"
        :min="0"
        :max="50"
        :step="0.1"
      />

      <ToggleColorField
        v-model:enable="localConfig.memo.isBorderEnabled"
        v-model:color="localConfig.memo.borderColor"
        v-model:width="localConfig.memo.borderWidth"
        :label="$t('common.border')"
      />

      <ToggleColorField
        v-model:enable="localConfig.memo.isShadowEnabled"
        v-model:color="localConfig.memo.shadowColor"
        :label="$t('common.shadow')"
      />
    </template>
  </SettingFormWrap>
</template>
