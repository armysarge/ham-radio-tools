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

/** Serialise an on-screen diagram to a standalone SVG (light-theme colours baked in). */
export function exportSvg(svg: SVGSVGElement, filename: string) {
  const css = `.dg-wire{stroke:#b4540a;fill:none;stroke-width:4;stroke-linecap:round}.dg-dim{stroke:#0b6e6e;fill:none;stroke-width:1.5}
.dg-text{fill:#1b2229;font-family:Arial,sans-serif;font-size:15px}.dg-dimtext{fill:#0b6e6e;font-family:monospace;font-size:15px;font-weight:700}
.dg-solid{fill:#1b2229}.dg-ground{stroke:#55606a;stroke-width:2}`
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.insertAdjacentHTML('afterbegin', `<style>${css}</style><rect width="100%" height="100%" fill="#fff"/>`)
  platform.saveFile(filename, clone.outerHTML, 'image/svg+xml')
}
