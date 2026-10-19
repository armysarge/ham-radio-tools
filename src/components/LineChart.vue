<script setup lang="ts">
import { computed } from 'vue'
import { fmt } from '../lib/units'

// Small dependency-free SVG chart: one curve and one highlighted operating point.
const props = defineProps<{
  points: [number, number][]; marker?: [number, number] | null
  xLabel: string; yLabel: string; logX?: boolean; title: string
}>()
const W = 520, H = 280, L = 56, R = 16, T = 14, B = 46

const sx = computed(() => props.logX ? Math.log10 : (v: number) => v)
const xr = computed(() => { const xs = props.points.map((p) => sx.value(p[0])); return [Math.min(...xs), Math.max(...xs)] })
const yr = computed(() => { const ys = props.points.map((p) => p[1]); return [Math.min(0, ...ys), Math.max(...ys)] })
const X = (v: number) => L + ((sx.value(v) - xr.value[0]) / (xr.value[1] - xr.value[0] || 1)) * (W - L - R)
const Y = (v: number) => H - B - ((v - yr.value[0]) / (yr.value[1] - yr.value[0] || 1)) * (H - T - B)
const d = computed(() => props.points.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' '))
const xt = computed(() => {
  const [a, b] = [props.points[0][0], props.points[props.points.length - 1][0]]
  return props.logX ? [a, Math.sqrt(a * b), b] : [a, (a + b) / 2, b]
})
const yt = computed(() => [0, 1, 2, 3, 4].map((i) => yr.value[0] + ((yr.value[1] - yr.value[0]) * i) / 4))
</script>

<template>
  <svg class="diagram" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="title">
    <line class="dg-axis" :x1="L" :y1="H - B" :x2="W - R" :y2="H - B" /><line class="dg-axis" :x1="L" :y1="T" :x2="L" :y2="H - B" />
    <g v-for="t in yt" :key="'y' + t"><text class="dg-tick" :x="L - 6" :y="Y(t) + 4" text-anchor="end">{{ fmt(t, 3) }}</text></g>
    <g v-for="t in xt" :key="'x' + t"><text class="dg-tick" :x="X(t)" :y="H - B + 16" text-anchor="middle">{{ fmt(t, 3) }}</text></g>
    <path class="dg-curve" :d="d" />
    <template v-if="marker">
      <line class="dg-dim" :x1="X(marker[0])" :y1="Y(marker[1])" :x2="X(marker[0])" :y2="H - B" stroke-dasharray="4 3" />
      <circle class="dg-mark" :cx="X(marker[0])" :cy="Y(marker[1])" r="7" />
    </template>
    <text class="dg-text" :x="(L + W - R) / 2" :y="H - 6" text-anchor="middle">{{ xLabel }}</text>
    <text class="dg-text" :transform="`translate(14 ${(T + H - B) / 2}) rotate(-90)`" text-anchor="middle">{{ yLabel }}</text>
  </svg>
</template>
