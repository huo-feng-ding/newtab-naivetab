<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider,
} from 'naive-ui'
import { nativeUILang, currTheme, themeOverrides } from '@/logic/store'
import Content from '@/options/Content.vue'
</script>

<template>
  <NConfigProvider
    :locale="nativeUILang"
    :theme="currTheme"
    :theme-overrides="themeOverrides"
  >
    <NMessageProvider>
      <NNotificationProvider>
        <NDialogProvider>
          <Content />
        </NDialogProvider>
      </NNotificationProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
body {
  font-family:
    Helvetica Neue,
    Helvetica,
    Arial,
    PingFang SC,
    Heiti SC,
    Hiragino Sans GB,
    Microsoft YaHei,
    sans-serif;
}
</style>
