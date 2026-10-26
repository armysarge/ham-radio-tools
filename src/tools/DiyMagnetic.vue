<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import MagneticWinding from '../components/MagneticWinding.vue'
import { CORES } from '../data/cores'
import { FREQ_UNITS, LENGTH_UNITS, feetInches, fmt } from '../lib/units'
import { chokeTurns, rfTransformer, windingMaterial } from '../lib/magnetics'
import { state } from '../core/store'

const props = defineProps<{ kind: 'balun' | 'transformer' }>()
const zPrimary = ref<number | null>(50), zSecondary = ref<number | null>(450)
const lowFrequency = ref<number | null>(props.kind === 'balun' ? 7e6 : 3.5e6)
const coreName = ref(props.kind === 'balun' ? 'FT240-43' : 'FT82-43')
const ferrites = CORES.filter(c => c.material.startsWith('Ferrite'))
const core = computed(() => ferrites.find(item => item.name === coreName.value)!)
const al = ref<number | null>(core.value.al), stack = ref<number | null>(1)
watch(coreName, () => { al.value = core.value.al })
const targetX = ref<number | null>(1000), reactanceFactor = ref<number | null>(4)
const diameter = ref<number | null>(props.kind === 'balun' ? .00495 : .001)
const leads = ref<number | null>(.15)
const cable = ref('rg400')
const cablePresets = [{ id: 'rg400', label: 'RG-400 · about 4.95 mm', diameter: .00495 }, { id: 'rg58', label: 'RG-58 · about 5 mm', diameter: .005 }, { id: 'rg316', label: 'RG-316 · about 2.5 mm', diameter: .0025 }, { id: 'custom', label: 'Other / enter measured diameter', diameter: null }]
watch(cable, () => { const d = cablePresets.find(c => c.id === cable.value)?.diameter; if (d) diameter.value = d })
const choke = computed(() => {
  if ([lowFrequency.value, targetX.value, al.value, stack.value].some(v => v == null)) return null
  try { return chokeTurns(lowFrequency.value!, targetX.value!, al.value!, stack.value!) } catch { return null }
})
const estimate = computed(() => {
  if ([zPrimary.value, zSecondary.value, lowFrequency.value, al.value, reactanceFactor.value].some(v => v == null)) return null
  try { return rfTransformer(zPrimary.value!, zSecondary.value!, lowFrequency.value!, al.value!, reactanceFactor.value!) } catch { return null }
})
const turns = computed(() => props.kind === 'balun' ? choke.value?.turns : estimate.value?.turns)
const material = computed(() => {
  if (!turns.value || diameter.value == null || leads.value == null) return { value: null, error: '' }
  try {
    const primary = windingMaterial(core.value, turns.value, diameter.value, leads.value, props.kind === 'balun' ? stack.value! : 1)
    const secondary = props.kind === 'transformer' && estimate.value ? windingMaterial(core.value, estimate.value.secondaryTurns, diameter.value, leads.value) : null
    return { value: { lengthM: primary.lengthM + (secondary?.lengthM ?? 0), singleLayerTurns: primary.singleLayerTurns }, error: '' }
  } catch (e) { return { value: null, error: (e as Error).message } }
})
const crowded = computed(() => material.value.value && (turns.value ?? 0) + (props.kind === 'transformer' ? estimate.value?.secondaryTurns ?? 0 : 0) > material.value.value.singleLayerTurns)
const imperial = computed(() => state.units === 'imperial')
const length = (m: number) => imperial.value ? feetInches(m) : `${m.toFixed(2)} m`
const refs = [
  'Roy Lewallen, W7EL, current-balun theory and construction, ARRL archive: https://www.arrl.org/files/file/History/History%20of%20QST%20Volume%201%20-%20Technology/AntComp1-Lewallen%281%29.pdf',
  'Fair-Rite, Technical Information, 17th edition catalogue: inductance factor and frequency-dependent ferrite impedance. https://fair-rite.com/wp-content/uploads/2023/05/Fair-Rite_Catalog_17th_Edition.pdf',
  'RSGB, Using EMC filters and ferrites: winding direction, stray capacitance and cable bend precautions. https://rsgb.org/main/technical/emc/using-emc-filters-and-ferrites/',
  'Amphenol Procom, RG-400 datasheet: PTFE dielectric, double braid and manufacturer bend-radius specification. https://amphenolprocom.com/product/rg-400/',
  'Core AL values and dimensions are typical local catalogue figures, not guaranteed specifications for every supplier. Material-length allowance: core cross-section perimeter plus cable thickness, 15% winding slack, and the entered leads.',
]
</script>

<template>
  <ToolLayout :id="kind === 'balun' ? 'diy-baluns' : 'diy-transformers'" :references="refs">
    <p class="magnetic-intro" v-if="kind === 'balun'">Plan the turns and coax needed for a <strong>1:1 ferrite current balun / common-mode choke</strong>. The calculator uses a low-frequency inductance model; the finished choke needs an impedance measurement across your operating bands.</p>
    <p class="magnetic-intro" v-else>Plan a <strong>conventional two-winding RF transformer</strong>: ideal turns ratio, whole winding turns, and conductor length. The integer-turn result shows the impedance ratio you actually selected.</p>
    <div class="cols">
      <div class="card stack">
        <template v-if="kind === 'transformer'">
          <NumField v-model="zPrimary" label="Primary impedance" unit="Ω" :min="0" min-exclusive />
          <NumField v-model="zSecondary" label="Secondary impedance" unit="Ω" :min="0" min-exclusive />
        </template>
        <NumField v-model="lowFrequency" :label="kind === 'balun' ? 'Frequency for the estimate' : 'Lowest design frequency'" unit="MHz" :units="FREQ_UNITS" :min="0" min-exclusive />
        <label class="field"><span class="lbl">Ferrite core</span><select v-model="coreName"><option v-for="item in ferrites" :key="item.name" :value="item.name">{{ item.name }} · {{ item.material }}</option></select><span class="hint">Core opening {{ (core.idIn * 25.4).toFixed(1) }} mm. Check the actual manufacturer's dimensions.</span></label>
        <NumField v-model="al" label="AL of one core" unit="nH/turn²" :min="0" min-exclusive hint="Preset is nominal. Override with your part datasheet or a low-frequency measurement. AL is not the RF impedance curve." />
        <template v-if="kind === 'balun'">
          <NumField v-model="stack" label="Identical cores stacked" unit="cores" :min="1" :max="10" hint="Whole numbers only; the same winding passes through all cores together." />
          <p v-if="stack != null && !Number.isInteger(stack)" class="err" role="alert">Use a whole number of cores.</p>
          <NumField v-model="targetX" label="Inductive reactance target" unit="Ω" :min="0" min-exclusive hint="A modeling input, not a guaranteed common-mode impedance. Ferrite loss and self-resonance are omitted." />
          <label class="field"><span class="lbl">Coax diameter preset</span><select v-model="cable"><option v-for="c in cablePresets" :key="c.id" :value="c.id">{{ c.label }}</option></select></label>
        </template>
        <NumField v-else v-model="reactanceFactor" label="Target primary XL / primary impedance" unit="×" :min="0" min-exclusive hint="Adjustable magnetizing-reactance rule of thumb; not a saturation or bandwidth calculation." />
        <NumField v-model="diameter" :label="kind === 'balun' ? 'Coax outside diameter' : 'Insulated winding-wire diameter'" :units="LENGTH_UNITS" :unit="imperial ? 'in' : 'mm'" :min="0" min-exclusive hint="Include insulation/jacket thickness. Used for the material and spacing estimate only." />
        <NumField v-model="leads" label="Lead allowance at each end" :units="LENGTH_UNITS" :unit="imperial ? 'in' : 'cm'" :min="0" />
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <template v-if="kind === 'balun'">
            <ResultRow label="Turns to wind (AL estimate)" :value="choke ? `${choke.turns} turns` : null" big />
            <ResultRow label="Unrounded turns" :value="choke ? fmt(choke.fractionalTurns, 3) : null" />
            <ResultRow label="Inductance target" :value="choke ? `${fmt(choke.targetL * 1e6, 3)} µH` : null" />
            <ResultRow label="Inductance with whole turns" :value="choke ? `${fmt(choke.inductance * 1e6, 3)} µH` : null" />
            <ResultRow label="XL with whole turns (ideal)" :value="choke ? `${fmt(choke.reactance, 3)} Ω` : null" />
          </template>
          <template v-else>
            <ResultRow label="Ideal impedance ratio" :value="estimate ? `${fmt(zPrimary!)} Ω → ${fmt(zSecondary!)} Ω (${fmt(zSecondary! / zPrimary!, 3)}:1)` : null" big />
            <ResultRow label="Ideal turns ratio, primary : secondary" :value="estimate ? `1 : ${fmt(estimate.turnsRatio, 3)}` : null" />
            <ResultRow label="Primary turns" :value="estimate ? `${estimate.turns} turns` : null" />
            <ResultRow label="Secondary turns" :value="estimate ? `${estimate.secondaryTurns} turns` : null" />
            <ResultRow label="Secondary impedance from whole turns" :value="estimate ? `${fmt(estimate.roundedImpedance, 3)} Ω` : null" />
            <ResultRow label="Primary inductance target" :value="estimate ? `${fmt(estimate.targetL * 1e6, 3)} µH` : null" />
          </template>
          <ResultRow :label="kind === 'balun' ? 'Coax length allowance' : 'Total winding-wire allowance'" :value="material.value ? length(material.value.lengthM) : null" />
          <p class="hint" style="margin:0">Includes both leads per winding and 15% winding slack. This estimates material to prepare; it does not guarantee bend clearance or a power rating.</p>
          <p v-if="material.error" class="err" role="alert">{{ material.error }}</p>
          <p v-if="crowded" class="notice" role="status">The planned passes exceed the rough single-layer spacing allowance. Use a larger opening, thinner suitable conductor, or a different tested build; do not force the winding into place.</p>
        </div>
        <div class="notice"><strong>Model limits:</strong> AL is usually measured at low frequency and low excitation. At RF, ferrite permeability and loss change with frequency; winding capacitance can cause self-resonance. The displayed XL is not measured choke impedance. This estimate does not rate power, temperature, bandwidth, voltage stress, isolation, or SWR.</div>
        <div class="card stack">
          <h3>Count the turns correctly</h3>
          <p style="margin:0">One complete passage through the core opening counts as one turn. Count the passes through the hole, not the visible outside loops. With stacked cores, a passage through the entire stack still counts as one turn.</p>
          <p v-if="kind === 'balun'" style="margin:0">A 1:1 current balun/choke suppresses common-mode current; it does not transform impedance or make an antenna resonant. For transmitting, start with a measured design for the exact core, coax and bands, then use this calculator to explore its inductance and material allowance.</p>
        </div>
      </div>
    </div>

    <section class="card stack" style="margin-top:1rem" aria-label="Winding illustrations">
      <h2>Winding and connections</h2>
      <MagneticWinding :kind="kind" :primary="turns ?? null" :secondary="estimate?.secondaryTurns" />
    </section>

    <section class="card stack magnetic-materials" style="margin-top:1rem">
      <h2>{{ kind === 'balun' ? 'Which coax can I use?' : 'Which wire and cables can I use?' }}</h2>
      <template v-if="kind === 'balun'">
        <p><strong>RG-400:</strong> a useful option where its 50 Ω impedance, diameter, PTFE dielectric and documented bend radius suit the build. It tolerates soldering heat better than ordinary polyethylene cable, but its jacket temperature rating is not a choke power rating.</p>
        <p><strong>RG-58:</strong> an economical option for suitable larger-core builds. Avoid tight bends and excessive soldering heat; check the cable's loss, power and minimum bend-radius specifications.</p>
        <p><strong>RG-316:</strong> thinner and easier to thread through a small opening; useful for receive or suitably rated low-power assemblies. Its smaller conductor and greater loss limit its use compared with larger coax.</p>
        <p><strong>RG-213 / LMR-400 and other thick feedlines:</strong> often better as the long feedline than as a tightly wound toroid choke. Use appropriately rated flexible jumpers or a documented bead/sleeve choke when the cable cannot meet its minimum bend radius. Keep 50 Ω coax for a 50 Ω station; 75 Ω TV coax is not an interchangeable winding choice.</p>
      </template>
      <template v-else>
        <p><strong>Enamelled copper magnet wire:</strong> a compact choice for a conventional transformer winding. Select conductor size for current and loss, and an insulation system for the actual RF voltage and temperature. Smooth or tape sharp core edges so they do not scrape the enamel; remove enamel only at the terminals.</p>
        <p><strong>PTFE-insulated copper wire:</strong> useful where soldering heat or insulation clearance matters. Enter the full insulated diameter above. Thick insulation uses more core opening and changes winding capacitance; there is no universal wire gauge or wattage rating for these outputs.</p>
        <p><strong>Coax on the input/output:</strong> use suitable 50 Ω coax such as RG-58 or RG-400 for short station-side connections; select a lower-loss feedline for a long run. That does not make coax the correct primary or secondary winding for this conventional transformer.</p>
        <p><strong>Bifilar pairs, twisted pair or coax windings:</strong> use them only with a documented transmission-line transformer circuit and its specified line impedance and phasing. Ethernet cable is not a general substitute for RF winding wire, and this calculator does not design a Guanella/Ruthroff balun or a tapped 49:1 EFHW transformer.</p>
      </template>
      <p class="hint">Verify the exact cable manufacturer's datasheet, including one-time and repeated bend limits. Never tighten cable around a core corner just to make it fit. Use a larger bend, a larger core opening, or a different published construction.</p>
    </section>

    <section class="card stack" style="margin-top:1rem">
      <h2>Build and verify</h2>
      <ol class="magnetic-steps">
        <li>Confirm the core material, AL tolerance and dimensions against its datasheet. Lay out the actual cable or insulated wire and check that every bend and pass fits without crushing or scraping.</li>
        <li v-if="kind === 'balun'">Keep the coax continuous. Thread every turn through the hole in the same winding sense and keep the input and output physically separated to limit bypass capacitance. Secure the cable gently; do not damage its jacket.</li>
        <li v-else>Wind and label P1/P2 and S1/S2. Follow the circuit's winding direction and polarity dots. These are two separate windings; do not join the returns unless your chosen circuit requires it.</li>
        <li v-if="kind === 'balun'">Measure common-mode impedance across the intended band with a suitable fixture. A DC continuity test only checks that the coax is intact; it cannot establish choking effectiveness.</li>
        <li v-else>Measure primary inductance and response with suitable source/load terminations over the intended band. Check the actual impedance ratio after rounding the turns; keep leads short.</li>
        <li>Start at low power. Check heating at the intended power and duty cycle, common-mode current where relevant, and the response in the installed station. Weatherproof connectors and provide strain relief.</li>
      </ol>
    </section>

    <template #explain>
      <div v-if="kind === 'balun'" class="formula">Ltarget = Xtarget / (2πf) · ALstack ≈ AL × core count<br />N = ceil(√(Ltarget / ALstack)) · Lwound ≈ ALstack × N²</div>
      <div v-else class="formula">Ns/Np = √(Zs/Zp) · Ltarget = factor × Zp / (2πf)<br />Np = ceil(√(Ltarget/AL)) · Ns = nearest whole turn<br />Zs,rounded = Zp × (Ns/Np)²</div>
      <p>Internal calculations use henries, metres, hertz and ohms; AL is entered in nH/turn². Turns are rounded up for the inductance target; transformer secondary turns are rounded to the nearest whole turn, with the resulting impedance shown explicitly.</p>
      <p>The material allowance follows the rectangular core cross-section perimeter, adds π × insulated conductor diameter per turn, a small existing core-perimeter allowance, 15% slack, and the entered leads. It is a rough shopping allowance, not a winding jig or bend-radius model. Leakage inductance, winding capacitance, ferrite complex permeability, core flux, voltage breakdown and thermal limits require a separate measured design.</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
.magnetic-intro { margin:0 0 1rem; max-width:78ch; }
.magnetic-materials p { margin:0; max-width:80ch; }
.magnetic-steps { margin:0; padding-left:1.3rem; }
.magnetic-steps li + li { margin-top:.55rem; }
</style>
