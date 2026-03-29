/**
 * 全局动态颜色 Token
 *
 * 格式：styleKey: ['lightColor', 'darkColor']
 * - lightColor：浅色模式下的颜色值（必填）
 * - darkColor：深色模式下的颜色值；若为空字符串 ''，则深色模式也使用 lightColor
 *
 * ⚠️  规范：所有需要随 light/dark 主题切换的硬编码颜色值，
 *         都应在此处统一注册，禁止在组件内直接写双份颜色字面量。
 *
 * 使用方式（JS 侧）：
 *   import { styleConst } from '@/styles/const'
 *   const isDark = localState.value.currAppearanceLabel === 'dark'
 *   const idx = isDark ? 1 : 0
 *   element.style.setProperty('--your-var', styleConst.value.yourKey[idx] || styleConst.value.yourKey[0])
 */
export const styleConst = ref({
  // ── Moveable (拖拽编辑) ─────────────────────────────────────────────
  auxiliaryLineMain: ['#40a9ff', ''],
  auxiliaryLineBound: ['#ff7875', ''],
  auxiliaryLineWidget: ['#69c0ff', ''],
  bgMoveableWidgetMain: ['rgba(100,181,246, 0.5)', ''],
  bgMoveableWidgetActive: ['rgba(100,181,246, 0.7)', ''],
  bgMoveableWidgetDelete: ['rgba(250,82,82, 1)', ''],
  moveableToolDeleteBtnColor: ['#ffa39e', ''],
  borderMoveableToolItem: ['#95a5a6', ''],
  bgMoveableToolDrawer: ['rgba(32, 32, 32, 0.7)', ''],

  // ── Popup Keyboard ──────────────────────────────────────────────────
  popupKeyboardBorder: ['rgb(224, 224, 230)', 'rgba(73, 73, 77, 1)'],
  popupKeyboardHoverBg: ['rgba(209, 213, 219, 1)', 'rgba(73, 73, 77, 1)'],
  popupKeyboardActiveBg: ['rgba(209, 213, 219, 0.85)', 'rgba(73, 73, 77, 0.8)'],

  // ── Dropdown Menu (右键菜单) ────────────────────────────────────────
  // CSS 变量前缀 --dm-，由 RightClickMenu.vue 的 applyDropdownThemeVars 写入 body
  dropdownBg: ['rgba(252, 252, 253, 0.92)', 'rgba(28, 28, 32, 0.82)'],
  dropdownBorder: ['rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.12)'],
  dropdownShadowColor: ['rgba(0, 0, 0, 0.14)', 'rgba(0, 0, 0, 0.36)'],
  dropdownText: ['rgba(30, 30, 35, 0.9)', 'rgba(255, 255, 255, 0.88)'],
  dropdownIcon: ['rgba(30, 30, 35, 0.4)', 'rgba(255, 255, 255, 0.5)'],
  dropdownIconHover: ['rgba(30, 30, 35, 0.85)', 'rgba(255, 255, 255, 0.9)'],
  dropdownHoverBg: ['rgba(0, 0, 0, 0.055)', 'rgba(255, 255, 255, 0.1)'],
  dropdownHoverBorder: ['rgba(0, 0, 0, 0.04)', 'rgba(255, 255, 255, 0.07)'],
  dropdownDivider: ['rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.1)'],
  dropdownDangerText: ['#d93025', '#ff6b6b'],
  dropdownDangerIcon: ['rgba(217, 48, 37, 0.6)', 'rgba(255, 107, 107, 0.7)'],
  dropdownDangerHover: ['rgba(217, 48, 37, 0.08)', 'rgba(255, 80, 80, 0.15)'],
})
