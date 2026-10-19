<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import SpectrumSketch from '../components/SpectrumSketch.vue'
import { FREQ_UNITS, LENGTH_UNITS, feetInches, fmt } from '../lib/units'
import { harmonicsInBands, maxFreqForDiameter, nearestHarmonic, smallLoopLimits } from '../lib/qrm'
import { QRM_META, QRM_SOURCES, QRM_STEPS, SNIFFER_TIPS } from '../data/qrmSources'
import { SNIFFER_BUILD_META, SNIFFER_PARTS, SNIFFER_SAFETY, SNIFFER_STEPS, SNIFFER_TROUBLE, SNIFFER_VARIANTS } from '../data/snifferBuild'
import SnifferLoopDiagram from '../components/SnifferLoopDiagram.vue'
import { state } from '../core/store'

const tab = ref<'steps' | 'sources' | 'harm' | 'diy'>('steps')
const TABS: ['steps' | 'sources' | 'harm' | 'diy', string][] = [['steps', 'How to hunt'], ['sources', 'Sources & signatures'], ['harm', 'Harmonic finder'], ['diy', 'DIY sniffer loop']]
const done = reactive<Record<number, boolean>>({})

// harmonic finder
const fund = ref<number | null>(65e3), listen = ref<number | null>(7.1e6), bw = ref<number | null>(2.4e3)
const hits = computed(() => { try { return fund.value ? harmonicsInBands(fund.value) : [] } catch { return [] } })
const near = computed(() => { try { return fund.value && listen.value ? nearestHarmonic(fund.value, listen.value) : null } catch { return null } })
const inPass = computed(() => near.value && bw.value ? Math.abs(near.value.offsetHz) <= bw.value / 2 : null)

// sniffer loop
const imperial = computed(() => state.units === 'imperial')
const dim = (m: number) => (imperial.value ? feetInches(m) : m >= 1 ? `${m.toFixed(2)} m` : `${(m * 100).toFixed(0)} cm`)
const fmax = ref<number | null>(30e6), diam = ref<number | null>(0.3)
const lim = computed(() => { try { return fmax.value ? smallLoopLimits(fmax.value) : null } catch { return null } })
const maxF = computed(() => { try { return diam.value ? maxFreqForDiameter(diam.value) : null } catch { return null } })
const spacingPx = computed(() => 28)
</script>

<template>
  <ToolLayout id="qrm-hunting" :references="[QRM_META.source + ` (revision ${QRM_META.revision}).`, 'Small-loop λ/10 rule: ARRL Antenna Book, “Small loop antennas” and direction finding.']">
    <div class="seg" role="tablist" aria-label="QRM hunting sections" style="margin-bottom:1rem">
      <button v-for="[k, t] in TABS" :key="k" role="tab" :aria-selected="tab === k" :aria-pressed="tab === k" @click="tab = k">{{ t }}</button>
    </div>

    <div v-if="tab === 'steps'" class="stack">
      <p class="muted" style="margin:0">Tick each step as you go. A tick is only kept while this page is open.</p>
      <label v-for="(s, i) in QRM_STEPS" :key="i" class="card" style="display:flex;gap:.8rem;cursor:pointer;align-items:flex-start">
        <input v-model="done[i]" type="checkbox" style="width:24px;height:24px;margin-top:.2rem;flex:none" />
        <span><strong>{{ i + 1 }}. {{ s.title }}</strong><br />{{ s.detail }}</span>
      </label>
    </div>

    <div v-else-if="tab === 'sources'" class="stack">
      <div class="notice">The sketches are <strong>schematic illustrations</strong> of typical shapes, not recordings of real devices. Real signatures vary with model, load and distance.</div>
      <div v-for="s in QRM_SOURCES" :key="s.id" class="card cols" style="grid-template-columns:minmax(220px,300px) 1fr">
        <SpectrumSketch :shape="s.shape" :label="s.name" :spacing="spacingPx" />
        <div>
          <h3>{{ s.name }}</h3>
          <p style="margin:.2rem 0"><strong>Sounds like:</strong> {{ s.sounds }}</p>
          <p style="margin:.2rem 0"><strong>Looks like:</strong> {{ s.looks }}</p>
          <p style="margin:.2rem 0"><strong>Where:</strong> {{ s.where }}</p>
          <p style="margin:.2rem 0"><strong>Clues:</strong> {{ s.clues }}</p>
          <p style="margin:.2rem 0"><strong>Fix:</strong> {{ s.fix }}</p>
        </div>
      </div>
    </div>

    <div v-else-if="tab === 'harm'" class="cols">
      <div class="card stack">
        <p class="muted" style="margin:0">Measured the spacing between spikes on your waterfall? Enter it. A switching supply or clock puts a spike at every multiple of its frequency.</p>
        <NumField v-model="fund" label="Spacing / switching frequency" :units="FREQ_UNITS" unit="kHz" :min="0" minExclusive hint="Typical supplies: 30–150 kHz." />
        <NumField v-model="listen" label="Frequency you listen on" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <NumField v-model="bw" label="Receiver bandwidth" :units="FREQ_UNITS" unit="kHz" :min="0" minExclusive hint="SSB ≈ 2.4 kHz, CW ≈ 0.5 kHz." />
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <ResultRow label="Nearest harmonic number" :value="near?.n ?? null" />
          <ResultRow label="…at" :value="near ? near.hz / 1e6 : null" unit="MHz" :sig="7" />
          <ResultRow label="Offset from your frequency" :value="near ? near.offsetHz / 1e3 : null" unit="kHz" :sig="3" />
          <p v-if="inPass !== null" class="notice" role="status">{{ inPass ? 'This harmonic falls inside your receiver’s passband, so you will hear it.' : 'It falls outside your passband, so the noise should be audible only if it is strong or broad.' }}</p>
        </div>
        <div class="card">
          <div class="table-wrap"><table class="table"><thead><tr><th>Band</th><th>Harmonics</th><th>First few</th></tr></thead>
            <tbody><tr v-for="h in hits" :key="h.band"><td>{{ h.band }}</td><td :style="h.count ? 'font-weight:700;color:var(--bad)' : ''">{{ h.count }}</td>
              <td class="mono">{{ h.sample.map((s) => fmt(s.hz / 1e6, 6)).join(', ') || '—' }}</td></tr></tbody></table></div>
          <p class="hint">A low fundamental hits every band; “0” means no harmonic lands in that band.</p>
        </div>
      </div>
    </div>

    <div v-else class="stack">
      <div class="cols">
        <div class="card stack">
          <h2>Small-loop size</h2>
          <NumField v-model="fmax" label="Highest frequency you want to use" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
          <div class="results" v-if="lim">
            <ResultRow label="Maximum perimeter (λ/10)" :value="dim(lim.perimeter)" big />
            <ResultRow label="Circular loop diameter" :value="dim(lim.diameter)" />
            <ResultRow label="Square loop side" :value="dim(lim.squareSide)" />
          </div>
        </div>
        <div class="card stack">
          <h2>…or start from the loop you have</h2>
          <NumField v-model="diam" label="Loop diameter" :units="LENGTH_UNITS" :unit="imperial ? 'in' : 'cm'" :min="0" minExclusive />
          <div class="results"><ResultRow label="Usable up to about" :value="maxF == null ? null : maxF / 1e6" unit="MHz" big /></div>
          <p class="hint">Above this the pattern loses its sharp nulls, which makes direction-finding less reliable.</p>
        </div>
      </div>
      <div class="card">
        <svg class="diagram" viewBox="0 0 360 200" role="img" aria-label="Figure-8 pattern of a small loop: strongest in the plane of the loop, null perpendicular to it" style="max-width:420px;margin:auto">
          <ellipse cx="180" cy="100" rx="120" ry="34" fill="var(--accent)" fill-opacity=".18" class="dg-dim" />
          <line class="dg-wire" x1="180" y1="60" x2="180" y2="140" /><circle class="dg-solid" cx="180" cy="100" r="4" />
          <text class="dg-text" x="300" y="94" text-anchor="middle">strongest</text><text class="dg-text" x="60" y="94" text-anchor="middle">strongest</text>
          <text class="dg-text" x="180" y="40" text-anchor="middle">null (noise disappears)</text><text class="dg-text" x="180" y="170" text-anchor="middle">null</text>
          <text class="dg-tick" x="188" y="104">loop edge-on</text>
        </svg>
        <p class="hint" style="text-align:center">Top view of a vertical loop seen edge-on: the loop passes signals along its own plane and nulls them broadside. Rotate for the null, then the source lies along that line, in one of two directions.</p>
      </div>
      <div class="card stack">
        <h2>Build a shielded loop, step by step</h2>
        <p class="muted" style="margin:0">A small loop made from a ring of coax with a gap in the outer braid. It senses the magnetic part of a signal and largely ignores local electric noise, and it has deep nulls you can use to find a direction. Cost: a few euros of coax and a box.</p>
        <div class="cols" style="grid-template-columns:minmax(260px,420px) 1fr">
          <SnifferLoopDiagram />
          <div>
            <h3>Parts</h3>
            <ul style="margin:0;padding-left:1.2rem"><li v-for="p in SNIFFER_PARTS" :key="p.item" style="margin:.35rem 0"><strong>{{ p.item }}</strong><br /><span class="muted">{{ p.why }}</span></li></ul>
          </div>
        </div>
        <h3>Steps</h3>
        <ol style="margin:0;padding-left:1.3rem"><li v-for="s in SNIFFER_STEPS" :key="s.title" style="margin:.5rem 0"><strong>{{ s.title }}.</strong> {{ s.detail }}</li></ol>
        <h3>If it does not work</h3>
        <ul style="margin:0;padding-left:1.2rem"><li v-for="t in SNIFFER_TROUBLE" :key="t.problem" style="margin:.35rem 0"><strong>{{ t.problem }}:</strong> {{ t.fix }}</li></ul>
        <h3>Other versions</h3>
        <details v-for="v in SNIFFER_VARIANTS" :key="v.name" class="explain" style="margin:0"><summary>{{ v.name }}</summary><p>{{ v.body }}</p></details>
        <p class="notice" style="margin:0"><strong>Safety.</strong> {{ SNIFFER_SAFETY }}</p>
        <p class="hint" style="margin:0">Source basis: {{ SNIFFER_BUILD_META.source }} (revision {{ SNIFFER_BUILD_META.revision }}).</p>
      </div>
      <div class="card stack">
        <h2>More tips</h2>
        <details v-for="t in SNIFFER_TIPS" :key="t.title" class="explain" style="margin:0"><summary>{{ t.title }}</summary><p>{{ t.body }}</p></details>
      </div>
    </div>

    <template #explain>
      <p>Man-made noise is usually either <strong>local</strong> (found by switching things off) or <strong>external</strong> (found by walking with a portable receiver and a directional loop). Harmonic maths tells you whether a suspected fundamental can reach your band: noise at n × f lands wherever n × f falls within your passband.</p>
      <div class="formula">harmonic n = f / fundamental     small loop: perimeter ≤ λ / 10     usable f<sub>max</sub> = c / (10 · π · D)</div>
      <p>Interference rules, limits and reporting procedures are different in every country, so this tool gives no legal advice; contact your national regulator or amateur-radio society for local steps.</p>
    </template>
  </ToolLayout>
</template>
