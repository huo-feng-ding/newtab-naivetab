<script setup lang="ts">
import { KEYBOARD_TYPE_OPTION, SPLIT_SPACE_OPTION, KEYCAP_TYPE_OPTION } from '@/logic/constants/keyboard'
import { localConfig } from '@/logic/store'
</script>

<template>
  <NForm
    label-placement="left"
    :label-width="120"
    :show-feedback="false"
  >
    <NFormItem :label="$t('keyboard.keycapVisualType')">
      <NRadioGroup
        v-model:value="localConfig.keyboard.keycapType"
        size="small"
      >
        <NRadioButton
          v-for="item in KEYCAP_TYPE_OPTION"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </NRadioButton>
      </NRadioGroup>
    </NFormItem>

    <NFormItem :label="$t('keyboard.splitSpace')">
      <NRadioGroup
        v-model:value="localConfig.keyboard.splitSpace"
        size="small"
      >
        <NRadioButton
          v-for="item in SPLIT_SPACE_OPTION"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </NRadioButton>
      </NRadioGroup>
    </NFormItem>

    <NFormItem :label="$t('keyboard.keyboardType')">
      <NRadioGroup
        v-model:value="localConfig.keyboard.keyboardType"
        size="small"
        style="margin-top: 6px"
      >
        <NRadio
          v-for="item in KEYBOARD_TYPE_OPTION"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </NRadio>
      </NRadioGroup>
    </NFormItem>
  </NForm>
</template>
