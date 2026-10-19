<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ToolLayout from '../components/ToolLayout.vue'
import ModsPanel from '../components/ModsPanel.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import DesignActions from '../components/DesignActions.vue'
import { FREQ_UNITS, feetInches, fmt } from '../lib/units'
import { efhw, efhwMatch } from '../lib/antenna'
import { HF_BANDS } from '../lib/qrm'
import { BANDS } from '../data/bands'
import { loadedParams, state } from '../core/store'

const p = loadedParams(useRoute(), 'efhw')
const f = ref<number | null>(Number(p?.f ?? 7.1e6))
const k = ref(Number(p?.k ?? 0.95))
const ratio = ref<number>(Number(p?.ratio ?? 49))
const name = ref('')
const svgEl = ref<SVGSVGElement>()

const r = computed(() => { try { return f.value ? efhw(f.value, k.value, HF_BANDS) : null } catch { return null } })
const imperial = computed(() => state.units === 'imperial')
const dim = (m: number | null | undefined) => (m == null ? '—' : imperial.value ? feetInches(m) : m >= 1 ? `${m.toFixed(2)} m` : `${(m * 100).toFixed(0)} cm`)
const turnsRatio = computed(() => Math.sqrt(ratio.value))
const ENDS = [1800, 2500, 3200, 4000]
const matches = computed(() => ENDS.map((z) => ({ z, ...efhwMatch(z, ratio.value) })))
const usable = computed(() => r.value?.harmonics.filter((h) => h.band) ?? [])
</script>

<template>
  <ToolLayout id="efhw" :references="[
    'ARRL Antenna Book — end-fed half-wave: a half-wave wire presents a high impedance (thousands of ohms) at its end, matched with a 49:1–64:1 transformer.',
    'Wire length uses the same ≈ 468/f (ft) rule as a dipole; trim with an analyser. Impedance transformer maths: Z₍in₎ = Z₍end₎ / ratio.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <div class="seg" role="group" aria-label="Band presets">
            <button v-for="[b, mhz] in BANDS" :key="b" :aria-pressed="f === mhz * 1e6" @click="f = mhz * 1e6">{{ b }}</button>
          </div>
          <NumField v-model="f" label="Fundamental (lowest) frequency" :units="FREQ_UNITS" unit="MHz" :min="100e3" :max="200e6" hint="The half-wave band; higher bands work on its multiples." />
          <label class="field"><span class="lbl">End-effect factor k = {{ k.toFixed(3) }}</span><input v-model.number="k" type="range" min="0.92" max="0.99" step="0.001" aria-label="End-effect factor" />
            <span class="hint">0.95 ≈ the 468 ÷ f(MHz) ft rule. Insulated wire and the transformer’s capacitance usually need a little trimming.</span></label>
          <div class="seg" role="group" aria-label="Transformer impedance ratio">
            <button v-for="n in [49, 64]" :key="n" :aria-pressed="ratio === n" @click="ratio = n">{{ n }}:1</button>
          </div>
        </div>
        <div class="card results" aria-live="polite">
          <ResultRow label="Radiating wire" :value="r ? dim(r.length) : null" big />
          <ResultRow label="Cut to start" :value="r ? dim(r.length * 1.03) : null" note="3% long, then trim for the lowest SWR" />
          <ResultRow label="Counterpoise" :value="r ? `${dim(r.counterpoiseMin)} – ${dim(r.counterpoiseMax)}` : null" note="about 0.05–0.1 λ, or use a choke on the coax" />
          <ResultRow :label="`Turns ratio for ${ratio}:1`" :value="turnsRatio" :sig="3" note="impedance ratio = turns ratio squared" />
        </div>
      </div>
      <div class="stack">
        <div class="card">
          <svg ref="svgEl" class="diagram dg-big" viewBox="0 0 640 220" role="img" :aria-label="`End-fed half-wave: wire ${dim(r?.length)}, ${ratio} to 1 transformer at one end`">
            <line class="dg-ground" x1="10" y1="200" x2="630" y2="200" />
            <line class="dg-ground" x1="610" y1="60" x2="610" y2="200" />
            <path class="dg-wire" d="M95 70 H610" />
            <rect class="dg-solid" x="55" y="52" width="40" height="36" rx="4" />
            <text class="dg-text" x="75" y="44" text-anchor="middle">{{ ratio }}:1</text>
            <path class="dg-wire" d="M55 78 H25 V150" style="stroke-width:3;opacity:.6" /><text class="dg-text" x="30" y="170">counterpoise</text>
            <path class="dg-ground" d="M75 88 V150 H110" /><text class="dg-text" x="116" y="154">coax</text>
            <line class="dg-dim" x1="95" y1="105" x2="610" y2="105" /><line class="dg-dim" x1="95" y1="97" x2="95" y2="113" /><line class="dg-dim" x1="610" y1="97" x2="610" y2="113" />
            <text class="dg-dimtext" x="352" y="126" text-anchor="middle">{{ dim(r?.length) }}</text>
          </svg>
          <p class="hint">The feed is at the wire’s end, not its centre. Not to scale in height.</p>
        </div>
        <div class="card">
          <h3>Which bands it covers</h3>
          <div class="table-wrap"><table class="table"><thead><tr><th>Harmonic</th><th>Frequency</th><th>Band</th></tr></thead>
            <tbody><tr v-for="h in r?.harmonics ?? []" :key="h.n"><td>×{{ h.n }}</td><td class="mono">{{ fmt(h.hz / 1e6, 5) }} MHz</td><td :style="h.band ? 'font-weight:700;color:var(--good)' : 'color:var(--muted)'">{{ h.band ?? 'no amateur band' }}</td></tr></tbody></table></div>
          <p class="hint">{{ usable.length ? `Works on ${usable.map((h) => h.band).join(', ')}.` : 'No harmonic lands in an amateur HF band for this fundamental.' }} Harmonics are not exact multiples in practice, so expect to trim for the higher bands.</p>
        </div>
        <div class="card">
          <h3>Why 49:1 or 64:1?</h3>
          <div class="table-wrap"><table class="table"><thead><tr><th>Wire-end impedance</th><th>Seen by radio at {{ ratio }}:1</th><th>SWR</th></tr></thead>
            <tbody><tr v-for="m in matches" :key="m.z"><td class="mono">{{ m.z }} Ω</td><td class="mono">{{ fmt(m.zIn, 3) }} Ω</td><td class="mono">{{ fmt(m.swr, 3) }} : 1</td></tr></tbody></table></div>
          <p class="hint">An ideal, lossless transformer on 50 Ω. The real end impedance is not known to this app (it varies with height, wire and counterpoise), so this shows sensitivity, not a prediction.</p>
        </div>
        <DesignActions v-model:name="name" tool-id="efhw" :default-name="`EFHW ${f ? fmt(f / 1e6) : ''} MHz`" :svg="svgEl" :file="`efhw-${f ? fmt(f / 1e6) : 'x'}MHz.svg`"
          :disabled="!r" :summary="`${f ? fmt(f / 1e6) : ''} MHz, ${dim(r?.length)}, ${ratio}:1`" :params="{ f: f ?? 0, k, ratio }" />
      </div>
    </div>

    <div class="card stack" style="margin-top:1rem">
      <h2>Building the transformer</h2>
      <ul style="margin:0;padding-left:1.2rem">
        <li><strong>Turns:</strong> a {{ ratio }}:1 <em>impedance</em> ratio is a {{ turnsRatio.toFixed(0) }}:1 <em>turns</em> ratio, e.g. 2 turns primary with {{ 2 * turnsRatio }} secondary, or 3 with {{ 3 * turnsRatio }}, on one ferrite core.</li>
        <li><strong>Core:</strong> large type-43 or type-52 toroids are commonly used. Core size and number of cores set the power rating and the loss; at higher power use a bigger core or two stacked.</li>
        <li><strong>Tuning:</strong> builders often add a small capacitor (typically in the low hundreds of picofarads) across the 50 Ω winding to flatten the SWR on the upper bands. Adjust on an analyser; the right value depends on your winding.</li>
        <li><strong>Weatherproof</strong> the box and keep the feed end clear of people: the end of a half-wave wire carries high RF voltage.</li>
      </ul>
      <p class="hint" style="margin:0">These are common amateur practices and are <strong>empirical</strong>; this app does not model the transformer.</p>
    </div>

    <ModsPanel antenna="efhw" />

    <template #explain>
      <div class="formula">L = k · c / (2f)       Z<sub>in</sub> = Z<sub>end</sub> / ratio       harmonics at n · f</div>
      <p>A half-wave wire fed at the end has the voltage at its maximum and the current at its minimum there, so the impedance is very high (often thousands of ohms) on the fundamental <strong>and on every multiple</strong> of it. A transformer brings that down to about 50 Ω, which is why one EFHW works on several bands without a tuner. The wire needs a return path: a short counterpoise or the outside of the coax, and a current choke keeps the coax from becoming part of the antenna.</p>
      <p><strong>Design estimate, not a simulation:</strong> the end impedance, SWR and the pattern on harmonic bands are not predicted. The pattern splits into more lobes as the wire gets longer in wavelengths, and the transformer and counterpoise change the match on each band.</p>
    </template>
  </ToolLayout>
</template>
