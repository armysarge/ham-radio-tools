<script setup lang="ts">
// Top view: the vertical at the centre, radials fanned out, and the room you have as a dashed circle.
const props = defineProps<{ count: number; lengthLabel: string; roomLabel: string; fits: boolean }>()
const cx = 160, cy = 140, R = 110
const shown = Math.min(props.count, 36)
const angles = Array.from({ length: shown }, (_, i) => (i * 2 * Math.PI) / shown)
</script>

<template>
  <svg class="diagram" viewBox="0 0 440 280" role="img" :aria-label="`Top view: ${count} radials of ${lengthLabel} spread around the base of the vertical, inside a ${roomLabel} radius`">
    <circle class="dg-dim" :cx="cx" :cy="cy" :r="R + 12" stroke-dasharray="6 5" />
    <line v-for="(a, i) in angles" :key="i" class="dg-wire" style="stroke-width:2" :x1="cx" :y1="cy" :x2="cx + R * Math.cos(a)" :y2="cy + R * Math.sin(a)" />
    <circle class="dg-solid" :cx="cx" :cy="cy" r="6" />
    <text class="dg-text" x="290" y="100">vertical at the centre</text>
    <text class="dg-text" x="290" y="130">{{ count }} radials × {{ lengthLabel }}</text>
    <text class="dg-tick" x="290" y="150">{{ shown < count ? `(first ${shown} drawn)` : 'evenly spaced' }}</text>
    <text class="dg-dimtext" x="290" y="180" style="font-size:13px">room: {{ roomLabel }}</text>
    <text class="dg-tick" x="290" y="198">{{ fits ? 'a full quarter wave fits' : 'shorter than a quarter wave' }}</text>
  </svg>
</template>
