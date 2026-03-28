<script setup lang="ts">
const props = defineProps({
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 100,
  },
  step: {
    type: Number,
    default: 1,
  },
})

const modelValue = defineModel<number>({ required: true })
</script>

<template>
  <NSlider
    v-model:value="modelValue"
    :step="props.step"
    :min="props.min"
    :max="props.max"
    :tooltip="false"
  />
  <NInputNumber
    v-model:value="modelValue"
    class="setting__item-ele setting__input-number"
    size="small"
    :step="props.step"
    :min="props.min"
    :max="props.max"
  />
</template>
