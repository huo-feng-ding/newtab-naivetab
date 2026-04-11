<script setup lang="ts">
import { Icon } from '@iconify/vue'
import i18n from '@/lib/i18n'
import { exportSetting, isUploadConfigLoading, importSetting, refreshSetting, resetSetting, configSizeMap, SYNC_QUOTA_BYTES_PER_ITEM } from '@/logic/storage'
import { localConfig, localState, globalState, customPrimaryColor } from '@/logic/store'
import { ICONS } from '@/logic/icons'
import SettingPaneTitle from '~/newtab/setting/components/SettingPaneTitle.vue'
import SettingPaneContent from '~/newtab/setting/components/SettingPaneContent.vue'
import Tips from '@/components/Tips.vue'
import { SliderField, ColorField, FontField, SwitchField, ToggleColorField } from '~/newtab/setting/fields'
import BackgroundDrawer from './BackgroundDrawer.vue'

const instance = getCurrentInstance()
const proxy = instance?.proxy

if (!proxy) {
  throw new Error('Failed to get component instance proxy')
}

const state = reactive({
  i18nList: i18n.global.availableLocales.map((locale: string) => ({
    label: locale,
    value: locale,
  })),
  isBackgroundDrawerVisible: false,
})

const themeList = computed(() => [
  { label: window.$t('general.followSystem'), value: 'auto' },
  { label: window.$t('common.light'), value: 'light' },
  { label: window.$t('common.dark'), value: 'dark' },
])

const drawerPlacementList = [
  { value: 'left', icon: ICONS.dockLeft, style: { transform: 'rotate(180deg)' } },
  { value: 'top', icon: ICONS.dockBottom, style: { transform: 'rotate(180deg)' } },
  { value: 'bottom', icon: ICONS.dockBottom, style: {} },
  { value: 'right', icon: ICONS.dockLeft, style: {} },
] as { value: TDrawerPlacement | 'right', icon: string, style: Record<string, string> }[]

const focusElementList = computed(() => [
  { label: window.$t('general.focusBrowserDefault'), value: 'default' },
  { label: window.$t('general.focusRoot'), value: 'root' },
  { label: window.$t('setting.search'), value: 'search' },
  { label: window.$t('setting.memo'), value: 'memo' },
  { label: window.$t('setting.keyboard'), value: 'keyboard' },
])

const loadPageAnimationTypeList = computed(() => [
  { label: window.$t('general.fadeIn'), value: 'fade-in' },
  { label: window.$t('general.zoomIn'), value: 'zoom-in' },
])

const onChangeLocale = (locale: string) => {
  proxy.$i18n.locale = locale
  localConfig.general.lang = locale
}

const openBackgroundDrawer = () => {
  state.isBackgroundDrawerVisible = true
}

const syncTime = computed(() => {
  if (!Object.prototype.hasOwnProperty.call(localState.value, 'isUploadConfigStatusMap')) {
    return '0'
  }
  const syncTimeList = [] as number[]
  for (const field of Object.keys(localState.value.isUploadConfigStatusMap)) {
    syncTimeList.push(localState.value.isUploadConfigStatusMap[field].syncTime)
  }
  const maxSyncTime = Math.max(...syncTimeList)
  return dayjs(maxSyncTime).format('YYYY-MM-DD HH:mm:ss')
})

const importSettingInputEl: Ref<HTMLInputElement | null> = ref(null)

const onImportSetting = () => {
  if (!importSettingInputEl.value) {
    return
  }
  importSettingInputEl.value.value = ''
  importSettingInputEl.value.click()
}

const onImportFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target || !target.files || target.files.length === 0) {
    console.warn('No file selected')
    return
  }
  const file = target.files[0]
  if (!file.name.includes('.json')) {
    target.value = ''
    return
  }
  const reader = new FileReader()
  reader.readAsText(file)
  reader.onload = () => {
    importSetting(reader.result as string)
  }
}

const onExportSetting = () => {
  exportSetting()
}

const onResetSetting = () => {
  resetSetting()
}

// configSizeMap 的 field 映射到 i18n label，兜底展示原始 field 名
const getFieldLabel = (field: string) => window.$t(`setting.${field}`) || field

// 计算总用量和 Top 占用大户
const sortedEntries = computed(() => {
  return Object.entries(configSizeMap)
    .sort((a, b) => b[1] - a[1])
})

const totalBytes = computed(() => {
  let total = 0
  for (const bytes of Object.values(configSizeMap)) {
    total += bytes
  }
  return total
})

const topLargeItems = computed(() => {
  return sortedEntries.value.slice(0, 3)
})
</script>

<template>
  <BackgroundDrawer v-model:show="state.isBackgroundDrawerVisible" />

  <SettingPaneTitle
    :title="$t('setting.general')"
    widget-code="general"
  />

  <SettingPaneContent
    widget-code="general"
    hide-reset
  >
    <template #behavior>
      <NFormItem :label="$t('general.pageTitle')">
        <NInput
          v-model:value="localConfig.general.pageTitle"
          type="text"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('general.defaultFocus')">
        <NSelect
          v-model:value="localConfig.general.openPageFocusElement"
          :options="focusElementList"
          size="small"
        />
        <Tips :content="$t('general.defaultFocusTips')" />
      </NFormItem>

      <NFormItem
        class="drawer__site_wrap"
        :label="$t('common.drawerSite')"
      >
        <div class="drawer__site">
          <div
            v-for="(item, index) in drawerPlacementList"
            :key="index"
            class="site__item"
            :class="{ 'site__item--active': localConfig.general.drawerPlacement === item.value }"
            :style="item.style"
            @click="localConfig.general.drawerPlacement = item.value"
          >
            <Icon :icon="item.icon" />
          </div>
        </div>
      </NFormItem>

      <!-- language -->
      <div class="setting__form_wrap">
        <NFormItem
          :label="$t('general.language')"
          class="n-form-item--half"
        >
          <NSelect
            v-model:value="proxy.$i18n.locale"
            :options="state.i18nList"
            size="small"
            @update:value="onChangeLocale"
          />
        </NFormItem>
        <NFormItem
          :label="`${$t('general.timeLanguage')}`"
          class="n-form-item--half"
        >
          <NSelect
            v-model:value="localConfig.general.timeLang"
            :options="state.i18nList"
            size="small"
          />
        </NFormItem>
      </div>
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.general.fontFamily"
        v-model:font-color="localConfig.general.fontColor"
        v-model:font-size="localConfig.general.fontSize"
        :label="`${$t('common.font')}`"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <NFormItem :label="$t('common.appearance')">
        <NRadioGroup
          v-model:value="localConfig.general.appearance"
          size="small"
        >
          <NRadioButton
            v-for="item in themeList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NRadioButton>
        </NRadioGroup>
      </NFormItem>

      <ColorField
        v-model="localConfig.general.primaryColor"
        :label="$t('common.primaryColor')"
        :tips="$t('general.primaryColorTips')"
      />

      <ColorField
        v-model="localConfig.general.backgroundColor"
        :label="$t('common.backgroundColor')"
      />

      <!-- backgroundImage -->
      <NFormItem :label="$t('common.backgroundImage')">
        <NSwitch
          v-model:value="localConfig.general.isBackgroundImageEnabled"
          size="small"
        />
        <Transition name="setting-expand">
          <NButton
            v-if="localConfig.general.isBackgroundImageEnabled"
            class="setting__item-ele setting__item-ml action-btn action-btn--primary"
            type="primary"
            size="small"
            secondary
            @click="openBackgroundDrawer()"
          >
            <Icon :icon="ICONS.selectFinger" />&nbsp;{{ $t('common.select') }}
          </NButton>
        </Transition>
      </NFormItem>

      <SliderField
        v-model="localConfig.general.bgBlur"
        :label="$t('common.blur')"
        :step="0.01"
        :min="0"
        :max="50"
      />

      <SliderField
        v-model="localConfig.general.bgOpacity"
        :label="$t('common.opacity')"
        :step="0.01"
        :min="0"
        :max="1"
      />

      <NFormItem :label="$t('general.parallax')">
        <NSwitch
          v-model:value="localConfig.general.isParallaxEnabled"
          size="small"
        />
        <Tips :content="$t('general.parallaxTips')" />
      </NFormItem>

      <Transition name="setting-expand">
        <SliderField
          v-if="localConfig.general.isParallaxEnabled"
          v-model="localConfig.general.parallaxIntensity"
          :label="$t('general.parallaxIntensity')"
          :step="1"
          :min="0"
          :max="20"
          class="setting__item-ml"
        />
      </Transition>

      <NFormItem :label="$t('general.loadPageAnimation')">
        <NSwitch
          v-model:value="localConfig.general.isLoadPageAnimationEnabled"
          size="small"
        />
        <Transition name="setting-expand">
          <NRadioGroup
            v-if="localConfig.general.isLoadPageAnimationEnabled"
            v-model:value="localConfig.general.loadPageAnimationType"
            size="small"
            class="setting__item-ml"
          >
            <NRadioButton
              v-for="item in loadPageAnimationTypeList"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </NRadioButton>
          </NRadioGroup>
        </Transition>
      </NFormItem>
    </template>

    <template #footer>
      <!-- setting -->
      <NDivider title-placement="left">
        {{ $t('general.settingDividerSetting') }}
      </NDivider>

      <!-- 同步时间 -->
      <NFormItem :label="$t('general.syncTime')">
        <NSpin
          :show="isUploadConfigLoading"
          size="small"
        >
          <div class="sync-time__badge">
            <Icon
              :icon="ICONS.check"
              class="sync-time__icon"
            />
            <span class="sync-time__text">{{ syncTime }}</span>
          </div>
        </NSpin>
        <Tips :content="$t('general.syncTimeTips')" />
      </NFormItem>

      <!-- 配置占用大小 -->
      <NFormItem :label="$t('general.syncStorageSize')">
        <NCollapse :default-expanded-names="[]">
          <NCollapseItem name="storage">
            <template #header>
              <div class="storage-header">
                <div class="storage-header__title">
                  <span class="storage-header__field">{{ $t('general.total') }}</span>
                  <span class="storage-header__total">
                    {{ (totalBytes / 1024).toFixed(1) }}KB / ~100KB
                  </span>
                  <Tips
                    :content="$t('general.syncStorageSizeTips')"
                    class="storage-header__tips"
                  />
                </div>
                <div
                  v-if="topLargeItems.length > 0"
                  class="storage-header__top"
                >
                  <div
                    v-for="([field, bytes], index) in topLargeItems"
                    :key="index"
                    class="storage-header__item"
                    :class="{
                      'storage-header__item--warn': bytes > 7000,
                      'storage-header__item--danger': bytes > 8000,
                    }"
                  >
                    <span class="storage-header__field">{{ getFieldLabel(field) }}</span>
                    <div class="storage-header__bar-wrap">
                      <div
                        class="storage-header__bar"
                        :style="{ width: `${Math.min((bytes / SYNC_QUOTA_BYTES_PER_ITEM) * 100, 100)}%` }"
                      />
                    </div>
                    <span class="storage-header__bytes">{{ (bytes / 1024).toFixed(1) }}KB</span>
                  </div>
                </div>
              </div>
            </template>
            <div class="storage-size__list">
              <NTooltip
                v-for="([field, bytes]) in sortedEntries"
                :key="field"
                trigger="hover"
                placement="top"
              >
                <template #trigger>
                  <div
                    class="storage-size__item"
                    :class="{
                      'storage-size__item--warn': bytes > 7000,
                      'storage-size__item--danger': bytes > 8000,
                    }"
                  >
                    <span class="item__field">{{ getFieldLabel(field) }}</span>
                    <div class="item__bar-wrap">
                      <div
                        class="item__bar"
                        :style="{ width: `${Math.min((bytes / SYNC_QUOTA_BYTES_PER_ITEM) * 100, 100)}%` }"
                      />
                    </div>
                    <span class="item__bytes">{{ (bytes / 1024).toFixed(1) }}KB</span>
                  </div>
                </template>
                {{ `${getFieldLabel(field)}: ${bytes} / ${SYNC_QUOTA_BYTES_PER_ITEM} bytes` }}
              </NTooltip>
            </div>
          </NCollapseItem>
        </NCollapse>
      </NFormItem>

      <NFormItem :label="$t('general.importExportSettingsLabel')">
        <NButton
          class="action-btn action-btn--primary"
          type="primary"
          size="small"
          secondary
          :loading="globalState.isImportSettingLoading"
          @click="onImportSetting"
        >
          <template #icon><Icon :icon="ICONS.importFile" /></template>
          {{ $t('general.importSettingsValue') }}
        </NButton>
        <input
          ref="importSettingInputEl"
          style="display: none"
          type="file"
          accept=".json"
          @change="onImportFileChange"
        />
        <Tips :content="$t('general.importSettingsTips')" />
        <NButton
          class="setting__item-ml action-btn action-btn--primary"
          type="primary"
          size="small"
          secondary
          @click="onExportSetting()"
        >
          <template #icon><Icon :icon="ICONS.exportFile" /></template>
          {{ $t('general.exportSettingValue') }}
        </NButton>
        <Tips :content="$t('general.exportSettingTips')" />
      </NFormItem>

      <NFormItem :label="$t('general.clearStorageLabel')">
        <NButton
          class="action-btn action-btn--warning"
          type="warning"
          size="small"
          secondary
          :loading="globalState.isClearStorageLoading"
          @click="refreshSetting()"
        >
          <template #icon><Icon :icon="ICONS.clearOutlined" /></template>
          {{ $t('general.clearStorageValue') }}
        </NButton>
        <Tips :content="$t('general.clearStorageTips')" />
      </NFormItem>

      <NFormItem :label="$t('general.resetSettingLabel')">
        <NPopconfirm @positive-click="onResetSetting()">
          <template #trigger>
            <NButton
              class="action-btn action-btn--error"
              type="error"
              size="small"
              secondary
            >
              <template #icon><Icon :icon="ICONS.restoreTwotone" /></template>
              {{ $t('general.resetAllSettingValue') }}
            </NButton>
          </template>
          {{ `${$t('common.confirm')} ${$t('general.resetAllSettingValue')}` }}?
        </NPopconfirm>
        <Tips :content="$t('general.resetSettingTips')" />
      </NFormItem>
    </template>
  </SettingPaneContent>
</template>

<style>
/* ——— 抽屉方向选择器 ——— */
.drawer__site_wrap {
  .n-form-item-label {
    margin-top: 14px;
  }
  .drawer__site {
    display: grid;
    grid-template-rows: repeat(3, 28px);
    grid-template-columns: repeat(3, 28px);
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-lg);
    background: rgba(128, 128, 128, 0.06);
    border: 1px solid rgba(128, 128, 128, 0.1);
    .site__item {
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 17px;
      cursor: pointer;
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      transition:
        background-color var(--transition-base),
        color var(--transition-base),
        border-color var(--transition-base),
        transform var(--transition-fast);
      color: rgba(128, 128, 128, 0.55);
      &:hover {
        background-color: rgba(128, 128, 128, 0.12);
        color: rgba(128, 128, 128, 0.85);
        transform: scale(1.08);
      }
      &:nth-child(1) {
        grid-column: 1;
        grid-row: 2;
      }
      &:nth-child(2) {
        grid-column: 2;
        grid-row: 1;
      }
      &:nth-child(3) {
        grid-column: 2;
        grid-row: 3;
      }
      &:nth-child(4) {
        grid-column: 3;
        grid-row: 2;
      }
    }
    .site__item--active {
      color: v-bind(customPrimaryColor) !important;
      background-color: color-mix(in srgb, v-bind(customPrimaryColor) 12%, transparent);
      border-color: color-mix(in srgb, v-bind(customPrimaryColor) 30%, transparent);
      transform: scale(1.06);
    }
  }
}

/* ——— 同步时间徽章 ——— */
.sync-time__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  background: rgba(56, 168, 102, 0.1);
  border: 1px solid rgba(56, 168, 102, 0.22);
  .sync-time__icon {
    font-size: 13px;
    color: #38a866;
    flex-shrink: 0;
  }
  .sync-time__text {
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    color: rgba(56, 168, 102, 0.85);
    letter-spacing: 0.2px;
  }
}

/* ——— 折叠面板头部（总用量 + Top 大户） ——— */
.storage-header {
  width: 100%;
  padding: 4px 0;
}

.storage-header__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.storage-header__title span:first-child {
  padding-left: 4px;
  font-weight: 500;
}

.storage-header__total {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

.storage-header__tips {
  margin-left: 4px;
}

.storage-header__field {
  font-size: 11px;
  width: 72px;
  flex-shrink: 0;
}

.storage-header__top {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 4px;
}

.storage-header__item {
  display: flex;
  align-items: center;
  gap: 5px;

  .storage-header__field {
    font-size: 11px;
    color: rgba(128, 128, 128, 0.7);
    width: 72px;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .storage-header__bar-wrap {
    flex: 1;
    height: 4px;
    max-width: 120px;
    border-radius: 2px;
    background: rgba(128, 128, 128, 0.15);
    overflow: hidden;
  }

  .storage-header__bar {
    height: 100%;
    border-radius: 2px;
    background: rgba(16, 152, 173, 0.7);
  }

  .storage-header__bytes {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: rgba(128, 128, 128, 0.65);
    width: 36px;
    text-align: right;
    flex-shrink: 0;
  }

  &.storage-header__item--warn {
    .storage-header__bar {
      background: rgba(240, 160, 32, 0.85);
    }
    .storage-header__bytes {
      color: rgba(200, 130, 0, 0.9);
    }
  }

  &.storage-header__item--danger {
    .storage-header__bar {
      background: rgba(220, 50, 50, 0.85);
    }
    .storage-header__bytes {
      color: rgba(200, 40, 40, 0.9);
    }
  }
}

/* ——— 配置占用大小列表 ——— */
.storage-size__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-width: 320px;
}

.storage-size__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: rgba(128, 128, 128, 0.05);
  cursor: default;
  transition: background-color var(--transition-fast);

  &:hover {
    background: rgba(128, 128, 128, 0.1);
  }

  /* 黄色警告：7KB ~ 8KB */
  &.storage-size__item--warn {
    background: rgba(240, 160, 32, 0.08);
    border-color: rgba(240, 160, 32, 0.2);
    .item__bar {
      background: rgba(240, 160, 32, 0.85);
    }
    .item__bytes {
      color: rgba(200, 130, 0, 0.9);
    }
  }

  /* 红色危险：>8KB */
  &.storage-size__item--danger {
    background: rgba(220, 50, 50, 0.08);
    border-color: rgba(220, 50, 50, 0.22);
    .item__bar {
      background: rgba(220, 50, 50, 0.85);
    }
    .item__bytes {
      color: rgba(200, 40, 40, 0.9);
    }
  }

  .item__field {
    font-size: 11px;
    font-family: monospace;
    color: rgba(128, 128, 128, 0.75);
    width: 90px;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item__bar-wrap {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: rgba(128, 128, 128, 0.15);
    overflow: hidden;
  }

  .item__bar {
    height: 100%;
    border-radius: 2px;
    background: rgba(16, 152, 173, 0.7);
    transition: width var(--transition-base);
  }

  .item__bytes {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: rgba(128, 128, 128, 0.65);
    width: 42px;
    text-align: right;
    flex-shrink: 0;
  }
}
</style>
