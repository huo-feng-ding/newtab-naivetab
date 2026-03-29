<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { useDebounceFn } from '@vueuse/core'
import { gaProxy } from '@/logic/gtag'
import { createTab, sleep } from '@/logic/util'
import { getBaiduSugrec } from '@/api'
import { isDragMode } from '@/logic/moveable'
import { localConfig, globalState, getStyleField } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const state = reactive({
  placementValue: 'bottom' as Placement,
  searchValue: '',
  isSuggestVisible: false,
  isSuggestLoading: false,
  isSuggestSelecting: false,
  currSuggestIndex: -1,
  suggestList: [] as {
    label: string
    key: string
    props: {
      class: string
      onClick: () => void
    }
  }[],
})

const onSearch = () => {
  if (state.searchValue.length === 0) {
    return
  }
  const encodeText = encodeURIComponent(state.searchValue)
  const searchUrl = localConfig.search.urlValue.replace('{query}', encodeText)
  state.isSuggestVisible = false
  gaProxy('click', ['search', 'onSearch'])
  if (localConfig.search.isNewTabOpen) {
    createTab(searchUrl)
    state.searchValue = ''
    return
  }
  // 当前标签页打开
  window.location.href = searchUrl
}

const handleSelectSuggest = (key: string) => {
  state.searchValue = key
  onSearch()
}

const handleSelectOutside = () => {
  state.isSuggestVisible = false
}

const handleSearchFocus = () => {
  globalState.isSearchFocused = true
  state.isSuggestVisible = true
}

const handleSearchBlur = () => {
  globalState.isSearchFocused = false
  state.isSuggestVisible = false
  state.isSuggestSelecting = false
  state.currSuggestIndex = -1
}

const handleSearchInput = () => {
  if (isDragMode.value) {
    state.searchValue = ''
    return
  }
  state.isSuggestVisible = true
  state.isSuggestSelecting = false
  state.currSuggestIndex = -1
}

const handleSearchKeydown = (e: KeyboardEvent) => {
  const { code, isComposing } = e
  if (isComposing) {
    return
  }
  if (['Enter', 'NumpadEnter'].includes(code)) {
    onSearch()
    return
  }
  if (['ArrowUp', 'ArrowDown'].includes(code)) {
    if (!state.isSuggestVisible) {
      return
    }
    e.preventDefault() // 阻止按下ArrowUp时光标移动至开头
    state.isSuggestSelecting = true
    if (code === 'ArrowUp') {
      state.currSuggestIndex -= 1
      if (state.currSuggestIndex < 0) {
        state.currSuggestIndex = 0
      }
    } else if (code === 'ArrowDown') {
      state.currSuggestIndex += 1
      if (state.currSuggestIndex > state.suggestList.length - 1) {
        state.currSuggestIndex = state.suggestList.length - 1
      }
    }
    const text = state.suggestList[state.currSuggestIndex].label
    state.searchValue = text
    state.suggestList = state.suggestList.map((item, index) => ({
      ...item,
      props: {
        ...item.props,
        class: state.currSuggestIndex === index ? 'n-dropdown-option-body--pending' : '',
      },
    }))
  }
}

const onClearValue = async () => {
  state.isSuggestVisible = false
  state.isSuggestSelecting = false
  state.currSuggestIndex = -1
  state.searchValue = ''
  await sleep(150) // 等待关闭动画执行完成
  state.suggestList = []
}

const getBaiduSuggest = async () => {
  if (state.searchValue.length === 0 || state.isSuggestSelecting) {
    return
  }
  state.isSuggestLoading = true
  const data = await getBaiduSugrec(state.searchValue)
  state.isSuggestLoading = false
  if (data && data.g && data.g.length !== 0) {
    state.suggestList = data.g
      .map((item) => ({
        label: item.q,
        key: item.q,
        props: {
          class: '',
          onClick: () => {
            handleSelectSuggest(item.q)
          },
        },
      }))
      .slice(0, 6)
  } else {
    state.suggestList = []
  }
}

const getBaiduSuggestHandler = useDebounceFn(getBaiduSuggest, 300)

watch(
  () => state.searchValue,
  () => {
    if (!localConfig.search.suggestionEnabled) {
      return
    }
    if (state.searchValue.length === 0) {
      onClearValue()
      return
    }
    getBaiduSuggestHandler()
  },
)

watch(isDragMode, () => {
  onClearValue()
})

const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customPadding = getStyleField(WIDGET_CODE, 'padding', 'vmin')
const customWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customHeight = getStyleField(WIDGET_CODE, 'height', 'vmin')
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'vmin')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customBackgroundBlur = getStyleField(WIDGET_CODE, 'backgroundBlur', 'px')
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="search__container"
      :class="{
        'search__container--focus': localConfig.search.isBorderEnabled && globalState.isSearchFocused,
        'search__container--border': localConfig.search.isBorderEnabled,
        'search__container--shadow': localConfig.search.isShadowEnabled,
      }"
    >
      <NInputGroup>
        <NDropdown
          class="search__dropdown"
          :show="localConfig.search.suggestionEnabled && state.isSuggestVisible && state.suggestList.length !== 0"
          :options="state.suggestList"
          :placement="state.placementValue"
          :show-arrow="true"
          :keyboard="false"
          :style="`width: ${customWidth};`"
          @select="handleSelectSuggest"
          @clickoutside="handleSelectOutside"
        >
          <NInput
            v-model:value="state.searchValue"
            type="text"
            size="large"
            class="input__main"
            :class="{ 'input__main--move': isDragMode }"
            :placeholder="localConfig.search.placeholder || localConfig.search.urlName"
            :loading="state.isSuggestLoading"
            clearable
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
            @input="handleSearchInput"
            @keydown="handleSearchKeydown"
          />
        </NDropdown>
        <NButton
          v-if="localConfig.search.iconEnabled"
          class="input__search"
          :class="{ 'input__search--move': isDragMode }"
          size="large"
          text
          @click="onSearch"
        >
          <Icon
            :icon="ICONS.searchAction"
            class="search__icon"
          />
        </NButton>
      </NInputGroup>
    </div>
  </WidgetWrap>
</template>

<style>
#search {
  font-family: v-bind(customFontFamily);
  user-select: none;

  .search__container {
    z-index: 10;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: v-bind(customBorderRadius);
    background-color: v-bind(customBackgroundColor);
    backdrop-filter: blur(v-bind(customBackgroundBlur)) saturate(1.4);
    transition: box-shadow 0.25s ease, border-color 0.25s ease, background-color 0.25s ease;
    will-change: transform;

    /* 内高光：左上角玻璃反射光晕 */
    &::before {
      content: '';
      pointer-events: none;
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(
        160deg,
        rgba(255, 255, 255, 0.14) 0%,
        rgba(255, 255, 255, 0.04) 40%,
        transparent 70%
      );
      z-index: 0;
    }
    /* 顶部高光线 */
    &::after {
      content: '';
      pointer-events: none;
      position: absolute;
      top: 0;
      left: 12%;
      right: 12%;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      border-radius: 50%;
      z-index: 1;
    }

    .n-input__border,
    .n-input__state-border {
      border: 0 !important;
      box-shadow: none !important;
    }
    .n-input,
    .n-input--focus {
      border-radius: v-bind(customBorderRadius) !important;
    }
    .input__main {
      position: relative;
      z-index: 1;
      flex: 1;
      width: v-bind(customWidth);
      height: v-bind(customHeight);
      font-size: v-bind(customFontSize);
      background-color: transparent;
      .n-input-wrapper {
        padding: 0 v-bind(customPadding);
        .n-input__input-el {
          height: v-bind(customHeight);
          color: v-bind(customFontColor) !important;
          caret-color: v-bind(customFontColor);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }
        .n-input__placeholder {
          color: v-bind(customFontColor);
          opacity: 0.4;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        .n-input__suffix {
          .n-base-clear {
            color: v-bind(customFontColor);
            opacity: 0.45;
            transition: opacity 0.18s ease, transform 0.15s ease;
            &:hover {
              opacity: 0.9;
              transform: scale(1.15);
            }
          }
        }
      }
    }
    .input__main--move {
      cursor: move !important;
      .n-input__input-el {
        cursor: move !important;
      }
    }
    .input__search {
      position: relative;
      z-index: 1;
      flex-shrink: 0;
      width: auto;
      padding: 0 v-bind(customPadding);
      color: v-bind(customFontColor) !important;
      opacity: 0.65;
      cursor: pointer;
      transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
      .search__icon {
        font-size: v-bind(customFontSize);
        display: block;
        filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
        transition: filter 0.18s ease;
      }
      &:hover {
        opacity: 1;
        transform: scale(1.12);
        .search__icon {
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
        }
      }
      &:active {
        transform: scale(0.95);
        transition-duration: 0.08s;
      }
    }
    .input__search--move {
      cursor: move !important;
      &:hover {
        transform: none;
      }
      &:active {
        transform: none;
      }
    }
  }

  .search__container--border {
    border: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .search__container--shadow {
    box-shadow:
      0 4px 24px v-bind(customShadowColor),
      0 1px 4px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  .search__container--focus {
    &.search__container--shadow {
      box-shadow:
        0 6px 32px v-bind(customShadowColor),
        0 2px 8px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.14);
    }
    &.search__container--border {
      border-color: v-bind(customFontColor);
    }
    /* 聚焦时背景微微提亮 */
    background-color: color-mix(in srgb, v-bind(customBackgroundColor) 85%, rgba(255,255,255,0.08) 15%);
  }
}
</style>
