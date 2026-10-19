<script setup lang="ts">
import { computed } from 'vue'
// Schematic of a Yagi (top view: boom with parallel elements) or a quad (loops side by side on a boom). Lengths are to scale
// relative to each other; the labels carry the real dimensions.
const props = defineProps<{ kind: 'yagi' | 'quad'; rows: { role: string; size: number; pos: number; label: string; posLabel: string }[] }>()
const W = 520, H = 250
const maxSize = computed(() => Math.max(...props.rows.map((r) => r.size)))
const maxPos = computed(() => Math.max(...props.rows.map((r) => r.pos)) || 1)
const x = (p: number) => 80 + (p / maxPos.value) * (W - 170)
const s = (v: number) => (v / maxSize.value) * (props.kind === 'yagi' ? 150 : 120)
const tag = (r: string, i: number) => (r === 'reflector' ? 'R' : r === 'driven' ? 'DE' : 'D' + (i - 1))
</script>

<template>
  <svg class="diagram" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="kind === 'yagi' ? 'Yagi top view: a boom with a reflector, driven element and directors, each labelled with its length and distance from the reflector' : 'Quad side view: square loops on a boom, each labelled with its perimeter and distance from the reflector'">
    <line class="dg-ground" x1="30" :x2="W - 30" :y1="H / 2 + (kind === 'quad' ? 70 : 0)" :y2="H / 2 + (kind === 'quad' ? 70 : 0)" stroke-width="5" />
    <template v-for="(r, i) in rows" :key="i">
      <template v-if="kind === 'yagi'">
        <line class="dg-wire" :x1="x(r.pos)" :x2="x(r.pos)" :y1="H / 2 - s(r.size) / 2" :y2="H / 2 + s(r.size) / 2" :style="r.role === 'driven' ? 'stroke:var(--accent)' : ''" />
        <text class="dg-text" :x="x(r.pos)" :y="H / 2 - s(r.size) / 2 - 8" text-anchor="middle">{{ tag(r.role, i) }}</text>
        <text class="dg-dimtext" :x="x(r.pos)" :y="H / 2 + s(r.size) / 2 + 18" text-anchor="middle" style="font-size:12px">{{ r.label }}</text>
      </template>
      <template v-else>
        <rect :x="x(r.pos) - s(r.size) / 2" :y="H / 2 + 70 - s(r.size)" :width="s(r.size)" :height="s(r.size)" fill="none" :stroke="r.role === 'driven' ? 'var(--accent)' : 'var(--wire)'" stroke-width="4" stroke-linejoin="round" />
        <text class="dg-text" :x="x(r.pos)" :y="H / 2 + 70 - s(r.size) - 8" text-anchor="middle">{{ tag(r.role, i) }}</text>
        <text class="dg-dimtext" :x="x(r.pos)" :y="H / 2 + 92" text-anchor="middle" style="font-size:12px">{{ r.label }}</text>
      </template>
    </template>
    <text class="dg-tick" x="30" :y="H - 6">boom: elements spaced {{ rows.length > 1 ? rows[1].posLabel + " to " + rows[rows.length - 1].posLabel : "" }} from the reflector</text>
    <text class="dg-tick" :x="W - 30" y="16" text-anchor="end">← back · front (beam direction) →</text>
  </svg>
</template>
