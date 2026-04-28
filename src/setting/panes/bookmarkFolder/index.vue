<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { localConfig } from '@/logic/store'
import { getBrowserBookmark } from '@/logic/bookmark'
import { requestPermission } from '@/logic/storage'
import SettingHeaderBar from '@/setting/components/SettingHeaderBar.vue'
import SettingFormWrap from '@/setting/components/SettingFormWrap.vue'
import BrowserBookmarkPicker from '@/components/BrowserBookmarkPicker.vue'
import { refreshSelectedFolderTitles } from '@/newtab/widgets/bookmarkFolder/logic'
import {
  SliderField,
  SwitchField,
  ColorField,
  FontField,
  ToggleColorField,
} from '@/setting/fields'

const state = reactive({
  showPicker: false,
  rootBookmarks: [] as BookmarkNode[],
})

const folderCrumb = computed(() => {
  const stack = localConfig.bookmarkFolder.selectedFolderTitles || []
  return stack.length === 0
    ? (window.$t('bookmarkFolder.rootDirectory') as string)
    : stack.join(' / ')
})

const findPathById = (root: BookmarkNode[], id: string): string[] => {
  for (const node of root) {
    if (node.id === id) return [node.title]
    if (node.children && node.children.length > 0) {
      const childPath = findPathById(node.children as BookmarkNode[], id)
      if (childPath.length > 0) return [node.title, ...childPath]
    }
  }
  return []
}

const ensureBookmarkRoot = async () => {
  if (state.rootBookmarks.length > 0) {
    return
  }
  const base = await getBrowserBookmark()
  state.rootBookmarks = base
}

const onOpenPicker = async () => {
  try {
    await ensureBookmarkRoot()
    state.showPicker = true
  } catch (e) {
    const granted = await requestPermission('bookmarks')
    if (granted) {
      await ensureBookmarkRoot()
      state.showPicker = true
    } else {
      window.$message.error(window.$t('browserPermission.bookmark') as string)
    }
  }
}

const onSelectBookmark = async (option: any) => {
  try {
    await ensureBookmarkRoot()
    const path = findPathById(state.rootBookmarks, option.id)
    localConfig.bookmarkFolder.selectedFolderTitles = path
    refreshSelectedFolderTitles()
  } catch (e) {
    console.warn('Select bookmark failed', e)
  }
}

const onResetFolder = () => {
  localConfig.bookmarkFolder.selectedFolderTitles = []
  refreshSelectedFolderTitles()
}
</script>

<template>
  <SettingHeaderBar
    :title="$t('setting.bookmarkFolder')"
    widget-code="bookmarkFolder"
  />

  <SettingFormWrap
    id="bookmarkFolder__setting"
    widget-code="bookmarkFolder"
  >
    <!-- 功能配置 -->
    <template #behavior>
      <NFormItem :label="$t('bookmarkFolder.defaultDisplayFolderTitle')">
        <div class="setting__item_wrap">
          <div class="item__box folder__crumb">
            <Icon
              :icon="ICONS.folderOutline"
              class="crumb__icon"
            />
            <span class="crumb__text">{{ folderCrumb }}</span>
          </div>
          <div class="item__box">
            <NButton
              type="primary"
              size="small"
              secondary
              class="setting__item-ele setting__item-ml action-btn action-btn--primary"
              @click="onOpenPicker"
            >
              <Icon :icon="ICONS.bookmarkPlus" />&nbsp;{{ $t('common.select') }}
            </NButton>
            <NButton
              size="small"
              secondary
              class="setting__item-ele setting__item-ml action-btn action-btn--default"
              @click="onResetFolder"
            >
              <Icon :icon="ICONS.restoreTwotone" />&nbsp;{{
                $t('generalSetting.resetSettingValue')
              }}
            </NButton>
          </div>
        </div>
      </NFormItem>

      <NFormItem :label="$t('bookmarkFolder.layoutColumns')">
        <NInputNumber
          v-model:value="localConfig.bookmarkFolder.gridColumns"
          class="setting__input-number"
          size="small"
          :step="1"
          :min="1"
          :max="50"
        />
      </NFormItem>

      <SwitchField
        v-model="localConfig.bookmarkFolder.isNewTabOpen"
        :label="$t('generalSetting.newTabOpen')"
      />

      <SwitchField
        v-model="localConfig.bookmarkFolder.isIconVisible"
        :label="$t('bookmarkFolder.showIcon')"
      />

      <SwitchField
        v-model="localConfig.bookmarkFolder.isNameVisible"
        :label="$t('bookmarkFolder.showName')"
      />
    </template>

    <!-- 尺寸样式 -->
    <template #size>
      <SliderField
        v-model="localConfig.bookmarkFolder.padding"
        :label="$t('common.padding')"
        :min="0"
        :max="50"
        :step="1"
      />

      <SliderField
        v-model="localConfig.bookmarkFolder.width"
        :label="$t('common.width')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.bookmarkFolder.height"
        :label="$t('common.height')"
        :min="1"
        :max="1000"
        :step="1"
      />

      <SliderField
        v-model="localConfig.bookmarkFolder.borderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="100"
        :step="1"
      />

      <SliderField
        v-model="localConfig.bookmarkFolder.iconSize"
        :label="$t('bookmarkFolder.iconSize')"
        :min="0"
        :max="100"
        :step="1"
      />

      <SliderField
        v-model="localConfig.bookmarkFolder.itemHeight"
        :label="$t('bookmarkFolder.itemHeight')"
        :min="1"
        :max="100"
        :step="1"
      />

      <SliderField
        v-model="localConfig.bookmarkFolder.itemGap"
        :label="$t('bookmarkFolder.itemGap')"
        :min="0"
        :max="50"
        :step="0.1"
      />

      <SliderField
        v-model="localConfig.bookmarkFolder.itemBorderRadius"
        :label="$t('bookmarkFolder.itemBorderRadius')"
        :min="0"
        :max="50"
        :step="1"
      />
    </template>

    <!-- 文字排版 -->
    <template #typography>
      <FontField
        v-model:font-family="localConfig.bookmarkFolder.fontFamily"
        v-model:font-color="localConfig.bookmarkFolder.fontColor"
        v-model:font-size="localConfig.bookmarkFolder.fontSize"
        :label="$t('common.font')"
      />
    </template>

    <!-- 色彩外观 -->
    <template #appearance>
      <ColorField
        v-model="localConfig.bookmarkFolder.backgroundColor"
        :label="$t('common.backgroundColor')"
      />

      <SliderField
        v-model="localConfig.bookmarkFolder.backgroundBlur"
        :label="$t('common.blur')"
        :min="0"
        :max="50"
        :step="0.1"
      />

      <ToggleColorField
        v-model:enable="localConfig.bookmarkFolder.isBorderEnabled"
        v-model:color="localConfig.bookmarkFolder.borderColor"
        v-model:width="localConfig.bookmarkFolder.borderWidth"
        :label="$t('common.border')"
      />

      <ToggleColorField
        v-model:enable="localConfig.bookmarkFolder.isShadowEnabled"
        v-model:color="localConfig.bookmarkFolder.shadowColor"
        :label="$t('common.shadow')"
      />
    </template>
  </SettingFormWrap>

  <BrowserBookmarkPicker
    v-model:show="state.showPicker"
    select-type="folder"
    @select="onSelectBookmark"
  />
</template>

<style>
#bookmarkFolder__setting .folder__crumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 6px 10px;
  border-radius: 6px;
  background-color: rgba(127, 140, 141, 0.08);
}
#bookmarkFolder__setting .crumb__icon {
  font-size: 16px;
}
#bookmarkFolder__setting .crumb__text {
  font-size: 13px;
  user-select: text;
}

#bookmarkFolder__setting .layout__inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
#bookmarkFolder__setting .layout__multiply {
  margin-left: 10px;
  font-size: 18px;
  opacity: 0.7;
}
#bookmarkFolder__setting .layout__preview {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}
#bookmarkFolder__setting .preview__grid {
  display: grid;
  justify-items: center;
  gap: 6px;
  height: 100px;
}
#bookmarkFolder__setting .preview__item {
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  background-color: rgba(127, 140, 141, 0.15);
  max-width: 30px;
}
</style>
