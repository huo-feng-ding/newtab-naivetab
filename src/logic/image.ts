import { useStorageLocal } from '@/composables/useStorageLocal'
import { getBingImagesData, getPexelsImagesData } from '@/api'
import { log, urlToFile, compressedImageUrlToBase64, downloadImageByUrl } from '@/logic/util'
import { databaseStore } from '@/logic/database'
import { localConfig, localState } from '@/logic/store'
import { IMAGE_NETWORK_SOURCE, BACKGROUND_IMAGE_SOURCE } from '@/logic/constants/image'
import type { ImageNetworkSource } from '@/logic/constants/image'

const BING_QUALITY_MAP = {
  low: '1366x768',
  medium: '1920x1080',
  high: 'UHD',
}

const PEXELS_QUALITY_MAP = {
  low: '&h=192&w=341',
  medium: '&h=1080&w=1920',
  high: '', // 不加参数为原图
}

// cn.bing.com//th?id=OHR.YurisNight_ZH-CN5738817931_1366x768.jpg
const getBingImageUrlFromName = (name: string, quality = 'low' as TImage.quality): string => {
  return `https://cn.bing.com/th?id=OHR.${name}_${BING_QUALITY_MAP[quality]}.jpg`
}

// images.pexels.com/photos/19065473/pexels-photo-19065473.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=768&w=1366
const getPexelsImageUrlFromName = (name: string, quality = 'low' as TImage.quality): string => {
  return `https://images.pexels.com/photos/${name}/pexels-photo-${name}.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop${PEXELS_QUALITY_MAP[quality]}`
}

export const getImageUrlFromName = (networkSourceType: ImageNetworkSource, name: string, quality = 'low' as TImage.quality) => {
  if (networkSourceType === IMAGE_NETWORK_SOURCE.BING) {
    return getBingImageUrlFromName(name, quality)
  }
  if (networkSourceType === IMAGE_NETWORK_SOURCE.PEXELS) {
    return getPexelsImageUrlFromName(name, quality)
  }
  return ''
}

/**
 * 背景图系统架构说明
 *
 * ## 三种图片来源
 * - LOCAL (0): 用户本地上传，存储在 IndexedDB 'localBackgroundImages' 表
 * - NETWORK (1): 网络来源（Bing/Pexels 图库或自定义 URL），存储在 'currBackgroundImages' 表
 * - BING_PHOTO (2): Bing 每日一图，自动同步双外观（浅色/深色），存储在 'currBackgroundImages' 表
 *
 * ## 大小图分离策略
 * - 小图（压缩 base64）→ 存 localStorage 'l-firstScreen'，同步读取，首屏秒开
 * - 大图（原始 File）→ 存 IndexedDB，异步 decode 后以 blob URL 渲染
 *
 * ## 双层渲染机制（BackgroundImg.vue）
 * - background__container: 显示 previewImageUrl（小图），立即渲染不白屏
 * - background__blob: 显示 fullImageUrl（大图），decode 完成后 opacity 淡入覆盖，无闪烁
 *
 * ## 切换守卫
 * - pendingAppearanceCode: 快速切换主题时丢弃过期的 decode 回调，防止显示错误图片
 */

export const imageLocalState = useStorageLocal('data-images', {
  bing: {
    syncTime: 0,
    list: [] as TImage.BaseImageItem[],
  },
  pexels: {
    syncTime: 0,
    list: [] as TImage.BaseImageItem[],
    currentPage: 1,
  },
})

/**
 * 首屏秒开：同步读取 localStorage 中的压缩小图 base64，
 * 在 Vue 挂载前即可恢复背景图，避免 IndexedDB 异步打开导致的白屏闪烁。
 */
const firstScreenPreviewImageUrl = localStorage.getItem('l-firstScreen') || ''

export const imageState = reactive({
  /** 当前背景图文件名（仅本地上传来源有值，用于 setting 面板展示） */
  currBackgroundImageFileName: '',
  /** 首屏预览图 URL（base64 小图），模块初始化时同步读取 localStorage，后续被 DB 数据覆盖 */
  previewImageUrl: firstScreenPreviewImageUrl,
  /** 高清大图 URL（blob URL），decode 完成后由 BackgroundImg.vue 控制淡入时机 */
  fullImageUrl: '',
})

// 注意：previewImageUrl 初始化时从 localStorage 读取的可能是旧来源的 base64/blob URL。
// 这不是 bug：blob URL 在页面刷新后自动失效，decode 失败后 fullImageUrl 会被正确赋值为新来源；
// base64 小图即使来自旧来源也不会导致功能异常，很快会被 DB 数据覆盖。
// 若旧来源恰好是 LOCAL 且 localStorage 仍有有效 base64，反而能加速首屏渲染。

const localBingList = ref<TImage.BaseImageItem[]>([])

const getLocalBingList = async (): Promise<void> => {
  // 本地文件内容固定，只加载一次
  // 文件路径：extension/src/assets/bing-wallpaper.md（打包时注入）
  if (localBingList.value.length > 0) {
    return
  }
  try {
    const response = await fetch('/assets/bing-wallpaper.md')
    const text = await response.text()

    const lines = text.split('\n')
    const batchSize = 100
    let index = 0

    // 清空旧数据，避免重复累积
    localBingList.value = []

    return new Promise<void>((resolve) => {
      const processBatch = () => {
        const batch = lines.slice(index, index + batchSize)
        const processedBatch = batch
          .filter((line) => /^\d{4}-\d{2}-\d{2} \|/.test(line.trim()))
          .map((line) => {
            const nameMatch = line.match(/th\?id=OHR\.(.*?)_UHD\.jpg/)
            const name = nameMatch ? nameMatch[1] : ''
            const descMatch = line.match(/\[(.*?)\s*\(/)
            const desc = descMatch ? descMatch[1] : ''
            return {
              name,
              desc,
            }
          })
          .filter((item) => item.name && item.desc)

        localBingList.value.push(...processedBatch)
        index += batchSize
        if (index < lines.length) {
          requestIdleCallback(processBatch)
        } else {
          resolve()
        }
      }

      requestIdleCallback(processBatch)
    })
  } catch (e) {
    console.error(e)
  }
}

export const previewImageListMap = computed(() => ({
  favorite: localConfig.general.favoriteImageList,
  bing: [...imageLocalState.value.bing.list, ...localBingList.value].map((item) => ({
    ...item,
    networkSourceType: IMAGE_NETWORK_SOURCE.BING,
  })),
  pexels: imageLocalState.value.pexels.list.map((item) => ({
    ...item,
    networkSourceType: IMAGE_NETWORK_SOURCE.PEXELS,
  })),
}))

export const isImageGalleryLoading = ref(false)

const getBingImageList = async () => {
  try {
    isImageGalleryLoading.value = true
    const data = await getBingImagesData()
    isImageGalleryLoading.value = false
    imageLocalState.value.bing.syncTime = dayjs().valueOf()
    imageLocalState.value.bing.list = data.images.map((item: TImage.BingImageItem) => {
      const name = item.urlbase.split('OHR.')[1]
      return {
        name,
        desc: item.copyright,
      }
    })
    log('Image update BingImageList')
  } catch (e) {
    isImageGalleryLoading.value = false
  }
}

const getPexelsImageList = async () => {
  try {
    isImageGalleryLoading.value = true
    const currentPage = imageLocalState.value.pexels.currentPage || 1
    const data = await getPexelsImagesData({
      page: currentPage,
      per_page: 80,
    })
    isImageGalleryLoading.value = false
    imageLocalState.value.pexels.syncTime = dayjs().valueOf()
    const newList = data.photos.map((item: TImage.PexelsImageItem) => ({
      name: `${item.id}`,
      desc: `${item.alt} (${item.photographer})`,
    }))
    imageLocalState.value.pexels.list.push(...newList)
    imageLocalState.value.pexels.currentPage = currentPage + 1
    log('Image update PexelsImageList, page:', currentPage, 'added:', newList.length)
  } catch (e) {
    isImageGalleryLoading.value = false
  }
}

export const updateBingImages = async () => {
  getLocalBingList()
  const currTS = dayjs().valueOf()
  // 最小刷新间隔为3小时
  if (currTS - imageLocalState.value.bing.syncTime <= 3600000 * 3) {
    return
  }
  await getBingImageList()
}

export const updatePexelsImages = async () => {
  const currTS = dayjs().valueOf()
  // 最小刷新间隔为3小时
  if (currTS - imageLocalState.value.pexels.syncTime <= 3600000 * 3) {
    return
  }
  // 重新同步时清空列表、重置为第1页
  imageLocalState.value.pexels.list = []
  imageLocalState.value.pexels.currentPage = 1
  await getPexelsImageList()
}

/** 返回当前背景图来源对应的 IndexedDB 表名 */
const getCurrBackgroundImageStoreName = (): DatabaseStore => {
  return localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL ? 'localBackgroundImages' : 'currBackgroundImages'
}

/**
 * 从 IndexedDB 获取当前来源对应 appearanceCode 的背景图数据
 */
const getCurrBackgroundImageFromDB = async (): Promise<TImage.BackgroundImageItem | null> => {
  const storeName = getCurrBackgroundImageStoreName()
  return databaseStore(storeName, 'get', localState.value.currAppearanceCode) as Promise<TImage.BackgroundImageItem | null>
}

/**
 * 根据当前配置构建背景图 URL（网络 / 每日一图 / 自定义 URL）
 * @param applyToAppearanceCode 目标外观码（浅色 0 / 深色 1）
 * @param quality 图片质量
 */
const buildBackgroundImageUrl = (applyToAppearanceCode: number, quality: TImage.quality): string => {
  if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.NETWORK) {
    if (localConfig.general.isBackgroundImageCustomUrlEnabled) {
      return localConfig.general.backgroundImageCustomUrls[applyToAppearanceCode]
    }
    const name = localConfig.general.backgroundImageNames?.[applyToAppearanceCode]
    if (!name) return ''
    return getImageUrlFromName(localConfig.general.backgroundNetworkSourceType, name, quality)
  }
  if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.BING_PHOTO) {
    const todayImage = imageLocalState.value.bing.list[0]
    const name = todayImage?.name
    return name ? getBingImageUrlFromName(name, quality) : ''
  }
  return ''
}

const getCurrNetworkBackgroundImageUrl = (applyToAppearanceCode = localState.value.currAppearanceCode): string => {
  const quality: TImage.quality = localConfig.general.backgroundImageHighQuality ? 'high' : 'medium'
  return buildBackgroundImageUrl(applyToAppearanceCode, quality)
}

export const isImageLoading = ref(false)

/**
 * 下载当前壁纸
 * 根据 backgroundImageSource 区分本地/网络/每日一图来源
 */
export const downloadCurrentWallpaper = async () => {
  if (!localConfig.general.isBackgroundImageEnabled) return

  const quality: TImage.quality = localConfig.general.backgroundImageHighQuality ? 'high' : 'medium'

  // 来源=0：本地上传，从 DB 重新创建 ObjectURL 用于下载（ObjectURL 刷新后失效，不能依赖 previewImageUrl）
  if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL) {
    const appearanceCode = localState.value.currAppearanceCode
    const dbData = await databaseStore('localBackgroundImages', 'get', appearanceCode) as TImage.BackgroundImageItem | null
    if (!dbData || !dbData.file) return
    const objectUrl = URL.createObjectURL(dbData.file)
    const filename = dbData.file.name || imageState.currBackgroundImageFileName || 'wallpaper.jpg'
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    link.click()
    URL.revokeObjectURL(objectUrl)
    return
  }

  // 来源=1或2：网络/每日一图，构造 URL
  const url = buildBackgroundImageUrl(localState.value.currAppearanceCode, quality)

  if (!url) return

  // 从 URL 中提取文件名
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
  } catch {
    // noop
  }

  await downloadImageByUrl(url, filename)
}

/** 记录当前正在加载的图片所属外观码，用于在快速切换主题时丢弃过期回调 */
let pendingAppearanceCode: number | null = null

/** 释放旧的 blob URL，避免内存泄漏 */
const revokeOldBlobUrl = () => {
  if (imageState.fullImageUrl && imageState.fullImageUrl.startsWith('blob:')) {
    URL.revokeObjectURL(imageState.fullImageUrl)
  }
}

/**
 * 从网络下载图片并存入 IndexedDB（网络来源首次访问时调用）
 * - BING_PHOTO 来源会同时写入两个 appearanceCode（强制双外观同步）
 */
const downloadAndStoreNetworkImage = async (appearanceCode: typeof localState.value.currAppearanceCode): Promise<TImage.BackgroundImageItem | null> => {
  const imageUrl = getCurrNetworkBackgroundImageUrl(appearanceCode)
  if (!imageUrl) return null
  const file = await urlToFile(imageUrl, imageUrl)
  const smallBase64 = await compressedImageUrlToBase64(imageUrl)
  const dbData: TImage.BackgroundImageItem = {
    appearanceCode,
    file,
    smallBase64,
  }
  await databaseStore('currBackgroundImages', 'put', dbData)
  // 每日一图：同时写入另一外观码
  if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.BING_PHOTO) {
    await databaseStore('currBackgroundImages', 'put', { ...dbData, appearanceCode: +!appearanceCode })
  }
  return dbData
}

/**
 * 渲染原始背景图（核心方法）
 *
 * 流程：
 * 1. 从 IndexedDB 读取对应来源、对应 appearanceCode 的图片数据
 * 2. 若 DB 无数据（网络来源首次访问），则从 URL 下载 → 压缩 → 写入 DB
 * 3. 创建 ObjectURL → new Image() → decode() 预解码
 * 4. decode 成功 → 赋值 imageState.fullImageUrl（由组件控制 CSS opacity 淡入）
 * 5. decode 失败 → 直接赋值 blob URL 回退
 *
 * 关键设计：
 * - pendingAppearanceCode 守卫：等待期间用户切换主题时丢弃本次结果
 * - 同步 smallBase64 到 localStorage：确保下次刷新首屏能秒开
 */
export const renderRawBackgroundImage = async () => {
  const start = performance.now()
  isImageLoading.value = true
  const targetAppearanceCode = localState.value.currAppearanceCode
  pendingAppearanceCode = targetAppearanceCode
  try {
    let dbData = await getCurrBackgroundImageFromDB()
    if (!dbData) {
      if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL) {
        imageState.previewImageUrl = ''
        revokeOldBlobUrl()
        imageState.fullImageUrl = ''
        isImageLoading.value = false
        return
      }
      // 网络 / 每日一图首次访问：下载并缓存
      dbData = await downloadAndStoreNetworkImage(targetAppearanceCode)
      if (!dbData) {
        isImageLoading.value = false
        return
      }
    }
    if (pendingAppearanceCode !== targetAppearanceCode) return

    imageState.currBackgroundImageFileName = localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL ? dbData.file.name : ''
    const blobUrl = URL.createObjectURL(dbData.file)

    const img = new Image()
    img.src = blobUrl
    img.decode().then(() => {
      if (pendingAppearanceCode !== targetAppearanceCode) {
        URL.revokeObjectURL(blobUrl)
        return
      }
      revokeOldBlobUrl()
      imageState.fullImageUrl = blobUrl
      localStorage.setItem('l-firstScreen', dbData.smallBase64)
      isImageLoading.value = false
      console.log(`RenderRawImage: ${(performance.now() - start).toFixed(2)}ms`)
    }).catch(() => {
      if (pendingAppearanceCode !== targetAppearanceCode) {
        URL.revokeObjectURL(blobUrl)
        return
      }
      revokeOldBlobUrl()
      imageState.fullImageUrl = blobUrl
      isImageLoading.value = false
    })
  } catch (e) {
    console.error('renderRawBackgroundImage error:', e)
    isImageLoading.value = false
  }
}

const deleteCurrRawBackgroundImageInDB = async () => {
  await databaseStore('currBackgroundImages', 'delete', localState.value.currAppearanceCode)
  await databaseStore('currBackgroundImages', 'delete', +!localState.value.currAppearanceCode)
}

const refreshTodayImage = async () => {
  const oldTodayImage = imageLocalState.value.bing.list[0]?.name
  await updateBingImages()
  const newTodayImage = imageLocalState.value.bing.list[0]?.name
  // updateBingImages 内部有 3 小时缓存判断，若未过期则不会刷新 API，
  // 此时 newTodayImage === oldTodayImage，不会误删缓存，行为正确。
  if (newTodayImage !== oldTodayImage) {
    await deleteCurrRawBackgroundImageInDB()
  }
  renderRawBackgroundImage()
}

/**
 * 存储用户本地上传的背景图（统一入口）
 *
 * 流程：
 * 1. 压缩生成 smallBase64 → 写入 localStorage 首屏秒开
 * 2. 写入 localBackgroundImages DB（当前 appearanceCode）
 * 3. 若另一外观码无数据，自动同步相同图片（双外观一致）
 * 4. 触发大图渲染
 */
export const storeLocalBackgroundImage = async (file: File) => {
  // 释放旧的 ObjectURL（仅 blob: 协议需要 revoke）
  if (imageState.previewImageUrl && imageState.previewImageUrl.startsWith('blob:')) {
    URL.revokeObjectURL(imageState.previewImageUrl)
  }
  const imageUrl = URL.createObjectURL(file)
  imageState.currBackgroundImageFileName = file.name
  imageState.previewImageUrl = imageUrl
  const smallBase64 = await compressedImageUrlToBase64(imageUrl)
  localStorage.setItem('l-firstScreen', smallBase64)
  // store DB — put 是 upsert，不存在时插入、存在时更新
  await databaseStore('localBackgroundImages', 'put', {
    appearanceCode: localState.value.currAppearanceCode,
    file,
    smallBase64,
  })
  // 当只单独设置了浅色或深色外观时，默认同步另一外观为相同的背景
  const oppositeAppearanceImage = await databaseStore('localBackgroundImages', 'get', +!localState.value.currAppearanceCode)
  if (!oppositeAppearanceImage) {
    await databaseStore('localBackgroundImages', 'put', {
      appearanceCode: +!localState.value.currAppearanceCode,
      file,
      smallBase64,
    })
  }
  // 触发大图渲染
  renderRawBackgroundImage()
}

/**
 * 初始化背景图（应用启动时调用）
 *
 * 1. 优先从 localStorage 'l-firstScreen' 同步读取小图（模块加载时已执行，此处为 DB 数据覆盖）
 * 2. 从 IndexedDB 读取对应来源的 DB 数据，若有 smallBase64 则覆盖 previewImageUrl 并同步到 localStorage
 * 3. 根据来源加载大图：
 *    - BING_PHOTO → refreshTodayImage()（先检查今日图片是否更新，更新则删除旧缓存再加载）
 *    - 其他 → renderRawBackgroundImage()
 */
export const initBackgroundImage = async () => {
  // 渲染缩略图：仅在当前来源的 DB 有数据时才设置，避免显示过期图片导致闪烁
  if (localConfig.general.isBackgroundImageEnabled) {
    const dbData = await getCurrBackgroundImageFromDB()
    if (dbData && dbData.smallBase64) {
      imageState.previewImageUrl = dbData.smallBase64
      localStorage.setItem('l-firstScreen', dbData.smallBase64)
    }
  }
  // 渲染原图
  if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.BING_PHOTO) {
    refreshTodayImage()
  } else {
    renderRawBackgroundImage()
  }
}

// 不涉及资源变化，仅切换外观主题（浅色/深色），直接从 DB 取对应 appearanceCode 的数据
watch([() => localState.value.currAppearanceCode], async () => {
  if (!localConfig.general.isBackgroundImageEnabled) {
    return
  }
  renderRawBackgroundImage()
})

// 背景图开关：关闭时不执行（保留 imageState 缓存以便开启时立即显示），
// 开启时重新加载当前来源的图片，确保关闭期间切换的来源能正确生效。
watch(
  () => localConfig.general.isBackgroundImageEnabled,
  async (enabled) => {
    if (enabled) {
      renderRawBackgroundImage()
    }
  },
)

// 涉及资源变化：切换来源、更换网络图片、画质开关、自定义 URL 开关/地址
// 策略：删除旧来源对应 DB 数据 → 清理过期预览 → 重新加载新来源图片
// 注意：必须 deep: true —— backgroundImageNames/backgroundImageCustomUrls 是数组，
// 切换图片时通过 backgroundImageNames[index] = name 修改元素，无 deep 则 watch 不触发。
watch(
  [
    () => localConfig.general.backgroundImageSource,
    () => localConfig.general.backgroundImageNames,
    () => localConfig.general.backgroundImageHighQuality,
    () => localConfig.general.isBackgroundImageCustomUrlEnabled,
    () => localConfig.general.backgroundImageCustomUrls,
  ],
  async ([newSource], [oldSource]) => {
    if (!localConfig.general.isBackgroundImageEnabled) {
      return
    }
    // 首次触发时 oldSource 为 undefined，无需删除旧数据
    if (oldSource != null && oldSource !== BACKGROUND_IMAGE_SOURCE.LOCAL) {
      // 只删除网络缓存表（currBackgroundImages），不删除用户上传的本地图片（localBackgroundImages）
      // localBackgroundImages 是用户主动导入的持久数据，切换来源时应保留，否则切回本地时图片丢失
      await databaseStore('currBackgroundImages', 'delete', localState.value.currAppearanceCode)
      await databaseStore('currBackgroundImages', 'delete', +!localState.value.currAppearanceCode)
    }
    // 来源切换时：清理旧来源残留的预览图，避免短暂显示过期图片
    if (oldSource != null && newSource !== oldSource) {
      // 离开 LOCAL 来源时清空预览（预览图是旧来源的 blob URL，不应继续显示）
      if (oldSource === BACKGROUND_IMAGE_SOURCE.LOCAL) {
        imageState.previewImageUrl = ''
      }
    }
    // 来源为 LOCAL 时，从 DB 恢复 smallBase64，用于：
    //   1. 写入 localStorage（首屏秒开）
    //   2. 恢复 previewImageUrl（避免被其他来源覆盖的旧 localStorage 误导）
    // 一次 DB 查询，两处复用结果。
    if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL) {
      const dbData = await getCurrBackgroundImageFromDB()
      if (dbData?.smallBase64) {
        localStorage.setItem('l-firstScreen', dbData.smallBase64)
        imageState.previewImageUrl = dbData.smallBase64
      }
    }
    // 仅渲染当前 appearanceCode 对应的图片。
    // 另一外观的图片在用户切换主题时由 currAppearanceCode watch 触发加载（按需延迟加载），
    // 不必在此预加载，避免下载用户可能永远看不到的图片。
    renderRawBackgroundImage()
  },
  {
    deep: true,
  },
)
