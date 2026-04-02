<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { Icon } from '@iconify/vue'
import { localConfig, globalState } from '@/logic/store'
import { settingsList, SETTING_GROUPS } from './registry'

const tabPaneList = computed(() => settingsList)

const onTabsChange = (tabCode: string) => {
  globalState.currSettingTabCode = tabCode
}

const settingContentHeight = ref(0)

const updateSettingContentHeightFunc = useDebounceFn((entries: ResizeObserverEntry[]) => {
  if (entries.length === 0) {
    return
  }
  const height = entries[0].contentRect.height
  settingContentHeight.value = height
}, 200)

const settingContentObserver = new ResizeObserver(updateSettingContentHeightFunc)

watch(
  () => globalState.isSettingDrawerVisible,
  async () => {
    if (!globalState.isSettingDrawerVisible) {
      settingContentObserver.disconnect()
      return
    }
    await nextTick()
    const targetEl = document.querySelector('#setting .setting__content') as HTMLElement
    if (targetEl) {
      settingContentObserver.observe(targetEl)
    } else {
      console.error('setting__content Target not found!')
    }
  },
)

const settingContentHeightStyle = computed(() => `${settingContentHeight.value}px`)

/**
 * 每个分组（第一个分组除外）的首个 tab code 集合。
 * 用于在该 tab 的 tab slot 中添加 group-start 标记，通过 CSS 显示分隔线。
 */
const groupStartSet = computed(() => {
  const set = new Set<settingPanes>()
  SETTING_GROUPS.forEach((group, index) => {
    if (index > 0 && group.items.length > 0) {
      set.add(group.items[0])
    }
  })
  return set
})
</script>

<template>
  <div id="background__drawer" />

  <div id="preset-theme__drawer" />

  <div id="setting">
    <!-- Drawer: height仅在位置是 top 和 bottom 时生效 -->
    <NDrawer
      v-model:show="globalState.isSettingDrawerVisible"
      class="drawer-wrap"
      :width="650"
      :height="500"
      :placement="localConfig.general.drawerPlacement"
      show-mask="transparent"
      :trap-focus="false"
      to="#setting"
    >
      <NDrawerContent class="setting__content">
        <NTabs
          type="line"
          :value="globalState.currSettingTabCode"
          placement="left"
          animated
          @update:value="onTabsChange"
        >
          <NTabPane
            v-for="item of tabPaneList"
            :key="item.code"
            :name="item.code"
            :tab="item.labelKeys ? `${$t(item.labelKeys[0])} / ${$t(item.labelKeys[1])}` : $t(item.labelKey || '')"
          >
            <template #tab>
              <div
                class="tab__title"
                :class="{ 'tab__title--group-start': groupStartSet.has(item.code) }"
              >
                <div
                  class="title__icon"
                  :style="`font-size: ${item.iconSize}px`"
                >
                  <Icon :icon="item.iconName" />
                </div>
                <span class="title__text">{{ item.labelKeys ? `${$t(item.labelKeys[0])} / ${$t(item.labelKeys[1])}` : $t(item.labelKey || '') }}</span>
              </div>
            </template>

            <template #default>
              <component :is="item.component" />
            </template>
          </NTabPane>
        </NTabs>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style>
#setting {
  .n-radio-group {
    width: 100%;
  }
  .n-radio {
    width: 20%;
  }
  /* collapse title */
  .n-collapse-item__header-main {
    font-weight: 500 !important;
  }
  /* 分割线：统一间距与标题大小 */
  .n-divider:not(.n-divider--vertical) {
    margin-top: var(--space-4);
    margin-bottom: var(--space-3);
  }
  .n-divider .n-divider__title {
    font-size: var(--text-md) !important;
    font-weight: 500;
    opacity: var(--opacity-primary);
    letter-spacing: 0.1px;
  }

  .n-drawer .n-drawer-content.n-drawer-content--native-scrollbar .n-drawer-body-content-wrapper {
    padding: 0 !important;
  }
  .drawer-wrap {
    /* 抽屉整体阴影，增加层次感 */
    box-shadow: var(--shadow-lg) !important;

    /* nav */
    .n-tabs .n-tabs-nav {
      padding: 10px 4px 4px 4px;
      background: var(--n-color);

      .n-tabs-nav-scroll-wrapper {
        height: v-bind(settingContentHeightStyle);

        /* 分组分隔线：在分组首个 tab 的外层 wrapper 前插入 */
        .n-tabs-tab:has(.tab__title--group-start) {
          margin-top: var(--space-2);
          position: relative;
          &::before {
            content: '';
            position: absolute;
            top: -5px;
            left: 12%;
            width: 76%;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--n-tab-border-color) 30%, var(--n-tab-border-color) 70%, transparent);
            opacity: 0.8;
          }
        }

        /* 每个 tab 项圆角与过渡 */
        .n-tabs-tab {
          border-radius: var(--radius-md);
          transition: background var(--transition-base);
        }

        .tab__title {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 5px;
          .title__icon {
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: var(--opacity-secondary);
            transition: opacity var(--transition-fast);
          }
          .title__text {
            user-select: none;
            letter-spacing: 0.1px;
          }
        }

        /* active tab: icon 不再半透明 */
        .n-tabs-tab--active .tab__title .title__icon {
          opacity: 1;
        }
      }
    }

    /* content */
    .n-tab-pane {
      padding: 0 16px 16px 16px !important;
      height: v-bind(settingContentHeightStyle);
      overflow: auto;
      user-select: none;
      box-sizing: border-box;
      /* 内容区细滚动条 */
      scrollbar-width: thin;
      scrollbar-color: var(--n-tab-border-color) transparent;
      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--n-tab-border-color);
        border-radius: var(--radius-pill);
      }
    }
  }
}
</style>
