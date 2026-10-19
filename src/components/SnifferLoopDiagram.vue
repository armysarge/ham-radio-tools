<script setup lang="ts">
// Schematic of a shielded (Faraday) loop: the outer braid is broken at the top, the centre conductor is the loop,
// and both ends meet at the feed box at the bottom. Not to scale.
const cx = 235, cy = 160, r = 92
const pt = (deg: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)] as const
const arc = (from: number, to: number) => { // clockwise from `from` to `to` degrees (screen coordinates, y down)
  const [x1, y1] = pt(from), [x2, y2] = pt(to), large = (to - from + 360) % 360 > 180 ? 1 : 0
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}
const GAP = 7, END = 9
const shield = arc(-90 + GAP, 90 - END) + ' ' + arc(90 + END, 270 - GAP) // two braid halves, open at the top (-90°)
const centre = arc(90 + END, 90 - END) // the centre conductor goes all the way round
const [lx, ly] = pt(90 + END), [rx, ry] = pt(90 - END)
const boxY = cy + r + 12
</script>

<template>
  <svg class="diagram" viewBox="0 0 470 360" role="img" aria-label="Shielded loop: a ring of coax with a gap cut in the outer braid at the top, and both ends joined at a feed box at the bottom, followed by a ferrite choke and the cable to the receiver">
    <path :d="shield" fill="none" stroke="var(--muted)" stroke-width="14" />
    <path :d="centre" fill="none" stroke="var(--accent)" stroke-width="3" />
    <!-- gap marker at the top -->
    <line class="dg-dim" :x1="cx" :y1="cy - r - 10" :x2="cx" :y2="cy - r - 40" />
    <text class="dg-text" :x="cx" :y="cy - r - 46" text-anchor="middle">gap in the braid</text>
    <!-- feed box and the two ends -->
    <line :x1="lx" :y1="ly" :x2="cx - 22" :y2="boxY + 4" stroke="var(--muted)" stroke-width="10" /><line :x1="rx" :y1="ry" :x2="cx + 22" :y2="boxY + 4" stroke="var(--muted)" stroke-width="10" />
    <rect :x="cx - 38" :y="boxY" width="76" height="32" rx="5" fill="var(--panel2)" stroke="var(--ink)" stroke-width="2" />
    <text class="dg-text" :x="cx" :y="boxY + 21" text-anchor="middle">feed box</text>
    <!-- feed coax with ferrite choke -->
    <line :x1="cx" :y1="boxY + 32" :x2="cx" :y2="boxY + 70" stroke="var(--muted)" stroke-width="6" />
    <rect :x="cx - 12" :y="boxY + 42" width="24" height="14" rx="3" fill="var(--wire)" />
    <text class="dg-text" :x="cx + 22" :y="boxY + 54">ferrite choke</text>
    <text class="dg-text" :x="cx + 22" :y="boxY + 72">→ short coax to receiver</text>
    <!-- labels, kept clear of the ring -->
    <text class="dg-text" x="6" y="52">braid (shield)</text><text class="dg-tick" x="6" y="68">unbroken except at the gap</text>
    <line class="dg-dim" x1="96" y1="74" :x2="cx - r + 14" :y2="cy - 52" />
    <text class="dg-text" :x="cx + r + 28" :y="cy - 6">centre conductor</text><text class="dg-tick" :x="cx + r + 28" :y="cy + 12">is the loop itself</text>
    <line class="dg-dim" :x1="cx + r + 6" :y1="cy" :x2="cx + r + 24" :y2="cy" style="stroke:var(--accent)" />
    <text class="dg-tick" x="6" :y="boxY - 6">both braids → ground</text><text class="dg-tick" x="6" :y="boxY + 10">one centre → pin</text><text class="dg-tick" x="6" :y="boxY + 26">other centre → ground</text>
    <text class="dg-tick" :x="cx" :y="cy + 4" text-anchor="middle">null ⊥ loop plane</text>
  </svg>
</template>
