<script setup lang="ts">
import { Icon } from '@iconify/vue'
import i18n from '@/lib/i18n'
import { exportSetting, isUploadConfigLoading, importSetting, refreshSetting, resetSetting } from '@/logic/storage'
import { localConfig, localState, globalState, customPrimaryColor } from '@/logic/store'
import SettingPaneTitle from '~/newtab/setting/SettingPaneTitle.vue'
import SettingPaneWrap from '~/newtab/setting/SettingPaneWrap.vue'
import Tips from '@/components/Tips.vue'
import BackgroundDrawer from './BackgroundDrawer.vue'
import SliderInput from '@/components/SliderInput.vue'
import { ICONS } from '@/logic/icons'

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
</script>

<template>
  <BackgroundDrawer v-model:show="state.isBackgroundDrawerVisible" />

  <SettingPaneTitle
    :title="$t('setting.general')"
    widget-code="general"
  />

  <SettingPaneWrap
    widget-code="general"
    :divider-name="$t('general.globalStyle')"
    hide-reset
  >
    <template #header>
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

    <template #style>
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
    </template>

    <template #footer>
      <!-- backgroundImage -->
      <NFormItem :label="$t('common.backgroundImage')">
        <NSwitch
          v-model:value="localConfig.general.isBackgroundImageEnabled"
          size="small"
        />
        <Transition name="setting-expand">
          <NButton
            v-if="localConfig.general.isBackgroundImageEnabled"
            class="setting__item-ele action-btn action-btn--primary"
            type="primary"
            size="small"
            secondary
            @click="openBackgroundDrawer()"
          >
            <Icon :icon="ICONS.selectFinger" />&nbsp;{{ $t('common.select') }}
          </NButton>
        </Transition>
      </NFormItem>

      <Transition name="setting-slide">
        <NFormItem
          v-if="localConfig.general.isBackgroundImageEnabled"
          :label="$t('common.blur')"
        >
          <SliderInput
            v-model="localConfig.general.bgBlur"
            :step="0.1"
            :min="0"
            :max="30"
          />
        </NFormItem>
      </Transition>

      <Transition name="setting-slide">
        <NFormItem
          v-if="localConfig.general.isBackgroundImageEnabled"
          :label="$t('common.opacity')"
        >
          <SliderInput
            v-model="localConfig.general.bgOpacity"
            :step="0.01"
            :min="0"
            :max="1"
          />
        </NFormItem>
      </Transition>

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
  </SettingPaneWrap>
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
      transition: background-color var(--transition-base), color var(--transition-base), border-color var(--transition-base), transform var(--transition-fast);
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

</style>
