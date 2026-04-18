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
        v-model="localConfig.keyboard.keycapPadding"
        :step="0.1"
        :min="0"
        :max="10"
      />
    </NFormItem>

    <NFormItem :label="`${$t('common.size')}`">
      <SliderInput
        v-model="localConfig.keyboard.keycapSize"
        :step="1"
        :min="40"
        :max="150"
      />
    </NFormItem>

    <NFormItem :label="$t('common.borderRadius')">
      <SliderInput
        v-model="localConfig.keyboard.keycapBorderRadius"
        :step="0.1"
        :min="0"
        :max="100"
      />
    </NFormItem>

    <NFormItem :label="$t('common.blur')">
      <SliderInput
        v-model="localConfig.keyboard.keycapBackgroundBlur"
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
        v-model:value="localConfig.keyboard.isKeycapBorderEnabled"
        size="small"
      />
      <CustomColorPicker
        v-model:value="localConfig.keyboard.keycapBorderColor[localState.currAppearanceCode]"
        class="setting__item-ele setting__item-ml"
      />
      <NInputNumber
        v-model:value="localConfig.keyboard.keycapBorderWidth"
        class="setting__item-ele setting__item-ml setting__input-number"
        size="small"
        :step="1"
        :min="1"
        :max="10"
      />
    </NFormItem>

    <!-- 键帽内容 -->
    <NDivider title-placement="left">
      {{ $t('keyboard.keycap') }}
    </NDivider>

    <NFormItem :label="`${$t('keyboard.keycap')}${$t('common.font')}`">
      <NSwitch
        v-model:value="localConfig.keyboard.isCapKeyVisible"
        size="small"
      />
      <template v-if="localConfig.keyboard.isCapKeyVisible">
        <NSelect
          v-model:value="localConfig.keyboard.keycapKeyFontFamily"
          class="setting__item-ml"
          size="small"
          :options="availableFontOptions"
          :render-label="fontSelectRenderLabel"
        />
        <NInputNumber
          v-model:value="localConfig.keyboard.keycapKeyFontSize"
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
        v-model:value="localConfig.keyboard.isFaviconVisible"
        size="small"
      />
      <template v-if="localConfig.keyboard.isFaviconVisible">
        <div class="setting__item-ml setting__slider-wrap">
          <SliderInput
            v-model="localConfig.keyboard.faviconSize"
            :step="0.01"
            :min="0"
            :max="1"
          />
        </div>
      </template>
    </NFormItem>

    <NFormItem :label="`${$t('keyboard.nameLabel')}${$t('common.font')}`">
      <NSwitch
        v-model:value="localConfig.keyboard.isNameVisible"
        size="small"
      />
      <template v-if="localConfig.keyboard.isNameVisible">
        <NSelect
          v-model:value="localConfig.keyboard.keycapBookmarkFontFamily"
          class="setting__item-ml"
          size="small"
          :options="availableFontOptions"
          :render-label="fontSelectRenderLabel"
        />
        <NInputNumber
          v-model:value="localConfig.keyboard.keycapBookmarkFontSize"
          class="setting__item-ele setting__item-ml setting__input-number"
          size="small"
          :step="1"
          :min="5"
          :max="50"
        />
      </template>
    </NFormItem>

    <NFormItem :label="$t('keyboard.tactileBumps')">
      <NSwitch
        v-model:value="localConfig.keyboard.isTactileBumpsVisible"
        size="small"
      />
    </NFormItem>

    <!-- 颜色 -->
    <NDivider title-placement="left">
      {{ `${$t('keyboard.keycap')}${$t('common.color')}` }}
    </NDivider>

    <NFormItem :label="$t('keyboard.emphasisGroupNone')">
      <NFormItem
        :label="`${$t('common.fontColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboard.mainFontColor[localState.currAppearanceCode]" />
      </NFormItem>
      <NFormItem
        :label="`${$t('common.backgroundColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboard.mainBackgroundColor[localState.currAppearanceCode]" />
      </NFormItem>
    </NFormItem>

    <NFormItem :label="$t('keyboard.emphasisGroupOne')">
      <NFormItem
        :label="`${$t('common.fontColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboard.emphasisOneFontColor[localState.currAppearanceCode]" />
      </NFormItem>
      <NFormItem
        :label="`${$t('common.backgroundColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboard.emphasisOneBackgroundColor[localState.currAppearanceCode]" />
      </NFormItem>
    </NFormItem>

    <NFormItem :label="$t('keyboard.emphasisGroupTwo')">
      <NFormItem
        :label="`${$t('common.fontColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboard.emphasisTwoFontColor[localState.currAppearanceCode]" />
      </NFormItem>
      <NFormItem
        :label="`${$t('common.backgroundColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.keyboard.emphasisTwoBackgroundColor[localState.currAppearanceCode]" />
      </NFormItem>
    </NFormItem>

    <!-- 强调键分组 -->
    <NDivider title-placement="left">
      {{ $t('keyboard.emphasisKeyGroup') }}
    </NDivider>

    <NFormItem :show-label="false">
      <KeyboardEmphasisKeySetting />
    </NFormItem>
  </NForm>
</template>
