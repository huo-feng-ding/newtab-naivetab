<script setup lang="ts">
import { localConfig, localState } from '@/logic/store'
import SettingPaneTitle from '~/newtab/setting/components/SettingPaneTitle.vue'
import SettingPaneContent from '~/newtab/setting/components/SettingPaneContent.vue'
import { SliderField, ColorField, FontField, SwitchField, ToggleColorField } from '~/newtab/setting/fields'

// 将总秒数拆为 h/m/s 供分项输入
const durationHours = computed({
  get: () => Math.floor(localConfig.countdown.defaultDuration / 3600),
  set: (h: number) => {
    const m = Math.floor((localConfig.countdown.defaultDuration % 3600) / 60)
    const s = localConfig.countdown.defaultDuration % 60
    localConfig.countdown.defaultDuration = Math.max(1, h * 3600 + m * 60 + s)
  },
})

const durationMinutes = computed({
  get: () => Math.floor((localConfig.countdown.defaultDuration % 3600) / 60),
  set: (m: number) => {
    const h = Math.floor(localConfig.countdown.defaultDuration / 3600)
    const s = localConfig.countdown.defaultDuration % 60
    localConfig.countdown.defaultDuration = Math.max(1, h * 3600 + m * 60 + s)
  },
})

const durationSeconds = computed({
  get: () => localConfig.countdown.defaultDuration % 60,
  set: (s: number) => {
    const h = Math.floor(localConfig.countdown.defaultDuration / 3600)
    const m = Math.floor((localConfig.countdown.defaultDuration % 3600) / 60)
    localConfig.countdown.defaultDuration = Math.max(1, h * 3600 + m * 60 + s)
  },
})
</script>

<template>
  <SettingPaneTitle
    :title="$t('setting.countdown')"
    widget-code="countdown"
  />

  <SettingPaneContent widget-code="countdown">
    <!-- 行为设置 -->
    <template #behavior>
      <SwitchField
        v-model="localConfig.countdown.showHours"
        :label="$t('countdown.showHours')"
      />

      <NFormItem :label="$t('countdown.defaultDuration')">
        <div class="duration__inputs">
          <NInputNumber
            v-if="localConfig.countdown.showHours"
            v-model:value="durationHours"
            class="setting__input-number"
            size="small"
            :min="0"
            :max="99"
            :step="1"
          >
            <template #suffix>
              h
            </template>
          </NInputNumber>
          <NInputNumber
            v-model:value="durationMinutes"
            class="setting__input-number"
            size="small"
            :min="0"
            :max="59"
            :step="1"
          >
            <template #suffix>
              m
            </template>
          </NInputNumber>
          <NInputNumber
            v-model:value="durationSeconds"
            class="setting__input-number"
            size="small"
            :min="0"
            :max="59"
            :step="1"
          >
            <template #suffix>
              s
            </template>
          </NInputNumber>
        </div>
      </NFormItem>

      <NFormItem :label="$t('countdown.label')">
        <NInput
          v-model:value="localConfig.countdown.label"
          size="small"
          clearable
        />
      </NFormItem>
    </template>

    <!-- 尺寸样式 -->
    <template #size>
      <SliderField
        v-model="localConfig.countdown.size"
        :label="$t('common.size')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.countdown.strokeWidth"
        :label="$t('countdown.strokeWidth')"
        :min="0"
        :max="50"
        :step="0.1"
      />
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <!-- 时钟字体 -->
      <FontField
        v-model:font-family="localConfig.countdown.clockFontFamily"
        v-model:font-color="localConfig.countdown.clockFontColor"
        v-model:font-size="localConfig.countdown.clockFontSize"
        :label="`${$t('countdown.clock')}${$t('common.font')}`"
      />
      <!-- 标签字体 -->
      <FontField
        v-model:font-family="localConfig.countdown.labelFontFamily"
        v-model:font-color="localConfig.countdown.labelFontColor"
        v-model:font-size="localConfig.countdown.labelFontSize"
        :label="`${$t('countdown.label')}${$t('common.font')}`"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <ColorField
        v-model="localConfig.countdown.backgroundColor"
        :label="$t('common.backgroundColor')"
      />

      <SliderField
        v-model="localConfig.countdown.backgroundBlur"
        :label="$t('common.blur')"
        :min="0"
        :max="30"
        :step="0.1"
      />

      <ColorField
        v-model="localConfig.countdown.progressColor"
        :label="$t('countdown.progressColor')"
      />

      <ColorField
        v-model="localConfig.countdown.trackColor"
        :label="$t('countdown.trackColor')"
      />

      <ToggleColorField
        v-model:enable="localConfig.countdown.isBorderEnabled"
        v-model:color="localConfig.countdown.borderColor"
        v-model:width="localConfig.countdown.borderWidth"
        :label="$t('common.border')"
      />

      <ToggleColorField
        v-model:enable="localConfig.countdown.isShadowEnabled"
        v-model:color="localConfig.countdown.shadowColor"
        :label="$t('common.shadow')"
      />
    </template>
  </SettingPaneContent>
</template>

<style scoped>
.duration__inputs {
  display: flex;
  gap: 6px;
}
</style>
