<script setup lang="ts">
/**
 * KeyboardLayout
 *
 * 键盘行列布局的通用容器组件，供 widget（newtab）和 popup 共用。
 * - 负责渲染 shell / plate / 行列结构，不关心每个键帽的具体内容
 * - 每个键帽内容通过具名 slot `keycap` 暴露，调用方自行决定渲染什么
 * - 布局尺寸样式通过 `useKeyboardStyle` composable 统一计算
 *
 * Props：
 *   unit        - 'vmin'（widget）或 'px'（popup），控制尺寸单位
 *   baseSize    - px 模式下的基准尺寸（默认 40），vmin 模式忽略此参数
 *   rows        - 键盘行列数据，二维数组，每项为 keyCode 字符串
 *   extraClass  - 附加到容器的 class（可选）
 *
 * Slot `keycap`：
 *   slot props：{ code: string, rowIndex: number }
 */

import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import { localConfig } from '@/logic/store'

const props = withDefaults(defineProps<{
  unit: 'vmin' | 'px'
  baseSize?: number
  rows: string[][]
  extraClass?: string | string[] | Record<string, boolean>
}>(), {
  baseSize: 40,
  extraClass: undefined,
})

// ── 样式 composable ──────────────────────────────────────────────────────────
const {
  getKeycapWrapStyle,
  layoutCssVars,
} = useKeyboardStyle(props.unit, props.baseSize)

// ── 显示开关 ─────────────────────────────────────────────────────────────────
const isShellVisible = computed(() => localConfig.keyboard.isShellVisible)
const isShellShadowEnabled = computed(() => localConfig.keyboard.isShellShadowEnabled)
const isPlateVisible = computed(() => localConfig.keyboard.isPlateVisible)
</script>

<template>
  <!-- 键盘容器：shell 可见时附加对应 modifier class -->
  <div
    class="keyboard-layout"
    :class="[
      {
        'keyboard-layout--shell': isShellVisible,
        'keyboard-layout--shell-shadow': isShellVisible && isShellShadowEnabled,
      },
      extraClass,
    ]"
    :style="layoutCssVars"
  >
    <!-- 行迭代 -->
    <div
      v-for="(rowData, rowIndex) of rows"
      :key="rowIndex"
      class="keyboard-layout__row"
    >
      <!-- 单键帽 wrap：宽度 / margin 由 getKeycapWrapStyle 计算 -->
      <div
        v-for="code of rowData"
        :key="code"
        class="keyboard-layout__keycap-wrap"
        :style="getKeycapWrapStyle(code)"
      >
        <!-- 定位板层（shell + plate 均开启时渲染，z-index: -1 置于键帽后方） -->
        <div
          v-if="isShellVisible && isPlateVisible"
          class="keyboard-layout__keycap-plate"
        />
        <!-- 键帽内容由调用方通过 slot 注入 -->
        <slot
          name="keycap"
          :code="code"
          :row-index="rowIndex"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── 键盘容器基础 ──────────────────────────────────────────────────────────── */
.keyboard-layout {
  font-family: var(--nt-kb-bookmark-font-family);

  /* ── 行 ── */
  .keyboard-layout__row {
    display: flex;

    /* ── 单键帽 wrap ── */
    .keyboard-layout__keycap-wrap {
      flex: 0 0 auto;
      position: relative;
      padding: var(--nt-kb-keycap-padding);
      height: var(--nt-kb-keycap-height);

      /* ── 定位板（绝对定位，向外扩展 platePadding，置于键帽层之下） ── */
      .keyboard-layout__keycap-plate {
        z-index: -1;
        position: absolute;
        top: calc(-1 * var(--nt-kb-plate-padding));
        left: calc(-1 * var(--nt-kb-plate-padding));
        width: calc(100% + var(--nt-kb-plate-padding) * 2);
        height: calc(100% + var(--nt-kb-plate-padding) * 2);
        background: var(--nt-kb-plate-color);
        border-radius: var(--nt-kb-plate-radius);
        backdrop-filter: blur(var(--nt-kb-plate-blur));
      }
    }
  }
}

/* ── Shell 外壳（isShellVisible = true） ─────────────────────────────────── */
.keyboard-layout--shell {
  padding: var(--nt-kb-shell-v-padding) var(--nt-kb-shell-h-padding);
  border-radius: var(--nt-kb-shell-radius);
  background-color: var(--nt-kb-shell-color) !important;
  backdrop-filter: blur(var(--nt-kb-shell-blur));
  /* 模拟玻璃质感的四边高光/阴影 */
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  border-left: 1px solid rgba(255, 255, 255, 0.10);
  border-right: 1px solid rgba(0, 0, 0, 0.10);
  border-bottom: 1px solid rgba(0, 0, 0, 0.18);
}

/* ── Shell 立体阴影（isShellShadowEnabled = true，叠加在 --shell 上） ─────── */
.keyboard-layout--shell-shadow {
  background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.10) 0%,
      rgba(255, 255, 255, 0.03) 35%,
      rgba(0, 0, 0, 0.06) 65%,
      rgba(0, 0, 0, 0.12) 100%
    ),
    var(--nt-kb-shell-color) !important;
  box-shadow:
    0px 8px 24px var(--nt-kb-shell-shadow),
    0px 3px 8px var(--nt-kb-shell-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 0 -2px 4px rgba(0, 0, 0, 0.15);
}
</style>
