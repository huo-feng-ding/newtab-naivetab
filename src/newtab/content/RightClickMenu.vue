<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { gaProxy } from '@/logic/gtag'
import { isDragMode, toggleIsDragMode, getTargetDataFromEvent } from '@/logic/moveable'
import { toggleFullscreen, switchSettingDrawerVisible, globalState, localConfig, localState } from '@/logic/store'
import { imageState, imageLocalState, getImageUrlFromName } from '@/logic/image'
import { downloadImageByUrl } from '@/logic/util'
import { WIDGET_CODE_LIST, getWidgetSettingPane } from '@/newtab/widgets/codes'
import { styleConst } from '@/styles/const'

const state = reactive({
  isMenuVisible: false,
  posX: 0,
  posY: 0,
  currTargetCode: '' as EleTargetCode | '',
})

const renderIconFunc = (icon: string) => () => h(Icon, { icon })

// 根据当前主题（light | dark）响应式更新 body 上的 CSS 变量
// NDropdown 弹出层 teleport 到 body，通过 body 上的变量继承即可
// 颜色值统一从 styleConst 读取，修改颜色请前往 src/styles/const.ts
const applyDropdownThemeVars = (isDark: boolean) => {
  const el = document.body
  const c = styleConst.value
  // styleConst 格式：['lightColor', 'darkColor']，darkColor 为空时回退到 lightColor
  const v = (key: keyof typeof c) => (isDark ? c[key][1] || c[key][0] : c[key][0])
  el.style.setProperty('--dm-bg', v('dropdownBg'))
  el.style.setProperty('--dm-border', v('dropdownBorder'))
  el.style.setProperty('--dm-shadow-color', v('dropdownShadowColor'))
  el.style.setProperty('--dm-text', v('dropdownText'))
  el.style.setProperty('--dm-icon', v('dropdownIcon'))
  el.style.setProperty('--dm-icon-hover', v('dropdownIconHover'))
  el.style.setProperty('--dm-hover-bg', v('dropdownHoverBg'))
  el.style.setProperty('--dm-hover-border', v('dropdownHoverBorder'))
  el.style.setProperty('--dm-divider', v('dropdownDivider'))
  el.style.setProperty('--dm-danger-text', v('dropdownDangerText'))
  el.style.setProperty('--dm-danger-icon', v('dropdownDangerIcon'))
  el.style.setProperty('--dm-danger-hover', v('dropdownDangerHover'))
}

watch(
  () => localState.value.currAppearanceLabel,
  (label) => applyDropdownThemeVars(label === 'dark'),
  { immediate: true },
)

// ──────────────────────────────────────────────────────────────────────────────
// 菜单列表冻结机制（解决点击 item 后菜单延迟消失的问题）
//
// 【根因】menuList 若用 computed，会响应 isDragMode / isFocusMode 等外部状态。
// 点击「编辑布局」时：
//   1. onSelectMenu 设 isMenuVisible = false
//   2. toggleIsDragMode() 同步改变 isDragMode
//   3. isDragMode 变化 → computed 重算 → NDropdown options 更新 → 组件重渲染
// 浏览器把步骤 1~3 打包在同一帧处理，菜单先刷新内容再消失，产生明显卡顿感。
//
// 【方案】改为普通 ref + 只在菜单打开（isMenuVisible = true）时重建列表，
// 菜单关闭期间完全冻结，不响应任何外部状态变化。
// ──────────────────────────────────────────────────────────────────────────────
const buildMenuList = () => {
  const isFocusMode = localConfig.general.isFocusMode
  const isHoverWidget = state.currTargetCode.length !== 0
  const isDownloadVisible = !isDragMode.value && localConfig.general.isBackgroundImageEnabled
  const targetLabel = isHoverWidget ? window.$t(`setting.${state.currTargetCode}`) : window.$t('setting.general')
  const list = [
    {
      label: targetLabel + window.$t('common.setting'),
      key: 'setting',
      icon: renderIconFunc(ICONS.settings),
      disabled: isDragMode.value,
    },
    {
      label: isDragMode.value ? window.$t('rightMenu.doneEdit') : window.$t('rightMenu.editLayout'),
      key: 'editLayout',
      icon: renderIconFunc(ICONS.dragDrop),
    },
    { type: 'divider', key: 'd1' },
    {
      label: `${isFocusMode ? window.$t('common.exit') : ''}${window.$t('rightMenu.focusMode')}`,
      key: 'focusMode',
      icon: renderIconFunc(ICONS.focus),
    },
  ]
  if (isFocusMode) {
    list.push({ label: window.$t('rightMenu.editFocusMode'), key: 'editFocusMode', icon: renderIconFunc('mdi:tune'), disabled: isDragMode.value })
  }
  list.push({ label: `${globalState.isFullScreen ? window.$t('common.exit') : ''}${window.$t('rightMenu.fullscreen')}`, key: 'fullscreen', icon: renderIconFunc(ICONS.fullscreen) })
  if (isDownloadVisible) {
    list.push({ label: window.$t('rightMenu.downloadWallpaper'), key: 'downloadWallpaper', icon: renderIconFunc(ICONS.downloadFill) })
  }
  if (!isFocusMode) {
    list.push(
      { type: 'divider', key: 'd2' },
      { label: window.$t('setting.aboutSponsor'), key: 'aboutSponsor', icon: renderIconFunc(ICONS.sponsor) },
    )
    if (isHoverWidget) {
      list.push({ type: 'divider', key: 'd3' })
      list.push({ label: window.$t('common.delete'), key: 'deleteWidget', icon: renderIconFunc(ICONS.deleteBin), props: { class: 'dropdown-option--danger' } } as any)
    } else {
      list.push({ label: window.$t('setting.aboutIndex'), key: 'aboutIndex', icon: renderIconFunc(ICONS.info) })
    }
  }
  return list
}

const menuList = ref(buildMenuList())

watch(
  () => state.isMenuVisible,
  (visible) => {
    if (visible) {
      menuList.value = buildMenuList()
    }
  },
)

const openSettingPane = (tabValue: settingPanes, anchor = '') => {
  globalState.currSettingTabCode = tabValue
  globalState.currSettingAnchor = anchor
  switchSettingDrawerVisible(true)
  gaProxy('click', ['rightMenu', tabValue])
}

const menuActionMap = {
  setting: () => {
    const code = state.currTargetCode
    if (code.length === 0) {
      openSettingPane('general')
    } else {
      const pane = getWidgetSettingPane(code as WidgetCodes)
      // clockDate 面板内有多个 section，传入 anchor 以便自动滚动定位
      const anchor = pane === 'clockDate' ? code : ''
      openSettingPane(pane, anchor)
    }
  },
  editLayout: () => {
    switchSettingDrawerVisible(false)
    toggleIsDragMode()
    gaProxy('click', ['rightMenu', 'editLayout'])
  },
  fullscreen: () => {
    toggleFullscreen()
    gaProxy('click', ['rightMenu', 'fullscreen'])
  },
  focusMode: () => {
    localConfig.general.isFocusMode = !localConfig.general.isFocusMode
    gaProxy('click', ['rightMenu', 'focusMode'])
  },
  editFocusMode: () => {
    openSettingPane('focusMode')
  },
  downloadWallpaper: async () => {
    if (!localConfig.general.isBackgroundImageEnabled) {
      return
    }
    try {
      if (localConfig.general.backgroundImageSource === 0) {
        const objectUrl = imageState.currBackgroundImageFileObjectURL
        const filename = imageState.currBackgroundImageFileName || 'wallpaper.jpg'
        if (!objectUrl) {
          return
        }
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = filename
        link.click()
      } else {
        const quality: TImage.quality = localConfig.general.backgroundImageHighQuality ? 'high' : 'medium'
        const appearanceCode = localState.value.currAppearanceCode
        let url = ''
        if (localConfig.general.backgroundImageSource === 1) {
          if (localConfig.general.isBackgroundImageCustomUrlEnabled) {
            url = localConfig.general.backgroundImageCustomUrls[appearanceCode]
          } else {
            const name = localConfig.general.backgroundImageNames && localConfig.general.backgroundImageNames[appearanceCode]
            url = getImageUrlFromName(
              localConfig.general.backgroundNetworkSourceType,
              name,
              quality,
            )
          }
        } else if (localConfig.general.backgroundImageSource === 2) {
          const todayImage = imageLocalState.value.bing.list[0]
          const name = todayImage && todayImage.name
          url = name ? getImageUrlFromName(1, name, quality) : ''
        }
        if (!url) {
          return
        }
        let filename = 'wallpaper.jpg'
        try {
          const u = new URL(url)
          const idParam = u.searchParams.get('id')
          if (idParam) {
            filename = idParam
          } else {
            const pathName = u.pathname.split('/').pop() || ''
            filename = pathName.split('?')[0] || 'wallpaper.jpg'
          }
        } catch (e) {
          // noop
        }
        await downloadImageByUrl(url, filename)
      }
      gaProxy('click', ['rightMenu', 'downloadWallpaper'])
    } catch (e) {
      // noop
    }
  },
  aboutSponsor: () => {
    openSettingPane('aboutSponsor')
  },
  aboutIndex: () => {
    openSettingPane('aboutIndex')
  },
  deleteWidget: () => {
    const code = state.currTargetCode as WidgetCodes
    if (!WIDGET_CODE_LIST.includes(code)) {
      return
    }
    localConfig[code].enabled = false
    gaProxy('click', ['rightMenu', 'deleteWidget'])
  },
}

const onSelectMenu = (key: string) => {
  // 先隐藏菜单，用 setTimeout(0)（而非 nextTick）延迟执行操作：
  // nextTick 只等 Vue 完成响应式更新，但浏览器渲染帧尚未提交；
  // setTimeout(0) 则会在当前帧结束、浏览器绘制后才执行，
  // 确保退出动画（0.08s）先启动，操作引发的状态变化不会干扰菜单的消失过程。
  state.isMenuVisible = false
  const action = menuActionMap[key]
  if (!action) {
    return
  }
  setTimeout(() => {
    action()
  }, 0)
}

const onClickoutside = (e: MouseEvent) => {
  if (e.button === 0) {
    state.isMenuVisible = false
  }
}

const openMenu = async (e: MouseEvent) => {
  state.posX = e.clientX
  state.posY = e.clientY
  const targetData = getTargetDataFromEvent(e)
  state.currTargetCode = targetData.code
  state.isMenuVisible = true
}

const handleContextMenu = async (e: MouseEvent) => {
  e.preventDefault()
  if (globalState.isGuideMode) {
    return
  }
  if (isDragMode.value) {
    toggleIsDragMode(false)
  }
  if (globalState.isGuideMode || globalState.isSettingDrawerVisible) {
    return
  }
  if (!state.isMenuVisible) {
    openMenu(e)
    return
  }
  state.isMenuVisible = false
  setTimeout(() => {
    openMenu(e)
  }, 200)
}

document.oncontextmenu = handleContextMenu
</script>

<template>
  <NDropdown
    placement="bottom-start"
    trigger="manual"
    :show="state.isMenuVisible"
    :x="state.posX"
    :y="state.posY"
    :options="menuList"
    @clickoutside="onClickoutside"
    @select="onSelectMenu"
  />
</template>

<style>
/* ============================================================
   Right-click Context Menu — Enhanced Visual Quality

   【主题变量】由 JS 层（applyDropdownThemeVars）响应式注入到 body，
   NDropdown 弹出层 teleport 到 body 后可直接继承这些 --dm-* 变量。
   颜色值来源：src/styles/const.ts → styleConst。

   【动画方案】Naive UI 内部用 <Transition name="popover-transition"> 控制
   弹出层显隐，对应 CSS 类为 .popover-transition-{enter|leave}-{active|from|to}。
   此处覆盖这些类以自定义动画曲线与时长：
     进入 0.18s：弹性曲线，scale 0.88→1 + fade-in
     退出 0.08s：ease-in 快速淡出，视觉上点击后立刻消失
   退出时长刻意短于进入，既保留弹出的动画质感，又消除点击后的卡顿感。
   ============================================================ */

/* ---- 菜单容器：毛玻璃 + 精细阴影 ---- */
.n-dropdown-menu {
  user-select: none;
  padding: 6px !important;
  border-radius: var(--radius-xl) !important;
  border: 1px solid var(--dm-border) !important;
  background: var(--dm-bg) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  box-shadow:
    0 8px 32px var(--dm-shadow-color),
    0 2px 8px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
}

/* ---- 覆盖 Naive UI 的 popover-transition，自定义进入/退出动画 ----
   Naive UI 用 Vue <Transition name="popover-transition"> 控制弹出层显隐，
   进入：scale(0.88)+fade-in 0.18s；退出：快速 0.08s fade-out，点击后立刻消失 */
.popover-transition-enter-active {
  transition:
    opacity 0.18s cubic-bezier(0.34, 1.1, 0.64, 1),
    transform 0.18s cubic-bezier(0.34, 1.1, 0.64, 1) !important;
}

.popover-transition-leave-active {
  transition:
    opacity 0.08s ease-in,
    transform 0.08s ease-in !important;
}

.popover-transition-enter-from {
  opacity: 0 !important;
  transform: scale(0.88) translateY(-4px) !important;
}

.popover-transition-enter-to {
  opacity: 1 !important;
  transform: scale(1) translateY(0) !important;
}

.popover-transition-leave-from {
  opacity: 1 !important;
  transform: scale(1) translateY(0) !important;
}

.popover-transition-leave-to {
  opacity: 0 !important;
  transform: scale(0.94) translateY(-2px) !important;
}

/* ---- 菜单项整体行 ---- */
.n-dropdown-option {
  border-radius: var(--radius-md) !important;
  transition: background var(--transition-fast) !important;
}

/* ---- 菜单项 body ---- */
.n-dropdown-option-body {
  height: 34px !important;
  padding: 0 10px !important;
  border-radius: var(--radius-md) !important;
  transition: background var(--transition-fast) !important;
}

/* ---- 悬停高亮：纯背景，不用 inset shadow 避免被裁剪 ---- */
.n-dropdown-option-body:hover,
.n-dropdown-option-body--pending {
  background: var(--dm-hover-bg) !important;
}

/* ---- 标签文字 ---- */
.n-dropdown-option-body__label {
  font-size: var(--text-base) !important;
  font-weight: 450;
  color: var(--dm-text) !important;
  letter-spacing: 0.15px;
}

/* ---- 图标前缀 ---- */
.n-dropdown-option-body__prefix {
  z-index: 2;
  display: flex;
  align-items: center;
  width: 20px !important;
  min-width: 20px !important;
  margin-right: 10px !important;
  color: var(--dm-icon) !important;
  font-size: 16px !important;
  transition: color var(--transition-fast) !important;
}

/* ---- 悬停时图标提亮 ---- */
.n-dropdown-option-body:hover .n-dropdown-option-body__prefix,
.n-dropdown-option-body--pending .n-dropdown-option-body__prefix {
  color: var(--dm-icon-hover) !important;
}

/* ---- disabled 项 ---- */
.n-dropdown-option--disabled .n-dropdown-option-body__label,
.n-dropdown-option--disabled .n-dropdown-option-body__prefix {
  opacity: 0.3 !important;
}
.n-dropdown-option--disabled .n-dropdown-option-body:hover {
  background: transparent !important;
}

/* ---- 删除项：危险色 ---- */
.dropdown-option--danger .n-dropdown-option-body__label {
  color: var(--dm-danger-text) !important;
}
.dropdown-option--danger .n-dropdown-option-body__prefix {
  color: var(--dm-danger-icon) !important;
}
.dropdown-option--danger .n-dropdown-option-body:hover {
  background: var(--dm-danger-hover) !important;
}
.dropdown-option--danger .n-dropdown-option-body:hover .n-dropdown-option-body__prefix {
  color: var(--dm-danger-text) !important;
}

/* ---- 分割线 ---- */
.n-dropdown-divider {
  margin: 5px 6px !important;
  background: var(--dm-divider) !important;
  height: 1px !important;
}
</style>
