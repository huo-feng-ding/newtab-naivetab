<script setup lang="ts">
import { localConfig, localState } from '@/logic/store'
import CustomColorPicker from '@/components/CustomColorPicker.vue'
import SliderInput from '@/components/SliderInput.vue'
</script>

<template>
  <NForm
    label-placement="left"
    :label-width="120"
    :show-feedback="false"
  >
    <!-- Shell -->
    <NFormItem :label="$t('keyboardCommon.shell')">
      <NSwitch
        v-model:value="localConfig.keyboardCommon.isShellVisible"
        size="small"
      />
      <CustomColorPicker
        v-if="localConfig.keyboardCommon.isShellVisible"
        v-model:value="localConfig.keyboardCommon.shellColor[localState.currAppearanceCode]"
        class="setting__item-ele setting__item-ml"
      />
    </NFormItem>

    <template v-if="localConfig.keyboardCommon.isShellVisible">
      <NFormItem :label="`${$t('common.vertical')}${$t('common.margin')}`">
        <SliderInput
          v-model="localConfig.keyboardCommon.shellVerticalPadding"
          :step="1"
          :min="0"
          :max="100"
        />
      </NFormItem>

      <NFormItem :label="`${$t('common.horizontal')}${$t('common.margin')}`">
        <SliderInput
          v-model="localConfig.keyboardCommon.shellHorizontalPadding"
          :step="1"
          :min="0"
          :max="100"
        />
      </NFormItem>

      <NFormItem :label="$t('common.borderRadius')">
        <SliderInput
          v-model="localConfig.keyboardCommon.shellBorderRadius"
          :step="0.1"
          :min="0"
          :max="30"
        />
      </NFormItem>

      <NFormItem :label="$t('common.blur')">
        <SliderInput
          v-model="localConfig.keyboardCommon.shellBackgroundBlur"
          :step="0.1"
          :min="0"
          :max="30"
        />
      </NFormItem>

      <NFormItem
        :label="$t('common.shadow')"
        class="n-form-item--color"
      >
        <NSwitch
          v-model:value="localConfig.keyboardCommon.isShellShadowEnabled"
          size="small"
        />
        <CustomColorPicker
          v-model:value="localConfig.keyboardCommon.shellShadowColor[localState.currAppearanceCode]"
          class="setting__item-ele setting__item-ml"
        />
      </NFormItem>
    </template>

    <!-- Plate -->
    <NDivider title-placement="left">
      {{ $t('keyboardCommon.plate') }}
    </NDivider>

    <NFormItem :label="$t('keyboardCommon.plate')">
      <NSwitch
        v-model:value="localConfig.keyboardCommon.isPlateVisible"
        size="small"
      />
      <CustomColorPicker
        v-if="localConfig.keyboardCommon.isPlateVisible"
        v-model:value="localConfig.keyboardCommon.plateColor[localState.currAppearanceCode]"
        class="setting__item-ele setting__item-ml"
      />
    </NFormItem>

    <template v-if="localConfig.keyboardCommon.isPlateVisible">
      <NFormItem :label="`${$t('common.margin')}`">
        <SliderInput
          v-model="localConfig.keyboardCommon.platePadding"
          :step="0.1"
          :min="0"
          :max="10"
        />
      </NFormItem>

      <NFormItem :label="$t('common.borderRadius')">
        <SliderInput
          v-model="localConfig.keyboardCommon.plateBorderRadius"
          :step="0.1"
          :min="0"
          :max="10"
        />
      </NFormItem>

      <NFormItem :label="$t('common.blur')">
        <SliderInput
          v-model="localConfig.keyboardCommon.plateBackgroundBlur"
          :step="0.1"
          :min="0"
          :max="30"
        />
      </NFormItem>
    </template>
  </NForm>
</template>
