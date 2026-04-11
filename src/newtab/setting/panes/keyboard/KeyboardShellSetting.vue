<script setup lang="ts">
import { localConfig, localState } from '@/logic/store'
import CustomColorPicker from '~/components/CustomColorPicker.vue'
import SliderInput from '@/components/SliderInput.vue'
</script>

<template>
  <NForm
    label-placement="left"
    :label-width="120"
    :show-feedback="false"
  >
    <!-- Shell -->
    <NFormItem :label="$t('keyboard.shell')">
      <NSwitch
        v-model:value="localConfig.keyboard.isShellVisible"
        size="small"
      />
      <CustomColorPicker
        v-if="localConfig.keyboard.isShellVisible"
        v-model:value="localConfig.keyboard.shellColor[localState.currAppearanceCode]"
        class="setting__item-ele setting__item-ml"
      />
    </NFormItem>

    <template v-if="localConfig.keyboard.isShellVisible">
      <NFormItem :label="`${$t('common.vertical')}${$t('common.margin')}`">
        <SliderInput
          v-model="localConfig.keyboard.shellVerticalPadding"
          :step="1"
          :min="0"
          :max="100"
        />
      </NFormItem>

      <NFormItem :label="`${$t('common.horizontal')}${$t('common.margin')}`">
        <SliderInput
          v-model="localConfig.keyboard.shellHorizontalPadding"
          :step="1"
          :min="0"
          :max="100"
        />
      </NFormItem>

      <NFormItem :label="$t('common.borderRadius')">
        <SliderInput
          v-model="localConfig.keyboard.shellBorderRadius"
          :step="0.1"
          :min="0"
          :max="30"
        />
      </NFormItem>

      <NFormItem :label="$t('common.blur')">
        <SliderInput
          v-model="localConfig.keyboard.shellBackgroundBlur"
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
          v-model:value="localConfig.keyboard.isShellShadowEnabled"
          size="small"
        />
        <CustomColorPicker
          v-model:value="localConfig.keyboard.shellShadowColor[localState.currAppearanceCode]"
          class="setting__item-ele setting__item-ml"
        />
      </NFormItem>
    </template>

    <!-- Plate -->
    <NDivider title-placement="left">
      {{ $t('keyboard.plate') }}
    </NDivider>

    <NFormItem :label="$t('keyboard.plate')">
      <NSwitch
        v-model:value="localConfig.keyboard.isPlateVisible"
        size="small"
      />
      <CustomColorPicker
        v-if="localConfig.keyboard.isPlateVisible"
        v-model:value="localConfig.keyboard.plateColor[localState.currAppearanceCode]"
        class="setting__item-ele setting__item-ml"
      />
    </NFormItem>

    <template v-if="localConfig.keyboard.isPlateVisible">
      <NFormItem :label="`${$t('common.margin')}`">
        <SliderInput
          v-model="localConfig.keyboard.platePadding"
          :step="0.1"
          :min="0"
          :max="10"
        />
      </NFormItem>

      <NFormItem :label="$t('common.borderRadius')">
        <SliderInput
          v-model="localConfig.keyboard.plateBorderRadius"
          :step="0.1"
          :min="0"
          :max="10"
        />
      </NFormItem>

      <NFormItem :label="$t('common.blur')">
        <SliderInput
          v-model="localConfig.keyboard.plateBackgroundBlur"
          :step="0.1"
          :min="0"
          :max="30"
        />
      </NFormItem>
    </template>
  </NForm>
</template>
