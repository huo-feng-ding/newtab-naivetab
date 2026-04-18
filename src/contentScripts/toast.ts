/**
 * Content Script 轻量级 Toast，用于命令执行后给用户视觉反馈。
 *
 * 运行在任意 HTTP/HTTPS 页面中，不依赖任何框架。
 * 使用唯一类名 + 最高 z-index 实现 CSS 隔离。
 */

const TOAST_CLASS = '__naivetab-toast'
let toastEl: HTMLDivElement | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

/**
 * CS 端轻量多语言。
 * CS 环境没有 Vue i18n，通过 navigator.language 自行推导。
 */
const MESSAGES = {
  'commandShortcut.toast.copyPageUrl': {
    'zh-CN': '已复制-页面URL',
    'en-US': 'Page URL copied',
  },
  'commandShortcut.toast.copyPageTitle': {
    'zh-CN': '已复制-页面标题',
    'en-US': 'Page title copied',
  },
}

/**
 * 简易 i18n。
 * @param key 文案 key，需与 locales/*.json 中的路径一致
 */
export function t(key: string): string {
  const entry = (MESSAGES as Record<string, Record<string, string>>)[key]
  if (!entry) return key
  const lang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'
  return entry[lang] ?? entry['en-US'] ?? key
}

/**
 * 显示 Toast
 * @param message 显示文字
 * @param duration 显示时长（ms），默认 1800
 */
export function showToast(message: string, duration = 1800) {
  // 清除上一个计时器
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  // 复用或创建元素
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.className = TOAST_CLASS
    Object.assign(toastEl.style, {
      position: 'fixed',
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%) translateY(-10px)',
      zIndex: '2147483647',
      padding: '8px 20px',
      borderRadius: '20px',
      background: 'rgba(20, 20, 20, 0.85)',
      color: '#fff',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      opacity: '0',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    })
    document.body.appendChild(toastEl)
    // 触发入场动画
    requestAnimationFrame(() => {
      if (toastEl) {
        toastEl.style.opacity = '1'
        toastEl.style.transform = 'translateX(-50%) translateY(0)'
      }
    })
  } else {
    // 已存在时先重置为隐藏状态，再重新动画，
    // 让重复触发时有视觉反馈（脉冲效果）
    toastEl.style.transition = 'none'
    toastEl.style.opacity = '0'
    toastEl.style.transform = 'translateX(-50%) translateY(-10px)'
    // 强制回流，使 transition 重置生效
    void toastEl.offsetHeight
    toastEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease'
    toastEl.style.opacity = '1'
    toastEl.style.transform = 'translateX(-50%) translateY(0)'
  }

  toastEl.textContent = message

  hideTimer = setTimeout(() => {
    if (toastEl) {
      toastEl.style.opacity = '0'
      toastEl.style.transform = 'translateX(-50%) translateY(-10px)'
    }
    hideTimer = null
  }, duration)
}
