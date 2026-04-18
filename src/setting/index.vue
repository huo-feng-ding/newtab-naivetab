<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { globalState, localConfig } from '@/logic/store'
import SettingPaneContent from './SettingPaneContent.vue'

// ── drawer 模式：同步侧边栏 nav 高度与内容区一致 ──
const settingContentHeight = ref(0)

const updateSettingContentHeight = useDebounceFn((entries: ResizeObserverEntry[]) => {
  if (entries.length === 0) return
  settingContentHeight.value = entries[0].contentRect.height
}, 200)

const settingContentObserver = new ResizeObserver(updateSettingContentHeight)

watch(
  () => globalState.isSettingDrawerVisible,
  async (visible) => {
    if (!visible) {
      settingContentObserver.disconnect()
      return
    }
    /**
     * NDrawer 使用 teleport + transition 渲染，需要两次 nextTick 才能获取到 DOM：
     * 1. 第一次：等待 Vue 响应式更新完成（isSettingDrawerVisible 触发渲染）
     * 2. 第二次：等待 NDrawer 内部 teleport 将子组件挂载到目标容器 #setting
     * 这是处理 teleport 组件 DOM 时机的常见模式。
     */
    await nextTick()
    await nextTick()
    const targetEl = document.querySelector('#setting .setting__content .n-drawer-body-content-wrapper') as HTMLElement
    if (targetEl) {
      settingContentObserver.observe(targetEl)
    }
  },
)

onUnmounted(() => {
  settingContentObserver.disconnect()
})
</script>

<template>
  <!-- Teleport 目标容器（BackgroundDrawer / PresetThemeDrawer 挂载点） -->
  <div id="background__drawer" />
  <div id="preset-theme__drawer" />

  <div id="setting">
    <!-- Drawer: height仅在位置是 top 和 bottom 时生效 -->
    <NDrawer
      v-model:show="globalState.isSettingDrawerVisible"
      class="drawer-wrap"
      :width="750"
      :height="500"
      :placement="localConfig.general.drawerPlacement"
      show-mask="transparent"
      :trap-focus="false"
      to="#setting"
    >
      <NDrawerContent class="setting__content">
        <SettingPaneContent :setting-content-height="settingContentHeight" />
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
