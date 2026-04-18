<script setup lang="ts">
import { computed } from 'vue'
import { localConfig } from '@/logic/store'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import { SliderField, SwitchField, FontField } from '@/setting/fields'

const showNumberScale = computed(() => localConfig.clockAnalog.showNumberScale)
</script>

<template>
  <SettingFormWrap widget-code="clockAnalog">
    <template #size>
      <SliderField
        v-model="localConfig.clockAnalog.width"
        :label="$t('common.width')"
        :min="10"
        :max="1000"
        :step="1"
      />
    </template>

    <template #typography>
      <SwitchField
        v-model="localConfig.clockAnalog.showNumberScale"
        :label="$t('clock.showNumberScale')"
      />
      <template v-if="showNumberScale">
        <SliderField
          v-model="localConfig.clockAnalog.numberScaleRadius"
          :label="$t('clock.numberScaleRadius')"
          :min="50"
          :max="95"
          :step="1"
        />
        <FontField
          v-model:font-family="localConfig.clockAnalog.numberScaleFontFamily"
          v-model:font-color="localConfig.clockAnalog.numberScaleFontColor"
          v-model:font-size="localConfig.clockAnalog.numberScaleFontSize"
          :label="$t('clock.numberScaleFont')"
        />
      </template>
    </template>
  </SettingFormWrap>
</template>
