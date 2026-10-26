<script setup lang="ts">
import { computed, ref, useId } from 'vue'
const props = defineProps<{ rows: { role: string; size: number; pos: number; label: string; posLabel: string }[] }>()
const azimuth = ref(35), elevation = ref(20)
const arrow = `quad-front-${useId()}`
type Point = { x: number; y: number; depth: number }
const scene = computed(() => {
  if (!props.rows.length) return null
  const a = azimuth.value * Math.PI / 180, e = elevation.value * Math.PI / 180
  const project = (x: number, y: number, z: number): Point => {
    const d = x * Math.sin(a) + y * Math.cos(a)
    return { x: x * Math.cos(a) - y * Math.sin(a), y: -z * Math.cos(e) - d * Math.sin(e), depth: d * Math.cos(e) - z * Math.sin(e) }
  }
  const size = Math.max(...props.rows.map(r => r.size)), end = Math.max(...props.rows.map(r => r.pos))
  const loops = props.rows.map((r, i) => {
    const h = r.size / 2, gap = r.size * .025
    const corners = [[-h, h], [h, h], [h, -h], [-h, -h]].map(([y, z]) => project(r.pos, y, z))
    const terminals = [project(r.pos, -gap, -h), project(r.pos, gap, -h)]
    const wire = r.role === 'driven' ? [terminals[0], corners[3], ...corners.slice(0, 3), terminals[1]] : [...corners, corners[0]]
    return { ...r, corners, terminals, wire, depth: project(r.pos, 0, 0).depth,
      tag: r.role === 'reflector' ? 'R' : r.role === 'driven' ? 'DE' : `D${i - 1}` }
  })
  const boom = [project(-size * .25, 0, 0), project(end + size * .25, 0, 0)]
  const front = [boom[1], project(end + size * (.65 + .6 * Math.abs(Math.tan(a))), 0, 0)]
  const points = [...loops.flatMap(l => l.corners), ...boom, ...front]
  const xmin = Math.min(...points.map(p => p.x)), xmax = Math.max(...points.map(p => p.x))
  const ymin = Math.min(...points.map(p => p.y)), ymax = Math.max(...points.map(p => p.y))
  const scale = Math.min(390 / (xmax - xmin || 1), 225 / (ymax - ymin || 1))
  const fit = (p: Point): Point => ({ x: 260 + (p.x - (xmin + xmax) / 2) * scale, y: 170 + (p.y - (ymin + ymax) / 2) * scale, depth: p.depth })
  return { loops: loops.sort((a, b) => a.depth - b.depth).map(l => ({ ...l, corners: l.corners.map(fit), wire: l.wire.map(fit), terminals: l.terminals.map(fit) })), boom: boom.map(fit), front: front.map(fit) }
})
const path = (points: Point[]) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
const reset = () => { azimuth.value = 35; elevation.value = 20 }
</script>

<template>
  <div class="quad-view">
    <p class="hint">3D construction view · orthographic projection</p>
    <svg v-if="scene" class="diagram quad-3d" viewBox="0 0 520 340" role="img" aria-label="Rotatable 3D cubical quad: square wire loops in separate planes, diagonal spreaders and a central boom">
      <defs><marker :id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="none" stroke="var(--accent)" stroke-width="1.5" /></marker></defs>
      <path class="quad-boom" :d="path(scene.boom)" />
      <g v-for="l in scene.loops" :key="l.tag">
        <path class="quad-spreaders" :d="path([l.corners[0], l.corners[2]]) + ' ' + path([l.corners[1], l.corners[3]])" />
        <path class="quad-loop" :class="{ 'quad-driven': l.role === 'driven' }" :d="path(l.wire)" />
        <template v-if="l.role === 'driven'"><circle v-for="(p, i) in l.terminals" :key="i" class="quad-feed-terminal" :cx="p.x" :cy="p.y" r="3" /></template>
      </g>
      <path :d="path(scene.front)" fill="none" stroke="var(--accent)" stroke-width="2" :marker-end="`url(#${arrow})`" />
      <text v-for="l in scene.loops" :key="l.tag" class="quad-label" :x="(l.corners[0].x + l.corners[1].x) / 2" :y="Math.min(...l.corners.map(p => p.y)) - 12" text-anchor="middle">{{ l.tag }}</text>
      <text class="quad-label" :x="scene.front[1].x" :y="scene.front[1].y + 25" text-anchor="middle">Front</text>
    </svg>
    <div class="quad-controls">
      <label>View azimuth · {{ azimuth }}°<input v-model.number="azimuth" aria-label="Quad view azimuth" type="range" min="-70" max="70" step="1" /></label>
      <label>View elevation · {{ elevation }}°<input v-model.number="elevation" aria-label="Quad view elevation" type="range" min="10" max="65" step="1" /></label>
      <button @click="reset">Reset view</button>
    </div>
    <p class="hint">Solid loops are wire; dashed diagonals are insulating spreaders attached at the boom. DE shows an enlarged bottom-centre feed gap. Hardware sizes are illustrative; use the dimension table for cutting lengths and spacing.</p>
  </div>
</template>

<style scoped>
.quad-boom { fill: none; stroke: var(--muted); stroke-width: 7; stroke-linecap: round; }
.quad-spreaders { fill: none; stroke: var(--muted); stroke-width: 1.6; stroke-dasharray: 5 4; opacity: .65; }
.quad-loop { fill: none; stroke: var(--wire); stroke-width: 3; stroke-linejoin: round; }
.quad-driven { stroke: var(--dim); stroke-width: 4; }
.quad-feed-terminal { fill: var(--panel); stroke: var(--dim); stroke-width: 2; }
.quad-label { fill: var(--ink); font-family: var(--font); font-size: 17px; font-weight: 600; paint-order: stroke; stroke: var(--panel); stroke-width: 4px; stroke-linejoin: round; }
.quad-controls { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; }
.quad-controls label { flex: 1 1 160px; font-size: .9rem; }
.quad-controls input { display: block; min-height: 44px; }
.quad-controls button { min-height: 44px; }
</style>
