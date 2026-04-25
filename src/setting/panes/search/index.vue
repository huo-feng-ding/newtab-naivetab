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
      faviconUrl: '',
    },
    ...SEARCH_ENGINE_LIST,
  ] as Array<{ label: string, value: string, faviconUrl: string }>
})

const searchSelectRenderLabel = (option: { label: string, value: string, faviconUrl?: string }) => {
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
        option.faviconUrl
          ? h(
              'img',
              {
                style: {
                  marginRight: '10px',
                  width: '15px',
                  height: '15px',
                },
                src: option.faviconUrl,
              },
            )
          : h('div', { style: { marginRight: '10px', width: '15px' } }),
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

  <SettingFormWrap
    widget-code="search"
    :sections="[
      { slot: 'searchBar', label: $t('search.searchBar') },
      { slot: 'dropdown', label: $t('search.suggestion') },
    ]"
  >
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
      <NFormItem :label="$t('search.searchEngineIcon')">
        <NSwitch
          v-model:value="localConfig.search.isSearchEngineIconVisible"
          size="small"
        />
        <Transition name="setting-expand">
          <div
            v-if="localConfig.search.isSearchEngineIconVisible"
            class="setting__item_wrap"
          >
            <NInput
              v-model:value="localConfig.search.searchEngineIconUrl"
              class="setting__item-ele setting__item-ml"
              size="small"
              :placeholder="`${$t('search.searchEngineIconUrl')} ${$t('search.searchEngineIconUrlPlaceholder')}`"
            />
          </div>
        </Transition>
      </NFormItem>
      <SwitchField
        v-model="localConfig.search.suggestionEnabled"
        :label="$t('search.suggestion')"
      />
    </template>
    <!-- 搜索栏 -->
    <template #searchBar>
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
        v-model="localConfig.search.padding"
        :label="$t('common.padding')"
        :min="0"
        :max="100"
        :step="0.1"
      />

      <SliderField
        v-model="localConfig.search.borderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="100"
        :step="1"
      />

      <FontField
        v-model:font-family="localConfig.search.fontFamily"
        v-model:font-color="localConfig.search.fontColor"
        v-model:font-size="localConfig.search.fontSize"
        :label="$t('common.font')"
      />

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

    <!-- 建议列表 -->
    <template #dropdown>
      <SliderField
        v-model="localConfig.search.dropdownBorderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="100"
        :step="1"
      />

      <SliderField
        v-model="localConfig.search.dropdownMaxItems"
        :label="$t('common.maxItems')"
        :min="2"
        :max="15"
        :step="1"
      />

      <FontField
        v-model:font-family="localConfig.search.dropdownFontFamily"
        v-model:font-color="localConfig.search.dropdownFontColor"
        v-model:font-size="localConfig.search.dropdownFontSize"
        :label="$t('common.font')"
      />

      <ColorField
        v-model="localConfig.search.dropdownBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
    </template>
  </SettingFormWrap>
</template>
