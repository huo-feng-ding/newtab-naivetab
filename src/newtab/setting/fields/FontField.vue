<script setup lang="ts">
import { NFormItem, NSelect, NInputNumber } from 'naive-ui'
import CustomColorPicker from '~/components/CustomColorPicker.vue'
import { localState, availableFontOptions, fontSelectRenderLabel } from '@/logic/store'

const props = defineProps<{
  fontFamily: string

  fontColor: string | string[]
  fontSize: number
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:fontFamily': [value: string]
  'update:fontColor': [value: string | string[]]
  'update:fontSize': [value: number]
}>()

// 判断是否为数组类型
const isArrayValue = computed(() => Array.isArray(props.fontColor))

// 计算当前外观的颜色值
const currentFontColor = computed(() => {
  if (isArrayValue.value) {
    return props.fontColor[localState.value.currAppearanceCode]
  }
  return props.fontColor as string
})

// 处理颜色更新
const handleColorUpdate = (value: string) => {
  if (isArrayValue.value) {
    const newArray = [...(props.fontColor as string[])]
    newArray[localState.value.currAppearanceCode] = value
    emit('update:fontColor', newArray)
  } else {
    emit('update:fontColor', value)
  }
}
</script>

<template>
  <NFormItem
    :label="label"
    :disabled="disabled"
  >
    <CustomColorPicker
      class="setting__item-ele"
      :value="currentFontColor"
      :disabled="disabled"
      @update:value="handleColorUpdate"
    />
    <NSelect
      class="setting__item-ml"
      :value="fontFamily"
      :options="availableFontOptions"
      :render-label="fontSelectRenderLabel"
      size="small"
      :disabled="disabled"
      @update:value="emit('update:fontFamily', $event)"
    />
    <NInputNumber
      :value="fontSize"
      class="setting__item-ele setting__item-ml setting__input-number"
      size="small"
      :step="1"
      :min="5"
      :max="1000"
      :disabled="disabled"
      @update:value="emit('update:fontSize', $event ?? 0)"
    />
  </NFormItem>
</template>
