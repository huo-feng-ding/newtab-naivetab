<script setup lang="ts">
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { isDragMode } from '@/logic/moveable'
import { KEYBOARD_NOT_ALLOW_KEYCODE_LIST_FOR_WIDGET } from '@/logic/constants/keyboard'
import { currKeyboardConfig, keyboardCurrentModelAllKeyList } from '@/logic/keyboard'
import { state as keyboardState, openPage, handleSpecialKeycapExec, getKeycapBookmarkType, getKeycapUrl, handlePressKeycap } from '@/newtab/widgets/keyboard/logic'
import { getStyleConst, getIsWidgetRender } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import KeyboardKeycapWidget from './components/KeyboardKeycapWidget.vue'
import { WIDGET_CODE } from './config'

const bgMoveableWidgetMain = getStyleConst('bgMoveableWidgetMain')

const isRender = getIsWidgetRender(WIDGET_CODE)

const keyboardStyle = computed(() => ({
  '--nt-k-bg-moveable-widget-main': bgMoveableWidgetMain.value,
}))

// keyboard listener
const keyboardTask = (e: KeyboardEvent) => {
  if (isDragMode.value) {
    return
  }
  const { code, shiftKey, ctrlKey, altKey, metaKey } = e
  if (KEYBOARD_NOT_ALLOW_KEYCODE_LIST_FOR_WIDGET.includes(code)) {
    return
  }
  if (shiftKey || ctrlKey || altKey || metaKey) {
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
  keyboardState.currSelectKeyCode = code
  openPage(url)
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

</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <KeyboardLayout
      unit="vmin"
      :rows="currKeyboardConfig.list"
      :extra-class="containerClass"
      :style="keyboardStyle"
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
      background-color: var(--nt-k-bg-moveable-widget-main) !important;
    }
  }
}
</style>
