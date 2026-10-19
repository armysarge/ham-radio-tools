<script setup lang="ts">
import type { DiyId } from '../data/diy'
// Schematic pictures for the DIY parts (not to scale; labels carry the meaning).
defineProps<{ kind: DiyId }>()
const turnsX = Array.from({ length: 11 }, (_, i) => 150 + i * 18)
const ringTurns = Array.from({ length: 13 }, (_, i) => (-60 + i * 21) * (Math.PI / 180))
const chokeTurns = Array.from({ length: 7 }, (_, i) => (195 + i * 25) * (Math.PI / 180))
const ARIA: Record<DiyId, string> = {
  coil: 'Air-core coil: wire wound turn by turn on a plastic tube, with a lead out of each end',
  toroid: 'Toroid inductor: wire passed through the hole of a ring-shaped core, turns spread around the ring',
  foilcap: 'Foil and film capacitor: two foil sheets with a plastic film between them, each with its own lead tab',
  aircap: 'Air variable capacitor: a half-round rotor plate turning between fixed stator plates, with a gap between neighbouring plates',
  dummy: 'Dummy load: resistors in series and parallel between the centre pin and the grounded box of a connector',
  choke: 'Common-mode choke: coax passing several times through a ferrite ring',
}
</script>

<template>
  <svg class="diagram" viewBox="0 0 460 250" role="img" :aria-label="ARIA[kind]">
    <!-- air-core coil -->
    <g v-if="kind === 'coil'">
      <rect x="130" y="85" width="220" height="80" rx="6" fill="var(--panel2)" stroke="var(--muted)" stroke-width="2" />
      <path v-for="x in turnsX" :key="x" class="dg-wire" style="stroke-width:3" :d="`M${x} 80 Q${x + 9} 125 ${x} 170`" />
      <line class="dg-wire" x1="60" y1="80" x2="150" y2="80" /><line class="dg-wire" x1="330" y1="170" x2="410" y2="170" />
      <text class="dg-text" x="60" y="68">lead</text><text class="dg-text" x="372" y="190">lead</text>
      <line class="dg-dim" x1="110" y1="85" x2="110" y2="165" /><text class="dg-dimtext" x="20" y="130">Ø former</text>
      <line class="dg-dim" x1="150" y1="205" x2="330" y2="205" /><text class="dg-dimtext" x="190" y="226">winding length</text>
      <text class="dg-tick" x="200" y="108">tube (plastic, not metal)</text>
    </g>
    <!-- toroid -->
    <g v-else-if="kind === 'toroid'">
      <circle cx="170" cy="125" r="85" fill="var(--panel2)" stroke="var(--muted)" stroke-width="2" />
      <circle cx="170" cy="125" r="45" fill="var(--bg)" stroke="var(--muted)" stroke-width="2" />
      <line v-for="(a, i) in ringTurns" :key="i" class="dg-wire" style="stroke-width:3" :x1="170 + 38 * Math.cos(a - 1.57)" :y1="125 + 38 * Math.sin(a - 1.57)" :x2="170 + 94 * Math.cos(a - 1.57)" :y2="125 + 94 * Math.sin(a - 1.57)" />
      <path class="dg-wire" d="M158 36 C130 20 100 20 78 36" /><path class="dg-wire" d="M212 130 C240 175 270 200 300 205 L330 205" />
      <text class="dg-text" x="20" y="30">start lead</text><text class="dg-text" x="335" y="210">end lead</text>
      <text class="dg-text" x="290" y="95">each pass through</text><text class="dg-text" x="290" y="115">the hole = 1 turn</text>
      <text class="dg-tick" x="290" y="140">spread the turns evenly</text>
      <text class="dg-tick" x="125" y="232">ferrite or iron-powder core</text>
    </g>
    <!-- foil and film capacitor -->
    <g v-else-if="kind === 'foilcap'">
      <rect x="110" y="170" width="240" height="14" fill="var(--wire)" opacity=".85" /><rect x="350" y="170" width="70" height="14" fill="var(--wire)" opacity=".85" />
      <rect x="95" y="152" width="270" height="16" rx="3" fill="var(--panel2)" stroke="var(--muted)" stroke-width="1.5" />
      <rect x="40" y="136" width="240" height="14" fill="var(--accent)" opacity=".85" /><rect x="30" y="136" width="10" height="14" fill="var(--accent)" />
      <rect x="95" y="118" width="270" height="16" rx="3" fill="var(--panel2)" stroke="var(--muted)" stroke-width="1.5" />
      <text class="dg-text" x="290" y="60">foil sheet B + lead tab</text><line class="dg-dim" x1="300" y1="66" x2="330" y2="168" />
      <text class="dg-text" x="40" y="60">foil sheet A + lead tab</text><line class="dg-dim" x1="80" y1="66" x2="100" y2="134" />
      <text class="dg-tick" x="100" y="108">plastic film in between (the dielectric)</text>
      <line class="dg-dim" x1="402" y1="152" x2="402" y2="170" /><text class="dg-dimtext" x="410" y="165">d</text>
      <text class="dg-tick" x="40" y="215">C = 8.85 pF/m × εr × area ÷ gap; press flat, no air pockets</text>
      <text class="dg-tick" x="40" y="236">side view: foil is much larger across than it is thick</text>
    </g>
    <!-- air variable -->
    <g v-else-if="kind === 'aircap'">
      <path d="M30 150 A80 80 0 0 1 190 150 L150 150 A40 40 0 0 0 70 150 Z" fill="var(--panel2)" stroke="var(--wire)" stroke-width="3" />
      <circle cx="110" cy="150" r="5" class="dg-solid" /><text class="dg-text" x="64" y="178">shaft hole</text>
      <line class="dg-dim" x1="110" y1="150" x2="190" y2="150" /><text class="dg-dimtext" x="140" y="143">R</text>
      <line class="dg-dim" x1="110" y1="150" x2="70" y2="150" /><text class="dg-dimtext" x="82" y="143">r</text>
      <text class="dg-tick" x="30" y="48">one half-round plate</text><text class="dg-tick" x="30" y="64">(file the edges smooth)</text>
      <g v-for="i in 7" :key="i"><rect :x="250 + (i - 1) * 24" :y="i % 2 ? 80 : 100" width="8" height="110" :fill="i % 2 ? 'var(--accent)' : 'var(--wire)'" /></g>
      <line class="dg-ground" x1="240" y1="148" x2="420" y2="148" style="stroke-width:3" />
      <text class="dg-text" x="260" y="66">stator (fixed) · rotor (turns)</text>
      <line class="dg-dim" x1="258" y1="212" x2="282" y2="212" /><text class="dg-dimtext" x="290" y="217">gap between plates</text>
      <text class="dg-tick" x="250" y="238">fully meshed = largest capacitance</text>
    </g>
    <!-- dummy load -->
    <g v-else-if="kind === 'dummy'">
      <rect x="20" y="40" width="420" height="190" rx="8" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="7 5" />
      <text class="dg-tick" x="28" y="34">metal box = shield and heat sink (grounded)</text>
      <circle cx="60" cy="120" r="16" fill="var(--panel2)" stroke="var(--ink)" stroke-width="2" /><circle cx="60" cy="120" r="5" class="dg-solid" />
      <text class="dg-text" x="30" y="152">connector</text><text class="dg-tick" x="30" y="168">centre pin → array</text>
      <line class="dg-wire" x1="76" y1="120" x2="140" y2="120" style="stroke-width:3" /><line class="dg-wire" x1="140" y1="80" x2="140" y2="180" style="stroke-width:3" />
      <g v-for="row in 3" :key="row">
        <line class="dg-wire" style="stroke-width:3" :x1="140" :y1="60 + row * 40" :x2="170" :y2="60 + row * 40" />
        <rect :x="170" :y="48 + row * 40" width="46" height="24" rx="3" fill="var(--panel2)" stroke="var(--wire)" stroke-width="2.5" />
        <line class="dg-wire" style="stroke-width:3" :x1="216" :y1="60 + row * 40" :x2="244" :y2="60 + row * 40" />
        <rect :x="244" :y="48 + row * 40" width="46" height="24" rx="3" fill="var(--panel2)" stroke="var(--wire)" stroke-width="2.5" />
        <line class="dg-wire" style="stroke-width:3" :x1="290" :y1="60 + row * 40" :x2="320" :y2="60 + row * 40" />
      </g>
      <line class="dg-wire" x1="320" y1="100" x2="320" y2="180" style="stroke-width:3" /><line class="dg-ground" x1="320" y1="140" x2="380" y2="140" style="stroke-width:3" />
      <text class="dg-text" x="330" y="124">to the box</text><text class="dg-tick" x="330" y="158">(ground), shortest path</text>
      <text class="dg-tick" x="168" y="210">example: 2 in series × 3 in parallel; keep leads short</text>
    </g>
    <!-- common-mode choke -->
    <g v-else>
      <circle cx="230" cy="150" r="80" fill="var(--panel2)" stroke="var(--muted)" stroke-width="2" /><circle cx="230" cy="150" r="42" fill="var(--bg)" stroke="var(--muted)" stroke-width="2" />
      <line v-for="(a, i) in chokeTurns" :key="i" stroke="var(--accent)" stroke-width="7" stroke-linecap="round" :x1="230 + 30 * Math.cos(a)" :y1="150 + 30 * Math.sin(a)" :x2="230 + 96 * Math.cos(a)" :y2="150 + 96 * Math.sin(a)" />
      <line x1="30" y1="125" x2="137" y2="125" stroke="var(--accent)" stroke-width="7" stroke-linecap="round" /><line x1="323" y1="125" x2="430" y2="125" stroke="var(--accent)" stroke-width="7" stroke-linecap="round" />
      <text class="dg-text" x="30" y="108">to the radio</text><text class="dg-text" x="330" y="108">to the antenna</text>
      <text class="dg-tick" x="230" y="22" text-anchor="middle">ferrite core, mix 43 for HF</text>
      <text class="dg-text" x="230" y="244" text-anchor="middle">coax (whole, uncut): 7–10 turns through the hole</text>
    </g>
  </svg>
</template>
