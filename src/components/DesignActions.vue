<script setup lang="ts">
import { ref } from 'vue'
import { saveDesign } from '../core/store'
import { exportSvg } from '../platform'

// Save / export / print block shared by the antenna tools.
const props = defineProps<{ toolId: string; defaultName: string; summary: string; params: Record<string, number | string>; svg?: SVGSVGElement; file: string; disabled?: boolean }>()
const name = defineModel<string>('name', { default: '' })
const saved = ref(false)
const print = () => window.print()
function save() {
  saveDesign({ toolId: props.toolId, name: name.value.trim() || props.defaultName, summary: props.summary, params: props.params })
  saved.value = true
}
</script>

<template>
  <div class="card stack no-print">
    <h3>Save, export or print</h3>
    <label class="field"><span class="lbl">Design name</span><input v-model="name" type="text" placeholder="e.g. Garden 40 m antenna" @input="saved = false" /></label>
    <div class="seg">
      <button class="primary" :disabled="disabled" @click="save">Save design</button>
      <button :disabled="!svg" @click="svg && exportSvg(svg, file)">Download SVG</button>
      <button @click="print">Print</button>
    </div>
    <span v-if="saved" role="status">Saved — see <router-link to="/saved">Saved designs</router-link>.</span>
  </div>
</template>
