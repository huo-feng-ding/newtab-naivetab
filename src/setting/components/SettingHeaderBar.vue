<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { globalState } from '@/logic/store'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  widgetCode: {
    type: String,
    default: '',
  },
})

const isDrawerMode = computed(() => globalState.settingMode === 'drawer')

// ——— 预览逻辑（hover 时透明化抽屉）———
const isPreviewing = ref(false)

const handlerPreviewEnter = () => {
  isPreviewing.value = true
  const drawer = document.querySelector('#setting .drawer-wrap') as HTMLElement
  if (drawer) {
    drawer.style.transition = 'opacity 0.3s ease'
    drawer.style.opacity = '0'
  }
  const mask = document.querySelector('.n-drawer-mask') as HTMLElement
  if (mask) {
    mask.setAttribute('style', 'transition: all 0.3s ease;background-color: transparent;')
  }
}

const handlerPreviewLeave = () => {
  isPreviewing.value = false
  const drawer = document.querySelector('#setting .drawer-wrap') as HTMLElement
  if (drawer) {
    drawer.style.opacity = ''
    // 等待 opacity 过渡完成后再移除 transition，避免干扰下次打开的滑入动画
    setTimeout(() => {
      drawer.style.transition = ''
    }, 300)
  }
  const mask = document.querySelector('.n-drawer-mask') as HTMLElement
  if (mask) {
    mask.style.backgroundColor = ''
  }
}
const openInNewTab = () => {
  const params = new URLSearchParams()
  const { currSettingTabCode, currSettingAnchor } = globalState
  if (currSettingTabCode) {
    params.set('tab', currSettingTabCode)
    if (currSettingAnchor) params.set('anchor', currSettingAnchor)
  } else {
    params.set('tab', 'general')
  }
  const url = chrome.runtime.getURL(`dist/options/index.html?${params.toString()}`)
  chrome.tabs.create({ url })
}
</script>

<template>
  <div class="base_setting__title">
    <!-- 左侧：标题 + 预览/新标签页按钮 -->
    <div class="title__left">
      <p class="title__main">{{ props.title }}</p>

      <div
        v-if="isDrawerMode"
        class="action__btn"
        :class="{ 'action__btn--active': isPreviewing }"
        @mouseenter="handlerPreviewEnter"
        @mouseleave="handlerPreviewLeave"
      >
        <Icon
          :icon="ICONS.preview"
          class="action__icon"
        />
        <span class="action__label">{{ $t('common.preview') }}</span>
      </div>

      <template v-if="isDrawerMode">
        <div
          class="action__btn"
          @click="openInNewTab"
        >
          <Icon
            :icon="ICONS.openInNew"
            class="action__icon"
          />
          <span class="action__label">{{ $t('setting.openInNewTab') }}</span>
        </div>
      </template>
    </div>

    <!-- 右侧：关闭按钮（仅抽屉模式） -->
    <div
      v-if="isDrawerMode"
      class="action__btn action__btn--close"
      @click="globalState.isSettingDrawerVisible = false"
    >
      <Icon
        :icon="ICONS.close"
        class="action__icon"
      />
    </div>
  </div>
</template>

<style scoped>
.base_setting__title {
  padding: 10px 0 10px 0;
  z-index: 2000;
  position: sticky;
  top: 0;
  width: 100%;
  /* 毛玻璃粘性标题 */
  background-color: var(--n-color);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--n-tab-border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title__left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .title__main {
    font-size: var(--text-md);
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    letter-spacing: -0.1px;
  }

  .action__btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 4px var(--space-2);
    border-radius: var(--radius-md);
    border: 1px solid var(--n-tab-border-color);
    cursor: pointer;
    transition: background-color var(--transition-base), border-color var(--transition-base), color var(--transition-base), box-shadow var(--transition-base);
    color: var(--gray-alpha-85);
    user-select: none;
    flex-shrink: 0;

    .action__icon {
      font-size: 13px;
      flex-shrink: 0;
    }

    .action__label {
      font-size: var(--text-xs);
      line-height: 1;
      letter-spacing: 0.1px;
    }

    &:hover {
      background-color: var(--n-tab-border-color);
      border-color: transparent;
      color: var(--n-text-color);
      box-shadow: var(--shadow-sm);
    }

    &.action__btn--active {
      background-color: rgba(16, 152, 173, 0.1);
      border-color: rgba(16, 152, 173, 0.4);
      color: var(--n-primary-color, #1098ad);
      box-shadow: 0 0 0 2px rgba(16, 152, 173, 0.12);
    }
  }
}
</style>
