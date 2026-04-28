import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT = path.resolve(__dirname, '..')
const OUTPUT = path.resolve(ROOT, 'dist', 'naivetab-source.zip')

// 确保输出目录存在
const distDir = path.resolve(ROOT, 'dist')
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

// 排除的目录和文件
const EXCLUDE_PATTERNS = [
  'docs',
  'site',
  'node_modules',
  'extension-chrome',
  'extension-firefox',
  'dist',
  '.git',
  '.claude',
  '.github',
  '.vscode',
  '.idea',
  '.qoder',
  '.DS_Store',
  '*.log',
  '*.local',
  '*.crx',
  '*.xpi',
  'src/**/__tests__',
  'src/auto-imports.d.ts',
  'src/components.d.ts',
  'stats.html',
  '.eslintcache',
  'test',
]

// 使用 zip 命令打包（macOS 自带）
const command = `cd "${ROOT}" && zip -r "${OUTPUT}" . \
  -x './.git/*' \
  -x './node_modules/*' \
  -x './dist/*' \
  -x './extension-chrome/*' \
  -x './extension-firefox/*' \
  -x './docs/*' \
  -x './site/*' \
  -x './.claude/*' \
  -x './.github/*' \
  -x './.vscode/*' \
  -x './.idea/*' \
  -x './.qoder/*' \
  -x '*.DS_Store' \
  -x './src/auto-imports.d.ts' \
  -x './src/components.d.ts' \
  -x './stats.html' \
  -x './.eslintcache' \
  -x './test/*' \
  -x '*/__tests__/*'`

console.log('📦 Creating source zip for Firefox store submission...')

try {
  execSync(command, { stdio: 'inherit' })
  const stats = fs.statSync(OUTPUT)
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
  console.log(`✅ Source zip created: ${OUTPUT} (${sizeMB} MB)`)
} catch (error) {
  console.error('❌ Failed to create source zip:', error)
  process.exit(1)
}
