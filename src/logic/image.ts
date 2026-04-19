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

export const imageState = reactive({
  currBackgroundImageFileName: '',
  currBackgroundImageFileObjectURL: '',
})

const localBingList = ref<TImage.BaseImageItem[]>([])

const getLocalBingList = async () => {
  // 本地文件内容固定，只加载一次
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
      }
    }

    requestIdleCallback(processBatch)
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

export const isImageListLoading = ref(false)

const getBingImageList = async () => {
  try {
    isImageListLoading.value = true
    const data = await getBingImagesData()
    isImageListLoading.value = false
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
    isImageListLoading.value = false
  }
}

const getPexelsImageList = async () => {
  try {
    isImageListLoading.value = true
    const currentPage = imageLocalState.value.pexels.currentPage || 1
    const data = await getPexelsImagesData({
      page: currentPage,
      per_page: 80,
    })
    isImageListLoading.value = false
    imageLocalState.value.pexels.syncTime = dayjs().valueOf()
    const newList = data.photos.map((item: TImage.PexelsImageItem) => ({
      name: `${item.id}`,
      desc: `${item.alt} (${item.photographer})`,
    }))
    imageLocalState.value.pexels.list.push(...newList)
    imageLocalState.value.pexels.currentPage = currentPage + 1
    log('Image update PexelsImageList, page:', currentPage, 'added:', newList.length)
  } catch (e) {
    isImageListLoading.value = false
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

const getCurrNetworkBackgroundImageUrl = (applyToAppearanceCode = localState.value.currAppearanceCode) => {
  let imageUrl = ''
  const quality: TImage.quality = localConfig.general.backgroundImageHighQuality ? 'high' : 'medium'
  if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.NETWORK) {
    // 网络
    if (localConfig.general.isBackgroundImageCustomUrlEnabled) {
      imageUrl = localConfig.general.backgroundImageCustomUrls[applyToAppearanceCode]
    } else {
      imageUrl = getImageUrlFromName(
        localConfig.general.backgroundNetworkSourceType,
        localConfig.general.backgroundImageNames && localConfig.general.backgroundImageNames[applyToAppearanceCode],
        quality,
      )
    }
  } else if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.BING_PHOTO) {
    // bing每日一图
    const todayImage = imageLocalState.value.bing.list[0]
    const name = todayImage?.name
    imageUrl = name ? getBingImageUrlFromName(name, quality) : ''
  }
  return imageUrl
}

export const isImageLoading = ref(false)

/**
 * 下载当前壁纸
 * 根据 backgroundImageSource 区分本地/网络/每日一图来源
 */
export const downloadCurrentWallpaper = async () => {
  if (!localConfig.general.isBackgroundImageEnabled) return

  const quality: TImage.quality = localConfig.general.backgroundImageHighQuality ? 'high' : 'medium'

  // 来源=0：本地上传，从 DB 取 ObjectURL
  if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL) {
    const objectUrl = imageState.currBackgroundImageFileObjectURL
    const filename = imageState.currBackgroundImageFileName || 'wallpaper.jpg'
    if (!objectUrl) return
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    link.click()
    return
  }

  // 来源=1或2：网络/每日一图，构造 URL
  const appearanceCode = localState.value.currAppearanceCode
  let url = ''
  if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.NETWORK) {
    if (localConfig.general.isBackgroundImageCustomUrlEnabled) {
      url = localConfig.general.backgroundImageCustomUrls[appearanceCode]
    } else {
      const name = localConfig.general.backgroundImageNames && localConfig.general.backgroundImageNames[appearanceCode]
      url = getImageUrlFromName(localConfig.general.backgroundNetworkSourceType, name, quality)
    }
  } else if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.BING_PHOTO) {
    const todayImage = imageLocalState.value.bing.list[0]
    const name = todayImage && todayImage.name
    url = name ? getImageUrlFromName(IMAGE_NETWORK_SOURCE.BING, name, quality) : ''
  }

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

const renderRawBackgroundImage = async () => {
  const start = performance.now()
  isImageLoading.value = true
  // 记录本次请求的目标外观码
  const targetAppearanceCode = localState.value.currAppearanceCode
  pendingAppearanceCode = targetAppearanceCode
  try {
    let dbData: TImage.BackgroundImageItem | null = null
    const storeName = localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL ? 'localBackgroundImages' : 'currBackgroundImages'
    dbData = await databaseStore(storeName, 'get', targetAppearanceCode)
    if (!dbData) {
      if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL) {
        // 首次选择 backgroundImageSource=0本地 时无数据，直接退出
        imageState.currBackgroundImageFileObjectURL = ''
        isImageLoading.value = false
        return
      }
      // 来源为网络、每日一图时，自动在DB内新增当前背景图数据
      const imageUrl = getCurrNetworkBackgroundImageUrl(targetAppearanceCode)
      // 存储背景图数据
      const targetFile = await urlToFile(imageUrl, imageUrl)
      const smallBase64 = await compressedImageUrlToBase64(imageUrl)
      dbData = {
        appearanceCode: targetAppearanceCode,
        file: targetFile,
        smallBase64,
      }
      // 使用 put（upsert）而非 add，避免同一 appearanceCode 已存在时抛出 ConstraintError
      databaseStore('currBackgroundImages', 'put', dbData)
      localStorage.setItem('l-firstScreen', smallBase64)
      // 每日一图，需要同时设置深色&浅色外观为同一张壁纸
      if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.BING_PHOTO) {
        databaseStore('currBackgroundImages', 'put', {
          ...dbData,
          appearanceCode: +!targetAppearanceCode,
        })
      }
    }
    // 如果在等待期间用户切换了主题，丢弃本次加载
    if (pendingAppearanceCode !== targetAppearanceCode) {
      return
    }
    imageState.currBackgroundImageFileName = localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL ? dbData.file.name : ''
    const rawBlobUrl = URL.createObjectURL((dbData as TImage.BackgroundImageItem).file)
    const rawImageEle = new Image()
    rawImageEle.src = rawBlobUrl
    // decode() 让浏览器提前解码，避免赋值时的渲染卡顿
    rawImageEle.decode().then(() => {
      // 过期回调：用户已切换主题，释放资源并放弃更新
      if (pendingAppearanceCode !== targetAppearanceCode) {
        URL.revokeObjectURL(rawBlobUrl)
        return
      }
      imageState.currBackgroundImageFileObjectURL = rawBlobUrl
      isImageLoading.value = false
      const elapsed = (performance.now() - start).toFixed(2)
      console.log(`RenderRawImage: ${elapsed}ms`)
    }).catch(() => {
      // decode 失败（如图片损坏），回退到直接赋值
      if (pendingAppearanceCode !== targetAppearanceCode) {
        URL.revokeObjectURL(rawBlobUrl)
        return
      }
      imageState.currBackgroundImageFileObjectURL = rawBlobUrl
      isImageLoading.value = false
    })
  } catch (e) {
    console.error('renderRawBackgroundImage error:', e)
    isImageLoading.value = false
  }
}

const setCurrSmallBackgroundImage = async () => {
  let dbData: TImage.BackgroundImageItem | null = null
  const storeName = localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL ? 'localBackgroundImages' : 'currBackgroundImages'
  dbData = await databaseStore(storeName, 'get', localState.value.currAppearanceCode)
  if (!dbData) {
    return
  }
  localStorage.setItem('l-firstScreen', dbData.smallBase64)
}

const deleteCurrSmallBackgroundImage = () => {
  localStorage.setItem('l-firstScreen', '')
}

const deleteCurrRawBackgroundImageInDB = async () => {
  await databaseStore('currBackgroundImages', 'delete', localState.value.currAppearanceCode)
  await databaseStore('currBackgroundImages', 'delete', +!localState.value.currAppearanceCode)
}

const refreshTodayImage = async () => {
  const oldTodayImage = imageLocalState.value.bing.list[0]?.name
  await updateBingImages()
  const newTodayImage = imageLocalState.value.bing.list[0]?.name
  if (newTodayImage !== oldTodayImage) {
    await deleteCurrRawBackgroundImageInDB()
  }
  renderRawBackgroundImage()
}

export const initBackgroundImage = () => {
  // 渲染缩略图
  const localImage = localStorage.getItem('l-firstScreen') || ''
  if (localImage) {
    imageState.currBackgroundImageFileObjectURL = localImage
  }
  // 渲染原图
  if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.BING_PHOTO) {
    refreshTodayImage()
  } else {
    renderRawBackgroundImage()
  }
}

//  不涉及资源变化，直接从DB取
watch([() => localState.value.currAppearanceCode], async () => {
  if (!localConfig.general.isBackgroundImageEnabled) {
    return
  }
  deleteCurrSmallBackgroundImage()
  setCurrSmallBackgroundImage()
  renderRawBackgroundImage()
})

// 涉及资源变化
watch(
  [
    () => localConfig.general.backgroundImageSource,
    () => localConfig.general.backgroundImageNames,
    () => localConfig.general.backgroundImageHighQuality,
    () => localConfig.general.isBackgroundImageCustomUrlEnabled,
    () => localConfig.general.backgroundImageCustomUrls,
  ],
  async () => {
    if (!localConfig.general.isBackgroundImageEnabled) {
      return
    }
    deleteCurrSmallBackgroundImage()
    // 背景图来源为本地，需要独立存储预览图
    if (localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL) {
      setCurrSmallBackgroundImage()
    }
    await deleteCurrRawBackgroundImageInDB()
    renderRawBackgroundImage()
  },
  {
    deep: true,
  },
)
