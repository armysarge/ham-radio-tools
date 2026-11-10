<script setup lang="ts">
import { computed } from 'vue'
import type { Element } from '../lib/impedance'
import { formatValue } from '../lib/components'
import { fmt } from '../lib/units'

const props = defineProps<{ elements: Element[]; mode: 'series' | 'parallel' }>()
const SLOT = 100
const n = computed(() => props.elements.length)
const width = computed(() => 80 + n.value * SLOT)
const height = computed(() => (props.mode === 'series' ? 130 : 240))
const names = computed(() => {
  const seen: Record<string, number> = {}
  return props.elements.map((e) => `${e.kind}${(seen[e.kind] = (seen[e.kind] ?? 0) + 1)}`)
})
const valueText = (e: Element) => {
  switch (e.kind) {
    case 'R': return formatValue(e.a, 'Ω')
    case 'L': return formatValue(e.a, 'H')
    case 'C': return formatValue(e.a, 'F')
    default: return `${fmt(e.a)} ${(e.b ?? 0) < 0 ? '−' : '+'} j${fmt(Math.abs(e.b ?? 0))} Ω`
  }
}
const placed = computed(() => props.elements.map((e, i) => ({
  e, name: names.value[i], text: valueText(e),
  x: props.mode === 'series' ? 40 + SLOT / 2 + i * SLOT : 70 + i * SLOT,
  y: props.mode === 'series' ? 65 : 120,
})))
const label = computed(() => `${props.mode === 'series' ? 'Series' : 'Parallel'} circuit of ${placed.value.map((p) => `${p.name} ${p.text}`).join(', ')}`)
</script>

<template>
  <svg class="diagram impedance-diagram" :viewBox="`0 0 ${width} ${height}`" role="img" :aria-label="label">
    <g fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <template v-if="mode === 'series'">
        <path :d="`M20 65 H${width - 20}`" />
        <circle cx="20" cy="65" r="5" fill="var(--panel)" /><circle :cx="width - 20" cy="65" r="5" fill="var(--panel)" />
      </template>
      <template v-else>
        <path :d="`M20 40 H${width - 40} M20 200 H${width - 40}`" />
        <circle cx="20" cy="40" r="5" fill="var(--panel)" /><circle cx="20" cy="200" r="5" fill="var(--panel)" />
        <template v-for="p in placed" :key="'w' + p.x"><path :d="`M${p.x} 40 V200`" /><circle v-if="n > 1" :cx="p.x" cy="40" r="3.5" fill="var(--accent)" /><circle v-if="n > 1" :cx="p.x" cy="200" r="3.5" fill="var(--accent)" /></template>
      </template>
      <g v-for="p in placed" :key="p.x" :transform="`translate(${p.x} ${p.y})${mode === 'parallel' ? ' rotate(90)' : ''}`">
        <rect x="-24" y="-14" width="48" height="28" fill="var(--panel)" stroke="none" />
        <template v-if="p.e.kind === 'R'"><rect x="-24" y="-9" width="48" height="18" rx="2" fill="var(--panel)" /></template>
        <template v-else-if="p.e.kind === 'L'"><path d="M-24 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0" /></template>
        <template v-else-if="p.e.kind === 'C'"><path d="M-40 0 H-5 M5 0 H40 M-5 -14 V14 M5 -14 V14" /></template>
        <template v-else><rect x="-24" y="-12" width="48" height="24" rx="3" fill="var(--panel)" /></template>
      </g>
    </g>
    <g fill="var(--ink)" font-size="15" font-family="var(--font)">
      <template v-for="p in placed" :key="'t' + p.x">
        <template v-if="mode === 'series'">
          <text :x="p.x" y="32" text-anchor="middle" font-weight="700">{{ p.name }}</text>
          <text :x="p.x" y="104" text-anchor="middle">{{ p.text }}</text>
        </template>
        <template v-else>
          <text :x="p.x + 16" y="112" font-weight="700">{{ p.name }}</text>
          <text :x="p.x + 16" y="132">{{ p.text }}</text>
        </template>
        <text v-if="p.e.kind === 'Z'" :x="p.x" :y="p.y + 5" text-anchor="middle" font-style="italic">Z</text>
      </template>
      <text x="32" :y="mode === 'series' ? 58 : 33" font-weight="700">A</text>
      <text v-if="mode === 'parallel'" x="32" y="222" font-weight="700">B</text>
      <text v-else :x="width - 32" y="58" text-anchor="end" font-weight="700">B</text>
    </g>
  </svg>
</template>
