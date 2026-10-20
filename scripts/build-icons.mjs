// Regenerate the committed desktop artwork from the original application mark.
import { chromium } from 'playwright-core'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
const svg = await readFile(new URL('../public/app-icon.svg', import.meta.url), 'utf8')
const output = new URL('../desktop/assets/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 })
  await page.setContent(`<style>body{margin:0}svg{width:100%;height:100%}</style>${svg}`)
  const sizes = [16, 32, 48, 256, 512], images = []
  for (const size of sizes) {
    await page.setViewportSize({ width: size, height: size })
    images.push(await page.screenshot({ omitBackground: true }))
  }
  await writeFile(new URL('icon.png', output), images.pop())
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach((bytes, i) => {
    const p = 6 + i * 16
    header[p] = sizes[i] % 256; header[p + 1] = sizes[i] % 256
    header.writeUInt16LE(1, p + 4); header.writeUInt16LE(32, p + 6)
    header.writeUInt32LE(bytes.length, p + 8); header.writeUInt32LE(offset, p + 12)
    offset += bytes.length
  })
  await writeFile(new URL('icon.ico', output), Buffer.concat([header, ...images]))
} finally { await browser.close() }
