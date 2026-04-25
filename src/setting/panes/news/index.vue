<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { localConfig } from '@/logic/store'
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import {
  SliderField,
  ColorField,
  FontField,
  ToggleColorField,
} from '@/setting/fields'
import { state } from '@/newtab/widgets/news/logic'

type NewsSourceItem = {
  label: string
  value: NewsSources
}

const allNewsSources = computed<NewsSourceItem[]>(() => [
  { label: window.$t('news.toutiao'), value: 'toutiao' },
  { label: window.$t('news.baidu'), value: 'baidu' },
  { label: window.$t('news.zhihu'), value: 'zhihu' },
  { label: window.$t('news.weibo'), value: 'weibo' },
  { label: window.$t('news.kr36'), value: 'kr36' },
  { label: window.$t('news.v2ex'), value: 'v2ex' },
])

// 判断某个 source 是否已选中
const isSourceSelected = (value: string) =>
  (localConfig.news.sourceList as string[]).includes(value)

// 切换选中状态
const toggleSource = (value: NewsSources) => {
  const list = localConfig.news.sourceList
  const idx = list.indexOf(value)
  if (idx === -1) {
    list.push(value)
  } else {
    list.splice(idx, 1)
  }
  state.currNewsTabValue = list[0] || 'baidu'
}

// 上移
const moveUp = (value: string) => {
  const list = localConfig.news.sourceList as string[]
  const idx = list.indexOf(value)
  if (idx <= 0) return
  list.splice(idx - 1, 0, list.splice(idx, 1)[0])
}

// 下移
const moveDown = (value: string) => {
  const list = localConfig.news.sourceList as string[]
  const idx = list.indexOf(value)
  if (idx === -1 || idx >= list.length - 1) return
  list.splice(idx + 1, 0, list.splice(idx, 1)[0])
}

// 选中列表（按 sourceList 顺序）
const selectedSources = computed<NewsSourceItem[]>(
  () =>
    (localConfig.news.sourceList as string[])
      .map((v) => allNewsSources.value.find((s) => s.value === v))
      .filter(Boolean) as NewsSourceItem[],
)

// 未选中列表（按默认顺序排列）
const unselectedSources = computed<NewsSourceItem[]>(() =>
  allNewsSources.value.filter((s) => !isSourceSelected(s.value)),
)
</script>

<template>
  <SettingHeaderBar
    :title="$t('setting.news')"
    widget-code="news"
  />

  <SettingFormWrap widget-code="news">
    <!-- 功能配置 -->
    <template #behavior>
      <NFormItem :label="$t('news.source')">
        <div class="news-source-sorter">
          <!-- 已选列表 -->
          <div
            v-for="(item, index) in selectedSources"
            :key="item.value"
            class="sorter__item sorter__item--selected"
          >
            <NCheckbox
              :checked="true"
              size="small"
              @update:checked="toggleSource(item.value)"
            />
            <span class="item__label">{{ item.label }}</span>
            <div class="item__actions">
              <NButton
                quaternary
                size="small"
                :disabled="index === 0"
                @click="moveUp(item.value)"
              >
                <Icon
                  icon="ic:round-keyboard-arrow-up"
                  class="action__icon"
                />
              </NButton>
              <NButton
                quaternary
                size="small"
                :disabled="index === selectedSources.length - 1"
                @click="moveDown(item.value)"
              >
                <Icon
                  icon="ic:round-keyboard-arrow-down"
                  class="action__icon"
                />
              </NButton>
            </div>
          </div>

          <!-- 分割线 -->
          <NDivider
            v-if="selectedSources.length > 0 && unselectedSources.length > 0"
          />

          <!-- 未选列表 -->
          <div
            v-for="item in unselectedSources"
            :key="item.value"
            class="sorter__item sorter__item--unselected"
          >
            <NCheckbox
              :checked="false"
              size="small"
              @update:checked="toggleSource(item.value)"
            />
            <span class="item__label item__label--dimmed">{{
              item.label
            }}</span>
          </div>
        </div>
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

    <!-- 尺寸样式 -->
    <template #size>
      <SliderField
        v-model="localConfig.news.margin"
        :label="$t('common.margin')"
        :min="0"
        :max="50"
        :step="1"
      />

      <SliderField
        v-model="localConfig.news.width"
        :label="$t('common.width')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.news.height"
        :label="$t('common.height')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.news.borderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="100"
        :step="1"
      />
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.news.fontFamily"
        v-model:font-color="localConfig.news.fontColor"
        v-model:font-size="localConfig.news.fontSize"
        :label="$t('common.font')"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <ColorField
        v-model="localConfig.news.backgroundColor"
        :label="$t('common.backgroundColor')"
      />

      <SliderField
        v-model="localConfig.news.backgroundBlur"
        :label="$t('common.blur')"
        :min="0"
        :max="50"
        :step="0.1"
      />

      <ToggleColorField
        v-model:enable="localConfig.news.isBorderEnabled"
        v-model:color="localConfig.news.borderColor"
        v-model:width="localConfig.news.borderWidth"
        :label="$t('common.border')"
      />

      <ToggleColorField
        v-model:enable="localConfig.news.isShadowEnabled"
        v-model:color="localConfig.news.shadowColor"
        :label="$t('common.shadow')"
      />

      <div class="setting__form_wrap">
        <ColorField
          v-model="localConfig.news.urlActiveColor"
          :label="`URL${$t('common.activeColor')}`"
        />
        <ColorField
          v-model="localConfig.news.tabActiveBackgroundColor"
          :label="`${$t('common.label')}${$t('common.activeColor')}`"
        />
      </div>
    </template>
  </SettingFormWrap>
</template>

<style scoped>
.news-source-sorter {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sorter__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px;
  border-radius: 6px;
}

.sorter__item--unselected {
  opacity: 0.45;
}

.item__label {
  flex: 1;
  font-size: 13px;
}

.item__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  .action__icon {
    font-size: 20px;
  }
}
</style>
