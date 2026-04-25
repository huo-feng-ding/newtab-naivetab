<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { URL_DAYJS_FORMAT } from '@/logic/constants/urls'
import { localConfig } from '@/logic/store'
import Tips from '@/components/Tips.vue'
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import {
  SliderField,
  SwitchField,
  ColorField,
  FontField,
  ToggleColorField,
} from '@/setting/fields'
import SliderInput from '@/components/SliderInput.vue'
</script>

<template>
  <SettingHeaderBar
    :title="$t('setting.yearProgress')"
    widget-code="yearProgress"
  />

  <SettingFormWrap widget-code="yearProgress">
    <!-- 功能配置 -->
    <template #behavior>
      <p class="setting__label">
        <Icon
          :icon="ICONS.yearProgressLeftText"
          class="label__icon"
        />
        {{ `${$t('common.left')}-${$t('common.text')}${$t('common.config')}` }}
      </p>

      <SwitchField
        v-model="localConfig.yearProgress.isRealtime"
        :label="`${$t('yearProgress.isRealtime')}`"
      />

      <NFormItem :label="`${$t('yearProgress.percentage')}`">
        <div class="setting__item_wrap">
          <div class="item__box">
            <NSwitch
              v-model:value="localConfig.yearProgress.isPercentageEnabled"
              size="small"
            />
          </div>
          <div class="item__box">
            <NInputNumber
              v-model:value="localConfig.yearProgress.percentageDecimal"
              class="setting__input-number--unit"
              size="small"
              :step="1"
              :min="0"
              :max="6"
            >
              <template #prefix>
                {{ `${$t('yearProgress.decimal')}` }}
              </template>
            </NInputNumber>
          </div>
        </div>
      </NFormItem>

      <NFormItem :label="`${$t('setting.date')}`">
        <NSwitch
          v-model:value="localConfig.yearProgress.isDateEnabled"
          size="small"
        />
        <Transition name="setting-expand">
          <div
            v-if="localConfig.yearProgress.isDateEnabled"
            class="setting__item_wrap"
          >
            <NInput
              v-model:value="localConfig.yearProgress.format"
              class="setting__item-ml"
              size="small"
            />
            <Tips
              link
              :content="URL_DAYJS_FORMAT"
            />
          </div>
        </Transition>
      </NFormItem>

      <NFormItem :label="`${$t('common.lineHeight')}`">
        <SliderInput
          v-model="localConfig.yearProgress.textLineHeight"
          :step="0.1"
          :min="0"
          :max="5"
        />
      </NFormItem>

      <ColorField
        v-model="localConfig.yearProgress.textActiveColor"
        :label="`${$t('common.active')}${$t('common.fontColor')}`"
      />

      <p class="setting__label">
        <Icon
          :icon="ICONS.yearProgressRightBlock"
          class="label__icon"
        />
        {{
          `${$t('common.right')}-${$t('yearProgress.block')}${$t('common.config')}`
        }}
      </p>

      <NFormItem :label="`${$t('yearProgress.block')}${$t('common.margin')}`">
        <SliderInput
          v-model="localConfig.yearProgress.blockMargin"
          :step="0.1"
          :min="0"
          :max="10"
        />
      </NFormItem>
      <NFormItem :label="`${$t('yearProgress.block')}${$t('common.size')}`">
        <SliderInput
          v-model="localConfig.yearProgress.blockSize"
          :step="0.1"
          :min="2"
          :max="10"
        />
      </NFormItem>
      <NFormItem
        :label="`${$t('yearProgress.block')}${$t('common.borderRadius')}`"
      >
        <SliderInput
          v-model="localConfig.yearProgress.blockRadius"
          :step="0.1"
          :min="0"
          :max="10"
        />
      </NFormItem>
      <div class="setting__form_wrap">
        <ColorField
          v-model="localConfig.yearProgress.blockDefaultColor"
          :label="`${$t('common.default')}${$t('common.backgroundColor')}`"
        />
        <ColorField
          v-model="localConfig.yearProgress.blockActiveColor"
          :label="`${$t('common.active')}${$t('common.backgroundColor')}`"
        />
      </div>
    </template>

    <!-- 尺寸样式 -->
    <template #size>
      <SliderField
        v-model="localConfig.yearProgress.padding"
        :label="$t('common.padding')"
        :min="0"
        :max="100"
        :step="1"
      />

      <SliderField
        v-model="localConfig.yearProgress.width"
        :label="$t('common.width')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.yearProgress.height"
        :label="$t('common.height')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.yearProgress.borderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="100"
        :step="1"
      />
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.yearProgress.fontFamily"
        v-model:font-color="localConfig.yearProgress.fontColor"
        v-model:font-size="localConfig.yearProgress.fontSize"
        :label="$t('common.font')"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <ColorField
        v-model="localConfig.yearProgress.backgroundColor"
        :label="$t('common.backgroundColor')"
      />

      <SliderField
        v-model="localConfig.yearProgress.backgroundBlur"
        :label="$t('common.blur')"
        :min="0"
        :max="50"
        :step="0.1"
      />

      <ToggleColorField
        v-model:enable="localConfig.yearProgress.isBorderEnabled"
        v-model:color="localConfig.yearProgress.borderColor"
        v-model:width="localConfig.yearProgress.borderWidth"
        :label="$t('common.border')"
      />

      <ToggleColorField
        v-model:enable="localConfig.yearProgress.isShadowEnabled"
        v-model:color="localConfig.yearProgress.shadowColor"
        :label="$t('common.shadow')"
      />
    </template>
  </SettingFormWrap>
</template>
