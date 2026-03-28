<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  icon: string
  label: string
}>()
</script>

<template>
  <p class="setting__label">
    <Icon
      :icon="icon"
      class="label__icon"
    />
    {{ label }}
  </p>
  <div class="setting__form_wrap">
    <slot />
  </div>
</template>
