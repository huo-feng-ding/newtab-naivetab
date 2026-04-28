import { isMacOS } from '@/env'
import { localConfig } from '@/logic/store'
import { EMPHASIS_ONE_KEYS, EMPHASIS_TWO_KEYS } from './keyboard-constants'
import * as layouts from './layouts'

// ── 布局注册表 ─────────────────────────────────────────────
const KEYBOARD_PRESETS: Record<string, TKeyboardDefinition> = layouts

// ── 当前键盘配置 ───────────────────────────────────────────

export const currKeyboardConfig = computed((): TKeyboardDefinition => {
  const preset =
    KEYBOARD_PRESETS[localConfig.keyboardCommon.keyboardType] ??
    KEYBOARD_PRESETS.key61

  const target = structuredClone(preset)

  try {
    // 统一注入强调键配置
    target.emphasisOneCodes = EMPHASIS_ONE_KEYS
    target.emphasisTwoCodes = EMPHASIS_TWO_KEYS

    // WKL 模式：移除最后一行的 Win 键
    if (localConfig.keyboardCommon.keyboardWklMode) {
      const maxY = Math.max(...target.keys.map((k) => k.y))
      target.keys = target.keys.filter(
        (k) => !(k.y === maxY && ['MetaLeft', 'MetaRight'].includes(k.code)),
      )
    } else {
      // macOS 修饰键交换（Option ↔ Command）
      if (isMacOS) {
        const maxY = Math.max(...target.keys.map((k) => k.y))
        const lastRowKeys = target.keys.filter((k) => k.y === maxY)
        const swap = (a: string, b: string) => {
          const keyA = lastRowKeys.find((k) => k.code === a)
          const keyB = lastRowKeys.find((k) => k.code === b)
          if (keyA && keyB) {
            const xA = keyA.x
            keyA.x = keyB.x
            keyB.x = xA
          }
        }
        swap('MetaLeft', 'AltLeft')
        swap('MetaRight', 'AltRight')
      }
    }

    // Space 键拆分变体：从 layout 的 spaceVariants 中读取配置并替换最后一行 Space 区域
    const { splitSpace } = localConfig.keyboardCommon
    if (splitSpace !== 'space1') {
      const variants = target.spaceVariants
      const variant =
        variants?.[
          splitSpace as keyof NonNullable<TKeyboardDefinition['spaceVariants']>
        ]
      if (variant) {
        const maxY = Math.max(...target.keys.map((k) => k.y))
        const spaceKey = target.keys.find(
          (k) => k.code === 'Space' && k.y === maxY,
        )
        if (spaceKey) {
          // 删除最后一行所有 Space 相关键
          target.keys = target.keys.filter(
            (k) =>
              !(
                k.y === maxY &&
                ['Space', 'SpaceSplit1', 'SpaceSplit2'].includes(k.code)
              ),
          )
          // 从 Space 原始 x 起点依次放置变体键
          let currentX = spaceKey.x
          for (const vKey of variant) {
            target.keys.push({
              code: vKey.code,
              x: currentX,
              y: maxY,
              w: vKey.w,
              h: 1,
            })
            currentX += vKey.w
          }
        }
      }
    }
  } catch (e) {
    console.error(e)
  }

  return target
})

export const keyboardCurrentModelAllKeyList = computed(() =>
  currKeyboardConfig.value.keys.map((k) => k.code),
)
