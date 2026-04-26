/**
 * Content Script 滚动容器查找与平滑滚动工具
 *
 * 从 contentScripts/index.ts 提取，供 CS 端命令执行器使用。
 * 优先返回 document.scrollingElement，如果它不可滚动则遍历 DOM 查
 * 算法灵感来自 Vimium C (github.com/gdh1995/vimium-c) 的 findScrollable
 */

/**
 * 查找页面上真正的滚动容器。
 * 优先返回 document.scrollingElement，如果它不可滚动则遍历 DOM 查找。
 */
const findScrollContainer = (): Element => {
  const scrollingEl = document.scrollingElement ?? document.documentElement
  // 如果 scrollingElement 本身有滚动空间，直接返回
  if (scrollingEl.scrollHeight > scrollingEl.clientHeight + 1) {
    return scrollingEl
  }

  // 从视口中心元素出发，向上查找有 overflow 且可滚动的祖先
  const centerEl = document.elementFromPoint(
    window.innerWidth / 2,
    window.innerHeight / 2,
  )
  if (centerEl) {
    let cur: Element | null = centerEl
    while (cur) {
      const style = window.getComputedStyle(cur)
      const overflowY = style.overflowY
      if (
        (overflowY === 'auto' ||
          overflowY === 'scroll' ||
          overflowY === 'overlay') &&
        cur.scrollHeight > cur.clientHeight + 1
      ) {
        return cur
      }
      cur = cur.parentElement
    }
  }

  // 兜底：遍历所有子元素，找面积最大的可见可滚动容器
  let best: Element | null = null
  let bestArea = 0
  const walk = (el: Element) => {
    try {
      const style = window.getComputedStyle(el)
      const overflowY = style.overflowY
      if (
        (overflowY === 'auto' ||
          overflowY === 'scroll' ||
          overflowY === 'overlay') &&
        el.scrollHeight > el.clientHeight + 1
      ) {
        const rect = el.getBoundingClientRect()
        const area = rect.width * rect.height
        if (area > bestArea && rect.width > 100 && rect.height > 100) {
          bestArea = area
          best = el
        }
      }
    } catch {
      /* cross-origin 等异常情况 */
    }
    for (const child of el.children) {
      walk(child)
    }
  }
  // 只遍历 body 下的直接子树，避免全 DOM 遍历太慢
  if (document.body) {
    for (const child of document.body.children) {
      walk(child)
    }
  }
  return best ?? scrollingEl
}

/** 缓存上次找到的滚动容器，提升后续调用性能 */
let cachedScrollContainer: Element | null = null

/**
 * 获取当前滚动容器（优先返回缓存，失效时重新查找）
 */
export const getScrollContainer = (): Element => {
  return (
    cachedScrollContainer ?? (cachedScrollContainer = findScrollContainer())
  )
}

/**
 * 使滚动容器缓存失效（在 DOM 结构变化或用户手动滚动后调用）
 */
export const invalidateScrollCache = () => {
  cachedScrollContainer = null
}

// 滚动结束后自动失效缓存，下次滚动时重新查找容器
// scrollend 事件：Chrome 77+ / Firefox 115+ / Safari 16+
document.addEventListener('scrollend', invalidateScrollCache, {
  capture: true,
  passive: true,
})

// 监听 DOM 变化：当页面结构变化（SPA 导航、动态加载）时使缓存失效
// 只关注 body 的子树增减和 class/style 属性变化
const scrollCacheObserver = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (
      m.type === 'childList' ||
      m.attributeName === 'class' ||
      m.attributeName === 'style'
    ) {
      invalidateScrollCache()
      break
    }
  }
})
if (document.body) {
  scrollCacheObserver.observe(document.body, {
    childList: true,
    subtree: false,
    attributes: true,
    attributeFilter: ['class', 'style'],
  })
}
document.addEventListener(
  'DOMContentLoaded',
  () => {
    if (document.body) {
      scrollCacheObserver.observe(document.body, {
        childList: true,
        subtree: false,
        attributes: true,
        attributeFilter: ['class', 'style'],
      })
    }
  },
  { once: true },
)

/**
 * 快速平滑滚动辅助函数（200ms，ease-out）。
 * 智能查找实际滚动容器，兼容 SPA / 内部滚动容器的页面。
 */
export const fastSmoothScrollTo = (targetY: number) => {
  const el = getScrollContainer()
  const startY = el.scrollTop
  const maxScroll = el.scrollHeight - el.clientHeight
  const clampedTarget = Math.max(0, Math.min(targetY, maxScroll))
  const delta = clampedTarget - startY
  if (delta === 0) return
  const duration = 200
  const startTime = performance.now()
  const step = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    // ease-out: 先快后慢
    const ease = 1 - (1 - progress) ** 3
    el.scrollTop = startY + delta * ease
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
