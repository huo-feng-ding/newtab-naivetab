<script setup lang="ts">
import { ICONS } from '@/logic/icons'
import { localConfig, localState } from '@/logic/store'
import SettingPaneWrap from '~/newtab/setting/SettingPaneWrap.vue'
import SettingIconGroup from '~/newtab/setting/SettingIconGroup.vue'
import CustomColorPicker from '~/components/CustomColorPicker.vue'
import SliderInput from '~/components/SliderInput.vue'
</script>

<template>
  <SettingPaneWrap
    widget-code="clockNeon"
    :border-radius-range="[0, 30]"
  >
    <template #header>
      <NFormItem :label="$t('clock.showSeconds')">
        <NSwitch
          v-model:value="localConfig.clockNeon.showSeconds"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.24hour')">
        <NSwitch
          v-model:value="localConfig.clockNeon.is24Hour"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.glowIntensity')">
        <SliderInput
          v-model="localConfig.clockNeon.glowIntensity"
          :step="1"
          :min="5"
          :max="50"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.showFrame')">
        <NSwitch
          v-model:value="localConfig.clockNeon.showFrame"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.showLabel')">
        <NSwitch
          v-model:value="localConfig.clockNeon.showLabel"
          size="small"
        />
      </NFormItem>

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

    <template #size>
      <NFormItem :label="$t('common.paddingVertical')">
        <SliderInput
          v-model="localConfig.clockNeon.paddingVertical"
          :step="1"
          :min="0"
          :max="100"
        />
      </NFormItem>

      <NFormItem :label="$t('common.paddingHorizontal')">
        <SliderInput
          v-model="localConfig.clockNeon.paddingHorizontal"
          :step="1"
          :min="0"
          :max="100"
        />
      </NFormItem>
    </template>

    <template #color>
      <SettingIconGroup
        :icon="ICONS.neonTimeColors"
        :label="$t('clock.neonTimeColorsLabel')"
      >
        <NFormItem
          :label="$t('clock.neonColor')"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.clockNeon.fontColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="$t('clock.neonSecondaryColor')"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.clockNeon.secondaryColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="$t('clock.neonAccentColor')"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.clockNeon.accentColor[localState.currAppearanceCode]" />
        </NFormItem>
      </SettingIconGroup>

      <SettingIconGroup
        :icon="ICONS.neonFrameColors"
        :label="$t('clock.neonFrameColorsLabel')"
      >
        <NFormItem
          :label="$t('clock.frameColor')"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.clockNeon.frameColor[localState.currAppearanceCode]" />
        </NFormItem>
      </SettingIconGroup>
    </template>
  </SettingPaneWrap>
</template>
