<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { NUMBER_CODES, NUMBER_CODES_REVIEWED } from '../data/numberCodes'
import { encode } from '../lib/morse'
import { platform } from '../platform'
const query = ref('')
const group = ref<'on-air' | 'historical' | 'all'>('on-air')
const status = ref(''), error = ref('')
const rows = computed(() => {
  const terms = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return NUMBER_CODES.filter(c => (group.value === 'all' || c.group === group.value) && terms.every(t =>
    [c.code, c.meaning, c.note, c.example].join(' ').toLowerCase().includes(t)))
})
async function copy(code: string) {
  status.value = ''; error.value = ''
  try { await platform.copyText(code); status.value = `Copied ${code}.` }
  catch { error.value = 'Could not copy the number. Select the displayed number and copy it manually.' }
}
</script>

<template>
  <ToolLayout id="number-codes" :references="['ACOM Quick Guide, first edition, revision 01, February 2022: §3, p. 9 (historical examples and QRP 72); §8, p. 33 (73/88).', 'International Morse notation uses the existing ITU-R M.1677-1 encoder. Usage notes and contact examples are editorial guidance.']">
    <div class="card stack">
      <p style="margin:0">Heard “73” at the end of a contact? It means best regards, and is often a friendly goodbye. These short number messages are different from Q codes and signal reports such as 599.</p>
      <label class="field"><span class="lbl">Search number codes</span><input v-model="query" aria-label="Search number codes" type="search" autocomplete="off" placeholder="e.g. 73, regards, QRP" /></label>
      <div class="seg" role="group" aria-label="Number code category">
        <button :aria-pressed="group === 'on-air'" @click="group = 'on-air'">On-air shorthand</button>
        <button :aria-pressed="group === 'historical'" @click="group = 'historical'">Historical examples</button>
        <button :aria-pressed="group === 'all'" @click="group = 'all'">All</button>
      </div>
      <p class="hint">{{ rows.length }} matching {{ rows.length === 1 ? 'entry' : 'entries' }} · reviewed {{ NUMBER_CODES_REVIEWED }}. Historical examples are not current operating instructions.</p>
    </div>
    <p v-if="status" role="status">{{ status }}</p>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <p v-if="!rows.length" class="empty">No number code matches “{{ query }}” in this category. Try another term or choose All.</p>
    <div v-else class="number-grid">
      <article v-for="c in rows" :key="c.code" class="card stack">
        <header class="code-title"><h2><span class="mono code">{{ c.code }}</span><span>{{ c.meaning }}</span></h2><button :aria-label="`Copy number ${c.code}`" @click="copy(c.code)">Copy</button></header>
        <p class="hint">{{ c.group === 'historical' ? 'Historical example' : c.code === '72' ? 'Informal QRP usage' : 'Amateur operating shorthand' }}</p>
        <p>{{ c.note }}</p>
        <div><span class="hint">International Morse · separate digits</span><div class="mono morse" :aria-label="`Morse for ${c.code}: ${encode(c.code).symbols}`">{{ encode(c.code).symbols }}</div></div>
        <p v-if="c.example" class="hint">Example: <span class="mono">{{ c.example }}</span></p>
      </article>
    </div>
    <p class="hint">For audio practice, use <RouterLink to="/tool/cw">CW Encoder &amp; Decoder</RouterLink>. See also <RouterLink to="/tool/abbreviations">Abbreviations</RouterLink> and <RouterLink to="/tool/q-codes">Q Codes</RouterLink>.</p>
    <template #explain>
      <p>Telegraph operators replaced recurring messages with numbers. “92 Code” names a historical code system, not the meaning of every number in modern amateur radio. This page is a selected reference, not a complete historical table. Historical assignments varied; the examples here follow the cited ACOM overview.</p>
      <p>72 is a later informal QRP greeting. It is kept separate from historical assignments. Use plain language if the other operator does not recognise a number.</p>
      <p>The Morse shown here encodes each digit using International Morse, with a character gap between digits. It is not a run-together prosign or a reproduction of historical landline Morse. A closing number does not replace your required station identification.</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
.number-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 1rem; margin-top: 1rem; }
.code-title { display: flex; gap: .75rem; justify-content: space-between; align-items: flex-start; }
h2 { display: grid; gap: .35rem; margin: 0; font-size: 1.1rem; }
.code { color: var(--accent); font-size: 2rem; }
.morse { font-size: 1.3rem; letter-spacing: .08em; white-space: pre-wrap; }
.code-title button { flex: none; min-height: 44px; }
</style>
