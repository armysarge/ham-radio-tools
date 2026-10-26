<script setup lang="ts">
import type { FilterPart } from '../lib/station'
import { fmt } from '../lib/units'
defineProps<{ parts: FilterPart[]; impedance: number }>()
const value = (p: FilterPart) => p.kind === 'C' ? `${fmt(p.value * 1e12, 4)} pF` : `${fmt(p.value * 1e6, 4)} µH`
</script>

<template>
  <figure class="filter-circuit">
    <figcaption>Connection diagram · ideal components</figcaption>
    <p class="hint">Input and load are both {{ impedance }} Ω. All ground symbols share the return conductor. Scroll the drawing for higher orders.</p>
    <div class="circuit-scroll" tabindex="0" role="region" aria-label="Filter circuit, horizontally scrollable">
      <svg :viewBox="`0 0 ${parts.length * 120 + 120} 245`" :style="{ minWidth: `${parts.length * 100 + 100}px` }" role="img" aria-label="LC ladder with labelled series and shunt components">
        <g fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 85 H60" />
          <g v-for="(p, i) in parts" :key="i" :transform="`translate(${60 + i * 120},85)`">
            <template v-if="p.position === 'shunt'">
              <path d="M0 0 H120 M60 0 V35" /><circle cx="60" cy="0" r="3" fill="currentColor" />
              <g transform="translate(60,35) rotate(90)">
                <path v-if="p.kind === 'C'" d="M0 0 H20 M20 -14 V14 M29 -14 V14 M29 0 H50" />
                <path v-else d="M0 0 H5 C5 -14 15 -14 15 0 C15 -14 25 -14 25 0 C25 -14 35 -14 35 0 C35 -14 45 -14 45 0 H50" />
              </g>
              <path d="M60 85 V100 M43 100 H77 M49 106 H71 M55 112 H65" />
            </template>
            <template v-else>
              <path d="M0 0 H35 M85 0 H120" />
              <g transform="translate(35,0)">
                <path v-if="p.kind === 'C'" d="M0 0 H20 M20 -14 V14 M29 -14 V14 M29 0 H50" />
                <path v-else d="M0 0 H5 C5 -14 15 -14 15 0 C15 -14 25 -14 25 0 C25 -14 35 -14 35 0 C35 -14 45 -14 45 0 H50" />
              </g>
            </template>
          </g>
          <path :d="`M${60 + parts.length * 120} 85 h45`" />
        </g>
        <g fill="currentColor" font-size="15" text-anchor="middle">
          <text x="30" y="65">IN</text><text :x="parts.length * 120 + 90" y="65">OUT</text>
          <g v-for="(p, i) in parts" :key="i">
            <text :x="120 + i * 120" :y="p.position === 'series' ? 32 : 220">{{ p.kind }}{{ i + 1 }}</text>
            <text :x="120 + i * 120" :y="p.position === 'series' ? 53 : 239">{{ value(p) }}</text>
          </g>
        </g>
      </svg>
    </div>
  </figure>
</template>

<style scoped>
.filter-circuit { margin: 0; }
figcaption { font-weight: 600; }
.circuit-scroll { overflow-x: auto; color: var(--accent); }
svg { width: 100%; display: block; }
</style>
