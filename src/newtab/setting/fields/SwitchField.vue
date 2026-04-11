<script setup lang="ts">
import { NFormItem, NSwitch } from 'naive-ui'

const props = defineProps<{
  modelValue: boolean
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <NFormItem
    :label="label"
    :disabled="disabled"
  >
    <NSwitch
      :value="modelValue"
      size="small"
      :disabled="disabled"
      @update:value="emit('update:modelValue', $event)"
    />
  </NFormItem>
</template>
