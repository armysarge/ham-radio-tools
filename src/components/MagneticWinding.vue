<script setup lang="ts">
import { computed } from 'vue'
import BalunConnections from './BalunConnections.vue'
import type { BalunTemplateId } from '../data/baluns'
const props = withDefaults(defineProps<{
  kind: 'balun' | 'transformer'
  primary: number | null
  secondary?: number | null
  balunTemplate?: BalunTemplateId
}>(), { balunTemplate: 'coax-1-1' })
const point = (r: number, a: number) => `${(180 + r * Math.cos(a)).toFixed(2)} ${(125 + r * Math.sin(a)).toFixed(2)}`
function winding(turns: number | null | undefined, start: number, sweep: number) {
  const count = Math.min(12, Math.max(1, turns ?? 5))
  const angles = Array.from({ length: count }, (_, i) => (start + sweep * (count === 1 ? .5 : i / (count - 1))) * Math.PI / 180)
  return angles.map((a, i) => ({ front: `M${point(88, a)}L${point(35, a)}`, back: i + 1 < count ? `M${point(35, a)}Q${point(61, (a + angles[i + 1]!) / 2)} ${point(88, angles[i + 1]!)}` : '' }))
}
const primaryPaths = computed(() => props.kind === 'balun' ? winding(props.primary, -145, 290) : winding(props.primary, 130, 100))
const secondaryPaths = computed(() => props.kind === 'transformer' ? winding(props.secondary, -50, 100) : [])
const isCoax = computed(() => props.balunTemplate === 'coax-1-1')
const isGuanella = computed(() => props.balunTemplate === 'guanella-4-1')
const isTrifilar = computed(() => props.balunTemplate === 'ruthroff-9-1')
const pairedPaths = computed(() => {
  const count = Math.min(12, Math.max(1, Math.round(props.primary ?? 5)))
  const conductors = isCoax.value ? 1 : isTrifilar.value ? 3 : 2
  return Array.from({ length: conductors }, (_, conductor) => {
    const offset = (conductor - (conductors - 1) / 2) * 4
    const angles = Array.from({ length: count }, (_, i) => (-140 + (count === 1 ? 0 : 280 * i / (count - 1)) + offset) * Math.PI / 180)
    const front = angles.map(a => `M${point(88, a)}L${point(35, a)}`)
    // One route includes both leads and every return; the core hides its underside.
    let route = `M30 ${60 + conductor * 10}Q65 45 ${point(88, angles[0]!)}`
    angles.forEach((a, i) => {
      route += `L${point(35, a)}`
      if (i + 1 < count) route += `Q${point(61, (a + angles[i + 1]!) / 2)} ${point(88, angles[i + 1]!)}`
    })
    const last = angles[angles.length - 1]!
    route += `Q${point(61, last + .25)} ${point(98, last + .25)}Q65 215 30 ${220 + conductor * 10}`
    return { route, front }
  })
})
const sectionLabels = computed(() => isGuanella.value
  ? [{ entry: 'Entry A / B', exit: 'Exit C / D', core: 'Core 1' }, { entry: 'Entry E / F', exit: 'Exit G / H', core: 'Core 2' }]
  : [{ entry: isCoax.value ? 'Entry' : isTrifilar.value ? 'Entry A1 / B1 / C1' : 'Entry A1 / B1', exit: isCoax.value ? 'Exit' : isTrifilar.value ? 'Exit A2 / B2 / C2' : 'Exit A2 / B2', core: 'One core' }])
</script>

<template>
  <div v-if="kind === 'balun'" class="magnetic-views balun-views">
    <figure>
      <h3>{{ isCoax ? 'Continuous coax winding' : isGuanella ? 'Two independent core sections' : isTrifilar ? 'Trifilar winding' : 'Paired-wire winding' }}</h3>
      <svg class="magnetic-svg physical-winding" :viewBox="`0 0 360 ${isGuanella ? 550 : 270}`" role="img" :aria-label="isCoax ? 'Continuous intact coax with entry and exit leads wound through one toroid' : `${isGuanella ? 'Two independent toroids, each' : 'One toroid'} wound with ${isTrifilar ? 'three continuous conductors' : 'a continuous pair'}; each conductor has ${primary ?? 'the calculated number of'} turns`">
        <g v-for="(section, index) in sectionLabels" :key="section.core" :transform="`translate(0 ${index * 280})`">
          <g v-for="(p, conductor) in pairedPaths" :key="conductor" :class="['physical-wire', conductor === 0 ? 'wire-a' : conductor === 1 ? 'wire-b' : 'wire-c', { 'coax-route': isCoax }]">
            <path class="winding-route" :d="p.route" />
          </g>
          <path class="magnetic-core winding-core" fill-rule="evenodd" d="M260 125a80 80 0 1 1-160 0a80 80 0 1 1 160 0 M222 125a42 42 0 1 0-84 0a42 42 0 1 0 84 0" />
          <g v-for="(p, conductor) in pairedPaths" :key="conductor" :class="['physical-wire', conductor === 0 ? 'wire-a' : conductor === 1 ? 'wire-b' : 'wire-c', { 'coax-route': isCoax }]">
            <path v-for="(segment, i) in p.front" :key="i" class="winding-front" :d="segment" />
          </g>
          <g class="balun-label">
            <text x="20" y="30">{{ section.entry }}</text>
            <text x="20" y="255">{{ section.exit }}</text>
            <text x="340" y="30" text-anchor="end">{{ section.core }}</text>
          </g>
        </g>
      </svg>
      <figcaption>
        <strong>{{ primary ?? '—' }} {{ isCoax ? 'turns of continuous coax' : 'turns per conductor' }}{{ isGuanella ? ', on each core' : '' }}.</strong>
        Each pass through the hole is one turn{{ isCoax ? '' : ' for each wire, not two turns' }}.
        Drawing shows at most 12 turns per conductor; use the calculated count.
        {{ isGuanella ? 'Wind both sections identically on separate cores.' : isTrifilar ? 'Keep all three insulated wires together with the same winding sense.' : !isCoax ? 'Keep the two insulated wires together, with the same winding sense.' : 'The entire cable, including its outer jacket, passes through the core.' }}
      </figcaption>
    </figure>
    <BalunConnections :template="balunTemplate" :turns="primary" />
  </div>
  <div v-else class="magnetic-views">
    <figure>
      <h3>Two windings on one core</h3>
      <svg class="magnetic-svg" viewBox="0 0 360 250" role="img" aria-label="Toroid with separate primary winding on the left and secondary winding on the right">
        <path class="magnetic-core" fill-rule="evenodd" d="M260 125a80 80 0 1 1-160 0a80 80 0 1 1 160 0 M222 125a42 42 0 1 0-84 0a42 42 0 1 0 84 0" />
        <g class="mag-primary magnetic-back"><path v-for="(p, i) in primaryPaths" :key="i" :d="p.back" /></g>
        <g class="mag-secondary magnetic-back"><path v-for="(p, i) in secondaryPaths" :key="i" :d="p.back" /></g>
        <g class="mag-primary"><path v-for="(p, i) in primaryPaths" :key="i" :d="p.front" /></g>
        <g class="mag-secondary"><path v-for="(p, i) in secondaryPaths" :key="i" :d="p.front" /></g>
      </svg>
      <figcaption><strong>Primary {{ primary ?? '—' }} turns · secondary {{ secondary ?? '—' }} turns</strong><br />Top view. Faded returns run behind the core. Drawing shows at most 12 turns per winding; use the calculated count.</figcaption>
    </figure>
    <figure>
      <h3>Electrical connections</h3>
      <svg class="magnetic-svg" viewBox="0 0 360 250" role="img" aria-label="Two electrically separate transformer windings with ferrite core lines and polarity dots at P1 and S1; P2 and S2 are separate returns">
        <path class="magnetic-core-line" d="M176 58V190 M184 58V190" />
        <path class="mag-primary" d="M40 65H132 C108 65 108 85 132 85 C108 85 108 105 132 105 C108 105 108 125 132 125 C108 125 108 145 132 145 C108 145 108 165 132 165 C108 165 108 185 132 185H40" />
        <path class="mag-secondary" d="M320 65H228 C252 65 252 85 228 85 C252 85 252 105 228 105 C252 105 252 125 228 125 C252 125 252 145 228 145 C252 145 252 165 228 165 C252 165 252 185 228 185H320" />
        <circle cx="144" cy="62" r="4" class="mag-primary-dot" /><circle cx="216" cy="62" r="4" class="mag-secondary-dot" />
        <g class="magnetic-label"><text x="38" y="49">P1</text><text x="38" y="211">P2</text><text x="320" y="49" text-anchor="end">S1</text><text x="320" y="211" text-anchor="end">S2</text></g>
      </svg>
      <figcaption>Dots mark corresponding winding starts. P1/P2 and S1/S2 are separate circuits; the symbol's loops are schematic. This is not the wiring for a tapped 49:1 unun or a transmission-line balun.</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.magnetic-views { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1.5rem; }
figure { margin:0; min-width:0; }
h3 { margin:0; }
.magnetic-svg { width:100%; height:auto; display:block; max-width:440px; margin:auto; }
.magnetic-core { fill:var(--panel2); stroke:var(--muted); stroke-width:2; }
.mag-primary,.mag-secondary { fill:none; stroke-width:5; stroke-linecap:round; stroke-linejoin:round; }
.mag-primary { stroke:var(--accent); }.mag-secondary { stroke:var(--wire); }
.magnetic-back { opacity:.42; stroke-dasharray:4 3; }
.magnetic-core-line { fill:none; stroke:var(--muted); stroke-width:3; }
.mag-primary-dot { fill:var(--accent); }.mag-secondary-dot { fill:var(--wire); }
.magnetic-label { fill:var(--ink); font:16px var(--font); }
.balun-views { align-items:start; }
.balun-views h3 { font-size:1.08rem; line-height:1.35; margin-bottom:.75rem; }
.balun-label { fill:var(--ink); font:16px var(--font); }
.physical-wire { fill:none; stroke-linecap:round; stroke-linejoin:round; stroke-width:3.5; }
.wire-a { stroke:var(--dim); }
.wire-b { stroke:var(--wire); stroke-dasharray:5 3; }
.wire-c { stroke:var(--ink); stroke-dasharray:9 3 2 3; }
.coax-route { stroke-width:7; stroke:var(--ink); }
figcaption { font-size:.95rem; line-height:1.55; color:var(--muted); }
figcaption strong { color:var(--ink); }
@media(max-width:700px) { .magnetic-views { grid-template-columns:1fr; } }
</style>
