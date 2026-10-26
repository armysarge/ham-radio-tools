<script setup lang="ts">
import type { BalunTemplateId } from '../data/baluns'
defineProps<{ template: BalunTemplateId; turns: number | null }>()
</script>

<template>
  <figure>
    <h3>{{ template === 'coax-1-1' ? 'Keep the coax intact' : 'Terminal connections' }}</h3>
    <svg v-if="template === 'coax-1-1'" class="connection-svg" viewBox="0 0 480 440" role="img" aria-label="Longitudinal and end sections of continuous coax through ferrite: outer jacket encloses the unbroken shield, dielectric and centre conductor; the ferrite ring surrounds the whole cable">
      <g class="labels"><text x="30" y="103">Radio</text><text x="450" y="103" text-anchor="end">Antenna</text><text x="240" y="48" text-anchor="middle">Ferrite</text></g>
      <path class="leader" d="M240 55V69" />
      <path class="core" d="M205 70H275V120H205Z M205 190H275V240H205Z" />
      <rect class="jacket" x="30" y="120" width="420" height="70" />
      <rect class="shield" x="30" y="131" width="420" height="48" />
      <rect class="dielectric" x="30" y="137" width="420" height="36" />
      <path class="centre" d="M30 155H450" />
      <text class="labels" x="240" y="264" text-anchor="middle">Whole cable through the opening</text>
      <path class="core" fill-rule="evenodd" d="M168 330a58 58 0 1 1-116 0a58 58 0 1 1 116 0 M156 330a46 46 0 1 0-92 0a46 46 0 1 0 92 0" />
      <circle class="jacket" cx="110" cy="330" r="44" />
      <circle class="shield" cx="110" cy="330" r="36" />
      <circle class="dielectric" cx="110" cy="330" r="30" />
      <circle class="centre-dot" cx="110" cy="330" r="6" />
      <path class="leader" d="M117 330L205 290 M134 334L205 321 M144 340L205 352 M150 348L205 383" />
      <g class="labels"><text x="220" y="297">Centre conductor</text><text x="220" y="328">Dielectric</text><text x="220" y="359">Shield / braid</text><text x="220" y="390">Outer jacket</text><text x="110" y="418" text-anchor="middle">End view</text></g>
    </svg>

    <svg v-else-if="template === 'wire-1-1'" class="connection-svg" viewBox="0 0 480 320" role="img" aria-label="1:1 paired-wire current balun: input hot A1 continues to A2 and input return B1 continues to B2 through the same core section; no cross-connections">
      <rect class="section" x="155" y="65" width="170" height="200" rx="12" />
      <path class="wire-a" aria-label="A1 to A2" d="M30 110H450" /><path class="wire-b" aria-label="B1 to B2" d="M30 220H450" />
      <g class="labels"><text x="30" y="45">Radio</text><text x="450" y="45" text-anchor="end">Antenna</text><text x="95" y="98">A1</text><text x="355" y="98">A2</text><text x="95" y="249">B1</text><text x="355" y="249">B2</text><text x="240" y="161" text-anchor="middle">One core</text><text x="240" y="188" text-anchor="middle">section</text><text x="240" y="305" text-anchor="middle">{{ turns ?? '—' }} turns per conductor</text></g>
      <g class="terminal"><circle cx="30" cy="110" r="5" /><circle cx="450" cy="110" r="5" /><circle cx="30" cy="220" r="5" /><circle cx="450" cy="220" r="5" /></g>
    </svg>

    <svg v-else-if="template === 'guanella-4-1'" class="connection-svg" viewBox="0 0 480 390" role="img" aria-label="4:1 Guanella: two independent core sections. Input hot joins A and E, input shield joins B and F, floating output series junction joins D and G, and balanced antenna terminals are C and H">
      <rect class="section" x="150" y="65" width="170" height="100" rx="10" />
      <rect class="section" x="150" y="205" width="170" height="100" rx="10" />
      <g class="labels"><text x="235" y="49" text-anchor="middle">Section 1</text><text x="235" y="192" text-anchor="middle">Section 2</text></g>
      <path class="wire-a" aria-label="Input hot join A to E" d="M25 40H55V235H150 M55 95H150" />
      <path class="wire-b" aria-label="Input shield join B to F" d="M25 345H90V241 M90 229V135H150 M90 275H150" />
      <path class="wire-a" aria-label="A to C" d="M150 95H320" />
      <path class="wire-b" aria-label="B to D" d="M150 135H320" />
      <path class="wire-a" aria-label="E to G" d="M150 235H320" />
      <path class="wire-b" aria-label="F to H" d="M150 275H320" />
      <path class="wire-a" aria-label="Floating series join D to G" d="M320 235H390V135H320" />
      <path class="wire-a" d="M320 95H450" /><path class="wire-b" d="M320 275H450" />
      <g class="labels"><text x="25" y="25">Input hot</text><text x="25" y="377">Input shield</text><text x="135" y="85" text-anchor="end">A</text><text x="135" y="153" text-anchor="end">B</text><text x="135" y="225" text-anchor="end">E</text><text x="135" y="300" text-anchor="end">F</text><text x="330" y="85">C</text><text x="330" y="153">D</text><text x="330" y="225">G</text><text x="330" y="301">H</text><text x="450" y="48" text-anchor="end">Balanced + C</text><text x="450" y="330" text-anchor="end">Balanced − H</text><text x="403" y="173">D + G</text><text x="403" y="209">floating</text></g>
      <g class="junction"><circle cx="55" cy="95" r="4.5" /><circle cx="90" cy="275" r="4.5" /></g>
      <g class="terminal"><circle cx="25" cy="40" r="5" /><circle cx="25" cy="345" r="5" /><circle cx="450" cy="95" r="5" /><circle cx="450" cy="275" r="5" /></g>
    </svg>

    <svg v-else-if="template === 'ruthroff-4-1'" class="connection-svg" viewBox="0 0 480 350" role="img" aria-label="4:1 Ruthroff voltage balun: equal windings with corresponding starts A1 and B1. A1 is input hot and antenna terminal 1; A2 joins B1 and input shield; B2 is antenna terminal 2">
      <path class="core-lines" d="M270 88V272 M279 88V272" />
      <path class="wire-a" d="M30 80H450 M220 80C248 80 248 105 220 105C248 105 248 130 220 130C248 130 248 155 220 155C248 155 248 180 220 180" />
      <path class="wire-b" d="M220 180C248 180 248 205 220 205C248 205 248 230 220 230C248 230 248 255 220 255C248 255 248 280 220 280H450" />
      <path class="wire-b" aria-label="Midpoint join A2 to B1" d="M30 180H220" />
      <g class="junction"><circle cx="220" cy="80" r="4.5" /><circle cx="220" cy="180" r="4.5" /></g>
      <circle class="start-a polarity-dot" cx="207" cy="97" r="4" /><circle class="start-b polarity-dot" cx="207" cy="197" r="4" />
      <g class="labels"><text x="30" y="54">Input hot</text><text x="30" y="210">Input shield</text><text x="220" y="60" text-anchor="middle">A1</text><text x="200" y="167" text-anchor="end">A2 + B1</text><text x="220" y="310" text-anchor="middle">B2</text><text x="450" y="54" text-anchor="end">Antenna 1</text><text x="450" y="310" text-anchor="end">Antenna 2</text><text x="305" y="134">W1: {{ turns ?? '—' }} turns</text><text x="305" y="238">W2: {{ turns ?? '—' }} turns</text></g>
      <g class="terminal"><circle cx="30" cy="80" r="5" /><circle cx="30" cy="180" r="5" /><circle cx="450" cy="80" r="5" /><circle cx="450" cy="280" r="5" /></g>
    </svg>

    <svg v-else class="connection-svg" viewBox="0 0 480 430" role="img" aria-label="9:1 unun with three equal series windings: A1 is shared input shield and counterpoise return, A2 plus B1 is input hot, B2 plus C1 is the internal series junction, C2 is antenna hot. Both ports are unbalanced">
      <path class="core-lines" d="M270 70V350 M279 70V350" />
      <path class="wire-a" d="M30 360H450 M220 360C248 360 248 335 220 335C248 335 248 310 220 310C248 310 248 285 220 285C248 285 248 260 220 260" />
      <path class="wire-b" d="M220 260C248 260 248 235 220 235C248 235 248 210 220 210C248 210 248 185 220 185C248 185 248 160 220 160" />
      <path class="wire-c" d="M220 160C248 160 248 135 220 135C248 135 248 110 220 110C248 110 248 85 220 85C248 85 248 60 220 60H450" />
      <path class="wire-b" aria-label="Input tap A2 plus B1" d="M30 260H220" />
      <g class="junction"><circle cx="220" cy="360" r="4.5" /><circle cx="220" cy="260" r="4.5" /><circle cx="220" cy="160" r="4.5" /></g>
      <circle class="start-a polarity-dot" cx="207" cy="343" r="4" /><circle class="start-b polarity-dot" cx="207" cy="243" r="4" /><circle class="start-c polarity-dot" cx="207" cy="143" r="4" />
      <g class="labels"><text x="220" y="40" text-anchor="middle">C2</text><text x="450" y="40" text-anchor="end">Antenna wire</text><text x="200" y="146" text-anchor="end">B2 + C1</text><text x="200" y="246" text-anchor="end">A2 + B1</text><text x="30" y="290">Input hot</text><text x="30" y="394">Input return</text><text x="220" y="394" text-anchor="middle">A1</text><text x="450" y="420" text-anchor="end">Counterpoise / return</text><text x="305" y="110">W3: {{ turns ?? '—' }} turns</text><text x="305" y="210">W2: {{ turns ?? '—' }} turns</text><text x="305" y="310">W1: {{ turns ?? '—' }} turns</text></g>
      <g class="terminal"><circle cx="30" cy="260" r="5" /><circle cx="30" cy="360" r="5" /><circle cx="450" cy="60" r="5" /><circle cx="450" cy="360" r="5" /></g>
    </svg>

    <figcaption v-if="template === 'coax-1-1'">Section views, not a stripping guide: the shield encloses the dielectric around the centre conductor. Both stay continuous through the winding. Ferrite acts on current on the shield's outside; it is not wired to the braid.</figcaption>
    <figcaption v-else-if="template === 'wire-1-1'">A1–A2 and B1–B2 are continuous conductors, wound together in the same sense. There is no tap or series connection. Match these labels to the terminal table.</figcaption>
    <figcaption v-else-if="template === 'guanella-4-1'">Dots join wires; the gap where buses cross does not. D + G is a floating RF series junction, with no separate ground wire. Through-section continuity is A–C, B–D, E–G and F–H. DC continuity is not an RF test: a correct assembly can look like a short at DC; measure transformation and balance.</figcaption>
    <figcaption v-else-if="template === 'ruthroff-4-1'">Series midpoint A2 + B1 connects to the input shield. Dots beside the windings mark corresponding starts; filled wire junctions are electrical joins. Equal windings give an ideal 2:1 voltage and 4:1 impedance ratio, without guaranteeing equal antenna currents.</figcaption>
    <figcaption v-else>Three equal windings add in series. Feed the first-winding tap A2 + B1; take antenna hot from C2 and the shared return from A1. This is a 9:1 unun, not a balanced output or a common-mode choke. Dots beside the windings identify their corresponding starts.</figcaption>
  </figure>
</template>

<style scoped>
figure { margin:0; min-width:0; }
h3 { margin:0; }
.connection-svg { width:100%; height:auto; display:block; max-width:480px; margin:auto; }
.labels { fill:var(--ink); font:20px var(--font); }
.core,.section { fill:var(--panel2); stroke:var(--muted); stroke-width:2; }
.jacket { fill:var(--muted); stroke:var(--ink); stroke-width:1.5; }
.shield { fill:var(--ink); stroke:var(--ink); stroke-width:2; }
.dielectric { fill:var(--panel); stroke:var(--line); stroke-width:1; }
.centre { fill:none; stroke:var(--wire); stroke-width:7; }
.centre-dot { fill:var(--wire); }
.leader,.core-lines { fill:none; stroke:var(--muted); stroke-width:1.5; }
.core-lines { stroke-width:3; }
.wire-a,.wire-b,.wire-c { fill:none; stroke-width:4; stroke-linecap:round; stroke-linejoin:round; }
.wire-a { stroke:var(--dim); }.wire-b { stroke:var(--wire); }
.wire-c { stroke:var(--ink); stroke-dasharray:8 3; }
.start-a { fill:var(--dim); }.start-b { fill:var(--wire); }.start-c { fill:var(--ink); }
.junction { fill:var(--ink); }
.terminal { fill:var(--panel); stroke:var(--ink); stroke-width:2; }
figcaption { font-size:.95rem; line-height:1.55; color:var(--muted); }
</style>
