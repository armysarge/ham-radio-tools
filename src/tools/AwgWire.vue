<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import {
  AWG_MAX, AWG_MIN, acResistanceRatio, areaFromDiameter, awgAltLabel, awgDiameter, awgGauges, awgLabel, circularMils,
  diameterFromArea, massPerMetre, nearestAwg, resistancePerMetre, skinDepth, thinnestGaugeForDrop, voltageDrop,
} from '../lib/wire'
import { FREQ_UNITS, LENGTH_UNITS, fmt, type Unit } from '../lib/units'

const DIAMETER_UNITS: Unit[] = [{ label: 'mm', factor: 1e-3 }, { label: 'in', factor: 0.0254 }, { label: 'mil', factor: 25.4e-6 }]
const AREA_UNITS: Unit[] = [{ label: 'mm²', factor: 1e-6 }, { label: 'cmil', factor: 5.067074790974978e-10 }]

type Mode = 'gauge' | 'diameter' | 'area'
const mode = ref<Mode>('gauge')
const gauge = ref(14)
const diameterIn = ref<number | null>(1.6e-3)
const areaIn = ref<number | null>(2e-6)
const tempC = ref<number | null>(20)
const lengthM = ref<number | null>(3)
const currentA = ref<number | null>(20)
const supplyV = ref<number | null>(13.8)
const maxDropPct = ref<number | null>(3)
const freqHz = ref<number | null>(14.2e6)
const roundTrip = ref(true)

const wire = computed(() => {
  try {
    if (mode.value === 'gauge') return { d: awgDiameter(gauge.value), error: '' }
    if (mode.value === 'diameter') return { d: diameterIn.value, error: '' }
    return { d: areaIn.value == null ? null : diameterFromArea(areaIn.value), error: '' }
  } catch (e) { return { d: null, error: (e as Error).message } }
})
const d = computed(() => wire.value.d)
const nearest = computed(() => {
  if (d.value == null) return { value: null, error: '' }
  try { return { value: nearestAwg(d.value), error: '' } } catch (e) { return { value: null, error: (e as Error).message } }
})
const temp = computed(() => tempC.value ?? 20)
const props = computed(() => {
  if (d.value == null) return null
  const rPerM = resistancePerMetre(d.value, temp.value)
  return { area: areaFromDiameter(d.value), cmil: circularMils(d.value), ohmPerKm: rPerM * 1000, ohmPer1000ft: rPerM * 304.8, kgPerKm: massPerMetre(d.value) * 1000 }
})
const drop = computed(() => {
  if (d.value == null || lengthM.value == null || currentA.value == null || supplyV.value == null) return { value: null, error: '' }
  try { return { value: voltageDrop({ diameter: d.value, currentA: currentA.value, oneWayLengthM: lengthM.value, supplyV: supplyV.value, tempC: temp.value, roundTrip: roundTrip.value }), error: '' } }
  catch (e) { return { value: null, error: (e as Error).message } }
})
const suggested = computed(() => {
  if (lengthM.value == null || currentA.value == null || supplyV.value == null || maxDropPct.value == null) return { gauge: undefined as number | null | undefined, error: '' }
  try { return { gauge: thinnestGaugeForDrop({ currentA: currentA.value, oneWayLengthM: lengthM.value, supplyV: supplyV.value, tempC: temp.value, roundTrip: roundTrip.value }, maxDropPct.value), error: '' } }
  catch (e) { return { gauge: undefined, error: (e as Error).message } }
})
const skin = computed(() => {
  if (d.value == null || freqHz.value == null) return null
  try { const delta = skinDepth(freqHz.value, temp.value); return { delta, ratio: acResistanceRatio(d.value, delta) } } catch { return null }
})
const gaugeText = (n: number) => { const alt = awgAltLabel(n); return alt ? `${awgLabel(n)} (${alt})` : awgLabel(n) }
const nearestText = computed(() => {
  const n = nearest.value.value
  if (!n) return null
  return `${gaugeText(n.gauge)} AWG` + (Math.abs(n.diameterErrorPct) < 0.05 ? '' : ` (${n.diameterErrorPct > 0 ? '+' : ''}${fmt(n.diameterErrorPct, 3)} % diameter)`)
})
const rows = computed(() => awgGauges().map((n) => {
  const dia = awgDiameter(n)
  return { n, label: gaugeText(n), mm: dia * 1000, mm2: areaFromDiameter(dia) * 1e6, ohmKm: resistancePerMetre(dia, temp.value) * 1000 }
}))
const highlighted = computed(() => nearest.value.value?.gauge)
</script>

<template>
  <ToolLayout id="awg-wire" :references="['ASTM B258, Standard Specification for Nominal Diameters and Cross-Sectional Areas of AWG Sizes of Solid Round Wires: diameter = 0.127 mm × 92^((36 − n)/39).', 'Annealed copper resistivity 1.7241 × 10⁻⁸ Ω·m at 20 °C (100 % IACS) and a temperature coefficient of 0.00393 per °C.']">
    <div class="cols">
      <div class="card stack">
        <div class="seg" role="group" aria-label="Enter the wire as">
          <button :aria-pressed="mode === 'gauge'" @click="mode = 'gauge'">AWG gauge</button>
          <button :aria-pressed="mode === 'diameter'" @click="mode = 'diameter'">Diameter</button>
          <button :aria-pressed="mode === 'area'" @click="mode = 'area'">Area</button>
        </div>
        <div v-if="mode === 'gauge'" class="field">
          <label class="lbl" for="awg-gauge">Wire gauge</label>
          <select id="awg-gauge" v-model.number="gauge">
            <option v-for="n in awgGauges()" :key="n" :value="n">{{ gaugeText(n) }} AWG</option>
          </select>
          <div class="hint">{{ awgLabel(AWG_MIN) }} to {{ AWG_MAX }} AWG, solid round copper.</div>
        </div>
        <NumField v-else-if="mode === 'diameter'" v-model="diameterIn" label="Conductor diameter" :units="DIAMETER_UNITS" unit="mm" :min="0" minExclusive hint="Bare copper, without insulation." />
        <NumField v-else v-model="areaIn" label="Cross-sectional area" :units="AREA_UNITS" unit="mm²" :min="0" minExclusive />
        <NumField v-model="tempC" label="Conductor temperature" unit="°C" :min="-100" :max="250" hint="Resistance is quoted at this temperature; 20 °C is the reference." />
        <p v-if="wire.error || nearest.error" class="err" role="alert">{{ wire.error || nearest.error }}</p>
      </div>
      <div class="card results" aria-live="polite">
        <ResultRow label="Nearest AWG" :value="nearestText" big />
        <ResultRow label="Diameter" :value="d == null ? null : d * 1000" unit="mm" />
        <ResultRow label="Diameter" :value="d == null ? null : d / 0.0254" unit="in" :sig="5" />
        <ResultRow label="Area" :value="props ? props.area * 1e6 : null" unit="mm²" />
        <ResultRow label="Circular mils" :value="props ? props.cmil : null" unit="cmil" />
        <ResultRow label="DC resistance" :value="props ? props.ohmPerKm : null" unit="Ω/km" />
        <ResultRow label="DC resistance" :value="props ? props.ohmPer1000ft : null" unit="Ω/1000 ft" />
        <ResultRow label="Copper mass" :value="props ? props.kgPerKm : null" unit="kg/km" />
      </div>
    </div>

    <div class="cols">
      <div class="card stack">
        <h3>Voltage drop on a run</h3>
        <NumField v-model="lengthM" label="Run length (one way)" :units="LENGTH_UNITS" unit="m" :min="0" />
        <NumField v-model="currentA" label="Current" unit="A" :min="0" />
        <NumField v-model="supplyV" label="Supply voltage" unit="V" :min="0" minExclusive />
        <div class="seg" role="group" aria-label="Conductors in the run">
          <button :aria-pressed="roundTrip" @click="roundTrip = true">Out and back</button>
          <button :aria-pressed="!roundTrip" @click="roundTrip = false">Single conductor</button>
        </div>
        <NumField v-model="maxDropPct" label="Allowed drop" unit="%" :min="0" minExclusive />
        <p v-if="drop.error || suggested.error" class="err" role="alert">{{ drop.error || suggested.error }}</p>
      </div>
      <div class="card results" aria-live="polite">
        <ResultRow label="Voltage drop" :value="drop.value ? drop.value.dropV : null" unit="V" />
        <ResultRow label="Drop of supply" :value="drop.value ? drop.value.dropPct : null" unit="%" />
        <ResultRow label="Power lost in wire" :value="drop.value ? drop.value.lossW : null" unit="W" />
        <ResultRow label="Conductor length" :value="drop.value ? drop.value.conductorM : null" unit="m" />
        <ResultRow label="Thinnest gauge within the allowed drop"
          :value="suggested.gauge === undefined ? null : suggested.gauge === null ? 'None up to 0000 AWG' : gaugeText(suggested.gauge) + ' AWG'" />
      </div>
    </div>

    <div class="cols">
      <div class="card stack">
        <h3>Skin effect</h3>
        <NumField v-model="freqHz" label="Frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
      </div>
      <div class="card results" aria-live="polite">
        <ResultRow label="Skin depth in copper" :value="skin ? skin.delta * 1e6 : null" unit="µm" />
        <ResultRow label="Approx. AC/DC resistance ratio" :value="skin ? skin.ratio : null" note="Isolated solid round wire; the ratio is 1 near DC." />
      </div>
    </div>

    <div class="card">
      <h3>AWG chart</h3>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th scope="col">AWG</th><th scope="col">Diameter (mm)</th><th scope="col">Area (mm²)</th><th scope="col">Resistance (Ω/km)</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.n" :aria-current="r.n === highlighted ? 'true' : undefined" :style="r.n === highlighted ? 'font-weight:700;color:var(--accent)' : ''">
              <th scope="row">{{ r.label }}</th><td class="mono">{{ fmt(r.mm, 4) }}</td><td class="mono">{{ fmt(r.mm2, 4) }}</td><td class="mono">{{ fmt(r.ohmKm, 4) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="hint">Solid bare copper at the chosen temperature. Stranded wire of the same AWG has a slightly larger overall diameter and a little more resistance per metre.</p>
    </div>

    <template #explain>
      <div class="formula">
        <math display="block">
          <mi>d</mi><mo>=</mo><mn>0.127</mn><mtext> mm</mtext><mo>×</mo>
          <msup><mn>92</mn><mfrac><mrow><mn>36</mn><mo>−</mo><mi>n</mi></mrow><mn>39</mn></mfrac></msup>
        </math>
        <math display="block">
          <mi>R</mi><mo>=</mo><mfrac><mrow><mi>ρ</mi><mo>·</mo><mi>L</mi></mrow><mrow><mi>π</mi><msup><mi>d</mi><mn>2</mn></msup><mo>/</mo><mn>4</mn></mrow></mfrac>
        </math>
        <math display="block">
          <mi>δ</mi><mo>=</mo><msqrt><mfrac><mi>ρ</mi><mrow><mi>π</mi><mi>f</mi><msub><mi>μ</mi><mn>0</mn></msub></mrow></mfrac></msqrt>
        </math>
      </div>
      <p>n is the gauge number (0000, 000 and 00 are −3, −2 and −1), d is the bare conductor diameter, ρ is copper resistivity, L is the conductor length, f is frequency and μ<sub>0</sub> is the permeability of free space. Every six gauge steps roughly halves the diameter; every three steps roughly halves the area and resistance.</p>
      <p>Resistivity is 1.7241 × 10<sup>−8</sup> Ω·m at 20 °C and rises 0.393 % per °C. An out-and-back run doubles the conductor length, so use it for a supply and its return. The thinnest-gauge suggestion picks the first standard size whose drop is within your limit.</p>
      <p>Skin depth shows why RF current travels near the surface. The AC/DC ratio is a first-order estimate for an isolated solid wire, not a measurement of coil or bundled-conductor behaviour. Current-carrying ratings depend on insulation, bundling, temperature and local wiring rules, so this tool gives no ampacity figure: for safety, use the cable maker's rating and your local code.</p>
    </template>
  </ToolLayout>
</template>
