<script setup lang="ts">
import { computed, ref } from 'vue'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json' // Natural Earth 1:110m, public domain, bundled locally
import { encode } from '../lib/maidenhead'
import type { Cell } from '../lib/maidenhead'

export interface Marker { lat: number; lon: number; label: string; accent?: boolean }
const props = defineProps<{ markers: Marker[]; route?: [number, number][] | null; cell?: Cell | null }>()
const emit = defineEmits<{ pick: [lat: number, lon: number] }>()

// Land outline as a single path in "degree space": x = lon + 180, y = 90 - lat (equirectangular).
const LAND = (() => {
  const w = world as any
  const fc = feature(w, w.objects.countries) as any
  let d = ''
  for (const f of fc.features) {
    const g = f.geometry
    for (const poly of g.type === 'Polygon' ? [g.coordinates] : g.coordinates)
      for (const ring of poly) d += 'M' + ring.map(([x, y]: number[]) => `${(x + 180).toFixed(2)} ${(90 - y).toFixed(2)}`).join('L') + 'Z'
  }
  return d
})()

const vx = ref(180), vy = ref(90), vw = ref(360) // view centre (svg coords) and width
const vh = computed(() => vw.value / 2)
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), Math.max(a, b))
function setView(x: number, y: number, w: number) {
  w = clamp(w, 0.1, 360)
  vw.value = w; vx.value = clamp(x, w / 2, 360 - w / 2); vy.value = clamp(y, w / 4, 180 - w / 4)
}
const viewBox = computed(() => `${vx.value - vw.value / 2} ${vy.value - vh.value / 2} ${vw.value} ${vh.value}`)
const reset = () => setView(180, 90, 360)
function fit() {
  const pts = props.markers
  if (!pts.length) return reset()
  const xs = pts.map((p) => p.lon + 180), ys = pts.map((p) => 90 - p.lat)
  const w = Math.max((Math.max(...xs) - Math.min(...xs)) * 1.5, (Math.max(...ys) - Math.min(...ys)) * 3, 2)
  setView((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, w)
}

const svg = ref<SVGSVGElement>()
function toLonLat(e: { clientX: number; clientY: number }) {
  const r = svg.value!.getBoundingClientRect()
  return { x: vx.value - vw.value / 2 + ((e.clientX - r.left) / r.width) * vw.value, y: vy.value - vh.value / 2 + ((e.clientY - r.top) / r.height) * vh.value }
}
function zoomAt(factor: number, e?: { clientX: number; clientY: number }) {
  const p = e ? toLonLat(e) : { x: vx.value, y: vy.value }
  const nw = clamp(vw.value * factor, 0.1, 360)
  const k = nw / vw.value
  setView(p.x - (p.x - vx.value) * k, p.y - (p.y - vy.value) * k, nw)
}
let drag: { cx: number; cy: number; x: number; y: number; moved: boolean } | null = null
function down(e: PointerEvent) { (e.currentTarget as Element).setPointerCapture(e.pointerId); drag = { cx: e.clientX, cy: e.clientY, x: vx.value, y: vy.value, moved: false } }
function move(e: PointerEvent) {
  if (!drag) return
  const r = svg.value!.getBoundingClientRect()
  if (Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) > 4) drag.moved = true
  if (drag.moved) setView(drag.x - ((e.clientX - drag.cx) / r.width) * vw.value, drag.y - ((e.clientY - drag.cy) / r.height) * vh.value, vw.value)
}
function up(e: PointerEvent) {
  if (drag && !drag.moved) { const p = toLonLat(e); if (p.y >= 0 && p.y <= 180) emit('pick', 90 - p.y, p.x - 180) }
  drag = null
}
function key(e: KeyboardEvent) {
  const s = vw.value * 0.15
  const m: Record<string, () => void> = {
    ArrowLeft: () => setView(vx.value - s, vy.value, vw.value), ArrowRight: () => setView(vx.value + s, vy.value, vw.value),
    ArrowUp: () => setView(vx.value, vy.value - s / 2, vw.value), ArrowDown: () => setView(vx.value, vy.value + s / 2, vw.value),
    '+': () => zoomAt(0.6), '=': () => zoomAt(0.6), '-': () => zoomAt(1 / 0.6),
  }
  if (m[e.key]) { e.preventDefault(); m[e.key]() }
}

// Maidenhead grid: coarser cells when zoomed out so the overlay stays readable.
const grid = computed(() => {
  const w = vw.value
  const [dx, dy, chars] = w > 100 ? [20, 10, 2] : w > 6 ? [2, 1, 4] : w > 0.8 ? [5 / 60, 2.5 / 60, 6] : [0.5 / 60, 0.25 / 60, 8]
  const x0 = vx.value - w / 2, x1 = vx.value + w / 2, y0 = vy.value - vh.value / 2, y1 = vy.value + vh.value / 2
  let d = ''
  for (let x = Math.max(0, Math.ceil(x0 / dx) * dx); x <= Math.min(360, x1); x += dx) d += `M${x} ${Math.max(0, y0)}V${Math.min(180, y1)}`
  for (let y = Math.max(0, Math.ceil(y0 / dy) * dy); y <= Math.min(180, y1); y += dy) d += `M${Math.max(0, x0)} ${y}H${Math.min(360, x1)}`
  const labels: { x: number; y: number; t: string }[] = []
  const ci0 = Math.max(0, Math.floor(x0 / dx)), ci1 = Math.min(Math.round(360 / dx) - 1, Math.floor(x1 / dx))
  const cj0 = Math.max(0, Math.floor(y0 / dy)), cj1 = Math.min(Math.round(180 / dy) - 1, Math.floor(y1 / dy))
  if ((ci1 - ci0 + 1) * (cj1 - cj0 + 1) <= 450)
    for (let i = ci0; i <= ci1; i++) for (let j = cj0; j <= cj1; j++) {
      const lon = (i + 0.5) * dx - 180, lat = 90 - (j + 0.5) * dy
      const full = encode(lat, lon, chars as 2 | 4 | 6 | 8)
      labels.push({ x: (i + 0.5) * dx, y: (j + 0.5) * dy, t: chars > 4 ? full.slice(-2) : full })
    }
  return { d, labels, fs: Math.min(dy * 0.3, dx * 0.13), chars }
})

const routeParts = computed(() => {
  if (!props.route) return []
  const parts: string[] = []
  let cur: string[] = [], prev: number | null = null
  for (const [lat, lon] of props.route) {
    if (prev !== null && Math.abs(lon - prev) > 180) { parts.push(cur.join('L')); cur = [] }
    cur.push(`${(lon + 180).toFixed(3)} ${(90 - lat).toFixed(3)}`); prev = lon
  }
  parts.push(cur.join('L'))
  return parts.filter((p) => p.includes('L')).map((p) => 'M' + p)
})
const r = computed(() => Math.max(vw.value / 130, 0.004))
</script>

<template>
  <div class="map">
    <svg ref="svg" :viewBox="viewBox" tabindex="0" role="application" preserveAspectRatio="xMidYMid meet"
      aria-label="World map. Arrow keys pan, plus and minus zoom. Click or tap to set the other station."
      @pointerdown="down" @pointermove="move" @pointerup="up" @wheel.prevent="zoomAt($event.deltaY > 0 ? 1.25 : 0.8, $event)" @keydown="key">
      <rect x="0" y="0" width="360" height="180" fill="var(--sea)" />
      <path class="land" :d="LAND" fill-rule="evenodd" />
      <rect v-if="cell" class="cell" :x="cell.west + 180" :y="90 - cell.north" :width="cell.east - cell.west" :height="cell.north - cell.south" />
      <path class="gridline" :d="grid.d" />
      <text v-for="l in grid.labels" :key="l.x + ',' + l.y" class="gl" :x="l.x" :y="l.y" :font-size="grid.fs">{{ l.t }}</text>
      <path v-for="(p, i) in routeParts" :key="i" class="route" :d="p" />
      <g v-for="m in markers" :key="m.label">
        <circle :cx="m.lon + 180" :cy="90 - m.lat" :r="r" :fill="m.accent ? 'var(--wire)' : 'var(--accent)'" stroke="var(--bg)" :stroke-width="r / 3" />
        <text :x="m.lon + 180 + r * 1.6" :y="90 - m.lat" :font-size="r * 2.4" dominant-baseline="central" fill="var(--ink)" stroke="var(--bg)" :stroke-width="r / 2.5" paint-order="stroke" font-weight="700">{{ m.label }}</text>
      </g>
    </svg>
    <div class="map-tools no-print">
      <button aria-label="Zoom in" @click="zoomAt(0.5)">＋</button>
      <button aria-label="Zoom out" @click="zoomAt(2)">－</button>
      <button @click="fit">Fit both</button>
      <button @click="reset">World</button>
      <span class="muted" style="font-size:.85rem">Grid: {{ grid.chars }}-character cells · drag to pan, click to set the other station</span>
    </div>
  </div>
</template>
