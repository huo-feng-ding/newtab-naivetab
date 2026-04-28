<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { globalState } from '@/logic/store'
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import AnalogSetting from './AnalogSetting.vue'
import DigitalSetting from './DigitalSetting.vue'
import FlipSetting from './FlipSetting.vue'
import NeonSetting from './NeonSetting.vue'
import DateSetting from './DateSetting.vue'

const ALL_SECTIONS = [
  'clockDigital',
  'clockAnalog',
  'clockFlip',
  'clockNeon',
  'date',
]
const expandedNames = ref<string[]>([])

watch(
  () => globalState.currSettingAnchor,
  (anchor) => {
    if (!anchor || !ALL_SECTIONS.includes(anchor)) {
      return
    }
    // 只展开目标 section，其余全部折叠
    expandedNames.value = [anchor]
    globalState.currSettingAnchor = ''
  },
  { immediate: true },
)
</script>

<template>
  <SettingHeaderBar :title="`${$t('setting.clock')} / ${$t('setting.date')}`" />

  <NCollapse
    v-model:expanded-names="expandedNames"
    class="setting__pane__content"
    display-directive="show"
    style="margin-top: 18px"
  >
    <NCollapseItem name="clockDigital">
      <template #header>
        <span class="setting__label setting__label--collapse">
          <Icon
            :icon="ICONS.clockDigital"
            class="label__icon"
          />
          {{ $t('setting.clockDigital') }}
        </span>
      </template>
      <DigitalSetting />
    </NCollapseItem>

    <NCollapseItem name="clockAnalog">
      <template #header>
        <span class="setting__label setting__label--collapse">
          <Icon
            :icon="ICONS.clockAnalog"
            class="label__icon"
          />
          {{ $t('setting.clockAnalog') }}
        </span>
      </template>
      <AnalogSetting />
    </NCollapseItem>

    <NCollapseItem name="clockFlip">
      <template #header>
        <span class="setting__label setting__label--collapse">
          <Icon
            :icon="ICONS.clockFlip"
            class="label__icon"
          />
          {{ $t('setting.clockFlip') }}
        </span>
      </template>
      <FlipSetting />
    </NCollapseItem>

    <NCollapseItem name="clockNeon">
      <template #header>
        <span class="setting__label setting__label--collapse">
          <Icon
            :icon="ICONS.clockNeon"
            class="label__icon"
          />
          {{ $t('setting.clockNeon') }}
        </span>
      </template>
      <NeonSetting />
    </NCollapseItem>

    <NCollapseItem name="date">
      <template #header>
        <span class="setting__label setting__label--collapse">
          <Icon
            :icon="ICONS.date"
            class="label__icon"
          />
          {{ $t('setting.date') }}
        </span>
      </template>
      <DateSetting />
    </NCollapseItem>
  </NCollapse>
</template>

<style>
.setting__label--collapse {
  margin: 0;
}
</style>
