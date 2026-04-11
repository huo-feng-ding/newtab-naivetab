<script setup lang="ts">
import { isDragMode } from '@/logic/moveable'
import { globalState, localConfig, getStyleField } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const onFocus = () => {
  globalState.isInputFocused = true
}

const onBlur = () => {
  globalState.isInputFocused = false
}

// isDragMode下不允许输入
let lastMemoContent = ''

const handleMemoInput = () => {
  if (lastMemoContent.length !== 0) {
    localConfig.memo.content = lastMemoContent
  }
}

watch(
  () => isDragMode.value,
  (data) => {
    if (data) {
      lastMemoContent = localConfig.memo.content
    } else {
      lastMemoContent = ''
    }
  },
)

const customWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customHeight = getStyleField(WIDGET_CODE, 'height', 'vmin')
const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'vmin')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customBackgroundBlur = getStyleField(WIDGET_CODE, 'backgroundBlur', 'px')
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="memo__container"
      :class="{
        'memo__container--border': localConfig.memo.isBorderEnabled,
        'memo__container--shadow': localConfig.memo.isShadowEnabled,
      }"
    >
      <div class="memo_wrap">
        <NInput
          v-model:value="localConfig.memo.content"
          class="memo__input"
          :class="{ 'memo__input--move': isDragMode }"
          type="textarea"
          placeholder=" "
          autosize
          :style="isDragMode ? 'cursor: move;' : ''"
          :show-count="localConfig.memo.countEnabled"
          @focus="onFocus"
          @blur="onBlur"
          @input="handleMemoInput"
        />
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#memo {
  font-family: v-bind(customFontFamily);

  .memo__container {
    z-index: 10;
    position: absolute;
    border-radius: v-bind(customBorderRadius);
    background-color: v-bind(customBackgroundColor);
    backdrop-filter: blur(v-bind(customBackgroundBlur)) saturate(1.4);
    transition: box-shadow 0.25s ease, border-color 0.25s ease, background-color 0.25s ease;
    will-change: transform;

    /* 内高光：左上角玻璃反射光晕 */
    &::before {
      content: '';
      pointer-events: none;
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(
        ellipse at 10% 10%,
        rgba(255, 255, 255, 0.12) 0%,
        rgba(255, 255, 255, 0.04) 35%,
        transparent 65%
      );
      z-index: 0;
    }
    /* 顶部高光线 */
    &::after {
      content: '';
      pointer-events: none;
      position: absolute;
      top: 0;
      left: 12%;
      right: 12%;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.28),
        transparent
      );
      border-radius: 50%;
      z-index: 1;
    }

    .n-input__border {
      border: 0 !important;
    }
    .n-input,
    .n-input--focus {
      border-radius: v-bind(customBorderRadius);
    }

    .memo_wrap {
      position: relative;
      z-index: 1;

      .n-input--textarea {
        background-color: transparent !important;
      }
      .memo__input {
        padding: 0 8px;
        width: v-bind(customWidth);
        height: v-bind(customHeight);
        font-size: v-bind(customFontSize);
        .n-input__textarea-el {
          caret-color: v-bind(customFontColor);
          color: v-bind(customFontColor);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
          letter-spacing: 0.2px;
          line-height: 1.6;
        }
        .n-input__border,
        .n-input__state-border {
          border: 0 !important;
          box-shadow: none !important;
          outline: none !important;
          /* 防止 state-border 的 transition 动画产生竖向闪烁条 */
          transition: none !important;
        }
        .n-input-word-count {
          color: v-bind(customFontColor) !important;
          opacity: 0.45;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          letter-spacing: 0.2px;
          transition: opacity 0.18s ease;
        }
      }
      .memo__input--move {
        cursor: move !important;
        .n-input__textarea-el {
          cursor: move !important;
        }
      }
    }
  }

  /* 聚焦时字数统计更明显 */
  .memo__container:focus-within {
    .n-input-word-count {
      opacity: 0.65;
    }
  }

  .memo__container--border {
    border: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .memo__container--shadow {
    box-shadow:
      0 4px 24px v-bind(customShadowColor),
      0 1px 4px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  /* 聚焦时阴影加深 */
  .memo__container--shadow:focus-within {
    box-shadow:
      0 6px 32px v-bind(customShadowColor),
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  /* fix left space */
  .n-input__textarea-el {
    left: 2px !important;
  }
}
</style>
