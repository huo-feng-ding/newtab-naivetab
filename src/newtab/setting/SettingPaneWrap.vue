<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { localConfig, localState, availableFontOptions, fontSelectRenderLabel } from '@/logic/store'
import { defaultConfig } from '@/logic/config'
import CustomColorPicker from '~/components/CustomColorPicker.vue'
import Tips from '@/components/Tips.vue'
import SliderInput from '@/components/SliderInput.vue'

const props = defineProps({
  widgetCode: {
    type: String,
    required: true,
  },
  dividerName: {
    type: String,
    default: '',
  },
  marginRange: {
    type: Array as () => number[],
    default: () => [0, 100],
  },
  paddingRange: {
    type: Array as () => number[],
    default: () => [0, 100],
  },
  widthRange: {
    type: Array as () => number[],
    default: () => [10, 100],
  },
  heightRange: {
    type: Array as () => number[],
    default: () => [10, 100],
  },
  borderRadiusRange: {
    type: Array as () => number[],
    default: () => [0, 100],
  },
  hideReset: {
    type: Boolean,
    default: false,
  },
})

const isRenderField = (field: string) => {
  return field in localConfig[props.widgetCode]
}

// ——— 重置逻辑 ———
const showResetConfirm = ref(false)

const hasWidgetCode = computed(() => !!props.widgetCode && props.widgetCode in defaultConfig)

const handleReset = () => {
  if (!hasWidgetCode.value) return
  const code = props.widgetCode as keyof typeof defaultConfig
  const current = localConfig[code] as any
  const defaultValue = JSON.parse(JSON.stringify(defaultConfig[code]))
  // 保留 enabled（开启状态）和 layout（位置信息），避免重置后意外关闭或移位
  const preserved: Record<string, any> = {}
  if (current.enabled !== undefined) preserved.enabled = current.enabled
  if (current.layout !== undefined) preserved.layout = JSON.parse(JSON.stringify(current.layout))
  Object.assign(localConfig[code], defaultValue, preserved)
  showResetConfirm.value = false
  window.$message?.success(window.$t('general.resetSettingValue'))
}
</script>

<template>
  <NForm
    label-placement="left"
    :label-width="120"
    :show-feedback="false"
  >
    <slot name="header" />

    <NDivider title-placement="left">
      {{ `${dividerName ? dividerName : $t('common.style')}` }}
    </NDivider>
    <slot name="style" />

    <!-- size -->
    <NFormItem
      v-if="isRenderField('margin')"
      :label="$t('common.margin')"
    >
      <SliderInput
        v-model="localConfig[props.widgetCode].margin"
        :step="0.1"
        :min="props.marginRange[0]"
        :max="props.marginRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('padding')"
      :label="$t('common.padding')"
    >
      <SliderInput
        v-model="localConfig[props.widgetCode].padding"
        :step="0.1"
        :min="props.paddingRange[0]"
        :max="props.paddingRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('width')"
      :label="$t('common.width')"
    >
      <SliderInput
        v-model="localConfig[props.widgetCode].width"
        :step="1"
        :min="props.widthRange[0]"
        :max="props.widthRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('height')"
      :label="$t('common.height')"
    >
      <SliderInput
        v-model="localConfig[props.widgetCode].height"
        :step="1"
        :min="props.heightRange[0]"
        :max="props.heightRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('borderRadius')"
      :label="$t('common.borderRadius')"
    >
      <SliderInput
        v-model="localConfig[props.widgetCode].borderRadius"
        :step="0.1"
        :min="props.borderRadiusRange[0]"
        :max="props.borderRadiusRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('backgroundBlur')"
      :label="$t('common.blur')"
    >
      <SliderInput
        v-model="localConfig[props.widgetCode].backgroundBlur"
        :step="0.1"
        :min="0"
        :max="30"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('fontFamily')"
      :label="$t('common.font')"
    >
      <NSelect
        v-model:value="localConfig[props.widgetCode].fontFamily"
        :options="availableFontOptions"
        :render-label="fontSelectRenderLabel"
        size="small"
      />
      <CustomColorPicker
        v-model:value="localConfig[props.widgetCode].fontColor[localState.currAppearanceCode]"
        class="setting__item-ele"
      />
      <NInputNumber
        v-model:value="localConfig[props.widgetCode].fontSize"
        class="setting__item-ele setting__input-number"
        size="small"
        :step="1"
        :min="5"
        :max="1000"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('letterSpacing')"
      :label="$t('common.letterSpacing')"
    >
      <SliderInput
        v-model="localConfig[props.widgetCode].letterSpacing"
        :step="0.1"
        :min="0"
        :max="50"
      />
    </NFormItem>

    <slot name="size" />

    <!-- color -->
    <NFormItem
      v-if="isRenderField('primaryColor')"
      :label="$t('common.primaryColor')"
      class="n-form-item--color"
    >
      <CustomColorPicker v-model:value="localConfig[props.widgetCode].primaryColor[localState.currAppearanceCode]" />
      <Tips :content="$t('general.primaryColorTips')" />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('backgroundColor')"
      :label="$t('common.backgroundColor')"
      class="n-form-item--color"
    >
      <CustomColorPicker v-model:value="localConfig[props.widgetCode].backgroundColor[localState.currAppearanceCode]" />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('borderColor')"
      :label="$t('common.border')"
      class="n-form-item--color"
    >
      <NSwitch
        v-model:value="localConfig[props.widgetCode].isBorderEnabled"
        size="small"
      />
      <CustomColorPicker
        v-if="isRenderField('isBorderEnabled')"
        v-model:value="localConfig[props.widgetCode].borderColor[localState.currAppearanceCode]"
        class="setting__item-ele"
      />
      <NInputNumber
        v-if="isRenderField('borderWidth')"
        v-model:value="localConfig[props.widgetCode].borderWidth"
        class="setting__item-ele setting__input-number"
        size="small"
        :step="1"
        :min="1"
        :max="10"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('shadowColor')"
      :label="$t('common.shadow')"
      class="n-form-item--color"
    >
      <NSwitch
        v-model:value="localConfig[props.widgetCode].isShadowEnabled"
        size="small"
      />
      <CustomColorPicker
        v-if="isRenderField('isShadowEnabled')"
        v-model:value="localConfig[props.widgetCode].shadowColor[localState.currAppearanceCode]"
        class="setting__item-ele"
      />
    </NFormItem>

    <slot name="color" />

    <slot name="footer" />

    <!-- 底部重置按钮 -->
    <div
      v-if="hasWidgetCode && !props.hideReset"
      class="setting-pane-wrap__reset-wrap"
    >
      <NPopconfirm
        v-model:show="showResetConfirm"
        placement="top"
        @positive-click="handleReset"
      >
        <template #trigger>
          <div class="setting-pane-wrap__reset-btn">
            <Icon
              :icon="ICONS.restoreTwotone"
              class="reset-btn__icon"
            />
            <span class="reset-btn__label">{{ $t('general.resetSettingValue') }} "{{ $t('setting.' + props.widgetCode) }}"</span>
          </div>
        </template>
        {{ `${$t('common.confirm')} ${$t('general.resetSettingValue')} "${$t('setting.' + props.widgetCode)}"?` }}
      </NPopconfirm>
    </div>
  </NForm>
</template>

<style scoped>
.setting-pane-wrap__reset-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-4);
  margin-bottom: var(--space-1);
}

.setting-pane-wrap__reset-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px var(--space-3);
  border-radius: var(--radius-md);
  border: 1px dashed rgba(208, 48, 80, 0.28);
  cursor: pointer;
  transition: background-color var(--transition-base), border-color var(--transition-base), color var(--transition-base), box-shadow var(--transition-base);
  color: rgba(208, 48, 80, 0.55);
  user-select: none;

  .reset-btn__icon {
    font-size: var(--text-xs);
    flex-shrink: 0;
    transition: transform var(--transition-slow);
  }

  .reset-btn__label {
    font-size: var(--text-xs);
    line-height: 1;
    letter-spacing: 0.1px;
  }

  &:hover {
    background-color: rgba(208, 48, 80, 0.06);
    border-color: rgba(208, 48, 80, 0.45);
    border-style: solid;
    color: #d03050;
    box-shadow: 0 0 0 2px rgba(208, 48, 80, 0.08);

    .reset-btn__icon {
      transform: rotate(-30deg);
    }
  }
}
</style>
