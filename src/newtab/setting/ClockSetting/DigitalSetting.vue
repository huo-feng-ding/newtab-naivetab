<script setup lang="ts">
import { URL_DAYJS_FORMAT } from '@/logic/constants/index'
import { localConfig } from '@/logic/store'
import SettingPaneWrap from '~/newtab/setting/SettingPaneWrap.vue'
import Tips from '@/components/Tips.vue'
</script>

<template>
  <SettingPaneWrap
    widget-code="clockDigital"
    :width-range="[5, 500]"
  >
    <template #header>
      <NFormItem :label="$t('common.format')">
        <NInput
          v-model:value="localConfig.clockDigital.format"
          size="small"
        />
        <Tips
          link
          :content="URL_DAYJS_FORMAT"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.colonBlink')">
        <NSwitch
          v-model:value="localConfig.clockDigital.colonBlinkEnabled"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.apMark')">
        <NSwitch
          v-model:value="localConfig.clockDigital.unitEnabled"
          size="small"
        />
        <Transition name="setting-expand">
          <NSlider
            v-if="localConfig.clockDigital.unitEnabled"
            v-model:value="localConfig.clockDigital.unit.fontSize"
            class="setting__item-ml"
            :step="1"
            :min="5"
            :max="200"
            :tooltip="false"
          />
        </Transition>
        <Transition name="setting-expand">
          <NInputNumber
            v-if="localConfig.clockDigital.unitEnabled"
            v-model:value="localConfig.clockDigital.unit.fontSize"
            class="setting__item-ele setting__input-number"
            size="small"
            :min="5"
            :step="1"
          />
        </Transition>
      </NFormItem>
    </template>
  </SettingPaneWrap>
</template>
