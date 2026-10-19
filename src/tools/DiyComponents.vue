<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import DiyDiagram from '../components/DiyDiagram.vue'
import { FREQ_UNITS, fmt } from '../lib/units'
import { DIELECTRICS, airCoilBuild, airSafeVolts, airVariable, dummyLoadOptions, maxSingleLayerTurns, plateAreaFor, plateCapacitance, toroidTurnLengthM } from '../lib/diy'
import { inductiveReactanceOf, toroidInductance, toroidTurns } from '../lib/station'
import { CORES, CORES_META } from '../data/cores'
import { DIY, DIY_REVISION, type DiyId } from '../data/diy'

const tab = ref<DiyId>('coil')
const project = computed(() => DIY.find((p) => p.id === tab.value)!)
const safe = <T,>(f: () => T): T | null => { try { return f() } catch { return null } }
const mm = (m: number) => `${fmt(m * 1000, 4)} mm`

// coil
const cL = ref<number | null>(10), cD = ref<number | null>(0.025), cW = ref<number | null>(0.0005), cS = ref(1)
const coil = computed(() => (cL.value && cD.value && cW.value ? safe(() => airCoilBuild(cL.value!, cD.value!, cW.value!, cS.value)) : null))
// toroid
const tCore = ref('T50-2'), tL = ref<number | null>(10e-6), tW = ref<number | null>(0.0005), tF = ref<number | null>(7e6)
const core = computed(() => CORES.find((c) => c.name === tCore.value)!)
const tor = computed(() => {
  if (!tL.value || !tW.value) return null
  return safe(() => {
    const n = toroidTurns(tL.value!, core.value.al), perTurn = toroidTurnLengthM(core.value), fit = maxSingleLayerTurns(core.value.idIn, tW.value!)
    return { n, wire: Math.ceil(n) * perTurn, fit, fits: Math.ceil(n) <= fit, x: tF.value ? inductiveReactanceOf(toroidInductance(Math.round(n), core.value.al), tF.value) : null }
  })
})
// foil capacitor
const fC = ref<number | null>(1e-9), fT = ref<number | null>(0.0001), fSheets = ref(2), fEr = ref(2.3)
const foil = computed(() => (fC.value && fT.value ? safe(() => {
  const area = plateAreaFor(fC.value!, fT.value!, fEr.value, fSheets.value - 1)
  return { area, side: Math.sqrt(area), back: plateCapacitance(area, fT.value!, fEr.value, fSheets.value - 1) }
}) : null))
// air variable
const aC = ref<number | null>(100e-12), aR = ref<number | null>(0.03), aRi = ref<number | null>(0.01), aG = ref<number | null>(0.001)
const air = computed(() => (aC.value && aR.value && aRi.value != null && aG.value ? safe(() => airVariable(aC.value!, aR.value!, aRi.value!, aG.value!)) : null))
// dummy load
const dR = ref<number | null>(100), dP = ref<number | null>(2)
const dummy = computed(() => (dR.value && dP.value ? safe(() => dummyLoadOptions(dR.value!, dP.value!).slice(0, 6)) : null))
// choke
const kCore = ref('FT240-43'), kOd = ref<number | null>(0.00495), kF = ref<number | null>(7e6), kTurns = ref<number | null>(8)
const kc = computed(() => CORES.find((c) => c.name === kCore.value)!)
const choke = computed(() => (kOd.value && kTurns.value ? safe(() => {
  const fit = maxSingleLayerTurns(kc.value.idIn, kOd.value!), l = toroidInductance(kTurns.value!, kc.value.al)
  return { fit, ok: kTurns.value! <= fit, l, x: kF.value ? inductiveReactanceOf(l, kF.value) : null }
}) : null))
const ferrite = computed(() => CORES.filter((c) => c.material.startsWith('Ferrite')))
</script>

<template>
  <ToolLayout id="diy-components" :references="[`Parallel-plate capacitance C = ε₀·εr·A/d; Wheeler (1928) for air coils; N = √(L/AL) for toroids (core table: ${CORES_META.source}, revision ${CORES_META.revision}).`, 'Build notes are general amateur-radio practice (ARRL Handbook “Component data and construction”, ARRL Antenna Book on chokes and baluns); reviewed ' + DIY_REVISION + '. They are cautious rules of thumb, not tested designs.']">
    <div class="seg" role="group" aria-label="Part to build" style="margin-bottom:1rem">
      <button v-for="p in DIY" :key="p.id" :aria-pressed="tab === p.id" @click="tab = p.id">{{ p.title }}</button>
    </div>
    <p class="muted" style="margin-top:0">{{ project.blurb }}</p>

    <div class="cols">
      <div class="stack">
        <div class="card"><DiyDiagram :kind="tab" /></div>
        <!-- inputs per project -->
        <div class="card stack" v-if="tab === 'coil'">
          <NumField v-model="cL" label="Inductance wanted" unit="µH" :min="0" minExclusive />
          <NumField v-model="cD" label="Former diameter (outside)" unit="mm" :units="[{ label: 'mm', factor: 0.001 }, { label: 'cm', factor: 0.01 }, { label: 'in', factor: 0.0254 }]" :min="0" minExclusive />
          <NumField v-model="cW" label="Wire diameter (with enamel)" unit="mm" :units="[{ label: 'mm', factor: 0.001 }]" :min="0" minExclusive />
          <label class="field"><span class="lbl">Winding</span><select v-model.number="cS"><option :value="1">Close wound (turns touching)</option><option :value="2">Spaced: one wire-width gap</option><option :value="3">Spaced: two wire-widths</option></select></label>
        </div>
        <div class="card stack" v-else-if="tab === 'toroid'">
          <label class="field"><span class="lbl">Core</span><select v-model="tCore"><option v-for="c in CORES" :key="c.name" :value="c.name">{{ c.name }} ({{ c.material }}, AL {{ c.al }})</option></select></label>
          <NumField v-model="tL" label="Inductance wanted" unit="µH" :units="[{ label: 'µH', factor: 1e-6 }, { label: 'nH', factor: 1e-9 }, { label: 'mH', factor: 1e-3 }]" :min="0" minExclusive />
          <NumField v-model="tW" label="Wire diameter (with enamel)" unit="mm" :units="[{ label: 'mm', factor: 0.001 }]" :min="0" minExclusive />
          <NumField v-model="tF" label="Frequency (for reactance)" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        </div>
        <div class="card stack" v-else-if="tab === 'foilcap'">
          <NumField v-model="fC" label="Capacitance wanted" unit="nF" :units="[{ label: 'pF', factor: 1e-12 }, { label: 'nF', factor: 1e-9 }, { label: 'µF', factor: 1e-6 }]" :min="0" minExclusive />
          <label class="field"><span class="lbl">Dielectric</span><select v-model.number="fEr"><option v-for="d in DIELECTRICS" :key="d.name" :value="d.er">{{ d.name }} (εr {{ d.er }})</option></select></label>
          <NumField v-model="fT" label="Thickness of the film (measured)" unit="mm" :units="[{ label: 'mm', factor: 0.001 }, { label: 'µm', factor: 1e-6 }]" :min="0" minExclusive hint="Fold ten layers, measure, divide by ten." />
          <label class="field"><span class="lbl">Foil sheets (alternate leads A and B)</span><select v-model.number="fSheets"><option v-for="n in [2, 3, 4, 5, 6]" :key="n" :value="n">{{ n }} sheets ({{ n - 1 }} film gap{{ n === 2 ? '' : 's' }})</option></select></label>
          <p class="hint">{{ DIELECTRICS.find((d) => d.er === fEr)?.note }}</p>
        </div>
        <div class="card stack" v-else-if="tab === 'aircap'">
          <NumField v-model="aC" label="Maximum capacitance wanted" unit="pF" :units="[{ label: 'pF', factor: 1e-12 }, { label: 'nF', factor: 1e-9 }]" :min="0" minExclusive />
          <NumField v-model="aR" label="Plate outer radius R" unit="mm" :units="[{ label: 'mm', factor: 0.001 }, { label: 'cm', factor: 0.01 }]" :min="0" minExclusive />
          <NumField v-model="aRi" label="Inner cut-out radius r" unit="mm" :units="[{ label: 'mm', factor: 0.001 }, { label: 'cm', factor: 0.01 }]" :min="0" />
          <NumField v-model="aG" label="Gap between plates" unit="mm" :units="[{ label: 'mm', factor: 0.001 }]" :min="0" minExclusive hint="A wider gap handles more voltage but needs more plates." />
        </div>
        <div class="card stack" v-else-if="tab === 'dummy'">
          <NumField v-model="dR" label="Resistor value you have" unit="Ω" :min="0" minExclusive />
          <NumField v-model="dP" label="Power rating of each resistor" unit="W" :min="0" minExclusive />
        </div>
        <div class="card stack" v-else>
          <label class="field"><span class="lbl">Ferrite core</span><select v-model="kCore"><option v-for="c in ferrite" :key="c.name" :value="c.name">{{ c.name }} (inner hole {{ c.idIn }} in, AL {{ c.al }})</option></select></label>
          <NumField v-model="kOd" label="Coax outer diameter" unit="mm" :units="[{ label: 'mm', factor: 0.001 }]" :min="0" minExclusive hint="RG-58 about 4.95 mm, RG-8X about 6.1 mm, RG-213 about 10.3 mm." />
          <NumField v-model="kTurns" label="Turns you plan" :min="1" />
          <NumField v-model="kF" label="Frequency (for reactance)" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        </div>
      </div>

      <div class="stack">
        <div class="card results" aria-live="polite">
          <template v-if="tab === 'coil'">
            <ResultRow label="Turns to wind" :value="coil?.turns ?? null" big />
            <ResultRow label="Winding length" :value="coil ? mm(coil.lengthM) : null" />
            <ResultRow label="Wire to cut (plus leads)" :value="coil ? fmt(coil.wireM, 3) : null" unit="m" />
            <p v-if="coil && coil.lengthToDiameter < 0.8" class="notice" role="status">The coil is shorter than 0.8 × its diameter, where the formula is less accurate (a few percent). Expect to trim.</p>
          </template>
          <template v-else-if="tab === 'toroid'">
            <ResultRow label="Turns to wind" :value="tor?.n ?? null" big :note="tor ? `about ${Math.round(tor.n)}` : ''" />
            <ResultRow label="Wire to cut (plus leads)" :value="tor ? fmt(tor.wire, 3) : null" unit="m" />
            <ResultRow label="Most turns that fit in one layer" :value="tor?.fit ?? null" />
            <ResultRow label="Reactance at this frequency" :value="tor?.x ?? null" unit="Ω" />
            <p v-if="tor && !tor.fits" class="notice" role="status">That many turns will not fit in one layer: use thinner wire, a larger core, or a core with higher AL.</p>
            <p v-if="core.material.startsWith('Ferrite')" class="notice" role="status">Ferrite is for chokes and broadband transformers, not tuned circuits.</p>
          </template>
          <template v-else-if="tab === 'foilcap'">
            <ResultRow label="Area of each foil sheet" :value="foil ? fmt(foil.area * 1e4, 4) : null" unit="cm²" />
            <ResultRow label="…or a square side of" :value="foil ? fmt(foil.side * 100, 3) : null" unit="cm" big />
            <p v-if="foil && foil.side > 0.5" class="notice" role="status">That is over half a metre a side: use more sheets, a thinner film or a higher-permittivity film.</p>
            <p v-if="foil" class="hint">Make the film about 1 cm larger than the foil all round so the sheets cannot touch.</p>
          </template>
          <template v-else-if="tab === 'aircap'">
            <ResultRow label="Plates (rotor + stator)" :value="air?.plates ?? null" big />
            <ResultRow label="Overlap per gap" :value="air ? fmt(air.overlapM2 * 1e4, 4) : null" unit="cm²" />
            <ResultRow label="Maximum capacitance from those plates" :value="air ? fmt(air.cMax * 1e12, 4) : null" unit="pF" />
            <ResultRow label="Safe voltage with this gap" :value="aG ? fmt(airSafeVolts(aG), 3) : null" unit="V" note="one-fifth of the dry-air breakdown: a clean, smooth, dust-free ceiling" />
            <p class="hint">Minimum capacitance is whatever strays remain: several pF at the least.</p>
          </template>
          <template v-else-if="tab === 'dummy'">
            <template v-if="dummy && dummy.length">
              <div v-for="o in dummy" :key="o.series + 'x' + o.parallel" class="result">
                <div>{{ o.series }} in series × {{ o.parallel }} in parallel<div class="hint">{{ o.count }} resistors · {{ fmt(o.ohms, 4) }} Ω · SWR {{ fmt(o.swr, 3) }}</div></div>
                <div><span class="val">{{ fmt(o.sustainedW, 3) }}</span> <span class="unit">W</span></div><div></div>
              </div>
              <p class="hint">Watts shown are sustained: half the combined rating, for resistors in still air. Rated total is double that.</p>
            </template>
            <p v-else class="notice" role="status">No arrangement of up to 24 of these resistors lands within 6 % of 50 Ω. Try a different value (47 Ω, 100 Ω, 150 Ω, 220 Ω and 470 Ω all work).</p>
          </template>
          <template v-else>
            <ResultRow label="Most turns that fit in one layer" :value="choke?.fit ?? null" big />
            <ResultRow label="Inductance from the AL value" :value="choke ? fmt(choke.l * 1e6, 4) : null" unit="µH" />
            <ResultRow label="Reactance at this frequency (upper bound)" :value="choke?.x ?? null" unit="Ω" />
            <p v-if="choke && !choke.ok" class="notice" role="status">{{ kTurns }} turns will not fit in one layer: use a larger core or fewer turns.</p>
          </template>
        </div>

        <div class="card stack">
          <h3>What to gather (everyday items)</h3>
          <ul style="margin:0;padding-left:1.2rem"><li v-for="i in project.items" :key="i">{{ i }}</li></ul>
          <h3>How to make it</h3>
          <ol style="margin:0;padding-left:1.2rem"><li v-for="s in project.steps" :key="s">{{ s }}</li></ol>
          <h3>Check it</h3>
          <ul style="margin:0;padding-left:1.2rem"><li v-for="c in project.check" :key="c">{{ c }}</li></ul>
          <h3>Safety</h3>
          <ul style="margin:0;padding-left:1.2rem"><li v-for="c in project.cautions" :key="c">{{ c }}</li></ul>
          <p class="hint"><strong>How accurate:</strong> {{ project.honest }}</p>
        </div>
      </div>
    </div>
    <template #explain>
      <p>Each part is a textbook formula turned into a build size: capacitors from plate area, gap and the film’s permittivity (C = ε₀·εr·A/d), coils from Wheeler’s formula, toroids from the core’s AL value. Real home-made parts differ from the numbers because films stretch, plates warp and winding is never perfect. The answer is a good first cut: build it, measure it, and trim.</p>
      <p>Parts from this page are for receive circuits, test gear and learning, plus low-power, well-ventilated transmit use where noted. Mains-voltage and high-voltage parts are left out on purpose.</p>
    </template>
  </ToolLayout>
</template>
