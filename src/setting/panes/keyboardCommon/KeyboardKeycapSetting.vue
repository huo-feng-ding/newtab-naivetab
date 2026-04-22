<script setup lang="ts">
import { localConfig, localState, availableFontOptions, fontSelectRenderLabel } from '@/logic/store'
import CustomColorPicker from '@/components/CustomColorPicker.vue'
import SliderInput from '@/components/SliderInput.vue'
import KeyboardEmphasisKeySetting from './KeyboardEmphasisKeySetting.vue'
</script>

<template>
  <NForm
    label-placement="left"
    :label-width="120"
    :show-feedback="false"
  >
    <!-- 尺寸与形状 -->
    <NFormItem :label="`${$t('common.margin')}`">
      <SliderInput
        v-model="localConfig.keyboardCommon.keycapPadding"
        :step="0.1"
        :min="0"
        :max="10"
      />
    </NFormItem>

    <NFormItem :label="`${$t('common.size')}`">
      <SliderInput
        v-model="localConfig.keyboardCommon.keycapSize"
        :step="1"
        :min="40"
        :max="150"
      />
    </NFormItem>

    <NFormItem :label="$t('common.borderRadius')">
      <SliderInput
        v-model="localConfig.keyboardCommon.keycapBorderRadius"
        :step="0.1"
        :min="0"
        :max="100"
      />
    </NFormItem>

    <NFormItem :label="$t('common.blur')">
      <SliderInput
        v-model="localConfig.keyboardCommon.keycapBackgroundBlur"
        :step="0.1"
        :min="0"
        :max="30"
      />
    </NFormItem>

    <NFormItem
      :label="$t('common.border')"
      class="n-form-item--color"
    >
      <NSwitch
        v-model:value="localConfig.keyboardCommon.isKeycapBorderEnabled"
        size="small"
      />
      <CustomColorPicker
        v-model:value="localConfig.keyboardCommon.keycapBorderColor[localState.currAppearanceCode]"
        class="setting__item-ele setting__item-ml"
      />
      <NInputNumber
        v-model:value="localConfig.keyboardCommon.keycapBorderWidth"
        class="setting__item-ele setting__item-ml setting__input-number"
        size="small"
        :step="1"
        :min="1"
        :max="10"
      />
    </NFormItem>

    <!-- 键帽内容 -->
    <NDivider title-placement="left">
      {{ $t('keyboardCommon.keycap') }}
    </NDivider>

    <NFormItem :label="`${$t('keyboardCommon.keycap')}${$t('common.font')}`">
      <NSwitch
        v-model:value="localConfig.keyboardCommon.isCapKeyVisible"
        size="small"
      />
      <template v-if="localConfig.keyboardCommon.isCapKeyVisible">
        <NSelect
          v-model:value="localConfig.keyboardCommon.keycapKeyFontFamily"
          class="setting__item-ml"
          size="small"
          :options="availableFontOptions"
          :render-label="fontSelectRenderLabel"
        />
        <NInputNumber
          v-model:value="localConfig.keyboardCommon.keycapKeyFontSize"
          class="setting__item-ele setting__item-ml setting__input-number"
          size="small"
          :step="1"
          :min="5"
          :max="50"
        />
      </template>
    </NFormItem>

    <NFormItem :label="`${$t('common.icon')}${$t('common.size')}`">
      <NSwitch
        v-model:value="localConfig.keyboardCommon.isFaviconVisible"
        size="small"
      />
      <template v-if="localConfig.keyboardCommon.isFaviconVisible">
        <div class="setting__item-ml setting__slider-wrap">
          <SliderInput
            v-model="localConfig.keyboardCommon.faviconSize"
            :step="0.01"
            :min="0"
            :max="1"
          />
        </div>
      </template>
    </NFormItem>

    <NFormItem :label="`${$t('keyboardCommon.nameLabel')}${$t('common.font')}`">
      <NSwitch
        v-model:value="localConfig.keyboardCommon.isNameVisible"
        size="small"
      />
      <template v-if="localConfig.keyboardCommon.isNameVisible">
        <NSelect
          v-model:value="localConfig.keyboardCommon.keycapBookmarkFontFamily"
          class="setting__item-ml"
          size="small"
          :options="availableFontOptions"
          :render-label="fontSelectRenderLabel"
        />
        <NInputNumber
          v-model:value="localConfig.keyboardCommon.keycapBookmarkFontSize"
          class="setting__item-ele setting__item-ml setting__input-number"
          size="small"
          :step="1"
          :min="5"
          :max="50"
        />
      </template>
    </NFormItem>

    <NFormItem :label="$t('keyboardCommon.tactileBumps')">
      <NSwitch
        v-model:value="localConfig.keyboardCommon.isTactileBumpsVisible"
        size="small"
      />
    </NFormItem>

    <!-- 颜色 -->
    <NDivider title-placement="left">
      {{ `${$t('keyboardCommon.keycap')}${$t('common.color')}` }}
    </NDivider>

    <NFormItem :label="$t('keyboardCommon.emphasisGroupNone')">
      <NFormItem
        :label="`${$t('common.fontColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboardCommon.mainFontColor[localState.currAppearanceCode]" />
      </NFormItem>
      <NFormItem
        :label="`${$t('common.backgroundColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboardCommon.mainBackgroundColor[localState.currAppearanceCode]" />
      </NFormItem>
    </NFormItem>

    <NFormItem :label="$t('keyboardCommon.emphasisGroupOne')">
      <NFormItem
        :label="`${$t('common.fontColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboardCommon.emphasisOneFontColor[localState.currAppearanceCode]" />
      </NFormItem>
      <NFormItem
        :label="`${$t('common.backgroundColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboardCommon.emphasisOneBackgroundColor[localState.currAppearanceCode]" />
      </NFormItem>
    </NFormItem>

    <NFormItem :label="$t('keyboardCommon.emphasisGroupTwo')">
      <NFormItem
        :label="`${$t('common.fontColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboardCommon.emphasisTwoFontColor[localState.currAppearanceCode]" />
      </NFormItem>
      <NFormItem
        :label="`${$t('common.backgroundColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboardCommon.emphasisTwoBackgroundColor[localState.currAppearanceCode]" />
      </NFormItem>
    </NFormItem>

    <!-- 强调键分组 -->
    <NDivider title-placement="left">
      {{ $t('keyboardCommon.emphasisKeyGroup') }}
    </NDivider>

    <NFormItem :show-label="false">
      <KeyboardEmphasisKeySetting />
    </NFormItem>
  </NForm>
</template>
