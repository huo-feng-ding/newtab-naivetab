<script setup lang="ts">
import { ICONS } from '@/logic/icons'
import { localConfig } from '@/logic/store'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import SettingIconGroup from '@/setting/components/SettingIconGroup.vue'
import {
  SliderField,
  SwitchField,
  FontField,
  ToggleColorField,
  ColorField,
} from '@/setting/fields'
</script>

<template>
  <SettingFormWrap widget-code="clockNeon">
    <template #behavior>
      <SwitchField
        v-model="localConfig.clockNeon.showSeconds"
        :label="$t('clock.showSeconds')"
      />

      <SwitchField
        v-model="localConfig.clockNeon.is24Hour"
        :label="$t('clock.24hour')"
      />

      <SliderField
        v-model="localConfig.clockNeon.glowIntensity"
        :label="$t('clock.glowIntensity')"
        :min="0"
        :max="50"
        :step="0.1"
      />

      <SwitchField
        v-model="localConfig.clockNeon.showFrame"
        :label="$t('clock.showFrame')"
      />

      <SwitchField
        v-model="localConfig.clockNeon.showLabel"
        :label="$t('clock.showLabel')"
      />

      <Transition name="setting-slide">
        <NFormItem
          v-if="localConfig.clockNeon.showLabel"
          :label="$t('clock.labelText')"
        >
          <NInput
            v-model:value="localConfig.clockNeon.labelLeft"
            size="small"
            :placeholder="$t('clock.labelLeftPlaceholder')"
          />
          <NInput
            v-model:value="localConfig.clockNeon.labelRight"
            size="small"
            :placeholder="$t('clock.labelRightPlaceholder')"
          />
        </NFormItem>
      </Transition>
    </template>

    <!-- 尺寸样式 -->
    <template #size>
      <SliderField
        v-model="localConfig.clockNeon.paddingVertical"
        :label="$t('common.paddingVertical')"
        :min="0"
        :max="100"
        :step="0.1"
      />

      <SliderField
        v-model="localConfig.clockNeon.paddingHorizontal"
        :label="$t('common.paddingHorizontal')"
        :min="0"
        :max="100"
        :step="0.1"
      />

      <SliderField
        v-model="localConfig.clockNeon.borderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="100"
        :step="0.1"
      />
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.clockNeon.fontFamily"
        v-model:font-color="localConfig.clockNeon.fontColor"
        v-model:font-size="localConfig.clockNeon.fontSize"
        :label="$t('common.font')"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <ColorField
        v-model="localConfig.clockNeon.backgroundColor"
        :label="$t('common.backgroundColor')"
      />

      <ToggleColorField
        v-model:enable="localConfig.clockNeon.isBorderEnabled"
        v-model:color="localConfig.clockNeon.borderColor"
        v-model:width="localConfig.clockNeon.borderWidth"
        :label="$t('common.border')"
      />

      <SettingIconGroup
        :icon="ICONS.neonTimeColors"
        :label="$t('clock.neonTimeColorsLabel')"
      >
        <ColorField
          v-model="localConfig.clockNeon.fontColor"
          :label="$t('clock.neonColor')"
        />
        <ColorField
          v-model="localConfig.clockNeon.secondaryColor"
          :label="$t('clock.neonSecondaryColor')"
        />
        <ColorField
          v-model="localConfig.clockNeon.accentColor"
          :label="$t('clock.neonAccentColor')"
        />
      </SettingIconGroup>

      <SettingIconGroup
        :icon="ICONS.neonFrameColors"
        :label="$t('clock.neonFrameColorsLabel')"
      >
        <ColorField
          v-model="localConfig.clockNeon.frameColor"
          :label="$t('clock.frameColor')"
        />
      </SettingIconGroup>
    </template>
  </SettingFormWrap>
</template>
