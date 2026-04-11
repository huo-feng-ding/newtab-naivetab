<script setup lang="ts">
import { URL_DAYJS_FORMAT } from '@/logic/constants/index'
import { localConfig } from '@/logic/store'
import SettingPaneContent from '~/newtab/setting/components/SettingPaneContent.vue'
import Tips from '@/components/Tips.vue'
import { SliderField, SwitchField, FontField, ToggleColorField } from '~/newtab/setting/fields'
</script>

<template>
  <SettingPaneContent widget-code="clockDigital">
    <!-- 功能配置 -->
    <template #behavior>
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

      <SwitchField
        v-model="localConfig.clockDigital.colonBlinkEnabled"
        :label="$t('clock.colonBlink')"
      />

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
            class="setting__item-ele setting__item-ml setting__input-number"
            size="small"
            :min="5"
            :step="1"
          />
        </Transition>
      </NFormItem>
    </template>

    <!-- 尺寸样式 -->
    <template #size>
      <SliderField
        v-model="localConfig.clockDigital.width"
        :label="$t('common.width')"
        :min="10"
        :max="1000"
        :step="1"
      />
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.clockDigital.fontFamily"
        v-model:font-color="localConfig.clockDigital.fontColor"
        v-model:font-size="localConfig.clockDigital.fontSize"
        :label="$t('common.font')"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <ToggleColorField
        v-model:enable="localConfig.clockDigital.isShadowEnabled"
        v-model:color="localConfig.clockDigital.shadowColor"
        :label="$t('common.shadow')"
      />
    </template>
  </SettingPaneContent>
</template>
