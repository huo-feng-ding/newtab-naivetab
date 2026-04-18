/**
 * useKeyboardStyle
 *
 * 统一计算键盘键帽 / 外壳 / 定位板所需的所有样式变量。
 * - widget（newtab）使用 `vmin` 单位，baseSize 由 `keycapSize * 0.1` 得到的 vmin 数值
 * - popup 使用固定 `px` 基准（默认 40px），直接传入 baseSize 数字
 *
 * 调用方通过 `unit` 参数区分两种场景：
 *   - `'vmin'`：widget 场景，内部乘以 0.1 再拼上 vmin
 *   - `'px'`：popup 场景，直接拼上 px
 *
 * 这样两侧的视觉计算公式完全一致，改一处即可同步更新。
 */

import { TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP } from '@/logic/constants/app'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG, SPACE_KEYCODE_LIST } from '@/logic/constants/keyboard'
import { currKeyboardConfig } from '@/logic/keyboard'
import { localConfig, getStyleField, customPrimaryColor } from '@/logic/store'

type Unit = 'vmin' | 'px'

/**
 * 将数值按照单位规则转成 CSS 字符串。
 * - vmin：value × 0.1 + 'vmin'（与 getStyleField 内部规则一致）
 * - px ：value + 'px'
 *
 * 配置值以 px 量级存储（如 keycapSize: 58 ≈ 58px），×0.1 转为 vmin，
 * 依赖约定：1vmin ≈ 10px（基准视口宽度 1000px 下）。
 */
const toUnit = (value: number, unit: Unit): string =>
  unit === 'vmin' ? `${value * 0.1}vmin` : `${value}px`

// ─────────────────────────────────────────────────────────────────────────────
export const useKeyboardStyle = (unit: Unit, baseSizeOverride?: number) => {
  // ── base ──────────────────────────────────────────────────────────────────
  /**
   * 所有尺寸计算的基准值（响应式 computed）：
   * - vmin 模式：读取 localConfig.keyboard.keycapSize，用户调整后所有依赖自动更新
   * - px  模式：使用 baseSizeOverride（默认 40px），固定不变
   */
  const base = computed(() =>
    unit === 'px' ? (baseSizeOverride ?? 40) : localConfig.keyboard.keycapSize,
  )

  // ── 颜色 ──────────────────────────────────────────────────────────────────
  // getStyleField 返回 computed ref，自动跟随外观模式（light/dark）切换

  // 键帽主色
  const mainFontColor = getStyleField('keyboard', 'mainFontColor')
  const mainBgColor = getStyleField('keyboard', 'mainBackgroundColor')

  // 强调色 1 / 2
  const emphasisOneFontColor = getStyleField('keyboard', 'emphasisOneFontColor')
  const emphasisOneBgColor = getStyleField('keyboard', 'emphasisOneBackgroundColor')
  const emphasisTwoFontColor = getStyleField('keyboard', 'emphasisTwoFontColor')
  const emphasisTwoBgColor = getStyleField('keyboard', 'emphasisTwoBackgroundColor')

  // 键帽边框 / 模糊 / 字体
  const keycapBorderColor = getStyleField('keyboard', 'keycapBorderColor')
  const keycapBackgroundBlurPx = getStyleField('keyboard', 'keycapBackgroundBlur', 'px')
  const keycapKeyFontFamily = getStyleField('keyboard', 'keycapKeyFontFamily')
  const keycapBookmarkFontFamily = getStyleField('keyboard', 'keycapBookmarkFontFamily')
  const faviconSize = getStyleField('keyboard', 'faviconSize')

  // Shell
  const shellColor = getStyleField('keyboard', 'shellColor')
  const shellShadowColor = getStyleField('keyboard', 'shellShadowColor')
  const shellBorderRadiusPx = getStyleField('keyboard', 'shellBorderRadius', 'px')
  const shellBackgroundBlurPx = getStyleField('keyboard', 'shellBackgroundBlur', 'px')

  // Plate
  const plateColor = getStyleField('keyboard', 'plateColor')
  const plateBorderRadiusPx = getStyleField('keyboard', 'plateBorderRadius', 'px')
  const plateBackgroundBlurPx = getStyleField('keyboard', 'plateBackgroundBlur', 'px')

  // ── 键帽尺寸 ──────────────────────────────────────────────────────────────

  /** 内边距基准（文本区 / 图标区 / stage flat 统一使用 8% base） */
  const keycapInnerPaddingCss = computed(() => toUnit(0.08 * base.value, unit))

  const keycapBaseSizeCss = computed(() => toUnit(base.value, unit))

  const keycapBorderWidthCss = computed(() => `${localConfig.keyboard.keycapBorderWidth}px`)

  const borderRadiusCss = computed(() => {
    const r = localConfig.keyboard.keycapBorderRadius
    const s = localConfig.keyboard.keycapSize
    return toUnit((r / s) * base.value, unit)
  })

  const keycapPaddingCss = computed(() => {
    const p = localConfig.keyboard.keycapPadding
    const s = localConfig.keyboard.keycapSize
    return toUnit((p / s) * base.value, unit)
  })

  const keycapKeyFontSizeCss = computed(() => {
    const s = localConfig.keyboard.keycapSize
    const fs = localConfig.keyboard.keycapKeyFontSize
    return toUnit((fs / s) * base.value, unit)
  })

  const keycapBookmarkFontSizeCss = computed(() => {
    const s = localConfig.keyboard.keycapSize
    const fs = localConfig.keyboard.keycapBookmarkFontSize
    return toUnit((fs / s) * base.value, unit)
  })

  // ── Keycap 立体边缘（GMK / DSA 键帽型别）─────────────────────────────────
  // GMK：仿 Cherry 高度，顶面向内收窄，底部边缘较厚
  const GMK_EDGE = 0.03
  const gmkTopBorderCss = computed(() => toUnit(GMK_EDGE * base.value, unit))
  const gmkHBorderCss = computed(() => toUnit(GMK_EDGE * 6 * base.value, unit))
  const gmkBotBorderCss = computed(() => toUnit(GMK_EDGE * 7 * base.value, unit))
  const gmkStageMarginTopCss = computed(() => toUnit(GMK_EDGE * 0.3 * base.value, unit))
  const gmkStageMarginLeftCss = computed(() => toUnit(GMK_EDGE * 1.5 * base.value, unit))
  const gmkStageHeightCss = computed(() => toUnit((1 - GMK_EDGE * 8) * base.value, unit))

  // DSA：球面均等高度，四边等宽边缘
  const DSA_EDGE = 0.18
  const dsaBorderCss = computed(() => toUnit(DSA_EDGE * base.value, unit))
  const dsaStageMargCss = computed(() => toUnit((DSA_EDGE / 3.8) * base.value, unit))
  const dsaStageHeightCss = computed(() => toUnit((1 - DSA_EDGE * 1.7) * base.value, unit))

  // ── Shell 尺寸 ────────────────────────────────────────────────────────────
  const shellVPaddingCss = computed(() => {
    const p = localConfig.keyboard.shellVerticalPadding
    const s = localConfig.keyboard.keycapSize
    return toUnit((p / s) * base.value, unit)
  })
  const shellHPaddingCss = computed(() => {
    const p = localConfig.keyboard.shellHorizontalPadding
    const s = localConfig.keyboard.keycapSize
    return toUnit((p / s) * base.value, unit)
  })

  // ── Plate 尺寸 ────────────────────────────────────────────────────────────
  const platePaddingCss = computed(() => {
    const p = localConfig.keyboard.platePadding
    const s = localConfig.keyboard.keycapSize
    return toUnit((p / s) * base.value, unit)
  })

  // ── 配置读取 helpers ──────────────────────────────────────────────────────
  // 读取自定义配置时，优先使用用户覆盖值，回退到默认配置

  /** 获取键帽显示标签（优先自定义 label） */
  const getCustomLabel = (code: string): string => {
    const custom = currKeyboardConfig.value.custom[code]?.label
    return custom ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].label
  }

  /** 获取键帽文字对齐（优先自定义 textAlign） */
  const getCustomTextAlign = (code: string): string => {
    const custom = currKeyboardConfig.value.custom[code]?.textAlign
    return custom ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].textAlign
  }

  /** 获取键帽宽度（原始数值，不含单位；用于算术计算） */
  const getKeycapWidthValue = (code: string, addRatio = 0): number => {
    const customSize = currKeyboardConfig.value.custom[code]?.size
    const size = customSize ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].size
    return (size + addRatio) * base.value
  }

  /** 获取键帽宽度（CSS 字符串，含单位） */
  const getKeycapWidthCss = (code: string, addRatio = 0): string =>
    toUnit(getKeycapWidthValue(code, addRatio), unit)

  /** 获取键帽自定义 margin（数值，不含单位；用于容器宽度计算） */
  const getKeycapMarginValue = (code: string, type: 'marginLeft' | 'marginRight'): number => {
    const value = currKeyboardConfig.value.custom[code]?.[type]
    return value ? base.value * value : 0
  }

  /**
   * 计算键盘第一行的总宽度（含 shell 左右 padding）。
   * - 供 popup 动态计算弹窗容器宽度，避免调用方重复内联换算公式。
   * - 仅在 unit = 'px' 场景下有意义（返回值单位：px）。
   */
  const getFirstRowWidth = (): number => {
    let width = 0
    if (localConfig.keyboard.isShellVisible) {
      const s = localConfig.keyboard.keycapSize
      width += (localConfig.keyboard.shellHorizontalPadding / s) * base.value * 2
    }
    for (const code of currKeyboardConfig.value.list[0]) {
      width += getKeycapWidthValue(code)
      width += getKeycapMarginValue(code, 'marginLeft')
      width += getKeycapMarginValue(code, 'marginRight')
    }
    return width
  }

  // ── 复合内联样式 helpers ──────────────────────────────────────────────────
  // 以下函数返回内联 style 字符串，供模板直接绑定 :style

  /** keycap-wrap 容器（宽度 + 自定义 margin） */
  const getKeycapWrapStyle = (code: string): string => {
    let style = `width: ${getKeycapWidthCss(code)}; `
    const custom = currKeyboardConfig.value.custom[code]
    if (custom?.marginLeft) style += `margin-left: ${toUnit(custom.marginLeft * base.value, unit)}; `
    if (custom?.marginRight) style += `margin-right: ${toUnit(custom.marginRight * base.value, unit)}; `
    if (custom?.marginBottom) style += `margin-bottom: ${toUnit(custom.marginBottom * base.value, unit)}; `
    return style
  }

  /** keycap stage 顶面（GMK / DSA 型别的立体偏移） */
  const getKeycapStageStyle = (code: string): string => {
    const keycapType = localConfig.keyboard.keycapType
    const isSpace = SPACE_KEYCODE_LIST.includes(code)
    const spaceGradient = 'background: linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 90%); background-color: inherit;'
    let style = ''
    if (keycapType === 'gmk') {
      style += `margin-top: -${gmkStageMarginTopCss.value};`
      style += `margin-left: -${gmkStageMarginLeftCss.value};`
      style += `width: ${toUnit(getKeycapWidthValue(code, -(GMK_EDGE * 10)), unit)};`
      style += `height: ${gmkStageHeightCss.value};`
      if (isSpace) style += `${spaceGradient} border-radius;`
    } else if (keycapType === 'dsa') {
      style += `margin: -${dsaStageMargCss.value};`
      style += `width: ${toUnit(getKeycapWidthValue(code, -(DSA_EDGE * 1.7)), unit)};`
      style += `height: ${dsaStageHeightCss.value};`
      if (isSpace) style += spaceGradient
    }
    return style
  }

  /** keycap 文本区（text-align + 非居中时加横向 padding） */
  const getKeycapTextStyle = (code: string): string => {
    const textAlign = getCustomTextAlign(code)
    let style = `text-align: ${textAlign};`
    if (textAlign !== 'center') style += `padding: 0 ${keycapInnerPaddingCss.value};`
    return style
  }

  /** keycap 图标区（justify-content + padding，依据是否显示名称分支） */
  const getKeycapIconStyle = (code: string): string => {
    const textAlign = getCustomTextAlign(code)
    const justifyContent = TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP[textAlign]
    let style = `justify-content: ${justifyContent};`
    if (localConfig.keyboard.isNameVisible) {
      if (justifyContent !== 'center') style += `padding: 0 ${keycapInnerPaddingCss.value};`
    } else {
      style += `padding: ${keycapInnerPaddingCss.value};`
    }
    return style
  }

  /** 获取某个键当前的强调色分组（0=普通 / 1=强调一 / 2=强调二） */
  const getEmphasisGroup = (code: string): 0 | 1 | 2 => {
    const override = localConfig.keyboard.emphasisKeyOverrides?.[code]
    if (override !== undefined) return override
    if (currKeyboardConfig.value.emphasisOneKeys.includes(code)) return 1
    if (currKeyboardConfig.value.emphasisTwoKeys.includes(code)) return 2
    return 0
  }

  /** 强调键（emphasisOne / emphasisTwo）底色 + 文字色 */
  const getEmphasisStyle = (code: string): string => {
    const group = getEmphasisGroup(code)
    if (group === 1) return `background-color:${emphasisOneBgColor.value};color:${emphasisOneFontColor.value};`
    if (group === 2) return `background-color:${emphasisTwoBgColor.value};color:${emphasisTwoFontColor.value};`
    return ''
  }

  // ── CSS 变量集合 ───────────────────────────────────────────────────────────
  // 汇总所有 keycap 相关 CSS 变量，通过 :style 注入到 KeyboardKeycapDisplay 根节点

  const keycapCssVars = computed(() => ({
    '--nt-kb-main-font-color': mainFontColor.value,
    '--nt-kb-main-bg-color': mainBgColor.value,
    '--nt-kb-background-blur': keycapBackgroundBlurPx.value,
    '--nt-kb-border-radius': borderRadiusCss.value,
    '--nt-kb-primary-color': customPrimaryColor.value,
    '--nt-kb-key-font-family': keycapKeyFontFamily.value,
    '--nt-kb-key-font-size': keycapKeyFontSizeCss.value,
    '--nt-kb-bookmark-font-size': keycapBookmarkFontSizeCss.value,
    '--nt-kb-favicon-size': faviconSize.value,
    '--nt-kb-stage-flat-padding': keycapInnerPaddingCss.value,
    '--nt-kb-gmk-top-border': gmkTopBorderCss.value,
    '--nt-kb-gmk-h-border': gmkHBorderCss.value,
    '--nt-kb-gmk-bot-border': gmkBotBorderCss.value,
    '--nt-kb-dsa-border': dsaBorderCss.value,
    '--nt-kb-border-width': keycapBorderWidthCss.value,
    '--nt-kb-border-color': keycapBorderColor.value,
  }))

  const layoutCssVars = computed(() => ({
    '--nt-kb-bookmark-font-family': keycapBookmarkFontFamily.value,
    '--nt-kb-keycap-padding': keycapPaddingCss.value,
    '--nt-kb-keycap-height': keycapBaseSizeCss.value,
    '--nt-kb-plate-padding': platePaddingCss.value,
    '--nt-kb-plate-color': plateColor.value,
    '--nt-kb-plate-radius': plateBorderRadiusPx.value,
    '--nt-kb-plate-blur': plateBackgroundBlurPx.value,
    '--nt-kb-shell-v-padding': shellVPaddingCss.value,
    '--nt-kb-shell-h-padding': shellHPaddingCss.value,
    '--nt-kb-shell-radius': shellBorderRadiusPx.value,
    '--nt-kb-shell-color': shellColor.value,
    '--nt-kb-shell-blur': shellBackgroundBlurPx.value,
    '--nt-kb-shell-shadow': shellShadowColor.value,
  }))

  // ── 返回值 ────────────────────────────────────────────────────────────────
  return {
    // 基准
    base,

    // CSS 变量集合（注入 KeyboardKeycapDisplay）
    keycapCssVars,

    // CSS 变量集合（注入 KeyboardLayout）
    layoutCssVars,

    // 配置读取
    getCustomLabel,
    getCustomTextAlign,
    getKeycapWidthValue,
    getKeycapWidthCss,
    getKeycapMarginValue,
    getFirstRowWidth,

    // 内联样式生成
    getKeycapWrapStyle,
    getKeycapStageStyle,
    getKeycapTextStyle,
    getKeycapIconStyle,
    getEmphasisGroup,
    getEmphasisStyle,
  }
}
