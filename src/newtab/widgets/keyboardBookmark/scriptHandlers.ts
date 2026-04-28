/**
 * 处理关闭当前标签页的脚本
 */
export const handleCloseCurrentTab = (): void => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.remove(tabs[0].id, () => {
        console.log(`标签页 ID ${tabs[0].id} 已关闭`)
      })
    }
  })
}

/**
 * 处理搜索框获取焦点的脚本
 * @param e 键盘事件或鼠标事件
 * @param keyboardState 键盘状态
 */
export const handleSearchFocus = (
  e: KeyboardEvent | MouseEvent,
  keyboardState: { currSelectKeyCode: string },
): void => {
  e.preventDefault() // 禁止输入框中有英文快捷键输入
  keyboardState.currSelectKeyCode = ''
  const searchInput = window.document.querySelector('.n-input__input-el')
  if (searchInput) {
    searchInput.focus()
  }
}

/**
 * 处理特殊脚本执行
 * @param url 要执行的URL
 * @param e 键盘事件或鼠标事件
 * @param keyboardState 键盘状态
 * @returns 是否处理了该脚本
 */
/**
 * 处理特殊脚本执行
 * @param url - 要执行的URL
 * @param e - 键盘事件或鼠标事件
 * @param keyboardState - 键盘状态对象
 * @returns 是否处理了该脚本，true表示已处理，false表示不是特殊脚本
 */
export const handleSpecialScript = (
  url: string,
  e: KeyboardEvent | MouseEvent,
  keyboardState: { currSelectKeyCode: string },
): boolean => {
  if (url.startsWith('script://CloseCurrentTab')) {
    handleCloseCurrentTab()
    return true
  }

  if (url.startsWith('script://SearchFocus')) {
    handleSearchFocus(e, keyboardState)
    return true
  }

  return false
}
