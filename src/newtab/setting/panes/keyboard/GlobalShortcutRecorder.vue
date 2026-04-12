<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { isMacOS } from '@/env'
import { formatModifierOnly } from '@/logic/globalShortcutKey'
import { NFormItem, NButton } from 'naive-ui'
import { localConfig } from '@/logic/store'
import Tips from '@/components/Tips.vue'
import { onUnmounted } from 'vue'

const isRecording = ref(false)
const pressedModifiers = reactive(new Set<string>())
let debounceTimer: ReturnType<typeof setTimeout> | null = null
// 修饰键快照：记录 keydown 时捕获的修饰键状态，防止 keyup 清空集合后丢失用户选择
// 例如用户按下 Cmd+Q 然后松开 Cmd，keyup 会删除 cmd，此时 pressedModifiers 只剩 meta
// 如果没有快照，saveModifier 读取到的集合可能已不完整
let lastModifierSnapshot = ''

const formattedModifier = computed(() => {
  return formatModifierOnly(localConfig.keyboard.globalShortcutModifier)
})

const globalModifierTips = computed(() => {
  const altLabel = isMacOS ? 'Opt' : 'Alt'
  const tips = window.$t('keyboard.globalModifierTips')
  return tips.replace('__alt__', altLabel)
})

const modifierFromSet = (): string => {
  const parts: string[] = []
  if (pressedModifiers.has('ctrl')) parts.push('ctrl')
  if (pressedModifiers.has('shift')) parts.push('shift')
  if (pressedModifiers.has('alt')) parts.push('alt')
  if (pressedModifiers.has('meta')) parts.push('meta')
  return parts.join('+')
}

/**
 * 清除录制过程中的所有状态
 * 用于取消录制或组件卸载时清理，防止残留的修饰键集合或待执行的防抖回调
 */
const clearRecordingState = () => {
  pressedModifiers.clear()
  lastModifierSnapshot = ''
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

const cancelRecording = () => {
  // 清除录制过程中的所有状态，防止残留修饰键或待保存的防抖回调
  clearRecordingState()
  isRecording.value = false
}

const saveModifier = () => {
  // 使用快照值（keydown 时捕获），而非当前集合（可能已被 keyup 清空）
  const modifiers = lastModifierSnapshot || modifierFromSet()
  if (!modifiers) {
    window.$message.warning(window.$t('keyboard.requireModifier'))
    return
  }
  localConfig.keyboard.globalShortcutModifier = modifiers
  isRecording.value = false
  window.$message?.success(`${window.$t('common.success')}`)
}

/**
 * 按键按下处理
 *
 * 设计思路：
 * - 用户录制修饰键组合（如 Cmd+Q），不需要主键
 * - 用户可能连续按多个修饰键（如先按 Cmd 再按 Shift）
 * - 使用 pressedModifiers Set 跟踪当前按住的修饰键
 * - 使用 lastModifierSnapshot 快照防止 keyup 清空集合后丢失状态
 * - 连续按键通过 100ms 防抖自动保存，全部松开时立即保存
 *
 * ⚠️ 使用 capture phase (true)：
 * 确保在页面脚本的 keydown 监听器之前捕获事件，
 * 防止页面调用 stopPropagation 导致录制器收不到事件。
 */
const handleKeydown = (e: KeyboardEvent) => {
  e.preventDefault()

  // Escape 键取消录制
  if (e.code === 'Escape') {
    cancelRecording()
    return
  }

  if (e.ctrlKey) pressedModifiers.add('ctrl')
  if (e.shiftKey) pressedModifiers.add('shift')
  if (e.altKey) pressedModifiers.add('alt')
  if (e.metaKey) pressedModifiers.add('meta')

  // 每次 keydown 更新快照，确保 keyup 清空集合后仍能读到用户选择的修饰键
  lastModifierSnapshot = modifierFromSet()

  // 防抖保存：用户连续按修饰键时重置计时器，100ms 无新按键后自动保存
  // 适用于用户想快速按下单修饰键（如只按 Alt）后立即松开的场景
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => saveModifier(), 100)
}

const handleKeyup = (e: KeyboardEvent) => {
  e.preventDefault()

  if (e.code === 'ControlLeft' || e.code === 'ControlRight') pressedModifiers.delete('ctrl')
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') pressedModifiers.delete('shift')
  if (e.code === 'AltLeft' || e.code === 'AltRight') pressedModifiers.delete('alt')
  if (e.code === 'MetaLeft' || e.code === 'MetaRight') pressedModifiers.delete('meta')

  // 所有修饰键都松开时，清除防抖并用快照保存
  // 快照是在最后一次 keydown 时捕获的，此时仍包含用户选择的修饰键
  if (pressedModifiers.size === 0 && debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
    saveModifier()
  }
}

const toggleRecording = () => {
  if (isRecording.value) {
    cancelRecording()
    return
  }
  pressedModifiers.clear()
  lastModifierSnapshot = ''
  isRecording.value = true
}

watch(isRecording, (value) => {
  if (value) {
    window.addEventListener('keydown', handleKeydown, true)
    window.addEventListener('keyup', handleKeyup, true)
  } else {
    window.removeEventListener('keydown', handleKeydown, true)
    window.removeEventListener('keyup', handleKeyup, true)
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }
})

// 组件销毁时确保清理事件监听器，防止切换到其他面板后事件泄漏
onUnmounted(() => {
  if (isRecording.value) {
    cancelRecording()
  }
})
</script>

<template>
  <NFormItem :label="$t('keyboard.globalModifier')">
    <div class="setting__item_wrap">
      <div class="item__box">
        <div class="recorder__row">
          <div
            v-if="isRecording"
            class="recorder__capture recorder__capture--recording"
            @click.stop
          >
            {{ $t('keyboard.recording') }}
          </div>
          <div
            v-else
            class="recorder__capture"
          >
            <span>{{ formattedModifier || $t('keyboard.recordModifier') }}</span>
          </div>

          <NButton
            quaternary
            size="tiny"
            :class="['recorder__toggle-btn', { 'recorder__toggle-btn--active': isRecording }]"
            @click="toggleRecording"
          >
            <Icon
              v-if="!isRecording"
              :icon="ICONS.record"
              class="toggle__icon"
            />
            <Icon
              v-else
              :icon="ICONS.stop"
              class="toggle__icon toggle__icon--stop"
            />
          </NButton>
        </div>
        <Tips :content="globalModifierTips" />
      </div>
    </div>
  </NFormItem>
</template>

<style scoped>
.recorder__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recorder__capture {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  border-radius: 6px;
  transition: all var(--transition-fast);
  user-select: none;
  white-space: nowrap;
}

.recorder__capture--recording {
  background-color: rgba(208, 48, 80, 0.06);
  border: 1px solid rgba(208, 48, 80, 0.3);
  color: #d03050;
  animation: pulse 1.4s ease-in-out infinite;
}

.recorder__toggle-btn {
  flex-shrink: 0;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  min-width: 32px;
  padding: 0;
  transition: all var(--transition-fast);
  border: 1px solid var(--n-border-color);
}

.recorder__toggle-btn:hover {
  background-color: rgba(208, 48, 80, 0.08);
}

.recorder__toggle-btn--active {
  border-color: rgba(208, 48, 80, 0.35);
  background-color: rgba(208, 48, 80, 0.06);
}

.recorder__toggle-btn--active:hover {
  background-color: rgba(208, 48, 80, 0.12);
}

.toggle__icon {
  font-size: 18px;
  color: #d03050;
  transition: all var(--transition-fast);
}

.toggle__icon--stop {
  font-size: 16px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
