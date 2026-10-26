<script setup lang="ts">
import { computed } from 'vue'
import { wireHeightReferences } from '../lib/antenna'
import { state } from '../core/store'
import { feetInches } from '../lib/units'

const props = defineProps<{ frequency: number | null; kind: 'dipole' | 'inverted-v' | 'efhw' }>()
const heights = computed(() => { try { return wireHeightReferences(props.frequency ?? 0) } catch { return null } })
const dim = (m: number) => state.units === 'imperial' ? feetInches(m) : `${m.toFixed(2)} m`
</script>

<template>
  <section class="height-guide" aria-label="Installation height guidance">
    <h3>Choosing an installation height</h3>
    <p><strong>No single optimal height:</strong> choose for the contacts you want and the supports available.</p>
    <dl v-if="heights" class="height-references">
      <div><dt>¼λ above ground</dt><dd>{{ dim(heights.quarter) }}</dd></div>
      <div><dt>½λ above ground</dt><dd>{{ dim(heights.half) }}</dd></div>
    </dl>
    <p v-else class="hint">Enter a valid design frequency to see height references.</p>
    <details class="explain">
    <summary>Height for DX or regional contacts</summary>
    <p><strong>General HF / DX:</strong> about ½λ or higher is a useful target when practical. Lower installations still make contacts; raising a horizontal wire changes its elevation lobes and nulls.</p>
    <p><strong>Regional HF / NVIS:</strong> ¼λ and below favours higher-angle radiation. NVIS also needs a suitable lower-HF frequency and ionospheric conditions; very low wire can lose efficiency in the ground.</p>
    <p v-if="kind === 'inverted-v'">Use the ½λ figure as an apex reference. The sloping legs are lower, so it does not reproduce a flat dipole's pattern. Check the entered end height separately.</p>
    <p v-else-if="kind === 'efhw'">These references apply to a horizontal EFHW on its fundamental band. Slopers, vertical layouts and harmonic bands need different pattern considerations.</p>
    <p class="hint">Height is measured above local ground, using free-space wavelength, without the wire shortening factor. Ground, slope and nearby objects matter. At VHF/UHF, prioritise line-of-sight and obstacle clearance. These figures are not structural or RF-exposure clearances.</p>
    <p class="hint">Sources: <a href="https://www.arrl.org/files/file/Technology/tis/info/pdf/9106023.pdf" target="_blank" rel="noopener noreferrer">ARRL, Here Is a Dipole</a>; <a href="https://www.arrl.org/files/file/antplnr.pdf" target="_blank" rel="noopener noreferrer">ARRL, Antenna Height and Communications Effectiveness</a>. Reference guidance, not a simulation.</p>
    </details>
  </section>
</template>

<style scoped>
.height-guide { margin-top:1rem; border-top:1px solid var(--line); padding-top:1rem; }
.height-guide p { margin:.65rem 0 0; max-width:78ch; }
.height-references { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; margin:.75rem 0; }
.height-references dt { color:var(--muted); font-size:.9rem; }
.height-references dd { margin:0; font-family:var(--mono); font-weight:650; font-size:1.1rem; }
@media(max-width:480px) { .height-references { grid-template-columns:1fr; } }
</style>
