<script setup lang="ts">
import { computed } from 'vue'
import type { Shape } from '../data/qrmSources'

// A schematic sketch of what a noise source looks like on an SDR. It is drawn from simple shapes, NOT from a recording.
const props = defineProps<{ shape: Shape; label: string; spacing?: number }>()
const W = 300, H = 90, FLOOR = 74
let seed = 11
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

const spectrum = computed(() => {
  seed = 11 + props.shape.length
  const pts: [number, number][] = []
  const sp = props.spacing ?? 28
  for (let x = 0; x <= W; x += 2) {
    let y = FLOOR - rnd() * 3
    if (props.shape === 'comb') { const d = Math.abs(((x + sp / 2) % sp) - sp / 2); y -= Math.max(0, 52 * Math.exp(-x / 220) - d * 9) }
    else if (props.shape === 'broadband') y -= 46 * Math.exp(-x / 110) + rnd() * 5
    else if (props.shape === 'blocks') { const on = (x > 25 && x < 95) || (x > 120 && x < 175) || (x > 205 && x < 270); const notch = Math.abs(x - 148) < 3 || Math.abs(x - 238) < 3; y -= on && !notch ? 26 + rnd() * 3 : 0 }
    else if (props.shape === 'carrier') for (const c of [40, 80, 120, 160, 200, 240, 280]) y -= Math.max(0, 40 - Math.abs(x - c) * 12)
    else y -= 3 + rnd() * 3
    pts.push([x, y])
  }
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1].toFixed(1)}`).join(' ')
})
// ticks are easier to read as a waterfall: a stripe every few rows
const stripes = computed(() => Array.from({ length: 9 }, (_, i) => 6 + i * 8))
</script>

<template>
  <svg class="diagram" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`Schematic sketch, not a recording: ${label}`" style="background:var(--panel2);border-radius:6px">
    <template v-if="shape === 'ticks'">
      <rect v-for="y in stripes" :key="y" x="10" :y="y" width="280" height="3" fill="var(--accent)" opacity=".85" />
      <text class="dg-tick" x="10" y="86">time ↓ — one tick about every second</text>
    </template>
    <template v-else>
      <line class="dg-axis" x1="0" :x2="W" :y1="FLOOR" :y2="FLOOR" />
      <path class="dg-curve" :d="spectrum" style="stroke-width:1.6" />
      <text class="dg-tick" x="4" y="86">frequency →</text><text class="dg-tick" :x="W - 4" y="86" text-anchor="end">schematic</text>
    </template>
  </svg>
</template>
