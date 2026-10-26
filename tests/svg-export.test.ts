import { expect, it, vi } from 'vitest'
import { exportSvg, platform } from '../src/platform'

it('exports diagram-specific colours, fonts and a background covering an offset viewBox', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '50 0 380 850')
  svg.innerHTML = '<path style="fill:none;stroke:rgb(10, 20, 30);stroke-width:6" d="M50 0L100 100"/><text style="font-size:19px" x="80" y="80">Dimension</text>'
  document.body.append(svg)
  const original = svg.outerHTML
  const save = vi.spyOn(platform, 'saveFile').mockImplementation(() => {})
  try {
    exportSvg(svg, 'diagram.svg')
    const exported = save.mock.calls[0]![1] as string
    expect(exported).toContain('stroke: rgb(10, 20, 30)')
    expect(exported).toContain('font-size: 19px')
    expect(exported).toContain('x="50" y="0" width="380" height="850"')
    expect(svg.outerHTML).toBe(original)
  } finally { save.mockRestore(); svg.remove() }
})
