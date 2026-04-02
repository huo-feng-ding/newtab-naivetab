<script setup lang="ts">
import { TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP } from '@/logic/constants/index'
import { isDragMode } from '@/logic/moveable'
import { getFaviconFromUrl } from '@/logic/bookmark'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG, SPACE_KEYCODE_LIST } from '@/logic/constants/keyboard'
import { currKeyboardConfig } from '@/logic/keyboard'
import { state as keyboardState, openPage, handleSpecialKeycapExec, getKeycapBookmarkType, getKeycapName, getKeycapUrl, getCustomKeycapWidth } from '~/newtab/widgets/keyboard/logic'
import { localConfig, getStyleField, customPrimaryColor } from '@/logic/store'
import KeyboardKeycapDisplay from '@/components/KeyboardKeycapDisplay.vue'
import { WIDGET_CODE } from '../config'
import { handleSpecialScript } from '../scriptHandlers'

const props = defineProps({
  keyCode: {
    type: String,
    required: true,
  },
})

// 标签优先读取自定义配置，未配置时回退到键位默认标签
const keycapLabel = computed(() => {
  let defaultLabel = KEYBOARD_CODE_TO_DEFAULT_CONFIG[props.keyCode].label
  const customLabel = currKeyboardConfig.value.custom[props.keyCode] && currKeyboardConfig.value.custom[props.keyCode].label
  if (customLabel) {
    defaultLabel = customLabel
  }
  return defaultLabel
})

const keycapName = computed(() => getKeycapName(props.keyCode))
const keycapBookmarkUrl = computed(() => getKeycapUrl(props.keyCode))
const keycapBookmarkType = computed(() => getKeycapBookmarkType(props.keyCode))
const keycapVisualType = computed(() => localConfig.keyboard.keycapType)

// title 用于鼠标悬浮提示，名称为空时不展示 tooltip，避免空提示框
const keycapTitle = computed(() => {
  if (keycapName.value.length === 0) {
    return ''
  }
  if (keycapBookmarkUrl.value.length === 0) {
    return keycapName.value
  }
  return `${keycapName.value} · ${keycapBookmarkUrl.value}`
})

// 统一处理键帽点击逻辑
const onMouseDownKey = (event: MouseEvent, keyCode: string) => {
  if (isDragMode.value) {
    return
  }
  // 避免拖拽模式下页面级的拖拽监听拿不到事件，无法进入拖动流程
  // 阻止默认行为（例如浏览器中键的滚轮模式切换）
  event.preventDefault()
  // 阻止事件冒泡
  event.stopPropagation()
  const { button, shiftKey, altKey } = event
  // 忽略鼠标右键
  if (button === 2) {
    return
  }
  const isHandled = handleSpecialKeycapExec(keyCode, keycapBookmarkType.value)
  if (isHandled) {
    return
  }
  const url = keycapBookmarkUrl.value
  if (url.length === 0) {
    return
  }
  // 处理特殊脚本
  if (handleSpecialScript(url, event, keyboardState)) {
    return
  }
  if (button === 0) {
    // 按下鼠标左键
    keyboardState.currSelectKeyCode = keyCode
    // shift + 点击key后台打开书签，alt + key 新标签页打开
    openPage(url, shiftKey, altKey)
  } else if (button === 1) {
    // 按下鼠标中键
    openPage(url, true)
  }
}

const customKeycapKeyFontFamily = getStyleField(WIDGET_CODE, 'keycapKeyFontFamily')
const customKeycapKeyFontSize = getStyleField(WIDGET_CODE, 'keycapKeyFontSize', 'vmin')
const customKeycapBookmarkFontSize = getStyleField(WIDGET_CODE, 'keycapBookmarkFontSize', 'vmin')
const customBookmarkFaviconSize = getStyleField(WIDGET_CODE, 'faviconSize')

// keycap-base
const customKeycapBorderRadius = getStyleField(WIDGET_CODE, 'keycapBorderRadius', 'vmin')
const customKeycapTextPadding = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', 0.08)
const customKeycapIconPadding = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', 0.08)
const customKeycapBackgroundBlur = getStyleField(WIDGET_CODE, 'keycapBackgroundBlur', 'px')

// keycap-flat
const customKeycapStageFlatPadding = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', 0.08)

// keycap-gmk
const KeycapkeycapGmkEdgeBaseSize = 0.03
const customKeycapkeycapGmkTopBorderWidth = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', KeycapkeycapGmkEdgeBaseSize)
const customKeycapkeycapGmkHorizontalBorderWidth = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', KeycapkeycapGmkEdgeBaseSize * 6)
const customKeycapkeycapGmkBottomBorderWidth = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', KeycapkeycapGmkEdgeBaseSize * 7)
const customKeycapStageGmkMarginTop = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', KeycapkeycapGmkEdgeBaseSize * 0.3)
const customKeycapStageGmkMarginLeft = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', KeycapkeycapGmkEdgeBaseSize * 1.5)
const KeycapkeycapGmkEdgeHorizontalSize = KeycapkeycapGmkEdgeBaseSize * 10
const customKeycapStageGmkHeight = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', 1 - KeycapkeycapGmkEdgeBaseSize * 8)

// keycap-dsa
const KeycapkeycapDsaEdgeBaseSize = 0.18
const KeycapkeycapDsaEdgeSize = KeycapkeycapDsaEdgeBaseSize * 1.7
const customKeycapDsaBorderWidth = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', KeycapkeycapDsaEdgeBaseSize)
const customKeycapStageDsaMargin = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', KeycapkeycapDsaEdgeBaseSize / 3.8)
const customKeycapStageDsaHeight = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', 1 - KeycapkeycapDsaEdgeSize)

// keycap color
const customMainFontColor = getStyleField(WIDGET_CODE, 'mainFontColor')
const customMainBackgroundColor = getStyleField(WIDGET_CODE, 'mainBackgroundColor')
const customEmphasisOneFontColor = getStyleField(WIDGET_CODE, 'emphasisOneFontColor')
const customEmphasisOneBackgroundColor = getStyleField(WIDGET_CODE, 'emphasisOneBackgroundColor')
const customEmphasisTwoFontColor = getStyleField(WIDGET_CODE, 'emphasisTwoFontColor')
const customEmphasisTwoBackgroundColor = getStyleField(WIDGET_CODE, 'emphasisTwoBackgroundColor')
const customBorderWidth = getStyleField(WIDGET_CODE, 'keycapBorderWidth', 'px')
const customBorderColor = getStyleField(WIDGET_CODE, 'keycapBorderColor')

// 共用展示组件只负责渲染结构与通用样式，这里通过 CSS 变量把 widget 侧的主题、
// 尺寸、边框厚度等参数注入进去，让 popup 和 widget 共享同一套 DOM。
const keycapCssVars = computed(() => ({
  '--keycap-main-font-color': customMainFontColor.value,
  '--keycap-main-bg-color': customMainBackgroundColor.value,
  '--keycap-background-blur': customKeycapBackgroundBlur.value,
  '--keycap-border-radius': customKeycapBorderRadius.value,
  '--custom-primary-color': customPrimaryColor.value,
  '--keycap-key-font-family': customKeycapKeyFontFamily.value,
  '--keycap-key-font-size': customKeycapKeyFontSize.value,
  '--keycap-bookmark-font-size': customKeycapBookmarkFontSize.value,
  '--keycap-favicon-size': customBookmarkFaviconSize.value,
  '--keycap-stage-flat-padding': customKeycapStageFlatPadding.value,
  '--keycap-gmk-top-border': customKeycapkeycapGmkTopBorderWidth.value,
  '--keycap-gmk-h-border': customKeycapkeycapGmkHorizontalBorderWidth.value,
  '--keycap-gmk-bot-border': customKeycapkeycapGmkBottomBorderWidth.value,
  '--keycap-dsa-border': customKeycapDsaBorderWidth.value,
  '--keycap-border-width': customBorderWidth.value,
  '--keycap-border-color': customBorderColor.value,
}))

// 键位允许单独配置文本对齐方式，图标与名称区域也会复用这个对齐结果
const getCustomTextAlign = (code: string) => {
  let value = KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].textAlign
  const customTextAlign = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].textAlign
  if (customTextAlign) {
    value = customTextAlign
  }
  return value
}

// 强调键只修改底色和文字色，其余立体结构仍由共享组件样式负责
const keycapStyle = computed(() => {
  let style = ''
  if (currKeyboardConfig.value.emphasisOneKeys.includes(props.keyCode)) {
    style += `background-color: ${customEmphasisOneBackgroundColor.value}; color: ${customEmphasisOneFontColor.value};`
  } else if (currKeyboardConfig.value.emphasisTwoKeys.includes(props.keyCode)) {
    style += `background-color: ${customEmphasisTwoBackgroundColor.value}; color: ${customEmphasisTwoFontColor.value};`
  }
  return style
})

// 顶面 stage 的尺寸和偏移需要根据键帽类型动态计算：
// - GMK / DSA 会在视觉上缩小顶面，露出四周侧壁
// - 空格等大键额外附加一层渐变，让顶面高光更自然
const keycapStageStyle = computed(() => {
  let style = ''
  if (keycapVisualType.value === 'gmk') {
    // 调整KeycapStage居中，形成按键边缘遮盖效果
    style += `margin-top: -${customKeycapStageGmkMarginTop.value};margin-left: -${customKeycapStageGmkMarginLeft.value};`
    style += `width: ${getCustomKeycapWidth(props.keyCode, -KeycapkeycapGmkEdgeHorizontalSize).value};`
    style += `height: ${customKeycapStageGmkHeight.value};`
    // 空格阴影效果
    if (SPACE_KEYCODE_LIST.includes(props.keyCode)) {
      style += 'background: linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 90%); background-color: inherit; border-radius;'
    }
  } else if (keycapVisualType.value === 'dsa') {
    style += `margin: -${customKeycapStageDsaMargin.value};`
    style += `width: ${getCustomKeycapWidth(props.keyCode, -KeycapkeycapDsaEdgeSize).value};`
    style += `height: ${customKeycapStageDsaHeight.value};`
    // 空格阴影效果
    if (SPACE_KEYCODE_LIST.includes(props.keyCode)) {
      style += 'background: linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 90%); background-color: inherit;'
    }
  }
  return style
})

// 文本区域根据 textAlign 决定对齐方式，非居中时补齐左右内边距
const keycapTextStyle = computed(() => {
  const textAlign = getCustomTextAlign(props.keyCode)
  let style = `text-align: ${textAlign};`
  if (textAlign !== 'center') {
    style += `padding: 0 ${customKeycapTextPadding.value};`
  }
  return style
})

// 图标区域与文本对齐保持一致；当名称隐藏时，改用统一 icon padding 保证视觉居中
const keycapIconStyle = computed(() => {
  let textAlign = getCustomTextAlign(props.keyCode)
  textAlign = TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP[textAlign]
  let style = `justify-content: ${textAlign};`
  if (localConfig.keyboard.isNameVisible) {
    if (textAlign !== 'center') {
      style += `padding: 0 ${customKeycapTextPadding.value};`
    }
  } else {
    style += `padding: ${customKeycapIconPadding.value};`
  }
  return style
})

// 展示组件内部已经携带基础类型类名，这里只补充 widget 专属交互状态类
const rowKeycapClassName = computed(() => {
  const className: string[] = []
  className.push(isDragMode.value ? 'row__keycap--move' : 'row__keycap--hover')
  if (keyboardState.currSelectKeyCode === props.keyCode) {
    className.push('row__keycap--active')
  }
  return className
})
</script>

<template>
  <KeyboardKeycapDisplay
    :key-code="keyCode"
    :label="keycapLabel"
    :name="keycapName"
    :visual-type="keycapVisualType"
    :bookmark-type="keycapBookmarkType"
    :icon-src="getFaviconFromUrl(keycapBookmarkUrl)"
    :stage-style="keycapStageStyle"
    :text-style="keycapTextStyle"
    :icon-style="keycapIconStyle"
    :img-draggable="false"
    :is-loading="keyboardState.isLoadPageLoading && keyboardState.currSelectKeyCode === keyCode"
    :is-border-enabled="localConfig.keyboard.isKeycapBorderEnabled"
    :show-cap-key="localConfig.keyboard.isCapKeyVisible"
    :show-name="localConfig.keyboard.isNameVisible"
    :show-favicon="localConfig.keyboard.isFaviconVisible"
    :show-tactile-bumps="localConfig.keyboard.isTactileBumpsVisible"
    :is-back-icon-visible="keyboardState.selectedFolderTitleStack.length !== 0"
    :class="rowKeycapClassName"
    :style="[keycapCssVars, keycapStyle]"
    :title="keycapTitle"
    :data-code="keyCode"
    @mousedown="onMouseDownKey($event, keyCode)"
  />
</template>
