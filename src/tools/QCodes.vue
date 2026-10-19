<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { Q_CODES, Q_CODES_REVISION } from '../data/qcodes'

const q = ref('')
const rows = computed(() => {
  const t = q.value.trim().toLowerCase()
  return t ? Q_CODES.filter((c) => (c.code + c.asks + c.says).toLowerCase().includes(t)) : Q_CODES
})
</script>

<template>
  <ToolLayout id="q-codes" :references="['ITU Radio Regulations, Appendix 14.', 'ARRL Operating Manual — Q signals in amateur use.']">
    <div class="card stack">
      <label class="field"><span class="lbl">Filter</span><input v-model="q" type="text" placeholder="e.g. QTH, power, frequency" autocomplete="off" /></label>
      <p class="hint" style="margin:0">{{ Q_CODES_REVISION }}. A trailing “?” turns a code into a question.</p>
    </div>
    <div v-if="!rows.length" class="empty" style="margin-top:1rem">No Q code matches “{{ q }}”.</div>
    <div v-else class="table-wrap" style="margin-top:1rem"><table class="table">
      <thead><tr><th>Code</th><th>As a question</th><th>As an answer</th></tr></thead>
      <tbody><tr v-for="c in rows" :key="c.code"><td class="mono" style="font-weight:700;color:var(--accent)">{{ c.code }}</td><td>{{ c.asks }}</td><td>{{ c.says }}</td></tr></tbody>
    </table></div>
    <template #explain><p>Q codes began as telegraph shorthand. On phone, plain language is preferred except for a few that became common words (QSL, QTH, QRM, QRP…). Meanings are paraphrased; consult the ITU text for the exact standard wording.</p></template>
  </ToolLayout>
</template>
