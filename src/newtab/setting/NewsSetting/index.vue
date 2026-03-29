<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { localConfig, localState } from '@/logic/store'
import SettingPaneTitle from '~/newtab/setting/SettingPaneTitle.vue'
import SettingPaneWrap from '~/newtab/setting/SettingPaneWrap.vue'
import CustomColorPicker from '~/components/CustomColorPicker.vue'
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
const isSourceSelected = (value: string) => (localConfig.news.sourceList as string[]).includes(value)

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
const selectedSources = computed<NewsSourceItem[]>(() => (localConfig.news.sourceList as string[]).map((v) => allNewsSources.value.find((s) => s.value === v)).filter(Boolean) as NewsSourceItem[])

// 未选中列表（按默认顺序排列）
const unselectedSources = computed<NewsSourceItem[]>(() => allNewsSources.value.filter((s) => !isSourceSelected(s.value)))
</script>

<template>
  <SettingPaneTitle
    :title="$t('setting.news')"
    widget-code="news"
  />

  <SettingPaneWrap
    widget-code="news"
    :width-range="[200, 1000]"
    :height-range="[50, 1000]"
  >
    <template #header>
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
          <NDivider v-if="selectedSources.length > 0 && unselectedSources.length > 0" />

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
            <span class="item__label item__label--dimmed">{{ item.label }}</span>
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
  </SettingPaneWrap>
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
