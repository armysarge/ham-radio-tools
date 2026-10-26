<script setup lang="ts">
type PatternKind = 'dipole' | 'inverted-v' | 'vertical' | 'loop' | 'efhw' | 'jpole' | 'beam' | 'qfh'

const props = defineProps<{ kind: PatternKind }>()
const PATTERNS: Record<PatternKind, { title: string; note: string; reference: string; url: string; axis: string }> = {
  dipole: {
    title: 'Ideal half-wave dipole · free-space azimuth cut',
    note: 'Broadside lobes and end-fire nulls for an ideal thin half-wave wire. The normalized sketch excludes height, ground, feedline and nearby objects.',
    reference: 'University of Texas, Basic Antenna Theory', url: 'https://farside.ph.utexas.edu/teaching/jk1/lectures/node104.html', axis: 'Wire axis; null directions',
  },
  'inverted-v': {
    title: 'Dipole-like concept · not a computed V pattern',
    note: 'An inverted-V is still a dipole, but its sloping legs, apex angle, height and ground reshape the pattern. The sketch only indicates broadside and end-fire directions; it is not a numerical plot.',
    reference: 'ARRL Antenna Book', url: 'https://www.arrl.org/arrl-antenna-book', axis: 'Wire direction; approximate null axis',
  },
  vertical: {
    title: 'Quarter-wave ground-plane · idealized cuts',
    note: 'The azimuth concept is omnidirectional. In the ideal elevation cut over a perfect ground plane, response is strongest near the horizon and falls toward the zenith; real ground and radials change it.',
    reference: 'NRAO, Essential Radio Astronomy, antenna patterns', url: 'https://www.cv.nrao.edu/~sransom/web/Ch3.html', axis: 'Mast axis',
  },
  loop: {
    title: 'Full-wave loop · orientation concept',
    note: 'The sketch shows a broadside orientation concept for a first-resonance loop. Shape, height, orientation, feed point and installation affect the actual lobes; this is not a pattern for every loop configuration.',
    reference: 'ARRL Antenna Book, Loop Antennas', url: 'https://www.arrl.org/arrl-antenna-book', axis: 'Loop plane; broadside is perpendicular',
  },
  efhw: {
    title: 'End-fed half-wave · fundamental-band concept',
    note: 'At its fundamental, an EFHW wire has a dipole-like broadside pattern. On harmonic bands it develops additional lobes and nulls; those patterns are not shown here.',
    reference: 'ARRL Antenna Book, wire antennas', url: 'https://www.arrl.org/arrl-antenna-book', axis: 'Wire axis; null directions',
  },
  jpole: {
    title: 'J-pole · ideal vertical concept',
    note: 'The half-wave radiator suggests all-around azimuth coverage and a horizon-oriented elevation pattern. The stub, feedline current, mast and nearby objects can distort the installed antenna.',
    reference: 'ARRL Antenna Book, vertical antennas', url: 'https://www.arrl.org/arrl-antenna-book', axis: 'Radiator axis',
  },
  beam: {
    title: 'Directional beam · forward-lobe concept',
    note: 'Reflector and director elements aim energy toward the forward direction. This sketch does not predict beamwidth, sidelobes, front-to-back ratio or gain for the starting dimensions above.',
    reference: 'ARRL Antenna Book, HF Yagi and Quad Antennas', url: 'https://www.arrl.org/arrl-antenna-book', axis: 'Forward direction →',
  },
  qfh: {
    title: 'QFH · broad sky-coverage concept',
    note: 'A receive QFH is intended to cover a broad portion of the sky for satellite passes. This is an illustration of that design goal, not a calculated or measured pattern; feed phasing, handedness, dimensions and surroundings matter.',
    reference: 'NOAA, Building Receive Stations User Guide', url: 'https://noaasis.noaa.gov/NOAASIS/pubs/Users_Guide-Building_Receive_Stations_March_2009.pdf', axis: 'Broad skyward coverage',
  },
}

const info = PATTERNS[props.kind]
</script>

<template>
  <section class="card stack radiation-pattern" aria-label="Radiation pattern illustration">
    <div>
      <h3 style="margin:0 0 .3rem">Radiation pattern concept</h3>
      <p class="muted" style="margin:0">{{ info.title }}</p>
    </div>
    <svg v-if="kind === 'dipole' || kind === 'inverted-v' || kind === 'efhw' || kind === 'loop'" viewBox="0 0 360 240" role="img" :aria-label="`${info.title}: two broadside lobes and null directions`" class="pattern-svg">
      <circle cx="180" cy="105" r="66" class="pattern-grid" />
      <circle cx="180" cy="105" r="36" class="pattern-grid" />
      <path d="M180 105 C150 35 88 45 92 105 C96 165 150 175 180 105 C210 35 272 45 268 105 C264 165 210 175 180 105Z" class="pattern-lobe" />
      <path d="M180 25V185" class="pattern-axis" />
      <circle cx="180" cy="105" r="4" class="pattern-feed" />
      <text x="180" y="204" text-anchor="middle" class="pattern-label">{{ info.axis.split(';')[0] }}<tspan v-if="info.axis.includes(';')" x="180" dy="21">{{ info.axis.split(';')[1]?.trim() }}</tspan></text>
    </svg>
    <svg v-else-if="kind === 'vertical' || kind === 'jpole'" viewBox="0 0 360 285" role="img" :aria-label="`${info.title}: omnidirectional azimuth and horizon-oriented elevation concept`" class="pattern-svg">
      <g transform="translate(98 100)">
        <circle r="56" class="pattern-grid" /><circle r="4" class="pattern-feed" />
        <path d="M0 -57V-76 M57 0H76 M0 57V76 M-57 0H-76" class="pattern-axis" />
        <text x="0" y="100" text-anchor="middle" class="pattern-label">Azimuth<tspan x="0" dy="21">Around mast</tspan></text>
      </g>
      <g transform="translate(260 100)">
        <circle r="56" class="pattern-grid" /><circle r="30" class="pattern-grid" />
        <path d="M260 100 C238 97 219 82 205 62 C193 44 192 30 204 23 C217 16 232 28 244 44 C251 53 256 61 260 66 C264 61 269 53 276 44 C288 28 303 16 316 23 C328 30 327 44 315 62 C301 82 282 97 260 100Z" class="pattern-lobe" transform="translate(-260 -100)" />
        <path d="M-56 0H56" class="pattern-axis" />
        <text x="0" y="100" text-anchor="middle" class="pattern-label">Elevation<tspan x="0" dy="21">Ideal ground</tspan></text>
      </g>
      <text x="180" y="265" text-anchor="middle" class="pattern-label">{{ info.axis }}</text>
    </svg>
    <svg v-else-if="kind === 'beam'" viewBox="0 0 360 210" role="img" :aria-label="`${info.title}: forward-directed main-lobe concept`" class="pattern-svg">
      <circle cx="105" cy="105" r="70" class="pattern-grid" /><circle cx="105" cy="105" r="38" class="pattern-grid" />
      <path d="M105 105 C150 68 225 55 300 88 C326 99 326 111 300 122 C225 155 150 142 105 105Z" class="pattern-lobe" />
      <path d="M68 105H145 M106 70V140" class="pattern-axis" />
      <text x="224" y="178" text-anchor="middle" class="pattern-label">{{ info.axis }}</text>
    </svg>
    <svg v-else viewBox="0 0 360 210" role="img" :aria-label="`${info.title}: broad skyward coverage illustration`" class="pattern-svg">
      <path d="M70 160 A110 110 0 0 1 290 160" class="pattern-lobe" />
      <path d="M95 160 A85 85 0 0 1 265 160 M125 160 A55 55 0 0 1 235 160" class="pattern-grid" />
      <path d="M180 173V94 M163 113 C168 91 192 91 197 113 M163 132 C168 110 192 110 197 132" class="pattern-axis" />
      <path d="M55 160H305" class="pattern-axis" />
      <text x="180" y="198" text-anchor="middle" class="pattern-label">{{ info.axis }}</text>
    </svg>
    <p style="margin:0">{{ info.note }}</p>
    <p class="hint" style="margin:0">Illustrative pattern concept only · no dBi scale or site-specific simulation. Reference: <a :href="info.url" target="_blank" rel="noopener noreferrer">{{ info.reference }}</a>.</p>
  </section>
</template>

<style scoped>
.pattern-svg { display:block; width:min(100%, 520px); height:auto; margin-inline:auto; overflow:visible; }
.pattern-grid { fill:none; stroke:var(--line); stroke-width:1.3; stroke-dasharray:4 5; }
.pattern-lobe { fill:color-mix(in srgb, var(--accent) 15%, transparent); stroke:var(--accent); stroke-width:3; stroke-linejoin:round; }
.pattern-axis { fill:none; stroke:var(--muted); stroke-width:1.5; stroke-dasharray:5 4; }
.pattern-feed { fill:var(--accent); }
.pattern-label { fill:var(--ink); font-family:var(--font); font-size:14px; font-weight:500; }
</style>
