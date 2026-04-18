<script setup lang="ts">
import { localConfig } from '@/logic/store'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import { SliderField, SwitchField, FontField, ToggleColorField, ColorField } from '@/setting/fields'
</script>

<template>
  <SettingFormWrap widget-code="clockFlip">
    <!-- 功能配置 -->
    <template #behavior>
      <SwitchField
        v-model="localConfig.clockFlip.showSeconds"
        :label="$t('clock.showSeconds')"
      />

      <SwitchField
        v-model="localConfig.clockFlip.is24Hour"
        :label="$t('clock.24hour')"
      />

      <SwitchField
        v-model="localConfig.clockFlip.showColon"
        :label="$t('clock.showColon')"
      />

      <SwitchField
        v-model="localConfig.clockFlip.colonBlinkEnabled"
        :label="$t('clock.colonBlink')"
        :disabled="!localConfig.clockFlip.showColon"
      />
    </template>

    <!-- 尺寸样式 -->
    <template #size>
      <SliderField
        v-model="localConfig.clockFlip.width"
        :label="$t('common.width')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.clockFlip.height"
        :label="$t('common.height')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.clockFlip.borderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="100"
        :step="1"
      />

      <SliderField
        v-model="localConfig.clockFlip.cardGap"
        :label="$t('clock.cardGap')"
        :min="0"
        :max="100"
        :step="0.1"
      />
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.clockFlip.fontFamily"
        v-model:font-color="localConfig.clockFlip.fontColor"
        v-model:font-size="localConfig.clockFlip.fontSize"
        :label="$t('common.font')"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <ColorField
        v-model="localConfig.clockFlip.cardColor"
        :label="$t('clock.cardColor')"
      />

      <ColorField
        v-model="localConfig.clockFlip.cardDividerColor"
        :label="$t('clock.cardDividerColor')"
      />

      <ToggleColorField
        v-model:enable="localConfig.clockFlip.isShadowEnabled"
        v-model:color="localConfig.clockFlip.shadowColor"
        :label="$t('common.shadow')"
      />
    </template>
  </SettingFormWrap>
</template>
