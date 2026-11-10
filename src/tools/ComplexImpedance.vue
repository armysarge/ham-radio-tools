<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import ImpedanceDiagram from '../components/ImpedanceDiagram.vue'
import { FREQ_UNITS, fmt, type Unit } from '../lib/units'
import { formatValue } from '../lib/components'
import { KIND_NAME, admittance, cAbs, cArg, combine, matchAgainst, seriesEquivalent, type Element, type ElementKind } from '../lib/impedance'

const L_UNITS: Unit[] = [{ label: 'µH', factor: 1e-6 }, { label: 'nH', factor: 1e-9 }, { label: 'mH', factor: 1e-3 }, { label: 'H', factor: 1 }]
const C_UNITS: Unit[] = [{ label: 'pF', factor: 1e-12 }, { label: 'nF', factor: 1e-9 }, { label: 'µF', factor: 1e-6 }]
const MAX_ELEMENTS = 5
const DEFAULTS: Record<ElementKind, { a: number; b?: number }> = { R: { a: 25 }, L: { a: 1e-6 }, C: { a: 470e-12 }, Z: { a: 50, b: 0 } }

interface Row { id: number; kind: ElementKind; a: number | null; b: number | null }
let nextId = 1
const makeRow = (kind: ElementKind): Row => ({ id: nextId++, kind, a: DEFAULTS[kind].a, b: DEFAULTS[kind].b ?? null })
const mode = ref<'series' | 'parallel'>('series')
const frequency = ref<number | null>(7.1e6)
const z0 = ref<number | null>(50)
const rows = ref<Row[]>([makeRow('R'), makeRow('L'), makeRow('C')])

const add = (kind: ElementKind) => { if (rows.value.length < MAX_ELEMENTS) rows.value.push(makeRow(kind)) }
const remove = (id: number) => { if (rows.value.length > 1) rows.value = rows.value.filter((r) => r.id !== id) }
const setKind = (row: Row, kind: ElementKind) => { row.kind = kind; row.a = DEFAULTS[kind].a; row.b = DEFAULTS[kind].b ?? null }
const rowName = (i: number) => { const k = rows.value[i].kind; return `${k}${rows.value.slice(0, i + 1).filter((r) => r.kind === k).length}` }

const elements = computed<Element[] | null>(() => {
  const out: Element[] = []
  for (const r of rows.value) {
    if (r.a == null || (r.kind === 'Z' && r.b == null)) return null
    out.push({ kind: r.kind, a: r.a, ...(r.kind === 'Z' ? { b: r.b! } : {}) })
  }
  return out
})
const calc = computed(() => {
  if (frequency.value == null || elements.value == null) return { result: null, error: '' }
  try {
    const total = combine(elements.value, frequency.value, mode.value)
    const match = z0.value == null ? null : matchAgainst(total, z0.value)
    const eq = total.open ? null : seriesEquivalent(total.z, frequency.value)
    return { result: { total, match, eq, y: admittance(total) }, error: '' }
  } catch (e) { return { result: null, error: (e as Error).message } }
})
const result = computed(() => calc.value.result)
const signed = (v: number, sig = 5) => `${v < 0 ? '−' : '+'} j${fmt(Math.abs(v), sig)}`
const rect = computed(() => {
  const t = result.value?.total
  if (!t) return null
  return t.open ? 'Open circuit (∞)' : `${fmt(t.z.re, 5)} ${signed(t.z.im)} Ω`
})
const polar = computed(() => {
  const t = result.value?.total
  if (!t) return null
  return t.open ? '∞' : `${fmt(cAbs(t.z), 5)} Ω ∠ ${fmt(cArg(t.z) * 180 / Math.PI, 5)}°`
})
const adm = computed(() => {
  const r = result.value
  if (!r) return null
  return r.total.short ? 'Short circuit (∞)' : `${fmt(r.y.re * 1000, 5)} ${signed(r.y.im * 1000)} mS`
})
const equivalent = computed(() => {
  const eq = result.value?.eq
  if (!eq) return null
  const part = eq.inductance != null ? `${formatValue(eq.inductance, 'H')} inductor` : eq.capacitance != null ? `${formatValue(eq.capacitance, 'F')} capacitor` : 'no reactance'
  return `${formatValue(eq.resistance, 'Ω')} in series with ${part}`
})
</script>

<template>
  <ToolLayout id="complex-impedance" :references="['Complex impedance Z = R + jX, XL = 2πfL and XC = −1/(2πfC): any circuits text, e.g. ARRL Handbook “Electrical Fundamentals”.', 'Reflection coefficient Γ = (Z − Z₀)/(Z + Z₀) and SWR = (1 + |Γ|)/(1 − |Γ|) for a real reference impedance Z₀.']">
    <div class="cols">
      <div class="card stack">
        <div class="seg" role="group" aria-label="How the elements are connected">
          <button :aria-pressed="mode === 'series'" @click="mode = 'series'">Series</button>
          <button :aria-pressed="mode === 'parallel'" @click="mode = 'parallel'">Parallel</button>
        </div>
        <NumField v-model="frequency" label="Frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <fieldset v-for="(r, i) in rows" :key="r.id" class="element-row stack">
          <legend>{{ rowName(i) }} — {{ KIND_NAME[r.kind] }}</legend>
          <div class="field">
            <label class="lbl" :for="`kind-${r.id}`">{{ rowName(i) }} type</label>
            <select :id="`kind-${r.id}`" :value="r.kind" @change="setKind(r, ($event.target as HTMLSelectElement).value as ElementKind)">
              <option v-for="(name, k) in KIND_NAME" :key="k" :value="k">{{ name }}</option>
            </select>
          </div>
          <NumField v-if="r.kind === 'R'" :key="'R' + r.id" v-model="r.a" :label="`${rowName(i)} resistance`" unit="Ω" :min="0" />
          <NumField v-else-if="r.kind === 'L'" :key="'L' + r.id" v-model="r.a" :label="`${rowName(i)} inductance`" :units="L_UNITS" unit="µH" :min="0" />
          <NumField v-else-if="r.kind === 'C'" :key="'C' + r.id" v-model="r.a" :label="`${rowName(i)} capacitance`" :units="C_UNITS" unit="pF" :min="0" minExclusive />
          <template v-else>
            <NumField :key="'Zr' + r.id" v-model="r.a" :label="`${rowName(i)} resistance`" unit="Ω" :min="0" />
            <NumField :key="'Zx' + r.id" v-model="r.b" :label="`${rowName(i)} reactance`" unit="Ω" hint="Positive is inductive, negative is capacitive." />
          </template>
          <button v-if="rows.length > 1" class="ghost" :aria-label="`Remove ${rowName(i)}`" @click="remove(r.id)">Remove</button>
        </fieldset>
        <div v-if="rows.length < MAX_ELEMENTS" class="row" role="group" aria-label="Add an element">
          <button v-for="(name, k) in KIND_NAME" :key="k" class="ghost" @click="add(k)">+ {{ name }}</button>
        </div>
        <p v-else class="hint">The calculator takes up to {{ MAX_ELEMENTS }} elements.</p>
        <NumField v-model="z0" label="Reference impedance Z₀" unit="Ω" :min="0" minExclusive hint="Used for the reflection and SWR results; 50 Ω for most coax." />
        <p v-if="calc.error" class="err" role="alert">{{ calc.error }}</p>
      </div>
      <div class="stack">
        <div v-if="elements" class="card"><ImpedanceDiagram :elements="elements" :mode="mode" /></div>
        <div class="card results" aria-live="polite">
          <ResultRow label="Impedance Z (R + jX)" :value="rect" big />
          <ResultRow label="Impedance Z (magnitude ∠ phase)" :value="polar" />
          <ResultRow label="Admittance Y (G + jB)" :value="adm" />
          <ResultRow label="Equivalent series circuit" :value="equivalent" :note="result?.eq ? `Q = ${fmt(result.eq.q, 4)}` : undefined" />
          <ResultRow label="SWR against Z₀" :value="result?.match ? result.match.swr : null" />
          <ResultRow label="Reflection coefficient |Γ|" :value="result?.match ? result.match.gamma : null" />
          <ResultRow label="Return loss" :value="result?.match ? result.match.returnLossDb : null" unit="dB" />
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">
        <math display="block"><msub><mi>Z</mi><mi>series</mi></msub><mo>=</mo><msub><mi>Z</mi><mn>1</mn></msub><mo>+</mo><msub><mi>Z</mi><mn>2</mn></msub><mo>+</mo><mo>⋯</mo></math>
        <math display="block"><msub><mi>Y</mi><mi>parallel</mi></msub><mo>=</mo><mfrac><mn>1</mn><msub><mi>Z</mi><mn>1</mn></msub></mfrac><mo>+</mo><mfrac><mn>1</mn><msub><mi>Z</mi><mn>2</mn></msub></mfrac><mo>+</mo><mo>⋯</mo><mo>,</mo><mspace width="1em" /><mi>Z</mi><mo>=</mo><mfrac><mn>1</mn><mi>Y</mi></mfrac></math>
        <math display="block"><msub><mi>X</mi><mi>L</mi></msub><mo>=</mo><mn>2</mn><mi>π</mi><mi>f</mi><mi>L</mi><mo>,</mo><mspace width="1em" /><msub><mi>X</mi><mi>C</mi></msub><mo>=</mo><mo>−</mo><mfrac><mn>1</mn><mrow><mn>2</mn><mi>π</mi><mi>f</mi><mi>C</mi></mrow></mfrac></math>
        <math display="block"><mi>Γ</mi><mo>=</mo><mfrac><mrow><mi>Z</mi><mo>−</mo><msub><mi>Z</mi><mn>0</mn></msub></mrow><mrow><mi>Z</mi><mo>+</mo><msub><mi>Z</mi><mn>0</mn></msub></mrow></mfrac><mo>,</mo><mspace width="1em" /><mi>SWR</mi><mo>=</mo><mfrac><mrow><mn>1</mn><mo>+</mo><mo>|</mo><mi>Γ</mi><mo>|</mo></mrow><mrow><mn>1</mn><mo>−</mo><mo>|</mo><mi>Γ</mi><mo>|</mo></mrow></mfrac></math>
      </div>
      <p>Each element is converted to a complex impedance Z = R + jX at the chosen frequency. Positive reactance is inductive and negative reactance is capacitive. Series elements add impedances; parallel elements add admittances Y = G + jB, where G is conductance and B is susceptance in siemens.</p>
      <p>The equivalent series circuit replaces the whole network at this one frequency with a resistor and an inductor or capacitor. Q is |X| divided by R. The equivalent changes with frequency; it is not a substitute for the original network at other frequencies.</p>
      <p>A short circuit in a parallel network gives 0 Ω. Ideal parallel inductor and capacitor at resonance give an open circuit, shown as infinite impedance. The model uses ideal parts: stray capacitance, lead inductance, component loss and self-resonance are not included.</p>
    </template>
  </ToolLayout>
</template>
