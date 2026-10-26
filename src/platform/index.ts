// The only module allowed to touch OS-level capabilities. The web build implements the minimum;
// Electron uses narrow copy/export bridges; future native access belongs here.
import type {} from './desktop'
export interface Platform {
  saveFile(name: string, data: string | Blob, mime?: string): void
  copyText(text: string): Promise<void>
}

export const platform: Platform = {
  async saveFile(name, data, mime = 'text/plain') {
    if (window.hrtDesktop) {
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(await data.arrayBuffer())
      return window.hrtDesktop.saveFile(name, bytes)
    }
    const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: mime }))
    const a = Object.assign(document.createElement('a'), { href: url, download: name })
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
  async copyText(text) {
    if (window.hrtDesktop) return window.hrtDesktop.copyText(text)
    try { await navigator.clipboard.writeText(text) } catch {
      const t = Object.assign(document.createElement('textarea'), { value: text })
      document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
  },
}

/** Keep scoped diagram styles and resolved theme colours in the standalone export. */
export function exportSvg(svg: SVGSVGElement, filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const originals = [svg, ...Array.from(svg.querySelectorAll<SVGElement>('*'))]
  const copies = [clone, ...Array.from(clone.querySelectorAll<SVGElement>('*'))]
  const properties = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'visibility', 'display']
  originals.forEach((node, i) => {
    const style = getComputedStyle(node)
    for (const property of properties) {
      const value = style.getPropertyValue(property)
      if (value) copies[i]!.style.setProperty(property, value)
    }
  })
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  const box = svg.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number)
  if (box?.length === 4 && box.every(Number.isFinite)) {
    for (const [i, attr] of ['x', 'y', 'width', 'height'].entries()) background.setAttribute(attr, String(box[i]))
    clone.setAttribute('width', String(box[2])); clone.setAttribute('height', String(box[3]))
  } else { background.setAttribute('width', '100%'); background.setAttribute('height', '100%') }
  background.setAttribute('fill', getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#fff')
  clone.prepend(background)
  platform.saveFile(filename, clone.outerHTML, 'image/svg+xml')
}
