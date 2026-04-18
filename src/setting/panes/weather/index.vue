<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { getCityLookup } from '@/api'
import { URL_QWEATHER_START } from '@/logic/constants/urls'
import { localConfig } from '@/logic/store'
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import Tips from '@/components/Tips.vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { FontField } from '@/setting/fields'

const state = reactive({
  isEditCityModel: false,
  isSearchLoading: false,
  keyword: '',
  cityList: [] as SelectStringItem[],
})

const getLocation = async () => {
  if (state.isSearchLoading || state.keyword.length === 0) {
    return
  }
  state.isSearchLoading = true
  try {
    const res = await getCityLookup(state.keyword)
    state.isSearchLoading = false
    if (res.code !== '200') {
      state.cityList = []
      return
    }
    state.cityList = res.location.map((item: CityItem) => ({
      label: `${item.country}-${item.adm1}-${item.adm2}-${item.name}`,
      value: item.id,
    }))
  } catch (e) {
    state.isSearchLoading = false
  }
}

const onSearch = useDebounceFn(() => {
  getLocation()
}, 500)

const onChangeCity = (label: string) => {
  state.keyword = label
  onSearch()
}

const onSelectCity = (cityId: string) => {
  const target = state.cityList.find((item) => item.value === cityId)
  const cityName = target ? target.label : state.keyword
  localConfig.weather.city.name = cityName
  localConfig.weather.city.id = cityId
}
</script>

<template>
  <SettingHeaderBar
    :title="$t('setting.weather')"
    widget-code="weather"
  />

  <SettingFormWrap
    id="weather__setting"
    widget-code="weather"
  >
    <template #behavior>
      <NFormItem :label="$t('weather.city')">
        <NInput
          v-if="!state.isEditCityModel"
          v-model:value="localConfig.weather.city.name"
          size="small"
          :disabled="true"
        />
        <NAutoComplete
          v-else
          v-model:value="state.keyword"
          :options="state.cityList"
          :loading="state.isSearchLoading"
          size="small"
          @update:value="onChangeCity"
          @select="onSelectCity"
        />

        <NButton
          type="primary"
          class="setting__item-ele setting__item-ml action-btn action-btn--primary"
          size="small"
          secondary
          @click="state.isEditCityModel = !state.isEditCityModel"
        >
          <template v-if="state.isEditCityModel">
            <Icon
              :icon="ICONS.check"
              class="item__icon"
            />
          </template>
          <template v-else>
            <Icon
              :icon="ICONS.edit"
              class="item__icon"
            />
          </template>
        </NButton>
      </NFormItem>

      <NFormItem label="API Key">
        <NInput
          v-model:value="localConfig.weather.apiKey"
          size="small"
        />
        <Tips
          link
          :content="URL_QWEATHER_START"
        />
      </NFormItem>

      <NFormItem :label="$t('weather.icon')">
        <div class="setting__item_wrap">
          <div class="item__box">
            <NSwitch
              v-model:value="localConfig.weather.iconEnabled"
              size="small"
            />
          </div>
          <Transition name="setting-expand">
            <div
              v-if="localConfig.weather.iconEnabled"
              class="item__box"
            >
              <NSlider
                v-model:value="localConfig.weather.iconSize"
                :step="1"
                :min="30"
                :max="200"
                :tooltip="false"
              />
              <NInputNumber
                v-model:value="localConfig.weather.iconSize"
                class="setting__item-ele setting__item-ml setting__input-number"
                size="small"
                :step="1"
                :min="30"
                :max="200"
              />
            </div>
          </Transition>
        </div>
      </NFormItem>
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.weather.fontFamily"
        v-model:font-color="localConfig.weather.fontColor"
        v-model:font-size="localConfig.weather.fontSize"
        :label="$t('common.font')"
      />
    </template>
  </SettingFormWrap>
</template>

<style>
#weather__setting {
  .n-input.n-input--disabled .n-input__input-el,
  .n-input.n-input--disabled .n-input__textarea-el {
    cursor: not-allowed;
  }
}
</style>
