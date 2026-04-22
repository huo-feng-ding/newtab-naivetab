/**
 * 压缩/解压工具模块
 *
 * 纯函数，无 Vue/dom 依赖，Service Worker 和 newtab 都可用
 * 用于处理 chrome.storage.sync 中大配置的 gzip 压缩
 */

// 压缩数据前缀标记
export const COMPRESS_PREFIX = 'gzip:'
// 自动压缩阈值（超过此大小才压缩）
export const AUTO_COMPRESS_THRESHOLD = 4000

/**
 * 使用 gzip 压缩字符串，返回 base64 编码
 */
export const compressString = async (str: string): Promise<string> => {
  try {
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))
    const compressed = await new Response(stream).arrayBuffer()
    // base64 编码
    const bytes = new Uint8Array(compressed)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  } catch (e) {
    console.error('Compress failed', e)
    throw e
  }
}

/**
 * 解压 gzip 压缩的 base64 字符串
 */
export const decompressString = async (base64Str: string): Promise<string> => {
  try {
    // base64 解码
    const binary = atob(base64Str)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    // gzip 解压
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    const decompressed = await new Response(stream).arrayBuffer()
    return new TextDecoder().decode(decompressed)
  } catch (e) {
    console.error('Decompress failed', e)
    throw e
  }
}

/**
 * 解析存储的数据（自动处理压缩和非压缩格式）
 * @param rawData chrome.storage 中存储的原始字符串
 * @returns 解析后的 JSON 对象
 */
export const parseStoredData = async (rawData: string): Promise<SyncPayload> => {
  let jsonStr = rawData
  // 检查是否压缩格式
  if (rawData.startsWith(COMPRESS_PREFIX)) {
    const compressedData = rawData.slice(COMPRESS_PREFIX.length)
    jsonStr = await decompressString(compressedData)
  }
  return JSON.parse(jsonStr)
}

/**
 * 判断是否应该使用压缩
 * @param field 配置字段名
 * @param payloadBytes 数据字节数
 * @returns 是否需要压缩
 */
export const shouldCompress = (field: string, payloadBytes: number): boolean => {
  // 目前只有 keyboardBookmark 配置需要压缩
  if (field !== 'keyboardBookmark') return false
  return payloadBytes > AUTO_COMPRESS_THRESHOLD
}
