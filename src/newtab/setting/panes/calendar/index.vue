<script setup lang="ts">
import { localConfig } from '@/logic/store'
import SettingPaneTitle from '~/newtab/setting/components/SettingPaneTitle.vue'
import SettingPaneContent from '~/newtab/setting/components/SettingPaneContent.vue'
import SettingIconGroup from '~/newtab/setting/components/SettingIconGroup.vue'
import { SliderField, SwitchField, ColorField, FontField, ToggleColorField } from '~/newtab/setting/fields'
import { ICONS } from '@/logic/icons'

const beginsList = computed(() => [
  { label: window.$t('calendar.monday'), value: 1 },
  { label: window.$t('calendar.sunday'), value: 7 },
])
</script>

<template>
  <SettingPaneTitle
    :title="$t('setting.calendar')"
    widget-code="calendar"
  />

  <SettingPaneContent widget-code="calendar">
    <!-- 功能配置 -->
    <template #behavior>
      <NFormItem :label="$t('calendar.weekBeginsOn')">
        <NRadioGroup
          v-model:value="localConfig.calendar.weekBeginsOn"
          size="small"
        >
          <NRadioButton
            v-for="item in beginsList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NRadioButton>
        </NRadioGroup>
      </NFormItem>

      <SwitchField
        v-model="localConfig.calendar.festivalCountdown"
        :label="$t('calendar.festivalCountdown')"
      />
    </template>

    <!-- 尺寸样式 -->
    <template #size>
      <SliderField
        v-model="localConfig.calendar.width"
        :label="$t('common.width')"
        :min="1"
        :max="100"
        :step="1"
      />

      <SliderField
        v-model="localConfig.calendar.borderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="50"
        :step="0.1"
      />
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.calendar.dayFontFamily"
        v-model:font-color="localConfig.calendar.dayFontColor"
        v-model:font-size="localConfig.calendar.dayFontSize"
        :label="`${$t('calendar.day')}${$t('common.font')}`"
      />

      <FontField
        v-model:font-family="localConfig.calendar.descFontFamily"
        v-model:font-color="localConfig.calendar.descFontColor"
        v-model:font-size="localConfig.calendar.descFontSize"
        :label="`${$t('calendar.desc')}${$t('common.font')}`"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <ColorField
        v-model="localConfig.calendar.backgroundColor"
        :label="$t('common.backgroundColor')"
      />

      <SliderField
        v-model="localConfig.calendar.backgroundBlur"
        :label="$t('common.blur')"
        :min="0"
        :max="30"
        :step="0.1"
      />

      <ToggleColorField
        v-model:enable="localConfig.calendar.isBorderEnabled"
        v-model:color="localConfig.calendar.borderColor"
        v-model:width="localConfig.calendar.borderWidth"
        :label="$t('common.border')"
      />

      <ToggleColorField
        v-model:enable="localConfig.calendar.isShadowEnabled"
        v-model:color="localConfig.calendar.shadowColor"
        :label="$t('common.shadow')"
      />

      <SettingIconGroup
        :icon="ICONS.calendarHoliday"
        :label="$t('calendar.holiday')"
      >
        <ColorField
          v-model="localConfig.calendar.holidayFontColor"
          :label="`${$t('calendar.desc')}${$t('common.fontColor')}`"
        />
      </SettingIconGroup>

      <SettingIconGroup
        :icon="ICONS.calendarToday"
        :label="$t('calendar.todayDesc')"
      >
        <ColorField
          v-model="localConfig.calendar.todayLabelFontColor"
          :label="`${$t('common.label')}${$t('common.fontColor')}`"
        />
        <ColorField
          v-model="localConfig.calendar.todayLabelBackgroundColor"
          :label="`${$t('common.label')}${$t('common.backgroundColor')}`"
        />
      </SettingIconGroup>
      <div class="setting__form_wrap">
        <ColorField
          v-model="localConfig.calendar.todayDayFontColor"
          :label="`${$t('calendar.day')}${$t('common.fontColor')}`"
        />
        <ColorField
          v-model="localConfig.calendar.todayDescFontColor"
          :label="`${$t('calendar.desc')}${$t('common.fontColor')}`"
        />
        <ColorField
          v-model="localConfig.calendar.todayItemBackgroundColor"
          :label="$t('common.backgroundColor')"
        />
      </div>

      <SettingIconGroup
        :icon="ICONS.calendarRest"
        :label="$t('calendar.restDesc')"
      >
        <ColorField
          v-model="localConfig.calendar.restLabelFontColor"
          :label="`${$t('common.label')}${$t('common.fontColor')}`"
        />
        <ColorField
          v-model="localConfig.calendar.restLabelBackgroundColor"
          :label="`${$t('common.label')}${$t('common.backgroundColor')}`"
        />
      </SettingIconGroup>
      <div class="setting__form_wrap">
        <ColorField
          v-model="localConfig.calendar.restDayFontColor"
          :label="`${$t('calendar.day')}${$t('common.fontColor')}`"
        />
        <ColorField
          v-model="localConfig.calendar.restDescFontColor"
          :label="`${$t('calendar.desc')}${$t('common.fontColor')}`"
        />
        <ColorField
          v-model="localConfig.calendar.restItemBackgroundColor"
          :label="$t('common.backgroundColor')"
        />
      </div>

      <SettingIconGroup
        :icon="ICONS.calendarWork"
        :label="$t('calendar.workDesc')"
      >
        <ColorField
          v-model="localConfig.calendar.workLabelFontColor"
          :label="`${$t('common.label')}${$t('common.fontColor')}`"
        />
        <ColorField
          v-model="localConfig.calendar.workLabelBackgroundColor"
          :label="`${$t('common.label')}${$t('common.backgroundColor')}`"
        />
      </SettingIconGroup>
      <div class="setting__form_wrap">
        <ColorField
          v-model="localConfig.calendar.workDayFontColor"
          :label="`${$t('calendar.day')}${$t('common.fontColor')}`"
        />
        <ColorField
          v-model="localConfig.calendar.workDescFontColor"
          :label="`${$t('calendar.desc')}${$t('common.fontColor')}`"
        />
        <ColorField
          v-model="localConfig.calendar.workItemBackgroundColor"
          :label="$t('common.backgroundColor')"
        />
      </div>
    </template>
  </SettingPaneContent>
</template>
