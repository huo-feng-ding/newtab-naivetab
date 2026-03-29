<script setup lang="ts">
import { gaProxy } from '@/logic/gtag'
import { createTab } from '@/logic/util'
import { isDragMode } from '@/logic/moveable'
import { state, newsLocalState, updateNews, onRetryNews, handleWatchNewsConfigChange } from '@/newtab/widgets/news/logic'
import { localConfig, getIsWidgetRender, getStyleField } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

const selectNewsSourceList = computed(() =>
  localConfig.news.sourceList.map((key: NewsSources) => ({
    label: window.$t(`news.${key}`),
    value: key,
  })),
)

const handleChangeCurrTab = (value: NewsSources) => {
  state.currNewsTabValue = value
  gaProxy('click', ['news', 'changeTab'])
}

const onOpenPage = (url: string) => {
  if (isDragMode.value) {
    return
  }
  createTab(url)
  gaProxy('click', ['news', 'openPage'])
}

const onMouseDownKey = (event: MouseEvent, url: string) => {
  // 拖动模式下不干预事件冒泡，让 body 的 mousedown 监听器能收到事件以启动拖拽
  if (isDragMode.value) {
    return
  }
  // 阻止默认行为（例如浏览器中键的滚轮模式切换）
  event.preventDefault()
  // 阻止事件冒泡（仅非拖动模式，防止影响拖拽事件链）
  event.stopPropagation()
  if (event.button !== 1) {
    return
  }
  // 按下鼠标中键
  createTab(url, false)
}

let newsConfigChangeHandle: ReturnType<typeof handleWatchNewsConfigChange> | null = null

onMounted(() => {
  updateNews()
  newsConfigChangeHandle = handleWatchNewsConfigChange()
})

onUnmounted(() => {
  if (newsConfigChangeHandle) {
    newsConfigChangeHandle()
  }
})

// 开启主开关后立即更新数据
watch(isRender, (value) => {
  if (!value) {
    return
  }
  updateNews()
})

const customMargin = getStyleField(WIDGET_CODE, 'margin', 'vmin')
const customWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customHeight = getStyleField(WIDGET_CODE, 'height', 'vmin')
const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'vmin')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customUrlActiveColor = getStyleField(WIDGET_CODE, 'urlActiveColor')
const customTabActiveBackgroundColor = getStyleField(WIDGET_CODE, 'tabActiveBackgroundColor')
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customBackgroundBlur = getStyleField(WIDGET_CODE, 'backgroundBlur', 'px')

</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="news__container"
      :class="{
        'news__container--border': localConfig.news.isBorderEnabled,
        'news__container--shadow': localConfig.news.isShadowEnabled,
      }"
    >
      <div class="news__wrap">
        <NTabs
          :value="state.currNewsTabValue"
          type="segment"
          animated
          justify-content="space-evenly"
          @before-leave="() => !isDragMode"
          @update:value="handleChangeCurrTab"
        >
          <NTabPane
            v-for="source in selectNewsSourceList"
            :key="source.value"
            :name="source.value"
            :tab="source.label"
          >
            <div
              class="news__content"
              :class="{
                'news__content--hover': !isDragMode,
              }"
            >
              <template v-if="newsLocalState[source.value] && newsLocalState[source.value].list.length !== 0">
                <div
                  v-for="(item, index) in newsLocalState[source.value] && newsLocalState[source.value].list"
                  :key="item.desc"
                  class="content__item"
                  :class="{
                    'content__item--hover': !isDragMode,
                  }"
                >
                  <p
                    class="row__index"
                    :class="{
                      row__index__1: index === 0,
                      row__index__2: index === 1,
                      row__index__3: index === 2,
                    }"
                  >
                    {{ index + 1 }}
                  </p>

                  <n-popover
                    :delay="500"
                    trigger="hover"
                    :disabled="isDragMode"
                    :style="`width: ${customWidth}; line-height: 1.5;`"
                  >
                    <template #trigger>
                      <div
                        class="row__content"
                        @click="onOpenPage(item.url)"
                        @mousedown="onMouseDownKey($event, item.url)"
                      >
                        <p class="content__desc">
                          {{ item.desc }}
                        </p>
                        <p class="content__hot">
                          {{ item.hot }}
                        </p>
                      </div>
                    </template>
                    <span>{{ item.desc }}</span>
                  </n-popover>
                </div>
              </template>
              <div
                v-else
                class="content__empty"
              >
                <NButton
                  ghost
                  @click="onRetryNews(source.value)"
                >
                  {{ `${$t('common.login')} / ${$t('common.refresh')}` }}
                </NButton>
              </div>
            </div>
          </NTabPane>
        </NTabs>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#news {
  font-family: v-bind(customFontFamily);
  user-select: none;
  .news__container {
    z-index: 10;
    position: absolute;
    border-radius: v-bind(customBorderRadius);
    background-color: v-bind(customBackgroundColor);
    backdrop-filter: blur(v-bind(customBackgroundBlur));
    overflow: hidden;
    will-change: transform;
    /* 显式触发合成层，配合 overflow:hidden + border-radius 消除边缘竖向闪烁 */
    transform: translateZ(0);
    .news__wrap {
      width: v-bind(customWidth);
      .n-tabs .n-tab-pane {
        padding: 0 !important;
      }
      /* segment */
      .n-tabs .n-tabs-nav.n-tabs-nav--segment-type {
        padding: 6px 8px 4px !important;
        .n-tabs-rail {
          background-color: transparent !important;
          border-radius: 8px !important;
          .n-tabs-capsule {
            background-color: v-bind(customTabActiveBackgroundColor) !important;
            border-radius: 6px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
            /* 提前升为独立合成层，消除 translateX 动画在父合成层边缘产生的竖向闪烁 */
            will-change: transform;
            backface-visibility: hidden;
          }
          .n-tabs-tab {
            border-radius: 6px !important;
            transition: color 0.2s ease !important;
          }
        }
      }
      /* line bottom border */
      .n-tabs .n-tabs-nav.n-tabs-nav--line-type .n-tabs-nav-scroll-content {
        border-bottom: v-bind(customBorderWidth) solid v-bind(customBorderColor) !important;
      }
      .n-tabs-tab__label {
        font-size: v-bind(customFontSize);
        font-weight: 500;
      }
      .news__content {
        height: v-bind(customHeight);
        color: v-bind(customFontColor);
        font-size: v-bind(customFontSize);
        overflow-y: scroll;
        padding: 2px 8px 6px;
        box-sizing: border-box;
        &::-webkit-scrollbar {
          display: none;
        }
        .content__item {
          display: flex;
          align-items: center;
          padding: v-bind(customMargin) 4px;
          width: 100%;
          border-radius: 6px;
          transition: background-color 0.15s ease, color 0.15s ease;
          box-sizing: border-box;
          .row__index {
            width: 28px;
            flex: 0 0 28px;
            font-weight: 700;
            text-align: center;
            font-size: 0.85em;
            line-height: 1;
          }
          .row__index__1 {
            color: #fe2d46;
          }
          .row__index__2 {
            color: #f60;
          }
          .row__index__3 {
            color: #faa90e;
          }
          .row__content {
            flex: 1;
            min-width: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 6px;
            .content__desc {
              flex: 1;
              min-width: 0;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              line-height: 1.4;
            }
            .content__hot {
              flex: 0 0 auto;
              font-size: 0.8em;
              opacity: 0.5;
              white-space: nowrap;
            }
          }
        }
        .content__item--hover:hover {
          color: v-bind(customUrlActiveColor);
          background-color: v-bind(customTabActiveBackgroundColor);
          cursor: pointer;
        }
        .content__empty {
          display: flex;
          justify-content: center;
          align-items: center;
          height: v-bind(customHeight);
        }
      }
      .news__content--hover:hover {
        cursor: default;
      }
    }
  }
  .news__container--border {
    border: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .news__container--shadow {
    box-shadow:
      v-bind(customShadowColor) 0px 2px 4px 0px,
      v-bind(customShadowColor) 0px 2px 16px 0px;
  }
}
</style>
