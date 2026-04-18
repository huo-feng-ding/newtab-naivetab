<script setup lang="ts">
import { URL_DAYJS_FORMAT } from '@/logic/constants/urls'
import { localConfig } from '@/logic/store'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import Tips from '@/components/Tips.vue'
import { FontField, ToggleColorField, SliderField } from '@/setting/fields'
</script>

<template>
  <SettingFormWrap widget-code="date">
    <template #behavior>
      <NFormItem :label="$t('common.format')">
        <NInput
          v-model:value="localConfig.date.format"
          size="small"
        />
        <Tips
          link
          :content="URL_DAYJS_FORMAT"
        />
      </NFormItem>
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.date.fontFamily"
        v-model:font-color="localConfig.date.fontColor"
        v-model:font-size="localConfig.date.fontSize"
        :label="$t('common.font')"
      />

      <SliderField
        v-model="localConfig.date.letterSpacing"
        :label="$t('common.letterSpacing')"
        :min="0"
        :max="100"
        :step="0.1"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <ToggleColorField
        v-model:enable="localConfig.date.isShadowEnabled"
        v-model:color="localConfig.date.shadowColor"
        :label="$t('common.shadow')"
      />
    </template>
  </SettingFormWrap>
</template>
