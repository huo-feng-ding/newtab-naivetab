<script setup lang="ts">
import { NFormItem } from 'naive-ui'
import CustomColorPicker from '~/components/CustomColorPicker.vue'
import Tips from '@/components/Tips.vue'
import { localState } from '@/logic/store'

const props = defineProps<{
  // 接受字符串或字符串数组
  modelValue: string | string[]
  label: string
  tips?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
}>()

// 判断是否为数组类型
const isArrayValue = computed(() => Array.isArray(props.modelValue))

// 计算当前外观的颜色值
const currentValue = computed(() => {
  if (isArrayValue.value) {
    return props.modelValue[localState.value.currAppearanceCode]
  }
  return props.modelValue as string
})

// 处理颜色更新
const handleColorUpdate = (value: string) => {
  if (isArrayValue.value) {
    const newArray = [...(props.modelValue as string[])]
    newArray[localState.value.currAppearanceCode] = value
    emit('update:modelValue', newArray)
  } else {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <NFormItem
    :label="label"
    :class="{ 'n-form-item--color': !tips }"
  >
    <CustomColorPicker
      :value="currentValue"
      @update:value="handleColorUpdate"
    />
    <Tips
      v-if="tips"
      :content="tips"
    />
  </NFormItem>
</template>
