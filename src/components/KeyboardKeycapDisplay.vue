<script setup lang="ts">
/**
 * KeyboardKeycapDisplay
 *
 * 单个键帽的纯展示组件，widget（newtab）和 popup 共用同一套 DOM 结构。
 * - 仅负责渲染，不包含任何业务逻辑（数据获取、事件派发等由外层处理）
 * - 尺寸 / 颜色通过父级注入的 CSS 变量（--nt-kb-*）驱动，无需 props 传递
 * - 外层通过 :style 绑定 keycapCssVars（来自 useKeyboardStyle）注入所有变量
 *
 * 视觉层级（从外到内）：
 *   row__keycap（键帽底座，含边框/阴影）
 *     └─ keycap__stage（键帽顶面，gmk/dsa/flat 三种型别）
 *          ├─ keycap__label  （键位标识，如 A / Enter）
 *          ├─ keycap__img    （书签图标 / 文件夹图标）
 *          └─ keycap__name   （书签名称）
 */

import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'

// ── Props ────────────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    // 必填
    keyCode: string
    label: string // 键位标识文本（如 'A'、'Enter'）
    name: string // 书签名称
    visualType: KeycapVisualType // 键帽型别：flat / gmk / dsa

    // 书签相关
    bookmarkType?: KeycapBookmarkType // mark（网页）/ folder（文件夹）/ back（返回）
    iconSrc?: string // favicon URL（mark 类型）

    // 内联样式（由 useKeyboardStyle helpers 生成）
    stageStyle?: string // stage 顶面的尺寸偏移（gmk/dsa 立体效果）
    textStyle?: string // label / name 的文字对齐 + padding
    iconStyle?: string // 图标区的 justify-content + padding

    // 交互 / 状态
    imgDraggable?: boolean // 图标是否可拖拽（popup 拖拽排序时开启）
    isSelected?: boolean // 选中高亮（popup 书签选择态）
    isLoading?: boolean // 加载动画
    isBorderEnabled?: boolean // 显示自定义边框（--nt-kb-border-*）

    // 内容显示开关
    showCapKey?: boolean // 显示键位标识
    showName?: boolean // 显示书签名称
    showFavicon?: boolean // 显示书签图标
    showTactileBumps?: boolean // 显示触感凸起（F / J 键）
    isBackIconVisible?: boolean // back 类型时是否显示返回箭头
  }>(),
  {
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
  },
)

// ── 派生 class ───────────────────────────────────────────────────────────────
// 型别 class 由组件自身管理；hover / active / move 等附加状态由外层传入

/** 键帽底座 class：型别 + 可选边框 */
const rowClassName = computed(() => [`row__keycap-${props.visualType}`, props.isBorderEnabled && 'row__keycap--border'])

/** stage 顶面 class：随型别切换 */
const stageClassName = computed(() => `keycap__stage-${props.visualType}`)
</script>

<template>
  <!-- 键帽底座：型别 class 决定边框厚度和阴影风格 -->
  <div
    class="row__keycap"
    :class="rowClassName"
  >
    <!-- 选中遮罩（popup 书签选择态） -->
    <div
      v-if="isSelected"
      class="keycap__select"
    >
      <Icon :icon="ICONS.checkCircle" />
    </div>

    <!-- 键帽顶面（三种型别 flat / gmk / dsa，stageStyle 传入几何偏移） -->
    <div
      class="keycap__stage"
      :class="stageClassName"
      :style="stageStyle"
    >
      <!-- 加载动画（书签 favicon 加载中） -->
      <div
        v-if="isLoading"
        class="item__loading"
      >
        <Icon :icon="ICONS.loading" />
      </div>

      <!-- 键位标识（如 A / Enter / Shift） -->
      <p
        v-if="showCapKey"
        class="keycap__label"
        :style="textStyle"
      >
        {{ label || '&nbsp;' }}
      </p>

      <!-- 书签图标区：mark 类型显示 favicon，folder/back 显示对应矢量图标 -->
      <!-- mark 类型只在真的拿到 iconSrc 时才渲染，避免空书签生成占位图 -->
      <div
        class="keycap__img"
        :style="iconStyle"
      >
        <div
          v-if="showFavicon && (bookmarkType !== 'mark' || iconSrc)"
          class="img__wrap"
        >
          <!-- mark：外链 favicon -->
          <img
            v-if="bookmarkType === 'mark' && iconSrc"
            class="img__main"
            :src="iconSrc"
            :draggable="imgDraggable"
          />
          <!-- folder / back：矢量图标 -->
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

      <!-- 书签名称 -->
      <p
        v-if="showName"
        class="keycap__name"
        :style="textStyle"
      >
        {{ name || '&nbsp;' }}
      </p>

      <!-- 触感凸起（仅 F / J 键，模拟实体键盘触感标记） -->
      <div
        v-if="showTactileBumps && ['KeyF', 'KeyJ'].includes(keyCode)"
        class="keycap__tactile-bumps"
      />
    </div>
  </div>
</template>

<style scoped>
/* ── 键帽底座基础样式 ─────────────────────────────────────────────────────── */
.row__keycap {
  position: relative;
  width: 100%;
  height: 100%;
  color: var(--nt-kb-main-font-color);
  background-color: var(--nt-kb-main-bg-color);
  backdrop-filter: blur(var(--nt-kb-background-blur));
  border-radius: var(--nt-kb-border-radius);
  border-style: solid;
  box-sizing: border-box;
  cursor: pointer;
  transition:
    transform 80ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
    box-shadow 80ms ease,
    filter 80ms ease;

  /* ── 选中遮罩 ── */
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
    background: color-mix(in srgb, var(--nt-kb-primary-color) 20%, transparent);
    color: var(--nt-kb-primary-color);
    font-size: 14px;
    border-radius: calc(var(--nt-kb-border-radius) - 1px);
    box-shadow:
      inset 0 0 0 1.5px var(--nt-kb-primary-color),
      0 0 8px color-mix(in srgb, var(--nt-kb-primary-color) 28%, transparent);
  }

  /* ── 键帽顶面（纵向三段式：label / img / name） ── */
  .keycap__stage {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 100%;
    border-style: solid;
    color: inherit;
    background-color: inherit;

    /* 加载旋转图标，绝对定位居中覆盖 */
    .item__loading {
      z-index: 1;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--nt-kb-primary-color);
      font-size: 190%;
    }

    /* 键位标识（左上角小字） */
    .keycap__label {
      flex: 0 0 auto;
      width: 100%;
      line-height: 1;
      padding-top: 1%;
      font-family: var(--nt-kb-key-font-family);
      font-size: var(--nt-kb-key-font-size);
      font-weight: 500;
    }

    /* 图标区（居中弹性伸缩，transform scale 由 --nt-kb-favicon-size 控制大小） */
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
        transform: scale(var(--nt-kb-favicon-size));

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

    /* 书签名称（底部单行截断） */
    .keycap__name {
      flex: 0 0 auto;
      width: 100%;
      line-height: 1;
      font-size: var(--nt-kb-bookmark-font-size);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* 触感凸起（F / J 键底部横条，模拟实体键盘盲打定位凸起） */
    .keycap__tactile-bumps {
      position: absolute;
      left: 50%;
      bottom: 6%;
      transform: translate(-50%, 0);
      width: 22%;
      height: 3px;
      border-radius: 2px;
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0.55) 0%, var(--nt-kb-main-font-color) 40%, rgba(0, 0, 0, 0.25) 100%);
      opacity: 0.7;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
  }
}

/* ── flat 型别（无立体感，内嵌渐变模拟微光泽） ──────────────────────────── */
.row__keycap-flat {
  box-shadow: none;

  .keycap__stage-flat {
    padding: var(--nt-kb-stage-flat-padding);
    border-radius: var(--nt-kb-border-radius);
    border-width: 1px;
    border-color: rgba(255, 255, 255, 0.18) rgba(0, 0, 0, 0.08) rgba(0, 0, 0, 0.12) rgba(255, 255, 255, 0.12);
    background: linear-gradient(160deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.04) 50%, rgba(0, 0, 0, 0.06) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.25),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  }
}

/* ── GMK 型别（仿 Cherry 高度，顶厚底薄三层边框 + 外阴影） ─────────────── */
.row__keycap-gmk {
  border-width: var(--nt-kb-gmk-top-border) var(--nt-kb-gmk-h-border) var(--nt-kb-gmk-bot-border);
  border-color: rgba(255, 255, 255, 0.06) rgba(0, 0, 0, 0.12) rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.08);
  box-shadow:
    0 3px 8px rgba(0, 0, 0, 0.45),
    0 1px 2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);

  .keycap__stage-gmk {
    overflow: hidden;
    border-width: 0px;
    border-color: rgba(0, 0, 0, 0.1);
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 8px 4px;
    border-bottom-left-radius: 8px 4px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.1) 18%, rgba(0, 0, 0, 0.04) 55%, rgba(0, 0, 0, 0.1) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      inset 0 -1px 0 rgba(0, 0, 0, 0.12),
      0 2px 6px rgba(0, 0, 0, 0.18);
    background-color: inherit;
    color: inherit;
  }
}

/* ── DSA 型别（球面均等高度，四边等宽 + 辐射渐变顶面） ──────────────────── */
.row__keycap-dsa {
  border-width: var(--nt-kb-dsa-border);
  border-color: rgba(255, 255, 255, 0.06) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.24) rgba(0, 0, 0, 0.06);
  box-shadow:
    0 3px 7px rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  .keycap__stage-dsa {
    overflow: hidden;
    border-width: 0px;
    border-radius: 8px;
    background: radial-gradient(ellipse at 38% 30%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 35%, rgba(0, 0, 0, 0.06) 65%, rgba(0, 0, 0, 0.14) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 0 rgba(0, 0, 0, 0.14),
      inset 1px 0 0 rgba(255, 255, 255, 0.12),
      inset -1px 0 0 rgba(0, 0, 0, 0.08),
      0 2px 5px rgba(0, 0, 0, 0.18);
    background-color: inherit;
    color: inherit;
  }
}

/* ── 状态修饰符 ──────────────────────────────────────────────────────────── */

/* 拖拽排序中 */
.row__keycap--move {
  cursor: move !important;
}

/* 自定义边框高亮（使用 outline 避免影响布局） */
.row__keycap--border {
  outline: var(--nt-kb-border-width) solid var(--nt-kb-border-color);
}

/* 按下态（popup 点击书签 / widget 键盘按下） */
.row__keycap--active {
  transform: translate(0px, 3px);
  filter: brightness(0.94);

  &.row__keycap-gmk {
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.4),
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

/* 悬停态（--hover 是外层显式加的，gmk/dsa 自身也有 hover 增强） */
.row__keycap--hover:hover,
.row__keycap-gmk:hover,
.row__keycap-dsa:hover {
  transform: translate(0px, -1px);
  filter: brightness(1.06);
}

.row__keycap--hover:hover.row__keycap-gmk,
.row__keycap-gmk:hover {
  box-shadow:
    0 5px 12px rgba(0, 0, 0, 0.5),
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

/* 原生 :active（无需外层控制的默认点击反馈） */
.row__keycap-gmk:active {
  transform: translateY(2px);
  filter: brightness(0.94);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.4),
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
