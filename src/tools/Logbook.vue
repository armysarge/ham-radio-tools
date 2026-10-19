<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import { FREQ_UNITS } from '../lib/units'
import { bandOf, fromAdif, isDuplicate, parseAdif, toAdif, type Qso } from '../lib/log'
import { state } from '../core/store'
import { platform } from '../platform'

declare const __APP_VERSION__: string
const KEY = 'hrt:log'
// ponytail: localStorage keeps about 20 000 QSOs; move to IndexedDB (as the content packs do) if logs ever outgrow that.
function load(): Qso[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] } }
const log = ref<Qso[]>(load())
const saveErr = ref('')
watch(log, (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); saveErr.value = '' } catch { saveErr.value = 'The browser would not store the log. Export it now so nothing is lost.' } }, { deep: true })

const nowParts = () => { const d = new Date().toISOString(); return { date: d.slice(0, 10), time: d.slice(11, 16) } }
const call = ref(''), date = ref(nowParts().date), time = ref(nowParts().time), f = ref<number | null>(14.2e6), mode = ref('SSB')
const rs = ref('59'), rr = ref('59'), name = ref(''), grid = ref(''), comment = ref('')
const MODES = ['SSB', 'CW', 'FM', 'AM', 'FT8', 'FT4', 'RTTY', 'PSK31', 'DIGITALVOICE']
const err = ref(''), note = ref('')
const dup = computed(() => !!call.value.trim() && isDuplicate(log.value, { call: call.value.trim(), date: date.value, freqMHz: f.value == null ? null : f.value / 1e6, mode: mode.value }))

function add() {
  err.value = ''
  const c = call.value.trim().toUpperCase()
  if (!/^[A-Z0-9/]{3,}$/.test(c) || !/\d/.test(c)) { err.value = 'Enter a call sign using letters, digits and “/”, e.g. DL1ABC or ZS6SHZ/P.'; return }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value) || !/^\d{2}:\d{2}$/.test(time.value)) { err.value = 'Enter the date and time in UTC.'; return }
  log.value.unshift({ id: Math.random().toString(36).slice(2, 10), call: c, date: date.value, time: time.value, freqMHz: f.value == null ? null : f.value / 1e6, mode: mode.value, rstSent: rs.value, rstRcvd: rr.value, name: name.value, grid: grid.value, comment: comment.value })
  call.value = name.value = grid.value = comment.value = ''; const n = nowParts(); date.value = n.date; time.value = n.time
}
const useNow = () => { const n = nowParts(); date.value = n.date; time.value = n.time }
const remove = (id: string) => { log.value = log.value.filter((q) => q.id !== id) }
const clearAll = () => { if (window.confirm(`Delete all ${log.value.length} contacts from this device? Export first if you want to keep them.`)) log.value = [] }
const exportAdif = () => platform.saveFile(`log-${nowParts().date}.adi`, new Blob([toAdif([...log.value].reverse(), state.callsign || '', __APP_VERSION__)], { type: 'text/plain' }))
async function importAdif(e: Event) {
  note.value = ''; const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
  try {
    const recs = parseAdif(await file.text()); let added = 0, skipped = 0
    for (const r of recs) {
      const q = fromAdif(r, Math.random().toString(36).slice(2, 10))
      if (!q || isDuplicate(log.value, q)) { skipped++; continue }
      log.value.push(q); added++
    }
    log.value.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    note.value = `Imported ${added} contact${added === 1 ? '' : 's'}; skipped ${skipped} (duplicate, or missing a call sign or date).`
  } catch { note.value = 'That file could not be read.' }
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <ToolLayout id="logbook" :references="['ADIF 3.1.4 specification (adif.org): the interchange format read by most logging programs and by Logbook of The World, eQSL and Club Log uploads.']">
    <div class="cols">
      <div class="card stack">
        <label class="field"><span class="lbl">Call sign worked</span><input v-model="call" autocapitalize="characters" spellcheck="false" @keyup.enter="add" /></label>
        <p v-if="dup" class="notice" role="status">You already have this call on this band and mode today.</p>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem">
          <label class="field"><span class="lbl">Date (UTC)</span><input type="date" v-model="date" /></label>
          <label class="field"><span class="lbl">Time (UTC)</span><input type="time" v-model="time" /></label>
        </div>
        <button class="ghost" @click="useNow">Use the time now</button>
        <NumField v-model="f" label="Frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive :hint="bandOf(f == null ? null : f / 1e6) ? 'Band: ' + bandOf(f == null ? null : f / 1e6) : 'Outside the amateur bands ADIF knows'" />
        <label class="field"><span class="lbl">Mode</span><select v-model="mode"><option v-for="m in MODES" :key="m">{{ m }}</option></select></label>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem">
          <label class="field"><span class="lbl">RST sent</span><input v-model="rs" /></label>
          <label class="field"><span class="lbl">RST received</span><input v-model="rr" /></label>
        </div>
        <label class="field"><span class="lbl">Name</span><input v-model="name" /></label>
        <label class="field"><span class="lbl">Grid square</span><input v-model="grid" autocapitalize="characters" /></label>
        <label class="field"><span class="lbl">Comment</span><input v-model="comment" /></label>
        <p v-if="err" class="notice" role="status">{{ err }}</p>
        <button @click="add">Log contact</button>
      </div>
      <div class="stack">
        <div class="card stack">
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
            <strong>{{ log.length }} contact{{ log.length === 1 ? '' : 's' }}</strong>
            <button class="ghost" @click="exportAdif" :disabled="!log.length">Export ADIF</button>
            <label class="ghost" style="cursor:pointer;padding:.45rem .8rem;border:1px solid var(--line);border-radius:8px">Import ADIF<input type="file" accept=".adi,.adif,.txt" @change="importAdif" style="position:absolute;opacity:0;width:1px;height:1px" /></label>
            <button class="ghost" @click="clearAll" :disabled="!log.length">Delete all</button>
          </div>
          <p v-if="!state.callsign" class="hint">Set your call sign in Settings so exported files carry it.</p>
          <p v-if="note" class="notice" role="status">{{ note }}</p>
          <p v-if="saveErr" class="notice" role="status">{{ saveErr }}</p>
          <div class="table-wrap" v-if="log.length">
            <table class="table"><thead><tr><th>UTC</th><th>Call</th><th>Band</th><th>Mode</th><th>RST</th><th></th></tr></thead>
              <tbody><tr v-for="q in log" :key="q.id"><td>{{ q.date }} {{ q.time }}</td><td><strong>{{ q.call }}</strong><div class="hint">{{ [q.name, q.grid, q.comment].filter(Boolean).join(' · ') }}</div></td><td>{{ bandOf(q.freqMHz) || q.freqMHz }}</td><td>{{ q.mode }}</td><td>{{ q.rstSent }}/{{ q.rstRcvd }}</td><td><button class="ghost" :aria-label="'Delete ' + q.call" @click="remove(q.id)">✕</button></td></tr></tbody></table>
          </div>
          <p v-else class="hint">No contacts yet.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <p>The log is stored in this browser on this device only, and survives closing the page, but not clearing site data. <strong>Export to ADIF regularly</strong> as your backup: any logging program can read the file. ADIF text is reduced to plain ASCII on export, so accented characters lose their accent. The duplicate warning uses the usual contest rule: same call, band and mode on the same UTC day. Country (DXCC) is not written, because a call-sign prefix identifies the ITU allocation holder rather than the DXCC entity.</p>
    </template>
  </ToolLayout>
</template>
