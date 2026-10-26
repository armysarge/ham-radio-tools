<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ kind: 'balun' | 'transformer'; primary: number | null; secondary?: number | null }>()
const point = (r: number, a: number) => `${(180 + r * Math.cos(a)).toFixed(2)} ${(125 + r * Math.sin(a)).toFixed(2)}`
function winding(turns: number | null | undefined, start: number, sweep: number) {
  const count = Math.min(12, Math.max(1, turns ?? 5))
  const angles = Array.from({ length: count }, (_, i) => (start + sweep * (count === 1 ? .5 : i / (count - 1))) * Math.PI / 180)
  return angles.map((a, i) => ({ front: `M${point(88, a)}L${point(35, a)}`, back: i + 1 < count ? `M${point(35, a)}Q${point(61, (a + angles[i + 1]!) / 2)} ${point(88, angles[i + 1]!)}` : '' }))
}
const primaryPaths = computed(() => props.kind === 'balun' ? winding(props.primary, -145, 290) : winding(props.primary, 130, 100))
const secondaryPaths = computed(() => props.kind === 'transformer' ? winding(props.secondary, -50, 100) : [])
</script>

<template>
  <div class="magnetic-views">
    <figure>
      <h3>{{ kind === 'balun' ? 'Coax wound on the core' : 'Two windings on one core' }}</h3>
      <svg class="magnetic-svg" viewBox="0 0 360 250" role="img" :aria-label="kind === 'balun' ? 'Top view of intact coax wrapped through a ferrite toroid; each pass through the hole is one turn' : 'Toroid with separate primary winding on the left and secondary winding on the right'">
        <path class="magnetic-core" fill-rule="evenodd" d="M260 125a80 80 0 1 1-160 0a80 80 0 1 1 160 0 M222 125a42 42 0 1 0-84 0a42 42 0 1 0 84 0" />
        <g class="mag-primary magnetic-back"><path v-for="(p, i) in primaryPaths" :key="i" :d="p.back" /></g>
        <g class="mag-secondary magnetic-back"><path v-for="(p, i) in secondaryPaths" :key="i" :d="p.back" /></g>
        <g class="mag-primary"><path v-for="(p, i) in primaryPaths" :key="i" :d="p.front" /></g>
        <g class="mag-secondary"><path v-for="(p, i) in secondaryPaths" :key="i" :d="p.front" /></g>
      </svg>
      <figcaption><strong>{{ kind === 'balun' ? `${primary ?? '—'} turns of continuous coax` : `Primary ${primary ?? '—'} turns · secondary ${secondary ?? '—'} turns` }}</strong><br />Top view. Faded returns run behind the core. Drawing shows at most 12 turns per winding; use the calculated count.</figcaption>
    </figure>
    <figure>
      <h3>{{ kind === 'balun' ? 'Keep the coax intact' : 'Electrical connections' }}</h3>
      <svg v-if="kind === 'transformer'" class="magnetic-svg" viewBox="0 0 360 250" role="img" aria-label="Two electrically separate transformer windings with ferrite core lines and polarity dots at P1 and S1; P2 and S2 are separate returns">
        <path class="magnetic-core-line" d="M176 58V190 M184 58V190" />
        <path class="mag-primary" d="M40 65H132 C108 65 108 85 132 85 C108 85 108 105 132 105 C108 105 108 125 132 125 C108 125 108 145 132 145 C108 145 108 165 132 165 C108 165 108 185 132 185H40" />
        <path class="mag-secondary" d="M320 65H228 C252 65 252 85 228 85 C252 85 252 105 228 105 C252 105 252 125 228 125 C252 125 252 145 228 145 C252 145 252 165 228 165 C252 165 252 185 228 185H320" />
        <circle cx="144" cy="62" r="4" class="mag-primary-dot" /><circle cx="216" cy="62" r="4" class="mag-secondary-dot" />
        <g class="magnetic-label"><text x="38" y="49">P1</text><text x="38" y="211">P2</text><text x="320" y="49" text-anchor="end">S1</text><text x="320" y="211" text-anchor="end">S2</text></g>
      </svg>
      <svg v-else class="magnetic-svg" viewBox="0 0 360 250" role="img" aria-label="Cutaway of intact coax through ferrite: centre conductor and shield remain continuous from radio to antenna; the ferrite surrounds the whole cable">
        <path class="magnetic-core" d="M144 57H216V91H144Z M144 159H216V193H144Z" />
        <rect x="28" y="99" width="304" height="52" rx="8" class="coax-jacket" />
        <path class="coax-shield" d="M28 107H332 M28 143H332" />
        <path class="mag-primary" d="M28 125H332" />
        <g class="magnetic-label"><text x="28" y="81">Radio</text><text x="332" y="81" text-anchor="end">Antenna</text><text x="180" y="225" text-anchor="middle">No cut, tap or shield break</text></g>
      </svg>
      <figcaption v-if="kind === 'transformer'">Dots mark corresponding winding starts. P1/P2 and S1/S2 are separate circuits; the symbol's loops are schematic. This is not the wiring for a tapped 49:1 unun or a transmission-line balun.</figcaption>
      <figcaption v-else>The ferrite surrounds both the centre conductor and shield. It impedes common-mode current on the shield's outside; the 1:1 choke does not transform impedance.</figcaption>
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
.coax-jacket { fill:var(--panel2); stroke:var(--muted); stroke-width:1.5; }.coax-shield { fill:none; stroke:var(--muted); stroke-width:2; }
figcaption { font-size:.95rem; line-height:1.55; color:var(--muted); }
figcaption strong { color:var(--ink); }
@media(max-width:700px) { .magnetic-views { grid-template-columns:1fr; } }
</style>
