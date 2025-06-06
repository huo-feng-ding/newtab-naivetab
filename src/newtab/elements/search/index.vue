<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { gaProxy } from '@/logic/gtag'
import { createTab, sleep } from '@/logic/util'
import { getBaiduSugrec } from '@/api'
import { isDragMode } from '@/logic/moveable'
import { localConfig, globalState, getIsComponentRender, getLayoutStyle, getStyleField } from '@/logic/store'
import MoveableComponentWrap from '@/newtab/components/moveable/MoveableComponentWrap.vue'

const CNAME = 'search'
const isRender = getIsComponentRender(CNAME)

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
  // 输入框有焦点的时候，这时要失去焦点
  if (['Escape'].includes(code) || (event.ctrlKey && 'BracketLeft' === code)) {
    const searchInput = window.document.querySelector('.n-input__input-el')
    if(searchInput){
      searchInput.blur()
    }
    handleSearchBlur()
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

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'vmin')
const customPadding = getStyleField(CNAME, 'padding', 'vmin')
const customWidth = getStyleField(CNAME, 'width', 'vmin')
const customHeight = getStyleField(CNAME, 'height', 'vmin')
const customBorderRadius = getStyleField(CNAME, 'borderRadius', 'vmin')
const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
</script>

<template>
  <MoveableComponentWrap
    v-model:dragStyle="dragStyle"
    component-name="search"
  >
    <div
      v-if="isRender"
      id="search"
      data-target-type="1"
      data-target-name="search"
    >
      <div
        class="search__container"
        :style="dragStyle || containerStyle"
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
            <il:search class="search__icon" />
          </NButton>
        </NInputGroup>
      </div>
    </div>
  </MoveableComponentWrap>
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
      width: 50px;
      color: v-bind(customFontColor) !important;
      cursor: pointer;
      .search__icon {
        font-size: v-bind(customFontSize);
      }
    }
    .input__search--move {
      cursor: move !important;
    }
  }
  .search__container--border {
    border: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .search__container--shadow {
    box-shadow:
      v-bind(customShadowColor) 0px 2px 4px 0px,
      v-bind(customShadowColor) 0px 2px 16px 0px;
  }
}
</style>
