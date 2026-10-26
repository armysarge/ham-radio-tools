<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
defineProps<{ longHeight: string; shortHeight: string; diameter: string; loopOffset: string }>()
const compact = ref(false)
let media: MediaQueryList | undefined
const resize = () => { compact.value = media?.matches ?? false }
onMounted(() => {
  if (typeof matchMedia !== 'function') return
  media = matchMedia('(max-width:600px)'); resize()
  media.addEventListener?.('change', resize)
})
onUnmounted(() => media?.removeEventListener?.('change', resize))

// Project four half-turn conductors. The small depth projection exposes the
// perpendicular arms; foreground and rear sections are drawn around the mast.
const cx = 240, radius = 88
function side(phase: number, top: number, height: number, from = 0, to = 1) {
  return Array.from({ length: 65 }, (_, i) => {
    const t = from + (to - from) * i / 64
    const angle = phase + Math.PI * t
    const x = cx + radius * (Math.cos(angle) + .12 * Math.sin(angle))
    const y = top + height * t - radius * .055 * Math.sin(angle)
    return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
}
const longFront = side(0, 92, 360)
const longBack = side(Math.PI, 92, 360)
const shortFront = [side(Math.PI / 2, 107.4, 329.2, 0, .5), side(3 * Math.PI / 2, 107.4, 329.2, .5, 1)]
const shortBack = [side(Math.PI / 2, 107.4, 329.2, .5, 1), side(3 * Math.PI / 2, 107.4, 329.2, 0, .5)]
</script>

<template>
  <svg class="diagram dg-big qfh-diagram" :viewBox="compact ? '50 0 380 850' : '0 0 760 580'" role="img"
    :aria-label="`QFH construction schematic: four half-turn helical sides around a central mast. Long-loop height ${longHeight}, short-loop height ${shortHeight}, diameter ${diameter}, loop-plane offset ${loopOffset}. Top and bottom views show perpendicular arms. Schematic proportions; not a cut template.`">
    <text class="dg-text qfh-title" :x="compact ? 240 : 380" y="27" text-anchor="middle">Half-turn QFH loop layout</text>

    <g class="qfh-front-view" aria-label="Oblique front view showing the four helical sides and central mast">
      <text class="dg-dimtext" x="240" y="57" text-anchor="middle">Front view</text>
      <g class="qfh-loop qfh-long qfh-back" aria-label="Rear side of the long loop">
        <path :d="longBack" />
      </g>
      <g class="qfh-loop qfh-short qfh-back" aria-label="Rear sections of the perpendicular short loop">
        <path v-for="(d, i) in shortBack" :key="i" :d="d" />
        <path d="M229.44 112.24L240 107.4 M229.44 441.44L240 436.6" />
      </g>

      <rect class="qfh-mast" x="230" y="76" width="20" height="438" />
      <rect class="qfh-cap" x="225" y="70" width="30" height="11" rx="2" />
      <path class="qfh-coax" d="M243 118V499" />

      <!-- The outer-ended pair exchanges sides; the perpendicular pair bows
           out from the mast and returns to it, as in the supplied references. -->
      <g class="qfh-loop qfh-long" aria-label="Long loop: outer arm ends joined by half-turn sides">
        <path :d="longFront" />
        <path class="qfh-arm" d="M152 92H328 M152 452H328" />
      </g>
      <g class="qfh-loop qfh-short" aria-label="Short loop: perpendicular arms and outward-bowing half-turn sides">
        <path v-for="(d, i) in shortFront" :key="i" :d="d" />
        <path class="qfh-arm" d="M240 107.4L250.56 102.56 M240 436.6L250.56 431.76" />
      </g>

      <g class="qfh-dimension">
        <path d="M140 92H114 M140 452H114 M120 92V452 M115 97L125 87 M115 457L125 447" />
        <path d="M340 107.4H366 M340 436.6H366 M360 107.4V436.6 M355 112.4L365 102.4 M355 441.6L365 431.6" />
        <path d="M152 466V493 M328 466V493 M152 486H328 M147 491L157 481 M323 491L333 481" />
      </g>
      <text class="dg-dimtext qfh-label-long" x="99" y="272" text-anchor="middle" transform="rotate(-90 99 272)">Long-loop height · {{ longHeight }}</text>
      <text class="dg-dimtext qfh-label-short" x="387" y="272" text-anchor="middle" transform="rotate(-90 387 272)">Short-loop height · {{ shortHeight }}</text>
      <text class="dg-dimtext" x="240" y="537" text-anchor="middle">Diameter · {{ diameter }}</text>
      <text class="dg-text qfh-note" x="240" y="563" text-anchor="middle">Loop-plane offset · {{ loopOffset }}</text>
    </g>

    <g class="qfh-endview qfh-top-view" :transform="compact ? 'translate(-429 540)' : undefined" aria-label="Top end view: long and short loop arms at right angles">
      <text class="dg-dimtext" x="574" y="75" text-anchor="middle">Top end view</text>
      <circle cx="574" cy="163" r="19" class="qfh-mast-end" />
      <path class="qfh-long qfh-end-arm" d="M510 163H638" />
      <path class="qfh-short qfh-end-arm" d="M574 99V227" />
      <circle cx="574" cy="163" r="5" class="qfh-mast-core" />
      <path class="qfh-dimension" d="M592 163V181H574" />
      <text class="dg-text qfh-note" x="612" y="196">90°</text>
      <text class="dg-text qfh-note" x="574" y="253" text-anchor="middle">{{ compact ? 'Arms at 90°' : 'Two perpendicular arm axes' }}</text>
    </g>

    <g class="qfh-endview qfh-bottom-view" :transform="compact ? 'translate(-239 282)' : undefined" aria-label="Bottom end view: the same perpendicular axes after a half turn">
      <text class="dg-dimtext" x="574" y="336" text-anchor="middle">Bottom end view</text>
      <circle cx="574" cy="421" r="19" class="qfh-mast-end" />
      <path class="qfh-long qfh-end-arm" d="M510 421H638" />
      <path class="qfh-short qfh-end-arm" d="M574 357V485" />
      <circle cx="574" cy="421" r="5" class="qfh-mast-core" />
      <text class="dg-text qfh-note" x="574" y="511" text-anchor="middle">{{ compact ? '180° twist' : 'Each side makes a half turn' }}</text>
    </g>

    <g class="qfh-legend" :transform="compact ? 'translate(-357 270)' : undefined" aria-label="Loop colour key">
      <path class="qfh-long qfh-end-arm" d="M477 548H500" />
      <text class="dg-text qfh-note" x="509" y="553">Long loop</text>
      <path class="qfh-short qfh-end-arm" d="M607 548H630" />
      <text class="dg-text qfh-note" x="639" y="553">Short loop</text>
    </g>
  </svg>
</template>

<style scoped>
.qfh-diagram { width:100%; max-width:900px; margin-inline:auto; }
.qfh-diagram .qfh-mast { fill:var(--panel2); stroke:var(--muted); stroke-width:1.5; }
.qfh-diagram .qfh-cap { fill:var(--panel2); stroke:var(--ink); stroke-width:1.5; }
.qfh-diagram .qfh-mast-end { fill:var(--panel2); stroke:var(--muted); stroke-width:1.5; }
.qfh-diagram .qfh-mast-core { fill:var(--muted); }
.qfh-diagram .qfh-coax { stroke:var(--muted); stroke-width:2; fill:none; }
.qfh-diagram .qfh-loop { fill:none; stroke-width:6; stroke-linecap:round; stroke-linejoin:round; }
.qfh-diagram .qfh-long { stroke:var(--accent); }
.qfh-diagram .qfh-short { stroke:var(--wire); }
.qfh-diagram .qfh-back { opacity:.46; }
.qfh-diagram .qfh-end-arm { fill:none; stroke-width:6; stroke-linecap:round; }
.qfh-diagram .qfh-dimension { fill:none; stroke:var(--muted); stroke-width:1.3; }
.qfh-diagram .qfh-label-long { fill:var(--accent); }
.qfh-diagram .qfh-label-short { fill:var(--wire); }
.qfh-diagram .qfh-title { font-weight:700; }
.qfh-diagram .qfh-note { font-size:14px; }
@media (max-width:600px) {
  .qfh-diagram .dg-text, .qfh-diagram .dg-dimtext { font-size:20px; }
  .qfh-diagram .qfh-note { font-size:18px; }
}
</style>
