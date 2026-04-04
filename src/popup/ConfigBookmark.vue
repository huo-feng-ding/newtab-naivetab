<script setup lang="ts">
import { useStorageLocal } from '@/composables/useStorageLocal'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import { gaProxy } from '@/logic/gtag'
import { requestPermission } from '@/logic/storage'
import { KEYBOARD_URL_MAX_LENGTH, KEYBOARD_NAME_MAX_LENGTH } from '@/logic/constants/keyboard'
import { getFaviconFromUrl } from '@/logic/bookmark'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG, KEYBOARD_COMMAND_ALLOW_KEYCODE_LIST } from '@/logic/constants/keyboard'
import { currKeyboardConfig } from '@/logic/keyboard'
import { getDefaultBookmarkNameFromUrl, getBookmarkConfigUrl, getBookmarkConfigName } from '~/newtab/widgets/keyboard/logic'
import { globalState, localConfig, customPrimaryColor, getStyleConst, getAllCommandsConfig, openConfigShortcutsPage } from '@/logic/store'
import BookmarkPicker from '@/components/BookmarkPicker.vue'
import KeyboardKeycapDisplay from '@/components/KeyboardKeycapDisplay.vue'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import Tips from '@/components/Tips.vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'

// ── 样式计算 ──────────────────────────────────────────────────────────────
// popup 键帽固定基准：40px
const KEYCAP_BASE_SIZE = 40

const {
  getCustomLabel,
  getKeycapStageStyle,
  getKeycapTextStyle,
  getKeycapIconStyle,
  getEmphasisStyle,
  keycapCssVars,
  getFirstRowWidth,
} = useKeyboardStyle('px', KEYCAP_BASE_SIZE)

// ── 表单状态 ───────────────────────────────────────────────────────────────
const state = reactive({
  isBookmarkModalVisible: false,
  isBookmarkDragEnabled: true,
  isCommitLoading: false,
  currDragKeyCode: '', // 拖拽：当前拖起的键
  targetDragKeyCode: '', // 拖拽：当前悬停的目标键
  url: '',
  name: '',
  keyCode: '', // 当前选中的键位
})

// 为实现 page 切换前台时刷新通过 popup 修改的书签
const keyboardPendingData = useStorageLocal('data-keyboard-pending', {
  isPending: false,
})

onMounted(() => {
  setCurrentTabUrl()
  getAllCommandsConfig()
  gaProxy('view', ['popup'], {
    userAgent: navigator.userAgent,
  })
})

// ── 书签表单操作 ───────────────────────────────────────────────────────────

const setCurrentTabUrl = () => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const currTab = tabs[0]
    state.url = currTab.url || ''
    state.name = currTab.title || ''
  })
}

/** 选中键位后，将该键已有的书签配置回填到表单 */
const loadCurrKeyConfig = () => {
  if (state.keyCode.length === 0) {
    return
  }
  if (localConfig.keyboard.keymap[state.keyCode] && localConfig.keyboard.keymap[state.keyCode].url) {
    state.url = localConfig.keyboard.keymap[state.keyCode].url
    state.name = localConfig.keyboard.keymap[state.keyCode].name
  }
}

const selectKey = (key: string) => {
  state.keyCode = key
  loadCurrKeyConfig()
}

const isCommitBtnDisabled = computed(() => state.keyCode.length === 0)

/** 通用提交包装：设置 loading、标记 pending（供 newtab 感知变更）、执行回调 */
const handleCommit = (callback: () => void) => {
  state.isCommitLoading = true
  keyboardPendingData.value.isPending = true
  callback()
  setTimeout(() => {
    state.isCommitLoading = false
    window.$message.success(`${window.$t('common.success')}`)
  }, 1000)
}

const onDeleteKey = () => {
  if (state.keyCode.length === 0) {
    return
  }
  handleCommit(() => {
    delete localConfig.keyboard.keymap[state.keyCode]
  })
}

const onCommitConfigBookmark = () => {
  handleCommit(() => {
    if (state.url.length === 0) {
      delete localConfig.keyboard.keymap[state.keyCode]
    } else {
      localConfig.keyboard.keymap[state.keyCode] = {
        url: state.url,
        name: state.name,
      }
    }
  })
}

const onOpenBookmarkPicker = async () => {
  const granted = await requestPermission('bookmarks')
  if (!granted) {
    return
  }
  state.isBookmarkModalVisible = true
}

const onSelectBookmark = (payload: BookmarkNode) => {
  state.name = payload.title
  state.url = payload.url || ''
  onCommitConfigBookmark()
}

// ── 键帽拖拽交换 ───────────────────────────────────────────────────────────

const handleDragStart = (code: string) => {
  state.currDragKeyCode = code
}

const handleDragOver = (e: Event, targetCode: string) => {
  e.preventDefault() // 阻止松开按键后的返回动画
  state.targetDragKeyCode = targetCode
}

const handleDragEnd = () => {
  if (state.currDragKeyCode === state.targetDragKeyCode) {
    return
  }
  // 忽略空书签（未配置 url 的键位不参与交换）
  if (!localConfig.keyboard.keymap[state.currDragKeyCode]) {
    return
  }
  handleCommit(() => {
    const targetData = localConfig.keyboard.keymap[state.targetDragKeyCode]
    localConfig.keyboard.keymap[state.targetDragKeyCode] = localConfig.keyboard.keymap[state.currDragKeyCode]
    localConfig.keyboard.keymap[state.currDragKeyCode] = targetData
    state.keyCode = state.targetDragKeyCode
  })
}

// ── 键盘渲染辅助 ───────────────────────────────────────────────────────────

const popupKeyboardBorder = getStyleConst('popupKeyboardBorder')
const popupKeyboardHoverBg = getStyleConst('popupKeyboardHoverBg')

// 空书签不传 favicon url：避免共享组件拿到浏览器占位地址，渲染出空 img 节点
const getPopupKeycapIconSrc = (code: string) => {
  const url = getBookmarkConfigUrl(code)
  return url ? getFaviconFromUrl(url) : ''
}

// popup 总宽 = 表单左右留白 + 键盘区宽度（含 shell padding，由 composable 统一计算）
const popupMainWidth = computed(() => `${80 + 24 + getFirstRowWidth()}px`)

const keycapVisualType = computed(() => localConfig.keyboard.keycapType)
const isKeycapBorderEnabled = computed(() => localConfig.keyboard.isKeycapBorderEnabled)
const isCapKeyVisible = computed(() => localConfig.keyboard.isCapKeyVisible)
const isNameVisible = computed(() => localConfig.keyboard.isNameVisible)
const isFaviconVisible = computed(() => localConfig.keyboard.isFaviconVisible)
const isTactileBumpsVisible = computed(() => localConfig.keyboard.isTactileBumpsVisible)
</script>

<template>
  <BookmarkPicker
    v-model:show="state.isBookmarkModalVisible"
    width="60%"
    @select="onSelectBookmark"
  />

  <NCard
    id="popup"
  >
    <template #header>
      <div class="popup__header">
        <span class="header__title">{{ `${$t('common.config')}${$t('setting.bookmark')}` }}</span>
        <div class="header__actions">
          <Tips :content="$t('popup.commitBtnTips')" />
          <NButton
            class="header__commit"
            type="primary"
            size="small"
            :disabled="isCommitBtnDisabled || state.isCommitLoading"
            :loading="state.isCommitLoading"
            @click="onCommitConfigBookmark()"
          >
            <Icon :icon="ICONS.save" />&nbsp;{{ $t('common.save') }}
          </NButton>
        </div>
      </div>
    </template>

    <NForm
      label-placement="left"
      require-mark-placement="left"
      :label-width="55"
      :show-feedback="false"
      :model="state"
    >
      <NFormItem
        class="form__url"
        :label="$t('keyboard.urlLabel')"
        path="url"
        :rule="{ required: true }"
      >
        <NInput
          v-model:value="state.url"
          size="small"
          :placeholder="$t('keyboard.urlPlaceholder')"
          :maxlength="KEYBOARD_URL_MAX_LENGTH"
          show-count
          clearable
          @input="state.url = state.url.replaceAll(' ', '')"
        />

        <div class="url__operation">
          <NButton
            text
            class="operation__btn"
            @click="setCurrentTabUrl()"
          >
            <Icon
              :icon="ICONS.currentLocation"
              class="btn__icon"
            />
          </NButton>
          <NButton
            text
            class="operation__btn"
            :disabled="state.keyCode.length === 0"
            @click="onOpenBookmarkPicker()"
          >
            <Icon
              :icon="ICONS.bookmarkPlus"
              class="btn__icon"
            />
          </NButton>
          <NPopconfirm @positive-click="onDeleteKey()">
            <template #trigger>
              <NButton
                text
                class="operation__btn"
                :disabled="state.keyCode.length === 0 || getBookmarkConfigUrl(state.keyCode).length === 0"
              >
                <Icon
                  :icon="ICONS.deleteBin"
                  class="btn__icon"
                />
              </NButton>
            </template>
            {{ `${$t('common.delete')} ${KEYBOARD_CODE_TO_DEFAULT_CONFIG[state.keyCode].label}` }} ？
          </NPopconfirm>
        </div>
      </NFormItem>

      <div class="popup__form_wrap">
        <NFormItem
          class="form__name"
          :label="$t('keyboard.nameLabel')"
        >
          <NInput
            v-model:value="state.name"
            size="small"
            :placeholder="getDefaultBookmarkNameFromUrl(state.url)"
            :maxlength="KEYBOARD_NAME_MAX_LENGTH"
            show-count
            clearable
            @input="state.name = state.name.trim()"
          />
        </NFormItem>

        <NFormItem
          :label="$t('keyboard.shortcutLabel')"
          class="form__shortcut"
        >
          <NInputGroupLabel
            v-if="localConfig.keyboard.isListenBackgroundKeystrokes"
            class="shortcut__main"
            :title="globalState.allCommandsMap[state.keyCode]"
            @click="openConfigShortcutsPage()"
          >
            <template v-if="globalState.allCommandsMap[state.keyCode]">
              {{ globalState.allCommandsMap[state.keyCode] }}
            </template>
            <Icon
              v-else-if="KEYBOARD_COMMAND_ALLOW_KEYCODE_LIST.includes(state.keyCode)"
              :icon="ICONS.add"
            />
            <Icon
              v-else
              :icon="ICONS.ban"
            />
          </NInputGroupLabel>
        </NFormItem>
      </div>

      <NFormItem
        :label="$t('keyboard.keyLabel')"
        path="key"
        :rule="{ required: true }"
      >
        <NSpin :show="state.isCommitLoading">
          <!--
            KeyboardLayout 负责行列结构、shell、plate 渲染。
            popup 侧通过 #keycap slot 注入拖拽绑定和 KeyboardKeycapDisplay，
            这样和 widget 共用同一套布局逻辑，以后只需维护一个地方。
          -->
          <KeyboardLayout
            unit="px"
            :base-size="KEYCAP_BASE_SIZE"
            :rows="currKeyboardConfig.list"
            class="popup__keyboard"
          >
            <template #keycap="{ code }">
              <div
                class="popup__keycap-drag-wrap"
                :draggable="state.isBookmarkDragEnabled"
                @dragstart="handleDragStart(code)"
                @dragover="handleDragOver($event, code)"
                @dragend="handleDragEnd()"
              >
                <KeyboardKeycapDisplay
                  :key-code="code"
                  :label="getCustomLabel(code)"
                  :name="getBookmarkConfigName(code)"
                  :visual-type="keycapVisualType"
                  :bookmark-type="'mark'"
                  :icon-src="getPopupKeycapIconSrc(code)"
                  :stage-style="getKeycapStageStyle(code)"
                  :text-style="getKeycapTextStyle(code)"
                  :icon-style="getKeycapIconStyle(code)"
                  :img-draggable="state.isBookmarkDragEnabled"
                  :is-selected="code === state.keyCode"
                  :is-border-enabled="isKeycapBorderEnabled"
                  :show-cap-key="isCapKeyVisible"
                  :show-name="isNameVisible"
                  :show-favicon="isFaviconVisible"
                  :show-tactile-bumps="isTactileBumpsVisible"
                  class="row__keycap--hover"
                  :style="[keycapCssVars, getEmphasisStyle(code)]"
                  @click="selectKey(code)"
                />
              </div>
            </template>
          </KeyboardLayout>
        </NSpin>
      </NFormItem>
    </NForm>
  </NCard>
</template>

<style>
#popup {
  width: v-bind(popupMainWidth);
  border-radius: 0 !important;
  overflow: hidden;

  /* ── 头部（标题 + 保存按钮同行）──────────────────────── */
  .n-card-header {
    padding: 0 !important;
    border-bottom: 1px solid v-bind(popupKeyboardBorder);
    /* 头部微渐变背景，增加层次感 */
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.04) 0%,
      transparent 100%
    );
  }

  .popup__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px 9px 16px;

    .header__title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      opacity: 0.88;

      /* 标题左侧色块装饰 */
      &::before {
        content: '';
        display: inline-block;
        width: 3px;
        height: 13px;
        border-radius: 2px;
        background-color: v-bind(customPrimaryColor);
        opacity: 0.8;
        flex-shrink: 0;
      }
    }

    .header__actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header__commit {
      border-radius: var(--radius-pill) !important;
      font-weight: 600;
      letter-spacing: 0.3px;
      font-size: 12px;
      padding: 0 12px !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.28),
        0 1px 3px rgba(0, 0, 0, 0.14),
        0 0 0 0 transparent;
      transition:
        opacity var(--transition-fast),
        transform var(--transition-fast),
        box-shadow var(--transition-fast);

      &:not([disabled]):hover {
        transform: translateY(-1px);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.32),
          0 4px 12px rgba(0, 0, 0, 0.22),
          0 1px 3px rgba(0, 0, 0, 0.1);
      }

      &:not([disabled]):active {
        transform: translateY(0.5px) scale(0.97);
        box-shadow:
          inset 0 2px 4px rgba(0, 0, 0, 0.18),
          0 1px 1px rgba(0, 0, 0, 0.06);
      }
    }
  }

  /* ── 内容区 ───────────────────────────────────────────── */
  .n-card__content {
    padding: 10px 14px 12px 14px !important;
  }

  .n-form-item {
    margin: 3px 0;
  }

  /* ── URL 行：输入框 + 操作按钮 ────────────────────────── */
  .url__operation {
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    padding-left: 5px;
    gap: 2px;

    .operation__btn {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 26px;
      height: 26px;
      border-radius: var(--radius-md);
      transition:
        background-color var(--transition-fast),
        opacity var(--transition-fast),
        transform var(--transition-spring),
        box-shadow var(--transition-fast);
      opacity: 0.4;

      &:not([disabled]):hover {
        background-color: v-bind(popupKeyboardHoverBg);
        opacity: 1;
        transform: scale(1.1);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }

      &:not([disabled]):active {
        transform: scale(0.92);
        opacity: 0.75;
        box-shadow: none;
      }

      .btn__icon {
        font-size: 14px;
      }
    }
  }

  /* ── 名称 + 快捷键行 ──────────────────────────────────── */
  .popup__form_wrap {
    display: flex;
    align-items: center;
    gap: 8px;

    .form__name {
      flex: 1;
    }

    .form__shortcut {
      flex: 0 0 auto;
      width: 22%;

      .shortcut__main {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0 6px;
        width: 100%;
        height: 28px;
        line-height: 1;
        text-align: center;
        font-size: 11px;
        font-weight: 600;
        cursor: alias;
        border-radius: var(--radius-md);
        opacity: 0.72;
        letter-spacing: 0.2px;
        /* kbd 风格微立体 */
        box-shadow:
          0 1px 0 rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
        transition: opacity var(--transition-fast);

        &:hover {
          opacity: 0.92;
        }
      }
    }
  }

  /* ── 键盘区域 ─────────────────────────────────────────── */
  .popup__keyboard {
    cursor: pointer;
    /* 无 shell 时加一点内边距；有 shell 时由 KeyboardLayout 内部的 shell padding 接管，不能覆盖 */
    &:not(.keyboard-layout--shell) {
      padding: 4px 2px 2px;
    }

    /* 拖拽包裹层：铺满整个 keycap-wrap 槽位，用于接收拖拽事件 */
    .popup__keycap-drag-wrap {
      width: 100%;
      height: 100%;
    }
  }
}
</style>
