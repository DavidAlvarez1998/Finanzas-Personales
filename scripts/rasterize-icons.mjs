import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const targets = [
  { file: 'favicon-16x16.png', size: 16 },
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'android-chrome-192x192.png', size: 192 },
  { file: 'android-chrome-512x512.png', size: 512 },
]

const svg = await readFile(join(publicDir, 'logo-source.svg'))

for (const { file, size } of targets) {
  const out = join(publicDir, file)
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log(`wrote ${file} (${size}x${size})`)
}
