<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import ResultRow from '../components/ResultRow.vue'
import ValueInput from '../components/ValueInput.vue'
import {
  CAP_TOLERANCE, CAP_VOLTAGE, COLOURS, DIGIT_COLOURS, MULT_COLOURS, PPM_COLOURS, SERIES, TOL_COLOURS,
  decodeCapacitor, decodeResistor, decodeSmd, divider, encodeResistor, formatValue, ledResistor, nearestPreferred, parallel, parseValue, seriesSum,
  type Colour, type SeriesName,
} from '../lib/components'

const tab = ref<'resistor' | 'caps' | 'values' | 'circuits'>('resistor')
const TABS: ['resistor' | 'caps' | 'values' | 'circuits', string][] = [['resistor', 'Resistor colours'], ['caps', 'Capacitor & SMD codes'], ['values', 'Standard values'], ['circuits', 'Series, parallel, divider, LED']]

// ---- resistor colours ----
const dir = ref<'read' | 'find'>('read')
const bandCount = ref<3 | 4 | 5 | 6>(4)
const picked = reactive<Colour[]>(['brown', 'black', 'red', 'gold', 'brown', 'red'])
const nDigits = computed(() => (bandCount.value >= 5 ? 3 : 2))
// which colours each position may use, and what to call it
const slots = computed(() => {
  const n = nDigits.value, out: { label: string; options: Colour[] }[] = []
  for (let i = 0; i < n; i++) out.push({ label: `Band ${i + 1}: digit ${i + 1}`, options: DIGIT_COLOURS })
  out.push({ label: `Band ${n + 1}: multiplier`, options: MULT_COLOURS })
  if (bandCount.value >= 4) out.push({ label: `Band ${n + 2}: tolerance`, options: TOL_COLOURS })
  if (bandCount.value === 6) out.push({ label: 'Band 6: temperature coefficient', options: PPM_COLOURS })
  return out
})
const shownBands = computed<Colour[]>(() => slots.value.map((s, i) => (s.options.includes(picked[i]) ? picked[i] : s.options[0])))
const decoded = computed(() => { try { return { v: decodeResistor(shownBands.value), err: '' } } catch (e) { return { v: null, err: (e as Error).message } } })
const valueText = ref('4k7'), valueOhms = ref<number | null>(4700)
const tolPick = ref<Colour>('gold'), ppmPick = ref<Colour>('red')
const encoded = computed(() => {
  if (valueOhms.value === null) return null
  try { return { v: encodeResistor(valueOhms.value, nDigits.value, tolPick.value), err: '' } } catch (e) { return { v: null, err: (e as Error).message } }
})
// bands shown in the drawing for the current mode
const drawn = computed<Colour[]>(() => {
  if (dir.value === 'read') return shownBands.value
  const b = encoded.value?.v?.bands ?? []
  if (!b.length || b.length === 1) return b
  const out = [...b]
  if (bandCount.value === 3) out.pop() // 3 bands: no tolerance band
  if (bandCount.value === 6) out.push(ppmPick.value)
  return out
})
const bandX = (i: number, n: number) => (n === 1 ? 180 : 100 + i * (n >= 5 ? 28 : 34) + (i === n - 1 && n >= 4 ? 18 : 0) + (n === 6 && i === 5 ? 6 : 0))
const colourName = (c: Colour) => c[0].toUpperCase() + c.slice(1)
const fmtTol = (v: number) => `±${v} %`

// ---- capacitor and SMD codes ----
const capText = ref('104K'), smdText = ref('472')
const cap = computed(() => { try { return { v: decodeCapacitor(capText.value), err: '' } } catch (e) { return { v: null, err: (e as Error).message } } })
const smd = computed(() => { try { return { v: decodeSmd(smdText.value), err: '' } } catch (e) { return { v: null, err: (e as Error).message } } })
const COMMON_CAPS = ['100', '101', '221', '471', '102', '222', '472', '103', '223', '473', '104', '224', '474', '105', '106'].map((c) => ({ c, f: formatValue(decodeCapacitor(c).pF * 1e-12, 'F') }))

// ---- standard values ----
const stdText = ref('4.8k'), stdOhms = ref<number | null>(4800), series = ref<SeriesName>('E24')
const near = computed(() => { try { return stdOhms.value ? nearestPreferred(stdOhms.value, series.value) : null } catch { return null } })
const decadeValues = computed(() => SERIES[series.value].values.map((v) => (series.value === 'E96' ? v.toFixed(2) : String(v / 10 < 1 ? v : v))).map((x) => (series.value === 'E96' ? x : (Number(x) >= 10 ? x : x))))

// ---- circuits ----
const listText = ref('1k, 2k2, 4k7'), part = ref<'R' | 'C'>('R')
const list = computed(() => { try { return { v: listText.value.split(/[,;\s]+/).filter(Boolean).map(parseValue), err: '' } } catch (e) { return { v: null, err: (e as Error).message } } })
const unitOf = computed(() => (part.value === 'R' ? 'Ω' : 'F'))
// resistors add in series and combine like 1/R in parallel; capacitors do the opposite
const combined = computed(() => {
  const v = list.value.v
  if (!v?.length) return null
  try { const a = seriesSum(v), b = parallel(v); return part.value === 'R' ? { series: a, parallel: b } : { series: b, parallel: a } } catch { return null }
})
const vin = ref<number | null>(5), r1 = ref<number | null>(10000), r2 = ref<number | null>(10000)
const vinT = ref('5'), r1T = ref('10k'), r2T = ref('10k')
const div = computed(() => { try { return vin.value !== null && r1.value !== null && r2.value !== null ? divider(vin.value, r1.value, r2.value) : null } catch { return null } })
const vs = ref<number | null>(5), vf = ref<number | null>(2), ma = ref<number | null>(0.02)
const vsT = ref('5'), vfT = ref('2'), maT = ref('20m')
const ledErr = ref('')
const led = computed(() => {
  ledErr.value = ''
  if (vs.value === null || vf.value === null || ma.value === null) return null
  try { return ledResistor(vs.value, vf.value, ma.value) } catch (e) { ledErr.value = (e as Error).message; return null }
})
void parseValue
</script>

<template>
  <ToolLayout id="components" :references="['IEC 60062: marking codes for resistors and capacitors (colour code, letter codes).', 'IEC 60063: preferred number series E6 to E192.', 'EIA-96 SMD marking: two digits select one of the 96 E96 values, a letter gives the multiplier.', 'LED resistor and divider: Ohm’s law (see the Ohm’s Law tool).']">
    <div class="seg" role="tablist" aria-label="Component tools" style="margin-bottom:1rem">
      <button v-for="[k, t] in TABS" :key="k" role="tab" :aria-selected="tab === k" :aria-pressed="tab === k" @click="tab = k">{{ t }}</button>
    </div>

    <div v-if="tab === 'resistor'" class="stack">
      <div class="cols">
        <div class="card stack">
          <div class="seg" role="group" aria-label="Direction">
            <button :aria-pressed="dir === 'read'" @click="dir = 'read'">Colours → value</button>
            <button :aria-pressed="dir === 'find'" @click="dir = 'find'">Value → colours</button>
          </div>
          <div class="seg" role="group" aria-label="Number of bands">
            <button v-for="n in [3, 4, 5, 6]" :key="n" :aria-pressed="bandCount === n" @click="bandCount = n as 3 | 4 | 5 | 6">{{ n }} bands</button>
          </div>
          <template v-if="dir === 'read'">
            <label v-for="(s, i) in slots" :key="s.label + bandCount" class="field"><span class="lbl">{{ s.label }}</span>
              <span class="row"><span aria-hidden="true" :style="{ background: COLOURS[shownBands[i]].hex, width: '44px', height: '44px', borderRadius: '8px', border: '1.5px solid var(--line)', flex: 'none' }" />
                <select :value="shownBands[i]" @change="picked[i] = ($event.target as HTMLSelectElement).value as Colour">
                  <option v-for="c in s.options" :key="c" :value="c">{{ colourName(c) }}{{ i < nDigits ? ` (${COLOURS[c].digit})` : '' }}</option>
                </select></span></label>
          </template>
          <template v-else>
            <ValueInput v-model="valueText" label="Resistance" unit="Ω" hint="Write it the way you say it: 4.7k, 4k7, 470, 2M2, R47" @value="valueOhms = $event" />
            <label v-if="bandCount >= 4" class="field"><span class="lbl">Tolerance</span>
              <select v-model="tolPick"><option v-for="c in TOL_COLOURS" :key="c" :value="c">{{ colourName(c) }} ({{ fmtTol(COLOURS[c].tol!) }})</option></select></label>
            <label v-if="bandCount === 6" class="field"><span class="lbl">Temperature coefficient</span>
              <select v-model="ppmPick"><option v-for="c in PPM_COLOURS" :key="c" :value="c">{{ colourName(c) }} ({{ COLOURS[c].ppm }} ppm/K)</option></select></label>
          </template>
        </div>
        <div class="stack">
          <div class="card">
            <svg class="diagram dg-big" viewBox="0 0 360 120" role="img" :aria-label="`Resistor with bands: ${drawn.map(colourName).join(', ')}`">
              <line class="dg-wire" x1="10" y1="60" x2="350" y2="60" style="stroke:var(--muted);stroke-width:5" />
              <rect x="70" y="26" width="220" height="68" rx="26" fill="#e7d3a8" stroke="#8a7650" stroke-width="2" />
              <rect v-for="(c, i) in drawn" :key="i" :x="bandX(i, drawn.length)" y="26" :width="drawn.length === 1 ? 14 : 16" height="68" :fill="COLOURS[c].hex" stroke="#00000044" stroke-width="1" />
            </svg>
            <p class="hint" style="margin:0">Hold the resistor with the tolerance band (gold or silver) on the right. If there is no gold or silver band, the band nearest an end is the first digit.</p>
          </div>
          <div v-if="dir === 'read'" class="card results" aria-live="polite">
            <p v-if="decoded.err" class="err" role="alert">{{ decoded.err }}</p>
            <template v-if="decoded.v">
              <ResultRow label="Resistance" :value="formatValue(decoded.v.ohms)" big />
              <ResultRow label="Tolerance" :value="fmtTol(decoded.v.tolerancePct)" />
              <ResultRow label="Actual value lies between" :value="`${formatValue(decoded.v.min)} and ${formatValue(decoded.v.max)}`" />
              <ResultRow v-if="decoded.v.ppm" label="Temperature coefficient" :value="`${decoded.v.ppm} ppm/K`" />
            </template>
          </div>
          <div v-else class="card results" aria-live="polite">
            <p v-if="encoded?.err" class="err" role="alert">{{ encoded.err }}</p>
            <p v-else-if="valueOhms === null" class="muted" style="margin:0">Enter a resistance to see its bands.</p>
            <template v-if="encoded?.v">
              <ResultRow v-for="(c, i) in drawn" :key="i" :label="`Band ${i + 1}`" :value="colourName(c)"
                :note="i < nDigits ? `digit ${COLOURS[c].digit}` : i === nDigits ? `multiplier ×${COLOURS[c].mult}` : i === nDigits + 1 ? `tolerance ${fmtTol(COLOURS[c].tol!)}` : `${COLOURS[c].ppm} ppm/K`" />
              <p v-if="!encoded.v.exact" class="notice" role="status">{{ bandCount === 5 || bandCount === 6 ? 'This needs more precision than the bands can show:' : 'These bands only reach' }} {{ formatValue(encoded.v.ohms) }}. {{ bandCount < 5 ? 'Try 5 bands for a third digit.' : '' }}</p>
            </template>
          </div>
        </div>
      </div>
      <div class="card">
        <h2>Colour chart</h2>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Colour</th><th>Digit</th><th>Multiplier</th><th>Tolerance</th><th>Temp. coeff.</th></tr></thead>
          <tbody><tr v-for="(c, name) in COLOURS" :key="name">
            <td><span aria-hidden="true" :style="{ display: 'inline-block', width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--line)', background: c.hex, verticalAlign: 'middle', marginRight: '.5rem' }" />{{ colourName(name as Colour) }}</td>
            <td class="mono">{{ c.digit ?? '—' }}</td><td class="mono">×{{ c.mult }}</td><td class="mono">{{ c.tol !== undefined ? fmtTol(c.tol) : '—' }}</td><td class="mono">{{ c.ppm ? c.ppm + ' ppm/K' : '—' }}</td></tr>
            <tr><td>No band</td><td>—</td><td>—</td><td class="mono">±20 %</td><td>—</td></tr></tbody>
        </table></div>
        <p class="hint">Temperature-coefficient colours other than these six differ between makers; check the datasheet. A single black band marks a zero-ohm link.</p>
      </div>
    </div>

    <div v-else-if="tab === 'caps'" class="stack">
      <div class="cols">
        <div class="card stack">
          <h2>Capacitor code</h2>
          <label class="field"><span class="lbl">Code printed on the capacitor</span><input v-model="capText" type="text" class="mono" autocomplete="off" spellcheck="false" style="text-transform:uppercase" />
            <span class="hint">Examples: 104, 473J, 4R7, 22. A letter at the end is the tolerance.</span></label>
          <p v-if="cap.err" class="err" role="alert">{{ cap.err }}</p>
          <div v-if="cap.v" class="results" aria-live="polite">
            <ResultRow label="Capacitance" :value="formatValue(cap.v.pF * 1e-12, 'F')" big />
            <ResultRow label="In picofarads" :value="cap.v.pF" unit="pF" />
            <ResultRow label="In microfarads" :value="cap.v.pF * 1e-6" unit="µF" :sig="4" />
            <ResultRow v-if="cap.v.tolerance" label="Tolerance" :value="cap.v.tolerance" />
          </div>
          <p class="hint">Three digits: the first two are the value and the third is how many zeros follow, in picofarads. 104 = 10 followed by four zeros = 100 000 pF = 100 nF = 0.1 µF.</p>
        </div>
        <div class="card stack">
          <h2>SMD resistor code</h2>
          <label class="field"><span class="lbl">Code printed on the resistor</span><input v-model="smdText" type="text" class="mono" autocomplete="off" spellcheck="false" style="text-transform:uppercase" />
            <span class="hint">Examples: 472, 4701, 4R7, 47R, 000, or EIA-96 such as 68X.</span></label>
          <p v-if="smd.err" class="err" role="alert">{{ smd.err }}</p>
          <div v-if="smd.v" class="results" aria-live="polite">
            <ResultRow label="Resistance" :value="formatValue(smd.v.ohms)" big />
            <ResultRow label="Read as" :value="smd.v.scheme" />
          </div>
          <p class="hint">3 or 4 digits work like the capacitor code (the last digit is the number of zeros); R is a decimal point; EIA-96 is two digits picking one of 96 values plus a multiplier letter (A = ×1, B = ×10, C = ×100, X = ×0.1, Y = ×0.01).</p>
        </div>
      </div>
      <div class="cols">
        <div class="card"><h3>Common capacitor codes</h3>
          <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:.4rem"><div v-for="x in COMMON_CAPS" :key="x.c" class="mono" style="padding:.3rem .5rem;border:1px solid var(--line);border-radius:6px"><strong>{{ x.c }}</strong> = {{ x.f }}</div></div></div>
        <div class="card"><h3>Tolerance and voltage letters</h3>
          <p class="mono" style="margin:0 0 .6rem">{{ Object.entries(CAP_TOLERANCE).map(([k, v]) => `${k} ${v}`).join(' · ') }}</p>
          <p class="mono" style="margin:0">{{ Object.entries(CAP_VOLTAGE).map(([k, v]) => `${k} = ${v} V`).join(' · ') }}</p>
          <p class="hint">Voltage codes vary between makers; the datasheet decides.</p></div>
      </div>
    </div>

    <div v-else-if="tab === 'values'" class="cols">
      <div class="card stack">
        <ValueInput v-model="stdText" label="Value you need" hint="Resistor, capacitor or inductor — it is just a number" @value="stdOhms = $event" />
        <div class="seg" role="group" aria-label="Series">
          <button v-for="s in (['E6', 'E12', 'E24', 'E96'] as SeriesName[])" :key="s" :aria-pressed="series === s" @click="series = s">{{ s }} (±{{ SERIES[s].tolerance }} %)</button>
        </div>
        <div v-if="near" class="results" aria-live="polite">
          <ResultRow label="Nearest standard value" :value="formatValue(near.value, '')" :note="`${near.errorPct >= 0 ? '+' : ''}${near.errorPct.toFixed(2)} % from what you asked for`" big />
          <ResultRow label="Next below" :value="near.below === null ? null : formatValue(near.below, '')" />
          <ResultRow label="Next above" :value="near.above === null ? null : formatValue(near.above, '')" />
        </div>
        <p v-else class="muted" style="margin:0">Enter a value above 0.</p>
      </div>
      <div class="card">
        <h3>{{ series }} values in one decade</h3>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:.4rem"><div v-for="v in SERIES[series].values" :key="v" class="mono" style="padding:.25rem .4rem;border:1px solid var(--line);border-radius:6px;text-align:center">{{ series === 'E96' ? v.toFixed(2) : v }}</div></div>
        <p class="hint">Multiply by 1, 10, 100 … so 47 also means 4.7, 470, 4.7 k. Each series divides a decade into 6, 12, 24 or 96 steps so that neighbouring values are about the series’ tolerance apart.</p>
      </div>
    </div>

    <div v-else class="stack">
      <div class="cols">
        <div class="card stack">
          <h2>Series and parallel</h2>
          <div class="seg" role="group" aria-label="Component type"><button :aria-pressed="part === 'R'" @click="part = 'R'">Resistors</button><button :aria-pressed="part === 'C'" @click="part = 'C'">Capacitors</button></div>
          <label class="field"><span class="lbl">Values, separated by commas</span><input v-model="listText" type="text" class="mono" autocomplete="off" spellcheck="false" /></label>
          <p v-if="list.err" class="err" role="alert">{{ list.err }}</p>
          <div v-if="combined" class="results" aria-live="polite">
            <ResultRow label="All in series" :value="formatValue(combined.series, unitOf)" big />
            <ResultRow label="All in parallel" :value="formatValue(combined.parallel, unitOf)" big />
          </div>
          <p class="hint">{{ part === 'R' ? 'Resistors add in series; in parallel the reciprocals add.' : 'Capacitors are the other way round: they add in parallel; in series the reciprocals add.' }}</p>
        </div>
        <div class="card stack">
          <h2>Voltage divider</h2>
          <ValueInput v-model="vinT" label="Input voltage" unit="V" @value="vin = $event" />
          <ValueInput v-model="r1T" label="R1 (top)" unit="Ω" @value="r1 = $event" />
          <ValueInput v-model="r2T" label="R2 (bottom)" unit="Ω" @value="r2 = $event" />
          <div v-if="div" class="results" aria-live="polite">
            <ResultRow label="Output voltage" :value="div.vout" unit="V" big />
            <ResultRow label="Current through the divider" :value="div.current * 1000" unit="mA" />
            <ResultRow label="Source resistance seen by the load" :value="formatValue(div.thevenin)" />
          </div>
          <p class="hint">Unloaded. A load draws current and pulls the output down unless it is much larger than R2.</p>
        </div>
      </div>
      <div class="card stack">
        <h2>LED series resistor</h2>
        <div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
          <ValueInput v-model="vsT" label="Supply voltage" unit="V" @value="vs = $event" />
          <ValueInput v-model="vfT" label="LED forward voltage" unit="V" hint="Red ≈ 2 V, green ≈ 2.1–3 V, blue/white ≈ 3 V (see the datasheet)" @value="vf = $event" />
          <ValueInput v-model="maT" label="LED current" unit="A" hint="20m means 20 mA" @value="ma = $event" />
        </div>
        <p v-if="ledErr" class="err" role="alert">{{ ledErr }}</p>
        <div v-if="led" class="results" aria-live="polite">
          <ResultRow label="Exact resistor needed" :value="formatValue(led.r)" />
          <ResultRow label="Use (next standard E24 value up)" :value="formatValue(led.e24Up)" big />
          <ResultRow label="Actual LED current" :value="led.actualAmps * 1000" unit="mA" />
          <ResultRow label="Power in the resistor" :value="led.watts * 1000" unit="mW" note="choose a resistor rated at least twice this" />
        </div>
      </div>
    </div>

    <template #explain>
      <p><strong>Resistor colour code.</strong> The first bands are digits, the next is a multiplier (a power of ten; gold and silver are ×0.1 and ×0.01), then tolerance, and on 6-band parts the temperature coefficient. The value is the digits read as a number times the multiplier. Orientation matters: the tolerance band sits slightly apart from the others, normally at the right.</p>
      <p><strong>Preferred values.</strong> Parts are made in standard steps so that every value is within tolerance of a stock one; the nearest-value finder compares on a logarithmic scale because tolerance is a percentage.</p>
      <p><strong>LED resistor.</strong> R = (V<sub>supply</sub> − V<sub>LED</sub>) / I, rounded <em>up</em> to a stock value so the current stays at or below the target. These are idealised formulas: real LEDs, supplies and resistors vary, and nothing here replaces a datasheet.</p>
    </template>
  </ToolLayout>
</template>
