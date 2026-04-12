<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { requestPermission } from '@/logic/storage'
import { getBookmarkConfigName, getBookmarkConfigUrl, getDefaultBookmarkNameFromUrl } from '~/newtab/widgets/keyboard/logic'
import { getFaviconFromUrl } from '@/logic/bookmark'
import { localConfig, localState, customPrimaryColor } from '@/logic/store'
import { currKeyboardConfig } from '@/logic/keyboard'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import { KEYBOARD_URL_MAX_LENGTH, KEYBOARD_NAME_MAX_LENGTH } from '@/logic/constants/keyboard'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import KeyboardKeycapDisplay from '@/components/KeyboardKeycapDisplay.vue'
import BookmarkPicker from '@/components/BookmarkPicker.vue'

const props = withDefaults(
  defineProps<{
    mode?: 'setting' | 'popup'
  }>(),
  {
    mode: 'setting',
  },
)

// ── 键盘样式 ──────────────────────────────────────────────────────────────
const KEYCAP_BASE_SIZE = 30

const { getCustomLabel, getKeycapStageStyle, getKeycapTextStyle, getKeycapIconStyle, getEmphasisStyle, keycapCssVars } = useKeyboardStyle('px', KEYCAP_BASE_SIZE)

const keycapVisualType = computed(() => localConfig.keyboard.keycapType)
const isKeycapBorderEnabled = computed(() => localConfig.keyboard.isKeycapBorderEnabled)
const isCapKeyVisible = computed(() => localConfig.keyboard.isCapKeyVisible)
const isNameVisible = computed(() => localConfig.keyboard.isNameVisible)
const isFaviconVisible = computed(() => localConfig.keyboard.isFaviconVisible)
const isTactileBumpsVisible = computed(() => localConfig.keyboard.isTactileBumpsVisible)

// ── 表单状态 ──────────────────────────────────────────────────────────────
const state = reactive({
  keyCode: '',
  isBookmarkModalVisible: false,
  isBookmarkDragEnabled: true,
  currDragKeyCode: '',
  targetDragKeyCode: '',
})

// ── 选中键帽 ──────────────────────────────────────────────────────────────
const selectKey = (code: string) => {
  state.keyCode = code
  // 确保 keymap entry 存在，v-model 直接绑定不会报错
  if (!localConfig.keyboard.keymap[code]) {
    localConfig.keyboard.keymap[code] = { url: '', name: '' }
  }
}

// ── 键帽上的书签信息 ────────────────────────────────────────────────────
const getKeycapName = (code: string) => getBookmarkConfigName(code)

const getKeycapIconSrc = (code: string) => {
  const url = getBookmarkConfigUrl(code)
  return url ? getFaviconFromUrl(url) : ''
}

const getKeycapBookmarkType = (code: string) => {
  const url = getBookmarkConfigUrl(code)
  return url.length > 0 ? 'mark' : 'none'
}

// ── 删除书签 ──────────────────────────────────────────────────────────────
const onDeleteBookmark = () => {
  if (state.keyCode.length === 0) return
  delete localConfig.keyboard.keymap[state.keyCode]
  state.keyCode = ''
  window.$message?.success(`${window.$t('common.success')}`)
}

// ── 书签选择 ──────────────────────────────────────────────────────────────
const onOpenBookmarkPicker = async () => {
  const granted = await requestPermission('bookmarks')
  if (!granted) return
  state.isBookmarkModalVisible = true
}

const onSelectBookmark = (payload: { title: string, url?: string }) => {
  if (!state.keyCode) return
  // 确保 entry 存在
  if (!localConfig.keyboard.keymap[state.keyCode]) {
    localConfig.keyboard.keymap[state.keyCode] = { url: '', name: '' }
  }
  localConfig.keyboard.keymap[state.keyCode].url = (payload.url || '').slice(0, KEYBOARD_URL_MAX_LENGTH)
  localConfig.keyboard.keymap[state.keyCode].name = (payload.title || '').slice(0, KEYBOARD_NAME_MAX_LENGTH)
  state.isBookmarkModalVisible = false
}

// ── 键帽拖拽交换 ──────────────────────────────────────────────────────────
const handleDragStart = (code: string) => {
  state.currDragKeyCode = code
}

const handleDragOver = (e: Event, targetCode: string) => {
  e.preventDefault()
  state.targetDragKeyCode = targetCode
}

const handleDragEnd = () => {
  if (state.currDragKeyCode === state.targetDragKeyCode) return
  if (!localConfig.keyboard.keymap[state.currDragKeyCode]) return
  const targetData = localConfig.keyboard.keymap[state.targetDragKeyCode]
  localConfig.keyboard.keymap[state.targetDragKeyCode] = localConfig.keyboard.keymap[state.currDragKeyCode]
  if (targetData) {
    localConfig.keyboard.keymap[state.currDragKeyCode] = targetData
  } else {
    delete localConfig.keyboard.keymap[state.currDragKeyCode]
  }
  state.keyCode = state.targetDragKeyCode
  window.$message?.success(`${window.$t('common.success')}`)
}

// ── 渲染辅助 ──────────────────────────────────────────────────────────────
const primaryBorder = computed(() => customPrimaryColor.value.replace(/[\d.]+\)$/, '0.55)'))
</script>

<template>
  <BookmarkPicker
    v-model:show="state.isBookmarkModalVisible"
    width="60%"
    @select="onSelectBookmark"
  />

  <div
    class="bookmark-manager"
    :class="`bookmark-manager--${mode}`"
  >
    <!-- 键盘区域 -->
    <div class="manager__keyboard-wrap">
      <KeyboardLayout
        unit="px"
        :base-size="KEYCAP_BASE_SIZE"
        :rows="currKeyboardConfig.list"
        class="manager__keyboard"
      >
        <template #keycap="{ code }">
          <div
            class="manager__keycap-drag-wrap"
            :draggable="state.isBookmarkDragEnabled"
            @dragstart="handleDragStart(code)"
            @dragover="handleDragOver($event, code)"
            @dragend="handleDragEnd()"
          >
            <KeyboardKeycapDisplay
              :key-code="code"
              :label="getCustomLabel(code)"
              :name="getKeycapName(code)"
              :visual-type="keycapVisualType"
              :bookmark-type="getKeycapBookmarkType(code)"
              :icon-src="getKeycapIconSrc(code)"
              :stage-style="getKeycapStageStyle(code)"
              :text-style="getKeycapTextStyle(code)"
              :icon-style="getKeycapIconStyle(code)"
              :img-draggable="state.isBookmarkDragEnabled"
              :is-selected="code === state.keyCode"
              :is-border-enabled="isKeycapBorderEnabled"
              :show-cap-key="isCapKeyVisible"
              :show-name="isNameVisible"
              :show-favicon="isFaviconVisible"
              :show-tactile-bumps="isTactileBumpsVisible"
              :style="[keycapCssVars, getEmphasisStyle(code)]"
              @click="selectKey(code)"
            />
          </div>
        </template>
      </KeyboardLayout>
    </div>

    <!-- 表单区域 -->
    <div class="manager__form">
      <template v-if="state.keyCode && localConfig.keyboard.keymap[state.keyCode]">
        <div class="form__config">
          <div class="form__field form__field--url">
            <NInput
              v-model:value="localConfig.keyboard.keymap[state.keyCode].url"
              size="small"
              :placeholder="$t('keyboard.urlLabel')"
              :maxlength="KEYBOARD_URL_MAX_LENGTH"
              show-count
              clearable
              @input="localConfig.keyboard.keymap[state.keyCode].url = localConfig.keyboard.keymap[state.keyCode].url.replaceAll(' ', '')"
            />
          </div>

          <div class="form__field form__field--name">
            <NInput
              v-model:value="localConfig.keyboard.keymap[state.keyCode].name"
              size="small"
              :placeholder="getDefaultBookmarkNameFromUrl(localConfig.keyboard.keymap[state.keyCode].url) || $t('keyboard.nameLabel')"
              :maxlength="KEYBOARD_NAME_MAX_LENGTH"
              show-count
              clearable
              @input="localConfig.keyboard.keymap[state.keyCode].name = localConfig.keyboard.keymap[state.keyCode].name.trim()"
            />
          </div>

          <div class="form__field form__field--actions">
            <NButton
              quaternary
              size="small"
              class="action-btn"
              @click="onOpenBookmarkPicker"
            >
              <Icon :icon="ICONS.bookmarkPlus" />
            </NButton>

            <NPopconfirm @positive-click="onDeleteBookmark">
              <template #trigger>
                <NButton
                  quaternary
                  size="small"
                  class="action-btn"
                  :disabled="!state.keyCode || !getBookmarkConfigUrl(state.keyCode)"
                >
                  <Icon :icon="ICONS.deleteBin" />
                </NButton>
              </template>
              {{ $t('common.delete') }} {{ getCustomLabel(state.keyCode) }}？
            </NPopconfirm>
          </div>
        </div>
      </template>

      <div
        v-else
        class="form__placeholder"
      >
        {{ $t('keyboard.selectKeycapTip') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.bookmark-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;

  /* ── Form ── */
  .manager__form {
    padding: 15px 0 0 0;
    height: 75px;
    box-sizing: border-box;
    .form__config {
      display: flex;
      gap: 12px;
      .form__field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .form__field--url {
        flex: 1;
        min-width: 0;
      }

      .form__field--name {
        flex: 0 0 auto;
        width: 140px;
      }

      .form__field--actions {
        flex-direction: row;
        flex: 0 0 auto;
        align-self: flex-end;
      }
    }

    .form__placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--n-text-color-3);
      font-size: 13px;
      user-select: none;
    }
  }

  /* ── Keyboard ── */
  .manager__keyboard-wrap {
    display: flex;
    justify-content: center;
  }
  .manager__keyboard {
    cursor: pointer;
  }

  .manager__keycap-drag-wrap {
    width: 100%;
    height: 100%;
    transition: outline var(--transition-fast);
    outline: 2px solid transparent;
    outline-offset: 2px;
    border-radius: 4px;
  }

  .manager__keycap-drag-wrap:has(.keyboard-keycap-display--selected) {
    outline-color: v-bind(primaryBorder);
  }
}
</style>
