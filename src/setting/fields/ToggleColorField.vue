<script setup lang="ts">
import { localState } from '@/logic/store'
import CustomColorPicker from '@/components/CustomColorPicker.vue'

const props = defineProps<{
  // 是否启用
  enable: boolean
  // 颜色值（字符串或字符串数组）
  color: string | string[]
  // 边框宽度（仅边框场景使用）
  width?: number
  // 标签文本
  label?: string
  // 是否禁用
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:enable': [value: boolean]
  'update:color': [value: string | string[]]
  'update:width': [value: number]
}>()

// 判断是否为数组类型
const isArrayValue = computed(() => Array.isArray(props.color))

// 计算当前外观的颜色值
const currentColor = computed(() => {
  if (isArrayValue.value) {
    return props.color[localState.value.currAppearanceCode]
  }
  return props.color as string
})

// 处理颜色更新
const handleColorUpdate = (value: string) => {
  if (isArrayValue.value) {
    const newArray = [...(props.color as string[])]
    newArray[localState.value.currAppearanceCode] = value
    emit('update:color', newArray)
  } else {
    emit('update:color', value)
  }
}

// 判断是否显示宽度输入
const showWidthInput = computed(() => props.width !== undefined)
</script>

<template>
  <NFormItem
    :label="label"
    :disabled="disabled"
  >
    <NSwitch
      :value="enable"
      size="small"
      :disabled="disabled"
      @update:value="emit('update:enable', $event)"
    />
    <Transition name="setting-expand">
      <div
        v-if="enable"
        class="setting__slider-wrap"
      >
        <CustomColorPicker
          :value="currentColor"
          class="setting__item-ele setting__item-ml"
          :disabled="disabled"
          @update:value="handleColorUpdate"
        />
        <NInputNumber
          v-if="showWidthInput"
          :value="width"
          class="setting__item-ele setting__item-ml setting__input-number"
          size="small"
          :step="1"
          :min="1"
          :max="1000"
          @update:value="emit('update:width', $event || 1)"
        />
      </div>
    </Transition>
  </NFormItem>
</template>
