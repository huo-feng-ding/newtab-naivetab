<script setup lang="ts">
import { useStorageLocal } from '@/composables/useStorageLocal'
import { gaProxy } from '@/logic/gtag'
import { requestPermission } from '@/logic/storage'
import { getFaviconFromUrl } from '@/logic/bookmark'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG, KEYBOARD_COMMAND_ALLOW_KEYCODE_LIST } from '@/logic/constants/keyboard'
import { currKeyboardConfig } from '@/logic/keyboard'
import { getDefaultBookmarkNameFromUrl, getBookmarkConfigUrl, getBookmarkConfigName } from '~/newtab/widgets/keyboard/logic'
import { globalState, localConfig, customPrimaryColor, getStyleConst, getStyleField, getAllCommandsConfig, openConfigShortcutsPage } from '@/logic/store'
import BookmarkPicker from '@/components/BookmarkPicker.vue'
import Tips from '@/components/Tips.vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'

const state = reactive({
  isBookmarkModalVisible: false,
  isBookmarkDragEnabled: true,
  isCommitLoading: false,
  currDragKeyCode: '',
  targetDragKeyCode: '',
  url: '',
  name: '',
  keyCode: '',
})

// 为实现page切换前台时刷新通过pupop修改的书签
const keyboardPendingData = useStorageLocal('data-keyboard-pending', {
  isPending: false,
})

const setCurrentTabUrl = () => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const currTab = tabs[0]
    state.url = currTab.url || ''
    state.name = currTab.title || ''
  })
}

onMounted(() => {
  setCurrentTabUrl()
  getAllCommandsConfig()
  gaProxy('view', ['popup'], {
    userAgent: navigator.userAgent,
  })
})

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

const isCommitBtnDisabled = computed(() => {
  return state.keyCode.length === 0
})

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
  // 忽略空书签
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

const popupKeyboardBorder = getStyleConst('popupKeyboardBorder')
const popupKeyboardHoverBg = getStyleConst('popupKeyboardHoverBg')
const popupKeyboardActiveBg = getStyleConst('popupKeyboardActiveBg')

// ── 从键盘 widget 配置读取样式（与 newtab 保持一致）──────────
const keycapMainFontColor = getStyleField('keyboard', 'mainFontColor')
const keycapMainBgColor = getStyleField('keyboard', 'mainBackgroundColor')
const keycapEmphasisOneFontColor = getStyleField('keyboard', 'emphasisOneFontColor')
const keycapEmphasisOneBgColor = getStyleField('keyboard', 'emphasisOneBackgroundColor')
const keycapEmphasisTwoFontColor = getStyleField('keyboard', 'emphasisTwoFontColor')
const keycapEmphasisTwoBgColor = getStyleField('keyboard', 'emphasisTwoBackgroundColor')
const keycapBorderColor = getStyleField('keyboard', 'keycapBorderColor')

// keycapSize 在 widget 中单位是 vmin（× 0.1），popup 固定 px 基准为 40
const KEYCAP_BASE_SIZE = 40
// 用 widget 配置的 keycapBorderRadius 换算为 px（keycapSize × ratio × 0.1 → 归一后直接用 px）
const keycapBorderRadiusPx = computed(() => {
  const r = localConfig.keyboard.keycapBorderRadius
  const s = localConfig.keyboard.keycapSize
  return `${(r / s) * KEYCAP_BASE_SIZE}px`
})
// GMK 侧壁厚度（同 KeyboardKeycap.vue 中的 KeycapkeycapGmkEdgeBaseSize = 0.03）
const GMK_EDGE = 0.03
const keycapGmkTopBorderPx = computed(() => `${GMK_EDGE * KEYCAP_BASE_SIZE}px`)
const keycapGmkHBorderPx = computed(() => `${GMK_EDGE * 6 * KEYCAP_BASE_SIZE}px`)
const keycapGmkBotBorderPx = computed(() => `${GMK_EDGE * 7 * KEYCAP_BASE_SIZE}px`)
// DSA 侧壁厚度（KeycapkeycapDsaEdgeBaseSize = 0.18）
const DSA_EDGE = 0.18
const keycapDsaBorderPx = computed(() => `${DSA_EDGE * KEYCAP_BASE_SIZE}px`)
// GMK stage 偏移（同 widget 中的计算，换算为 px）
const keycapGmkStageMarginTopPx = computed(() => `${GMK_EDGE * 0.3 * KEYCAP_BASE_SIZE}px`)
const keycapGmkStageMarginLeftPx = computed(() => `${GMK_EDGE * 1.5 * KEYCAP_BASE_SIZE}px`)
const keycapGmkStageHeightPx = computed(() => `${(1 - GMK_EDGE * 8) * KEYCAP_BASE_SIZE}px`)
// DSA stage 偏移
const keycapDsaStageMargPx = computed(() => `${(DSA_EDGE / 3.8) * KEYCAP_BASE_SIZE}px`)
const keycapDsaStageHeightPx = computed(() => `${(1 - DSA_EDGE * 1.7) * KEYCAP_BASE_SIZE}px`)
// favicon 缩放
const keycapFaviconSize = getStyleField('keyboard', 'faviconSize')
// 键帽类型（gmk / dsa / flat）
const keycapType = computed(() => localConfig.keyboard.keycapType)
// 字体
const keycapKeyFontFamily = getStyleField('keyboard', 'keycapKeyFontFamily')
const keycapKeyFontSizePx = computed(() => {
  const s = localConfig.keyboard.keycapSize
  const fs = localConfig.keyboard.keycapKeyFontSize
  return `${(fs / s) * KEYCAP_BASE_SIZE}px`
})
const keycapBookmarkFontSizePx = computed(() => {
  const s = localConfig.keyboard.keycapSize
  const fs = localConfig.keyboard.keycapBookmarkFontSize
  return `${(fs / s) * KEYCAP_BASE_SIZE}px`
})
// 自定义描边
const isKeycapBorderEnabled = computed(() => localConfig.keyboard.isKeycapBorderEnabled)
const keycapBorderWidthPx = computed(() => `${localConfig.keyboard.keycapBorderWidth}px`)
// keycap wrap padding（widget 中单位 vmin，同比换算）
const keycapPaddingPx = computed(() => {
  const p = localConfig.keyboard.keycapPadding
  const s = localConfig.keyboard.keycapSize
  return `${(p / s) * KEYCAP_BASE_SIZE}px`
})

// ── shell（外壳）──────────────────────────────────────────
const isShellVisible = computed(() => localConfig.keyboard.isShellVisible)
const isShellShadowEnabled = computed(() => localConfig.keyboard.isShellShadowEnabled)
// shell padding 换算（vmin → px，同 keycapSize 基准）
const shellVPaddingPx = computed(() => {
  const p = localConfig.keyboard.shellVerticalPadding
  const s = localConfig.keyboard.keycapSize
  return `${(p / s) * KEYCAP_BASE_SIZE}px`
})
const shellHPaddingPx = computed(() => {
  const p = localConfig.keyboard.shellHorizontalPadding
  const s = localConfig.keyboard.keycapSize
  return `${(p / s) * KEYCAP_BASE_SIZE}px`
})
const shellBorderRadiusPx = getStyleField('keyboard', 'shellBorderRadius', 'px')
const shellColor = getStyleField('keyboard', 'shellColor')
const shellShadowColor = getStyleField('keyboard', 'shellShadowColor')
const shellBackgroundBlurPx = getStyleField('keyboard', 'shellBackgroundBlur', 'px')

// ── plate（定位板）───────────────────────────────────────
const isPlateVisible = computed(() => localConfig.keyboard.isPlateVisible)
// plate padding 换算（同 keycapSize 基准）
const platePaddingPx = computed(() => {
  const p = localConfig.keyboard.platePadding
  const s = localConfig.keyboard.keycapSize
  return `${(p / s) * KEYCAP_BASE_SIZE}px`
})
const plateBorderRadiusPx = getStyleField('keyboard', 'plateBorderRadius', 'px')
const plateColor = getStyleField('keyboard', 'plateColor')
const plateBackgroundBlurPx = getStyleField('keyboard', 'plateBackgroundBlur', 'px')

const keycapBaseSize = `${KEYCAP_BASE_SIZE}px`

const getCustomKeycapWidth = (code: string) => {
  let value = KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].size
  const customSize = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].size
  if (customSize) {
    value = customSize
  }
  const width = KEYCAP_BASE_SIZE * value
  return width
}

const getCustomKeycapMargin = (code: string, type: 'marginLeft' | 'marginRight') => {
  const value = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code][type]
  if (value) {
    return KEYCAP_BASE_SIZE * value
  }
  return 0
}

const getKeycapWrapStyle = (code: string) => {
  let style = ''
  const width = getCustomKeycapWidth(code)
  style += `width: ${width}px; `
  const marginLeft = getCustomKeycapMargin(code, 'marginLeft')
  if (marginLeft) {
    style += `margin-left: ${marginLeft}px; `
  }
  const marginRight = getCustomKeycapMargin(code, 'marginRight')
  if (marginRight) {
    style += `margin-right: ${marginRight}px; `
  }
  const marginBottom = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].marginBottom
  if (marginBottom) {
    style += `margin-bottom: ${KEYCAP_BASE_SIZE * marginBottom}px; `
  }
  return style
}

const getContainerWidth = () => {
  // 左侧：label(55) + card-padding-left(14) + 余量(11) = 80
  // 右侧：card-padding-right(14) + 余量(10) = 24
  let totalWidth = 80 + 24
  // shell 开启时加上左右 padding
  if (localConfig.keyboard.isShellVisible) {
    const s = localConfig.keyboard.keycapSize
    totalWidth += (localConfig.keyboard.shellHorizontalPadding / s) * KEYCAP_BASE_SIZE * 2
  }
  // 计算第一行的宽度
  for (const code of currKeyboardConfig.value.list[0]) {
    totalWidth += getCustomKeycapWidth(code)
    totalWidth += getCustomKeycapMargin(code, 'marginLeft')
    totalWidth += getCustomKeycapMargin(code, 'marginRight')
  }
  return totalWidth
}

const popupMainWidth = computed(() => `${getContainerWidth()}px`)
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
          <div
            class="popup__keyboard"
            :class="{
              'popup__keyboard--shell': isShellVisible,
              'popup__keyboard--shell-shadow': isShellVisible && isShellShadowEnabled,
            }"
          >
            <div
              v-for="(rowData, rowIndex) of currKeyboardConfig.list"
              :key="rowIndex"
              class="keyboard__row"
            >
              <div
                v-for="code of rowData"
                :key="code"
                class="row__keycap-wrap"
                :style="getKeycapWrapStyle(code)"
                :draggable="state.isBookmarkDragEnabled"
                @dragstart="handleDragStart(code)"
                @dragover="handleDragOver($event, code)"
                @dragend="handleDragEnd()"
              >
                <div
                  v-if="isShellVisible && isPlateVisible"
                  class="row__keycap-plate"
                />
                <div
                  class="row__keycap"
                  :class="[
                    `row__keycap-${keycapType}`,
                    isKeycapBorderEnabled && 'row__keycap--border',
                  ]"
                  :style="
                    currKeyboardConfig.emphasisOneKeys.includes(code)
                      ? `background-color:${keycapEmphasisOneBgColor};color:${keycapEmphasisOneFontColor};`
                      : currKeyboardConfig.emphasisTwoKeys.includes(code)
                        ? `background-color:${keycapEmphasisTwoBgColor};color:${keycapEmphasisTwoFontColor};`
                        : ''
                  "
                  @click="selectKey(code)"
                >
                  <div
                    v-if="code === state.keyCode"
                    class="keycap__select"
                  >
                    <Icon :icon="ICONS.checkCircle" />
                  </div>

                  <div
                    class="keycap__stage"
                    :class="`keycap__stage-${keycapType}`"
                  >
                    <p class="keycap__label">
                      {{ KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].label }}
                    </p>
                    <div class="keycap__img">
                      <img
                        v-if="getBookmarkConfigUrl(code)"
                        class="img__main"
                        :src="getFaviconFromUrl(getBookmarkConfigUrl(code))"
                        :draggable="state.isBookmarkDragEnabled"
                      />
                    </div>
                    <p class="keycap__name">
                      {{ getBookmarkConfigName(code) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
    font-family: v-bind(keycapKeyFontFamily);
    padding: 4px 2px 2px;
    border-radius: var(--radius-lg);

    /* ── shell 外壳 ── */
    &.popup__keyboard--shell {
      padding: v-bind(shellVPaddingPx) v-bind(shellHPaddingPx);
      border-radius: v-bind(shellBorderRadiusPx);
      background-color: v-bind(shellColor) !important;
      backdrop-filter: blur(v-bind(shellBackgroundBlurPx));
      border-top: 1px solid rgba(255, 255, 255, 0.18);
      border-left: 1px solid rgba(255, 255, 255, 0.10);
      border-right: 1px solid rgba(0, 0, 0, 0.10);
      border-bottom: 1px solid rgba(0, 0, 0, 0.18);
    }
    &.popup__keyboard--shell-shadow {
      background: linear-gradient(
          145deg,
          rgba(255, 255, 255, 0.10) 0%,
          rgba(255, 255, 255, 0.03) 35%,
          rgba(0, 0, 0, 0.06) 65%,
          rgba(0, 0, 0, 0.12) 100%
        ),
        v-bind(shellColor) !important;
      box-shadow:
        0px 8px 24px v-bind(shellShadowColor),
        0px 3px 8px v-bind(shellShadowColor),
        inset 0 1px 0 rgba(255, 255, 255, 0.22),
        inset 0 -2px 4px rgba(0, 0, 0, 0.15);
    }

    .keyboard__row {
      display: flex;

      .row__keycap-wrap {
        position: relative;
        padding: v-bind(keycapPaddingPx);
        height: v-bind(keycapBaseSize);
        cursor: pointer;

        /* ── plate 定位板 ── */
        .row__keycap-plate {
          z-index: -1;
          position: absolute;
          top: calc(-1 * v-bind(platePaddingPx));
          left: calc(-1 * v-bind(platePaddingPx));
          width: calc(100% + v-bind(platePaddingPx) * 2);
          height: calc(100% + v-bind(platePaddingPx) * 2);
          background: v-bind(plateColor);
          border-radius: v-bind(plateBorderRadiusPx);
          backdrop-filter: blur(v-bind(plateBackgroundBlurPx));
        }

        /* ── 基础键帽：颜色/圆角/字体读取 widget 配置 ── */
        .row__keycap {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          color: v-bind(keycapMainFontColor);
          background-color: v-bind(keycapMainBgColor);
          border-style: solid;
          border-radius: v-bind(keycapBorderRadiusPx);
          box-sizing: border-box;
          user-select: none;
          cursor: pointer;
          transition:
            transform 80ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
            box-shadow 80ms ease,
            filter 80ms ease;

          /* 选中蒙层 */
          .keycap__select {
            display: flex;
            justify-content: center;
            align-items: center;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            background: color-mix(in srgb, v-bind(customPrimaryColor) 20%, transparent);
            color: v-bind(customPrimaryColor);
            font-size: 14px;
            border-radius: calc(v-bind(keycapBorderRadiusPx) - 1px);
            box-shadow:
              inset 0 0 0 1.5px v-bind(customPrimaryColor),
              0 0 8px color-mix(in srgb, v-bind(customPrimaryColor) 28%, transparent);
          }

          /* 键帽顶面 stage（公共基础） */
          .keycap__stage {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            height: 100%;
            border-style: solid;
            border-width: 0;
            color: inherit;
            background-color: inherit;

            .keycap__label {
              flex: 0 0 auto;
              width: 100%;
              font-size: v-bind(keycapKeyFontSizePx);
              line-height: 1;
              font-weight: 500;
              text-align: center;
              opacity: 0.82;
              letter-spacing: 0.3px;
              padding: 2px 2px 0;
            }

            .keycap__img {
              flex: 1 1 0;
              min-height: 0;
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: hidden;
              padding: 1px 0;
              filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.18));
              transition: filter var(--transition-fast), transform var(--transition-fast);

              .img__main {
                display: block;
                max-width: 80%;
                max-height: 100%;
                width: auto;
                height: auto;
                object-fit: contain;
              }
            }

            .keycap__name {
              flex: 0 0 auto;
              width: 100%;
              line-height: 1;
              font-size: v-bind(keycapBookmarkFontSizePx);
              text-align: center;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              opacity: 0.72;
              font-weight: 500;
              letter-spacing: 0.15px;
              padding: 0 2px 2px;
            }
          }

          /* hover 时 favicon 高光 */
          &:hover .keycap__img {
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.22));
          }
        }

        /* ── Flat 磨砂质感 ── */
        .row__keycap-flat {
          box-shadow: none;
          .keycap__stage-flat {
            padding: 3px 2px 2px;
            border-radius: v-bind(keycapBorderRadiusPx);
            border-width: 1px;
            border-color: rgba(255, 255, 255, 0.18) rgba(0, 0, 0, 0.08) rgba(0, 0, 0, 0.12) rgba(255, 255, 255, 0.12);
            background: linear-gradient(
              160deg,
              rgba(255, 255, 255, 0.18) 0%,
              rgba(255, 255, 255, 0.04) 50%,
              rgba(0, 0, 0, 0.06) 100%
            );
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.25),
              inset 0 -1px 0 rgba(0, 0, 0, 0.1);
          }
        }

        /* ── GMK 机械键帽立体感 ── */
        .row__keycap-gmk {
          border-width: v-bind(keycapGmkTopBorderPx) v-bind(keycapGmkHBorderPx) v-bind(keycapGmkBotBorderPx);
          border-color: rgba(255, 255, 255, 0.06) rgba(0, 0, 0, 0.12) rgba(0, 0, 0, 0.30) rgba(0, 0, 0, 0.08);
          box-shadow:
            0 3px 8px rgba(0, 0, 0, 0.45),
            0 1px 2px rgba(0, 0, 0, 0.30),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);

          &:hover {
            transform: translateY(-1px);
            filter: brightness(1.06);
            box-shadow:
              0 5px 12px rgba(0, 0, 0, 0.50),
              0 2px 4px rgba(0, 0, 0, 0.32),
              inset 0 1px 0 rgba(255, 255, 255, 0.18);
          }
          &:active {
            transform: translateY(2px);
            filter: brightness(0.94);
            box-shadow:
              0 1px 3px rgba(0, 0, 0, 0.40),
              0 0px 1px rgba(0, 0, 0, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
          }

          .keycap__stage-gmk {
            /* GMK stage 覆盖外壳侧壁，形成顶面凹入效果 */
            overflow: hidden;
            margin-top: calc(-1 * v-bind(keycapGmkStageMarginTopPx));
            margin-left: calc(-1 * v-bind(keycapGmkStageMarginLeftPx));
            width: calc(100% + v-bind(keycapGmkHBorderPx) * 2);
            height: v-bind(keycapGmkStageHeightPx);
            border-width: 0px;
            border-color: rgba(0, 0, 0, 0.1);
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
            border-bottom-right-radius: 8px 4px;
            border-bottom-left-radius: 8px 4px;
            background: linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.28) 0%,
              rgba(255, 255, 255, 0.10) 18%,
              rgba(0, 0, 0, 0.04) 55%,
              rgba(0, 0, 0, 0.10) 100%
            );
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.35),
              inset 0 -1px 0 rgba(0, 0, 0, 0.12),
              0 2px 6px rgba(0, 0, 0, 0.18);
            background-color: inherit;
            color: inherit;
          }
        }

        /* ── DSA 球面键帽立体感 ── */
        .row__keycap-dsa {
          border-width: v-bind(keycapDsaBorderPx);
          border-color: rgba(255, 255, 255, 0.06) rgba(0, 0, 0, 0.10) rgba(0, 0, 0, 0.24) rgba(0, 0, 0, 0.06);
          box-shadow:
            0 3px 7px rgba(0, 0, 0, 0.40),
            0 1px 2px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.10);

          &:hover {
            transform: translateY(-1px);
            filter: brightness(1.06);
            box-shadow:
              0 5px 10px rgba(0, 0, 0, 0.44),
              0 2px 3px rgba(0, 0, 0, 0.28),
              inset 0 1px 0 rgba(255, 255, 255, 0.16);
          }
          &:active {
            transform: translateY(2px);
            filter: brightness(0.94);
            box-shadow:
              0 1px 3px rgba(0, 0, 0, 0.36),
              0 0px 1px rgba(0, 0, 0, 0.22),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
          }

          .keycap__stage-dsa {
            overflow: hidden;
            margin: calc(-1 * v-bind(keycapDsaStageMargPx));
            width: calc(100% + v-bind(keycapDsaBorderPx) * 2);
            height: v-bind(keycapDsaStageHeightPx);
            border-width: 0px;
            border-radius: 8px;
            background: radial-gradient(
              ellipse at 38% 30%,
              rgba(255, 255, 255, 0.30) 0%,
              rgba(255, 255, 255, 0.10) 35%,
              rgba(0, 0, 0, 0.06) 65%,
              rgba(0, 0, 0, 0.14) 100%
            );
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.30),
              inset 0 -1px 0 rgba(0, 0, 0, 0.14),
              inset 1px 0 0 rgba(255, 255, 255, 0.12),
              inset -1px 0 0 rgba(0, 0, 0, 0.08),
              0 2px 5px rgba(0, 0, 0, 0.18);
            background-color: inherit;
            color: inherit;
          }
        }

        /* ── 自定义描边 ── */
        .row__keycap--border {
          outline: v-bind(keycapBorderWidthPx) solid v-bind(keycapBorderColor);
        }
      }
    }
  }

}
</style>
