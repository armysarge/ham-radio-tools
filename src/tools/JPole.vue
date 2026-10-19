<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import DesignActions from '../components/DesignActions.vue'
import ModsPanel from '../components/ModsPanel.vue'
import MaterialsPanel from '../components/MaterialsPanel.vue'
import { FREQ_UNITS, feetInches, fmt } from '../lib/units'
import { jpole } from '../lib/antenna'
import { loadedParams, state } from '../core/store'

const PRESETS: [string, number][] = [['6 m', 50.15], ['2 m', 146], ['1.25 m', 223.5], ['70 cm', 435]]
const p = loadedParams(useRoute(), 'jpole')
const f = ref<number | null>(Number(p?.f ?? 146e6))
const k = ref(Number(p?.k ?? 0.957))
const name = ref('')
const svgEl = ref<SVGSVGElement>()

const r = computed(() => { try { return f.value ? jpole(f.value, k.value) : null } catch { return null } })
const err = computed(() => { try { if (f.value) jpole(f.value, k.value); return '' } catch (e) { return (e as Error).message } })
const imperial = computed(() => state.units === 'imperial')
const dim = (m: number | null | undefined) => (m == null ? '—' : imperial.value ? (m < 0.3 ? `${(m / 0.0254).toFixed(2)} in` : feetInches(m)) : m >= 1 ? `${m.toFixed(3)} m` : `${(m * 100).toFixed(1)} cm`)

// drawing, to scale vertically: the whole J is 250 px tall
const TOP = 30, H = 240, X1 = 200, SP = 70
const sc = computed(() => (r.value ? H / r.value.total : 1))
const yBottom = TOP + H
const yStubTop = computed(() => (r.value ? yBottom - r.value.stub * sc.value : yBottom))
const yTap = computed(() => (r.value ? yBottom - Math.max(r.value.tap * sc.value, 24) : yBottom)) // tap height is exaggerated if tiny so it stays readable
const X2 = X1 + SP
</script>

<template>
  <ToolLayout id="jpole" :references="[
    'ARRL Antenna Book — J-pole (a half-wave radiator fed through a quarter-wave shorted matching stub).',
    'Amateur practice: 146 MHz in ½-inch copper pipe is about 58 in (1.47 m) overall, with a stub of about 19–20 in; the tap is found by trial.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <div class="seg" role="group" aria-label="Band presets">
            <button v-for="[b, mhz] in PRESETS" :key="b" :aria-pressed="f === mhz * 1e6" @click="f = mhz * 1e6">{{ b }}</button>
          </div>
          <NumField v-model="f" label="Design frequency" :units="FREQ_UNITS" unit="MHz" :min="10e6" :max="3e9" />
          <label class="field"><span class="lbl">Shortening factor k = {{ k.toFixed(3) }}</span>
            <input v-model.number="k" type="range" min="0.92" max="0.99" step="0.001" aria-label="Shortening factor" />
            <span class="hint">0.957 matches ½-inch copper pipe at 2 m. Fatter tube → slightly lower k. Cut long and trim.</span></label>
          <p v-if="err" class="err" role="alert">{{ err }}</p>
        </div>
        <div class="card results" aria-live="polite">
          <ResultRow label="Overall length (long element)" :value="r ? dim(r.total) : null" big />
          <ResultRow label="Matching stub (short element)" :value="r ? dim(r.stub) : null" big />
          <ResultRow label="Radiating section above the stub" :value="r ? dim(r.radiator) : null" />
          <ResultRow label="Spacing between the two tubes (centre to centre)" :value="r ? dim(r.spacing) : null" note="start here; set by your fittings" />
          <ResultRow label="Feed tap, up from the shorted bottom" :value="r ? dim(r.tap) : null" :note="r ? `try ${dim(r.tapMin)} to ${dim(r.tapMax)}` : ''" />
        </div>
      </div>
      <div class="stack">
        <div class="card">
          <svg ref="svgEl" class="diagram dg-big" viewBox="0 0 540 340" role="img" :aria-label="`J-pole: overall ${dim(r?.total)}, stub ${dim(r?.stub)}, feed tap ${dim(r?.tap)} above the shorted bottom`">
            <path class="dg-wire" :d="`M${X1} ${TOP} V${yBottom} H${X2} V${yStubTop}`" style="stroke-width:7" />
            <text class="dg-text" :x="X1 + 12" :y="TOP + 6">open top</text>
            <text class="dg-text" :x="X2 + 12" :y="yStubTop + 6">stub open end</text>
            <text class="dg-text" :x="(X1 + X2) / 2" :y="yBottom + 26" text-anchor="middle">shorted bottom</text>
            <!-- feed: centre conductor to the long element, shield to the stub, at the tap height -->
            <line class="dg-ground" :x1="X1" :y1="yTap" :x2="X2" :y2="yTap" stroke-dasharray="3 3" />
            <circle class="dg-solid" :cx="X1" :cy="yTap" r="5" /><circle class="dg-solid" :cx="X2" :cy="yTap" r="5" />
            <path class="dg-ground" :d="`M${X2} ${yTap} H${X2 + 130}`" />
            <text class="dg-text" :x="X2 + 14" :y="yTap + 22">coax to radio (with choke)</text>
            <text class="dg-tick" :x="X2 + 12" :y="yTap - 12">feed tap</text>
            <!-- dimensions -->
            <g><line class="dg-dim" :x1="X1 - 44" :y1="TOP" :x2="X1 - 44" :y2="yBottom" /><line class="dg-dim" :x1="X1 - 50" :y1="TOP" :x2="X1 - 38" :y2="TOP" /><line class="dg-dim" :x1="X1 - 50" :y1="yBottom" :x2="X1 - 38" :y2="yBottom" />
              <text class="dg-dimtext" :x="X1 - 54" :y="(TOP + yBottom) / 2" text-anchor="end">{{ dim(r?.total) }}</text></g>
            <g><line class="dg-dim" :x1="X2 + 170" :y1="yStubTop" :x2="X2 + 170" :y2="yBottom" /><line class="dg-dim" :x1="X2 + 164" :y1="yStubTop" :x2="X2 + 176" :y2="yStubTop" /><line class="dg-dim" :x1="X2 + 164" :y1="yBottom" :x2="X2 + 176" :y2="yBottom" />
              <text class="dg-dimtext" :x="X2 + 164" :y="(yStubTop + yBottom) / 2 - 8" text-anchor="end">stub {{ dim(r?.stub) }}</text></g>
            <line class="dg-dim" :x1="X1" :y1="TOP + 70" :x2="X2" :y2="TOP + 70" /><line class="dg-dim" :x1="X1" :y1="TOP + 64" :x2="X1" :y2="TOP + 76" /><line class="dg-dim" :x1="X2" :y1="TOP + 64" :x2="X2" :y2="TOP + 76" />
            <text class="dg-dimtext" :x="(X1 + X2) / 2" :y="TOP + 60" text-anchor="middle">{{ dim(r?.spacing) }}</text>
          </svg>
          <p class="hint">Vertical lengths are drawn to scale; the spacing and the tap height are exaggerated so they stay readable. Coax centre conductor goes to the long element, the shield to the stub, at the tap.</p>
        </div>
        <DesignActions v-model:name="name" tool-id="jpole" :default-name="`J-pole ${f ? fmt(f / 1e6) : ''} MHz`" :svg="svgEl" :file="`jpole-${f ? fmt(f / 1e6) : 'x'}MHz.svg`"
          :disabled="!r" :summary="`${f ? fmt(f / 1e6) : ''} MHz, ${dim(r?.total)} overall`" :params="{ f: f ?? 0, k }" />
      </div>
    </div>

    <div class="card stack" style="margin-top:1rem">
      <h2>Building it</h2>
      <ol style="margin:0;padding-left:1.3rem">
        <li style="margin:.4rem 0"><strong>Cut the tubes.</strong> The long element is the overall length. The short element is the stub length, plus the fittings’ extra: with a copper tee or elbows, measure to the <em>centre</em> of each fitting so the electrical length matches the numbers.</li>
        <li style="margin:.4rem 0"><strong>Join the bottom.</strong> Use a ½-inch copper tee or two elbows and a short spacer piece so the long and short tubes are parallel at the spacing shown; solder or braze every joint for a solid short at the bottom.</li>
        <li style="margin:.4rem 0"><strong>Fit the feed.</strong> Drill or clamp two small stainless-steel or brass screws at the tap height: the coax centre conductor goes to the long element and the shield to the stub. Start at the tap shown and slide it for the lowest SWR (move in small steps).</li>
        <li style="margin:.4rem 0"><strong>Add the choke.</strong> Wind 6–8 turns of the coax in a coil a few diameters across (or fit snap-on ferrites) just below the feed point so the coax does not become part of the antenna.</li>
        <li style="margin:.4rem 0"><strong>Seal and mount.</strong> Cap the open tube ends, seal the feed, and fix the antenna to a non-metal pole with the whole J clear of other metal. Re-check the SWR once it is in its final position; metal nearby shifts the tune.</li>
      </ol>
    </div>

    <MaterialsPanel antenna="jpole" />
    <ModsPanel antenna="jpole" />

    <template #explain>
      <div class="formula">overall = 0.75 · k · λ       stub = 0.25 · k · λ       radiator = overall − stub = 0.5 · k · λ</div>
      <p>A J-pole is a half-wave radiator with a quarter-wave stub as its matching section. At the shorted bottom of a quarter-wave stub the impedance is almost zero; moving the feed tap up the stub raises it until it reaches about 50 Ω, which is why the coax connects part-way up. Because the radiator is fed at the shorted end of the stub, it needs no radials or ground plane, although the outside of the coax still needs a choke.</p>
      <p><strong>Empirical design estimate, not a simulation.</strong> The spacing and tap are starting values: they depend on the tube diameter and fittings. SWR bandwidth, gain and pattern are not predicted. A J-pole’s gain is about that of a half-wave dipole, so claims of much more should be treated with caution.</p>
    </template>
  </ToolLayout>
</template>
