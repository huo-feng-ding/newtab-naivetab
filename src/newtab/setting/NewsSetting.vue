<script setup lang="ts">
import { globalState, localConfig, localState } from '@/logic/store'
import BaseComponentCardTitle from '@/newtab/components/form/BaseComponentCardTitle.vue'
import BaseComponentSetting from '@/newtab/components/form/BaseComponentSetting.vue'
import CustomColorPicker from '@/newtab/components/form/CustomColorPicker.vue'

const newsSourceList = computed(() => [
  { label: window.$t('news.toutiao'), value: 'toutiao' },
  { label: window.$t('news.baidu'), value: 'baidu' },
  { label: window.$t('news.zhihu'), value: 'zhihu' },
  { label: window.$t('news.weibo'), value: 'weibo' },
  { label: window.$t('news.kr36'), value: 'kr36' },
  { label: window.$t('news.v2ex'), value: 'v2ex' },
  // { label: window.$t('news.bilibili'), value: 'bilibili' },
])

const handleUpdateValue = () => {
  globalState.currNewsTabValue = localConfig.news.sourceList[0] || ''
}
</script>

<template>
  <BaseComponentCardTitle :title="$t('setting.news')" />

  <BaseComponentSetting
    cname="news"
    :width-range="[200, 1000]"
    :height-range="[50, 1000]"
  >
    <template #header>
      <NFormItem :label="$t('news.source')">
        <NSelect
          v-model:value="localConfig.news.sourceList"
          :options="newsSourceList"
          size="small"
          max-tag-count="responsive"
          multiple
          clearable
          @update:value="handleUpdateValue"
        />
      </NFormItem>
      <NFormItem :label="$t('news.refreshInterval')">
        <NInputNumber
          v-model:value="localConfig.news.refreshIntervalTime"
          class="setting__input-number--unit"
          size="small"
          :step="1"
          :min="30"
          :max="1000"
        >
          <template #suffix> min </template>
        </NInputNumber>
      </NFormItem>
    </template>

    <template #color>
      <div class="setting__form_wrap">
        <NFormItem
          :label="`URL${$t('common.activeColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.news.urlActiveColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('common.label')}${$t('common.activeColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.news.tabActiveBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>
    </template>
  </BaseComponentSetting>
</template>
