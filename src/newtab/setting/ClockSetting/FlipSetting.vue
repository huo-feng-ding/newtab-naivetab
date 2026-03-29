<script setup lang="ts">
import { localConfig, localState } from '@/logic/store'
import SettingPaneWrap from '~/newtab/setting/SettingPaneWrap.vue'
import CustomColorPicker from '~/components/CustomColorPicker.vue'
import SliderInput from '~/components/SliderInput.vue'
</script>

<template>
  <SettingPaneWrap
    widget-code="clockFlip"
    :width-range="[20, 100]"
    :height-range="[30, 150]"
    :border-radius-range="[0, 20]"
  >
    <template #header>
      <NFormItem :label="$t('clock.showSeconds')">
        <NSwitch
          v-model:value="localConfig.clockFlip.showSeconds"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.24hour')">
        <NSwitch
          v-model:value="localConfig.clockFlip.is24Hour"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.showColon')">
        <NSwitch
          v-model:value="localConfig.clockFlip.showColon"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.colonBlink')">
        <NSwitch
          v-model:value="localConfig.clockFlip.colonBlinkEnabled"
          size="small"
          :disabled="!localConfig.clockFlip.showColon"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.cardGap')">
        <SliderInput
          v-model="localConfig.clockFlip.cardGap"
          :step="1"
          :min="0"
          :max="20"
        />
      </NFormItem>
    </template>

    <template #color>
      <NFormItem :label="$t('clock.cardColor')">
        <CustomColorPicker v-model:value="localConfig.clockFlip.cardColor[localState.currAppearanceCode]" />
      </NFormItem>

      <NFormItem :label="$t('clock.cardDividerColor')">
        <CustomColorPicker v-model:value="localConfig.clockFlip.cardDividerColor[localState.currAppearanceCode]" />
      </NFormItem>
    </template>
  </SettingPaneWrap>
</template>
