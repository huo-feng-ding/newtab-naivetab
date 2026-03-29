<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'

// 通过 props + CSS 变量复用同一套键帽 DOM：
// - widget 和 popup 共享结构与基础视觉
// - 外层只需要传入尺寸、颜色、交互状态和显示开关
// - 这样可以保证两处在后续迭代时不再出现结构漂移
const props = withDefaults(defineProps<{
  keyCode: string
  label: string
  name: string
  visualType: KeycapVisualType
  // 可选参数
  bookmarkType?: KeycapBookmarkType
  iconSrc?: string
  stageStyle?: string
  textStyle?: string
  iconStyle?: string
  imgDraggable?: boolean
  isSelected?: boolean
  isLoading?: boolean
  isBorderEnabled?: boolean
  showCapKey?: boolean
  showName?: boolean
  showFavicon?: boolean
  showTactileBumps?: boolean
  isBackIconVisible?: boolean
}>(), {
  bookmarkType: 'mark',
  iconSrc: '',
  stageStyle: '',
  textStyle: '',
  iconStyle: '',
  imgDraggable: false,
  isSelected: false,
  isLoading: false,
  isBorderEnabled: false,
  showCapKey: true,
  showName: true,
  showFavicon: true,
  showTactileBumps: false,
  isBackIconVisible: false,
})

// 基础类型类名由组件自身管理，外层只关心 hover / active / move 等附加状态类
const rowClassName = computed(() => [
  `row__keycap-${props.visualType}`,
  props.isBorderEnabled && 'row__keycap--border',
])

const stageClassName = computed(() => `keycap__stage-${props.visualType}`)
</script>

<template>
  <div
    class="row__keycap"
    :class="rowClassName"
  >
    <div
      v-if="isSelected"
      class="keycap__select"
    >
      <Icon :icon="ICONS.checkCircle" />
    </div>

    <div
      class="keycap__stage"
      :class="stageClassName"
      :style="stageStyle"
    >
      <div
        v-if="isLoading"
        class="item__loading"
      >
        <Icon :icon="ICONS.loading" />
      </div>

      <p
        v-if="showCapKey"
        class="keycap__label"
        :style="textStyle"
      >
        {{ label || '&nbsp;' }}
      </p>

      <!-- mark 类型只有在真的拿到 iconSrc 时才渲染 img，避免空书签生成占位图 -->
      <div
        class="keycap__img"
        :style="iconStyle"
      >
        <div
          v-if="showFavicon && (bookmarkType !== 'mark' || iconSrc)"
          class="img__wrap"
        >
          <img
            v-if="bookmarkType === 'mark' && iconSrc"
            class="img__main"
            :src="iconSrc"
            :draggable="imgDraggable"
          />
          <div
            v-else
            class="img__type"
          >
            <template v-if="bookmarkType === 'folder'">
              <Icon
                :icon="ICONS.folderOutline"
                class="type__icon"
              />
            </template>
            <template v-else-if="bookmarkType === 'back' && isBackIconVisible">
              <Icon
                :icon="ICONS.arrowBackRounded"
                class="type__icon"
              />
            </template>
          </div>
        </div>
      </div>

      <p
        v-if="showName"
        class="keycap__name"
        :style="textStyle"
      >
        {{ name || '&nbsp;' }}
      </p>

      <div
        v-if="showTactileBumps && ['KeyF', 'KeyJ'].includes(keyCode)"
        class="keycap__tactile-bumps"
      />
    </div>
  </div>
</template>

<style scoped>
.row__keycap {
  position: relative;
  width: 100%;
  height: 100%;
  color: var(--keycap-main-font-color);
  background-color: var(--keycap-main-bg-color);
  backdrop-filter: blur(var(--keycap-background-blur));
  border-radius: var(--keycap-border-radius);
  border-style: solid;
  box-sizing: border-box;
  cursor: pointer;
  transition:
    transform 80ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
    box-shadow 80ms ease,
    filter 80ms ease;

  .keycap__select {
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    background: color-mix(in srgb, var(--custom-primary-color) 20%, transparent);
    color: var(--custom-primary-color);
    font-size: 14px;
    border-radius: calc(var(--keycap-border-radius) - 1px);
    box-shadow:
      inset 0 0 0 1.5px var(--custom-primary-color),
      0 0 8px color-mix(in srgb, var(--custom-primary-color) 28%, transparent);
  }

  .keycap__stage {
    /* 纵向三段式布局：label / img / name，popup 与 widget 都按这套骨架渲染 */
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 100%;
    border-style: solid;
    color: inherit;
    background-color: inherit;

    .item__loading {
      z-index: 1;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--custom-primary-color);
      font-size: 190%;
    }

    .keycap__label {
      flex: 0 0 auto;
      width: 100%;
      line-height: 1;
      padding-top: 1%;
      font-family: var(--keycap-key-font-family);
      font-size: var(--keycap-key-font-size);
      font-weight: 500;
    }

    .keycap__img {
      flex: 1 1 0;
      min-height: 0;
      width: 100%;
      height: 40%;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;

      .img__wrap {
        height: 100%;
        transform: scale(var(--keycap-favicon-size));

        .img__type {
          height: 100%;

          .type__icon {
            width: 100%;
            height: 100%;
          }
        }

        .img__main {
          height: 100%;
        }
      }
    }

    .keycap__name {
      flex: 0 0 auto;
      width: 100%;
      line-height: 1;
      font-size: var(--keycap-bookmark-font-size);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .keycap__tactile-bumps {
      position: absolute;
      left: 50%;
      bottom: 6%;
      transform: translate(-50%, 0);
      width: 22%;
      height: 3px;
      border-radius: 2px;
      background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.55) 0%,
        var(--keycap-main-font-color) 40%,
        rgba(0, 0, 0, 0.25) 100%
      );
      opacity: 0.7;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
  }
}

.row__keycap-flat {
  box-shadow: none;

  .keycap__stage-flat {
    padding: var(--keycap-stage-flat-padding);
    border-radius: var(--keycap-border-radius);
    border-width: 1px;
    border-color: rgba(255, 255, 255, 0.18) rgba(0, 0, 0, 0.08) rgba(0, 0, 0, 0.12) rgba(255, 255, 255, 0.12);
    background: linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(255, 255, 255, 0.04) 50%,
      rgba(0, 0, 0, 0.06) 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.25),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  }
}

.row__keycap-gmk {
  border-width: var(--keycap-gmk-top-border) var(--keycap-gmk-h-border) var(--keycap-gmk-bot-border);
  border-color: rgba(255, 255, 255, 0.06) rgba(0, 0, 0, 0.12) rgba(0, 0, 0, 0.30) rgba(0, 0, 0, 0.08);
  box-shadow:
    0 3px 8px rgba(0, 0, 0, 0.45),
    0 1px 2px rgba(0, 0, 0, 0.30),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);

  .keycap__stage-gmk {
    overflow: hidden;
    border-width: 0px;
    border-color: rgba(0, 0, 0, 0.1);
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 8px 4px;
    border-bottom-left-radius: 8px 4px;
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.28) 0%,
      rgba(255, 255, 255, 0.10) 18%,
      rgba(0, 0, 0, 0.04) 55%,
      rgba(0, 0, 0, 0.10) 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      inset 0 -1px 0 rgba(0, 0, 0, 0.12),
      0 2px 6px rgba(0, 0, 0, 0.18);
    background-color: inherit;
    color: inherit;
  }
}

.row__keycap-dsa {
  border-width: var(--keycap-dsa-border);
  border-color: rgba(255, 255, 255, 0.06) rgba(0, 0, 0, 0.10) rgba(0, 0, 0, 0.24) rgba(0, 0, 0, 0.06);
  box-shadow:
    0 3px 7px rgba(0, 0, 0, 0.40),
    0 1px 2px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);

  .keycap__stage-dsa {
    overflow: hidden;
    border-width: 0px;
    border-radius: 8px;
    background: radial-gradient(
      ellipse at 38% 30%,
      rgba(255, 255, 255, 0.30) 0%,
      rgba(255, 255, 255, 0.10) 35%,
      rgba(0, 0, 0, 0.06) 65%,
      rgba(0, 0, 0, 0.14) 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.30),
      inset 0 -1px 0 rgba(0, 0, 0, 0.14),
      inset 1px 0 0 rgba(255, 255, 255, 0.12),
      inset -1px 0 0 rgba(0, 0, 0, 0.08),
      0 2px 5px rgba(0, 0, 0, 0.18);
    background-color: inherit;
    color: inherit;
  }
}

.row__keycap--move {
  cursor: move !important;
}

.row__keycap--border {
  outline: var(--keycap-border-width) solid var(--keycap-border-color);
}

.row__keycap--active {
  transform: translate(0px, 3px);
  filter: brightness(0.94);

  &.row__keycap-gmk {
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.40),
      0 0px 1px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  &.row__keycap-dsa {
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.36),
      0 0px 1px rgba(0, 0, 0, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
}

.row__keycap--hover:hover,
.row__keycap-gmk:hover,
.row__keycap-dsa:hover {
  transform: translate(0px, -1px);
  filter: brightness(1.06);
}

.row__keycap--hover:hover.row__keycap-gmk,
.row__keycap-gmk:hover {
  box-shadow:
    0 5px 12px rgba(0, 0, 0, 0.50),
    0 2px 4px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.row__keycap--hover:hover.row__keycap-dsa,
.row__keycap-dsa:hover {
  box-shadow:
    0 5px 10px rgba(0, 0, 0, 0.44),
    0 2px 3px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.row__keycap-gmk:active {
  transform: translateY(2px);
  filter: brightness(0.94);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.40),
    0 0px 1px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.row__keycap-dsa:active {
  transform: translateY(2px);
  filter: brightness(0.94);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.36),
    0 0px 1px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
</style>
