<script setup lang="ts">
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import { gaProxy } from '@/logic/gtag'
import { requestPermission, flushConfigSync } from '@/logic/storage'
import { KEYBOARD_URL_MAX_LENGTH, KEYBOARD_NAME_MAX_LENGTH } from '@/logic/constants/keyboard'
import { getFaviconFromUrl } from '@/logic/bookmark'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG } from '@/logic/constants/keyboard'
import { currKeyboardConfig } from '@/logic/keyboard'
import { getDefaultBookmarkNameFromUrl, getBookmarkConfigUrl, getBookmarkConfigName } from '~/newtab/widgets/keyboard/logic'
import { localConfig, customPrimaryColor, getStyleConst } from '@/logic/store'
import BookmarkPicker from '@/components/BookmarkPicker.vue'
import KeyboardKeycapDisplay from '@/components/KeyboardKeycapDisplay.vue'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import Tips from '@/components/Tips.vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'

// ── 样式计算 ──────────────────────────────────────────────────────────────
// popup 键帽固定基准：40px
const KEYCAP_BASE_SIZE = 40

const { getCustomLabel, getKeycapStageStyle, getKeycapTextStyle, getKeycapIconStyle, getEmphasisStyle, keycapCssVars, getFirstRowWidth } = useKeyboardStyle('px', KEYCAP_BASE_SIZE)

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

onMounted(() => {
  setCurrentTabUrl()
  gaProxy('view', ['popup'], {
    userAgent: navigator.userAgent,
  })
})

// ── 书签表单操作 ───────────────────────────────────────────────────────────

const setCurrentTabUrl = () => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const currTab = tabs[0]
    const { url, title } = currTab
    state.url = url?.slice(0, KEYBOARD_URL_MAX_LENGTH) || ''
    // title 可能过长且包含换行，默认不直接使用，交由用户选择是否填入；如果用户没有输入名称，则使用默认名称（从 url 解析或默认文案）
    state.name = ''
  })
}

/** 选中键位后，将该键已有的书签配置回填到表单 */
const loadCurrKeyConfig = () => {
  if (state.keyCode.length === 0) {
    return
  }
  state.url = localConfig.keyboard.keymap[state.keyCode]?.url || ''
  state.name = localConfig.keyboard.keymap[state.keyCode]?.name || ''
}

const selectKey = (key: string) => {
  state.keyCode = key
  loadCurrKeyConfig()
}

const isCommitBtnDisabled = computed(() => state.keyCode.length === 0)

/** 通用提交包装：设置 loading、执行回调、强制同步到 chrome.storage */
const handleCommit = async (callback: () => void) => {
  state.isCommitLoading = true
  callback()
  // 强制立即同步到 chrome.storage.sync，确保 Service Worker 和 newtab 能收到更新
  // popup 关闭后防抖回调不会执行，必须在此处强制同步
  await flushConfigSync('keyboard')
  setTimeout(() => {
    state.isCommitLoading = false
    window.$message.success(`${window.$t('common.success')}`)
  }, 300)
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
const popupMainWidth = computed(() => `${70 + getFirstRowWidth()}px`)

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

  <NCard id="popup">
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

    <div class="popup__form">
      <div class="form__config">
        <div class="form__field form__field--url">
          <NInput
            v-model:value="state.url"
            size="small"
            :placeholder="$t('keyboard.urlLabel')"
            :maxlength="KEYBOARD_URL_MAX_LENGTH"
            show-count
            clearable
            @input="state.url = state.url.replaceAll(' ', '')"
          />
        </div>

        <div class="form__field form__field--name">
          <NInput
            v-model:value="state.name"
            size="small"
            :placeholder="getDefaultBookmarkNameFromUrl(state.url) || $t('keyboard.nameLabel')"
            :maxlength="KEYBOARD_NAME_MAX_LENGTH"
            show-count
            clearable
            @input="state.name = state.name.trim()"
          />
        </div>

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
      </div>

      <div class="popup__keyboard-wrap">
        <NSpin :show="state.isCommitLoading">
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
      </div>
    </div>
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
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%);
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

  /* ── Form ── */
  .popup__form {
    .form__config {
      margin: 10px;
      display: flex;
      gap: 12px;

      .form__field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .form__field--url {
        flex: 1;
        min-width: 0;
      }

      .form__field--name {
        flex: 0 0 auto;
        width: 140px;
      }

      .url__operation {
        display: flex;
        flex-wrap: nowrap;
        justify-content: center;
        align-items: center;
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
    }
  }

  /* ── 键盘区域 ─────────────────────────────────────────── */
  .popup__keyboard-wrap {
    display: flex;
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
}
</style>
