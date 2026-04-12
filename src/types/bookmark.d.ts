type KeycapBookmarkType = 'none' | 'mark' | 'folder' | 'back'

type KeycapVisualType = 'gmk' | 'dsa' | 'flat'

interface KeyboardConfigItem {
  label?: string
  textAlign?: 'left' | 'center' | 'right'
  size: number
  alias?: string // LShift
  marginLeft?: number // default 0
  marginRight?: number // default 0
  marginBottom?: number // default 0
}

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode

interface TBookmarkEntry {
  url: string
  name: string
}

interface BookmarkItem {
  key: string
  url: string
  name?: string
}
