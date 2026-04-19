<script setup lang="ts">
import { SEARCH_ENGINE_LIST } from '@/logic/constants/search'
import { localConfig } from '@/logic/store'
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import { SliderField, SwitchField, FontField, ToggleColorField, ColorField } from '@/setting/fields'

const state = reactive({
  searchEngine: '',
})

watch(
  () => localConfig.search.urlName,
  () => {
    state.searchEngine = localConfig.search.urlName === 'custom' ? 'custom' : localConfig.search.urlValue
  },
  {
    immediate: true,
  },
)

const onChangeSearch = (value: string, option: SelectStringItem) => {
  if (value === 'custom') {
    localConfig.search.urlName = 'custom'
    return
  }
  localConfig.search.urlName = option.label
  localConfig.search.urlValue = value
}

const searchEngineList = computed(() => {
  return [
    {
      label: window.$t('common.custom'),
      value: 'custom',
      icon: '',
    },
    ...SEARCH_ENGINE_LIST,
  ]
})

const searchSelectRenderLabel = (option: typeof SEARCH_ENGINE_LIST[0]) => {
  return [
    h(
      'div',
      {
        style: {
          width: '100%',
          display: 'flex',
          alignItems: 'center',
        },
      },
      [
        h(
          'div',
          {
            style: {
              marginRight: '10px',
              width: '15px',
              height: '15px',
            },
          },
          [
            h(
              'img',
              {
                style: {
                  width: '100%',
                  display: option.icon ? 'auto' : 'none',
                },
                src: option.icon,
              },
            ),
          ],
        ),
        h('span', {}, option.label),
      ],
    ),
  ]
}
</script>

<template>
  <SettingHeaderBar
    :title="$t('setting.search')"
    widget-code="search"
  />

  <SettingFormWrap widget-code="search">
    <!-- 功能配置 -->
    <template #behavior>
      <NFormItem :label="$t('search.searchEngine')">
        <NSelect
          v-model:value="state.searchEngine"
          :options="searchEngineList"
          :render-label="searchSelectRenderLabel"
          size="small"
          @update:value="onChangeSearch"
        />
      </NFormItem>
      <Transition name="setting-slide">
        <NFormItem
          v-if="localConfig.search.urlName === 'custom'"
          :label="$t('search.customEngine')"
        >
          <NInput
            v-model:value="localConfig.search.urlValue"
            type="text"
            size="small"
            placeholder="https://example/search?q={query}"
          />
        </NFormItem>
      </Transition>
      <NFormItem :label="$t('search.placeholder')">
        <NInput
          v-model:value="localConfig.search.placeholder"
          type="text"
          size="small"
          :placeholder="localConfig.search.urlName"
        />
      </NFormItem>
      <SwitchField
        v-model="localConfig.search.isNewTabOpen"
        :label="$t('generalSetting.newTabOpen')"
      />
      <SwitchField
        v-model="localConfig.search.iconEnabled"
        :label="$t('search.icon')"
      />
      <SwitchField
        v-model="localConfig.search.suggestionEnabled"
        :label="$t('search.suggestion')"
      />
    </template>

    <!-- 尺寸样式 -->
    <template #size>
      <SliderField
        v-model="localConfig.search.padding"
        :label="$t('common.padding')"
        :min="0"
        :max="100"
        :step="0.1"
      />

      <SliderField
        v-model="localConfig.search.width"
        :label="$t('common.width')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.search.height"
        :label="$t('common.height')"
        :min="1"
        :max="500"
        :step="1"
      />

      <SliderField
        v-model="localConfig.search.borderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="100"
        :step="1"
      />
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.search.fontFamily"
        v-model:font-color="localConfig.search.fontColor"
        v-model:font-size="localConfig.search.fontSize"
        :label="$t('common.font')"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <ColorField
        v-model="localConfig.search.backgroundColor"
        :label="$t('common.backgroundColor')"
      />

      <SliderField
        v-model="localConfig.search.backgroundBlur"
        :label="$t('common.blur')"
        :min="0"
        :max="30"
        :step="0.1"
      />

      <ToggleColorField
        v-model:enable="localConfig.search.isBorderEnabled"
        v-model:color="localConfig.search.borderColor"
        v-model:width="localConfig.search.borderWidth"
        :label="$t('common.border')"
      />

      <ToggleColorField
        v-model:enable="localConfig.search.isShadowEnabled"
        v-model:color="localConfig.search.shadowColor"
        :label="$t('common.shadow')"
      />
    </template>
  </SettingFormWrap>
</template>
