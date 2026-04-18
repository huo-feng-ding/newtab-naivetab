<script setup lang="ts">
import { NFormItem } from 'naive-ui'
import SliderInput from '@/components/SliderInput.vue'

const props = withDefaults(defineProps<{
  label: string
  min?: number
  max?: number
  step?: number
}>(), {
  min: 0,
  max: 1000,
  step: 1,
})

const modelValue = defineModel<number>({ required: true })
</script>

<template>
  <NFormItem :label="label">
    <SliderInput
      v-model="modelValue"
      :min="min"
      :max="max"
      :step="step"
    />
  </NFormItem>
</template>
