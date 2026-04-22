<script setup lang="ts">
/**
 * UrlBlacklistInput
 *
 * 通用域名黑名单输入组件，通过 v-model 双向绑定域名数组。
 * 可在 keyboardBookmark、keyboardCommand 等设置面板中复用。
 *
 * 使用示例：
 * ```vue
 * <UrlBlacklistInput v-model="localConfig.keyboardBookmark.urlBlacklist" />
 * <UrlBlacklistInput v-model="localConfig.keyboardCommand.urlBlacklist" />
 * ```
 */

import { NDynamicTags } from 'naive-ui'
import Tips from '@/components/Tips.vue'

const model = defineModel<string[]>({ default: [] })

const MAX_TAG_COUNT = 20
const MAX_TAG_LENGTH = 100

const tipsContent = window.$t('generalSetting.urlBlacklistTips')

/**
 * 清理域名：去掉协议前缀、路径、参数、锚点，只保留域名（+端口），统一转小写
 */
const cleanUrl = (tag: string): string => {
  return tag
    .trim()
    .replace(/^https?:\/\//i, '') // 去掉协议前缀
    .replace(/[/?#].*$/, '') // 去掉路径、参数、锚点
    .replace(/\/+$/, '') // 去掉尾部斜杠
    .toLowerCase() // 域名不区分大小写
}

const handleUpdate = (value: string[]) => {
  const cleaned = value.map(cleanUrl).filter(Boolean)
  // 去重并保持原有顺序
  const deduped = [...new Set(cleaned)]
  if (deduped.length === value.length && deduped.every((v, i) => v === value[i])) {
    model.value = value
    return
  }
  model.value = deduped
}
</script>

<template>
  <div class="url-blacklist">
    <NDynamicTags
      :value="model"
      :max="MAX_TAG_COUNT"
      :check-str="
        (tag: string) => {
          if (tag.length > MAX_TAG_LENGTH) {
            return $t('generalSetting.urlBlacklistTooLong').replace('__max__', String(MAX_TAG_LENGTH))
          }
          return ''
        }
      "
      @update:value="handleUpdate"
    />
    <Tips :content="tipsContent" />
  </div>
</template>

<style scoped>
.url-blacklist {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

:deep(.n-tag) {
  max-width: 100%;
}

:deep(.n-tag .n-tag__content) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
