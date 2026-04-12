<script setup lang="ts">
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { isDragMode } from '@/logic/moveable'
import { KEYBOARD_NOT_ALLOW_KEYCODE_LIST } from '@/logic/constants/keyboard'
import { currKeyboardConfig, keyboardCurrentModelAllKeyList } from '@/logic/keyboard'
import { state as keyboardState, openPage, handleSpecialKeycapExec, getKeycapBookmarkType, getKeycapUrl, handlePressKeycap } from '~/newtab/widgets/keyboard/logic'
import { getStyleConst, getIsWidgetRender } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import KeyboardKeycapWidget from './components/KeyboardKeycapWidget.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

// keyboard listener
const keyboardTask = (e: KeyboardEvent) => {
  if (isDragMode.value) {
    return
  }
  const { code, shiftKey, ctrlKey, altKey, metaKey } = e
  if (code === 'Escape') {
    e.preventDefault() // 阻止Esc默认事件，按esc会取消打开页面，表现为Esc的书签无法打开
  }
  if (KEYBOARD_NOT_ALLOW_KEYCODE_LIST.includes(code)) {
    return
  }
  if (ctrlKey || metaKey) {
    return
  }
  // 过滤非当前配置下的按键
  if (!keyboardCurrentModelAllKeyList.value.includes(code)) {
    return
  }
  const isHandled = handleSpecialKeycapExec(code, getKeycapBookmarkType(code))
  const url = getKeycapUrl(code)
  if (isHandled || url.length === 0) {
    handlePressKeycap(code)
    return
  }
  // shift + key 后台打开书签，alt + key 新标签页打开
  keyboardState.currSelectKeyCode = code
  openPage(url, shiftKey, altKey)
}

watch(
  isRender,
  (value) => {
    if (!value) {
      removeKeydownTask(WIDGET_CODE)
      return
    }
    addKeydownTask(WIDGET_CODE, keyboardTask)
  },
  { immediate: true },
)

const containerClass = computed(() => ({
  'keyboard__container--drag': isDragMode.value,
  'keyboard__container--hover': !isDragMode.value,
}))

const bgMoveableWidgetMain = getStyleConst('bgMoveableWidgetMain')
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <KeyboardLayout
      unit="vmin"
      :rows="currKeyboardConfig.list"
      :extra-class="containerClass"
      class="keyboard__container"
    >
      <template #keycap="{ code }">
        <KeyboardKeycapWidget :key-code="code" />
      </template>
    </KeyboardLayout>
  </WidgetWrap>
</template>

<style>
#keyboard {
  user-select: none;

  .keyboard__container {
    z-index: 10;
    position: absolute;
    overflow: hidden;
  }

  .keyboard__container--hover {
    cursor: pointer;
  }

  .keyboard__container--drag {
    background-color: transparent !important;
    &:hover {
      background-color: v-bind(bgMoveableWidgetMain) !important;
    }
  }
}
</style>
