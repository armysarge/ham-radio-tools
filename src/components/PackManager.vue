<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { installPack, installedPacks, packsError, refreshPacks, removePack } from '../core/packs'
import { ageDays, parsePack, type Pack } from '../lib/packs'
import { parseScheduleText } from '../lib/scheduleImport'
import { BUNDLED_PACKS } from '../data/packs'
import { platform } from '../platform'

const err = ref(''), msg = ref('')
const pending = ref<{ pack: Pack; rows: number; skipped: string[]; file: string } | null>(null)
const STALE: Record<string, number> = { 'band-plan': 365, 'broadcast-schedule': 45 }
const KIND: Record<string, string> = { 'band-plan': 'Band plan', 'broadcast-schedule': 'Broadcast schedule' }
onMounted(refreshPacks)
const bundledNames = BUNDLED_PACKS.map((p) => p.jurisdiction ?? p.title).join(', ')

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement, file = input.files?.[0]
  err.value = msg.value = ''; pending.value = null
  if (!file) return
  try { pending.value = { ...parsePack(await file.text()), file: file.name } } catch (x) { err.value = (x as Error).message }
  input.value = ''
}
async function confirm() {
  if (!pending.value) return
  try { await installPack(pending.value.pack, pending.value.rows); msg.value = `Installed “${pending.value.pack.title}” (${pending.value.rows} rows).`; pending.value = null }
  catch (x) { err.value = (x as Error).message }
}
const existing = () => installedPacks.value.find((p) => p.id === pending.value?.pack.id)
const age = (rev: string) => ageDays(rev)

// ---- convert a plain schedule file into a pack ----
const conv = ref<{ entries: ReturnType<typeof parseScheduleText>['entries']; skipped: string[]; layout: string; file: string } | null>(null)
const meta = ref({ title: '', source: '', revision: '', license: '' })
const convErr = ref('')
async function onSchedule(e: Event) {
  const input = e.target as HTMLInputElement, file = input.files?.[0]
  conv.value = null; convErr.value = ''
  if (!file) return
  try {
    const r = await file.text().then(parseScheduleText)
    conv.value = { ...r, file: file.name }
    meta.value = { title: r.layout === 'eibi' ? 'EiBi shortwave schedule' : file.name.replace(/\.[^.]+$/, ''), source: r.layout === 'eibi' ? 'EiBi (eibispace.de) shortwave schedule' : '', revision: '', license: '' }
  } catch (x) { convErr.value = (x as Error).message }
  input.value = ''
}
function buildPack() {
  if (!conv.value) throw new Error('No file loaded.')
  const id = meta.value.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'schedule'
  return JSON.stringify({ format: 'ham-radio-tools-pack', version: 1, kind: 'broadcast-schedule', id, title: meta.value.title, source: meta.value.source, revision: meta.value.revision, license: meta.value.license, data: { entries: conv.value.entries } })
}
async function installConverted() {
  convErr.value = ''
  try { const p = parsePack(buildPack()); await installPack(p.pack, p.rows); msg.value = `Installed “${p.pack.title}” (${p.rows} rows).`; conv.value = null }
  catch (x) { convErr.value = (x as Error).message }
}
function saveConverted() {
  convErr.value = ''
  try { const p = parsePack(buildPack()); platform.saveFile(`${p.pack.id}-${p.pack.revision}.json`, JSON.stringify(p.pack), 'application/json') } catch (x) { convErr.value = (x as Error).message }
}
</script>

<template>
  <div class="card stack">
    <h2>Content on this device</h2>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Content</th><th>Status</th><th>Source / revision</th></tr></thead>
      <tbody>
        <tr><td>Application, calculators, diagrams</td><td>Bundled</td><td>Included in the install</td></tr>
        <tr><td>World basemap (country outlines)</td><td>Bundled</td><td>Natural Earth 1:110m, public domain</td></tr>
        <tr><td>National band plans: {{ bundledNames }}</td><td>Bundled</td><td>Official tables, dated 2026-10-19; sources shown in the Band Plans tool</td></tr>
        <tr><td>ITU region amateur allocations, CTCSS tones, constants, abbreviations, Q codes, callsign prefixes</td><td>Bundled</td><td>Dated in each tool</td></tr>
        <tr v-for="p in installedPacks" :key="p.id">
          <td>{{ p.title }}<div class="hint">{{ KIND[p.kind] }} · {{ p.rows }} rows{{ p.jurisdiction ? ' · ' + p.jurisdiction : '' }}</div></td>
          <td>Installed<button class="ghost" :aria-label="`Remove ${p.title}`" @click="removePack(p.id)">Remove</button></td>
          <td>{{ p.source }} · revision {{ p.revision }} ({{ age(p.revision) }} days old)
            <div v-if="age(p.revision) > STALE[p.kind]" class="err">Older than {{ STALE[p.kind] }} days — look for a newer pack.</div></td>
        </tr>
        <tr v-if="!installedPacks.length"><td>Regional band plans, broadcast schedules</td><td>Unavailable</td><td>Import a pack file below</td></tr>
        <tr><td>Detailed regional map packs</td><td>Unavailable</td><td>Planned</td></tr>
        <tr><td>Radio manual library, offline AI assistant</td><td>Unavailable</td><td>Planned</td></tr>
      </tbody>
    </table></div>
    <p v-if="packsError" class="notice" role="alert">{{ packsError }}</p>
    <label class="btn" style="display:inline-flex;align-items:center;width:fit-content">Import a content pack (.json)…<input type="file" accept=".json,application/json" class="sr-only" aria-label="Import content pack" @change="onFile" /></label>
    <p v-if="err" class="err" role="alert">{{ err }}</p>
    <div v-if="pending" class="notice" role="status">
      <strong>{{ pending.pack.title }}</strong> — {{ KIND[pending.pack.kind] }}, {{ pending.rows }} rows, revision {{ pending.pack.revision }} ({{ age(pending.pack.revision) }} days old).<br />
      Source: {{ pending.pack.source }} · Licence: {{ pending.pack.license }}
      <p v-if="existing()" style="margin:.4rem 0 0">Replaces the installed copy (revision {{ existing()!.revision }}){{ existing()!.revision > pending.pack.revision ? ' — note: the installed one is NEWER' : '' }}.</p>
      <ul v-if="pending.skipped.length" style="margin:.4rem 0 0"><li v-for="m in pending.skipped.slice(0, 5)" :key="m">Skipped: {{ m }}</li><li v-if="pending.skipped.length > 5">…and {{ pending.skipped.length - 5 }} more</li></ul>
      <button class="primary" style="margin-top:.6rem" @click="confirm">Install pack</button>
    </div>
    <p v-if="msg" class="notice" role="status">{{ msg }}</p>

    <details class="explain" style="margin:0">
      <summary>Convert a shortwave schedule text file into a pack</summary>
      <p class="muted">Understands the semicolon-separated layout used by the EiBi shortwave schedule, and a simple CSV (<span class="mono">freq_khz,start_utc,end_utc,days,station,language,target,country,note</span>). Get the file yourself, check its licence, and say where it came from below.</p>
      <label class="btn" style="display:inline-flex;align-items:center">Choose a schedule file…<input type="file" accept=".txt,.csv,text/plain,text/csv" class="sr-only" aria-label="Choose schedule text file" @change="onSchedule" /></label>
      <p v-if="convErr" class="err" role="alert">{{ convErr }}</p>
      <div v-if="conv" class="stack" style="margin-top:.6rem">
        <p style="margin:0"><strong>{{ conv.file }}</strong>: {{ conv.entries.length }} transmissions ({{ conv.layout }} layout){{ conv.skipped.length ? `, ${conv.skipped.length} line(s) skipped` : '' }}.</p>
        <ul v-if="conv.skipped.length" style="margin:0"><li v-for="m in conv.skipped.slice(0, 4)" :key="m">Skipped: {{ m }}</li></ul>
        <label class="field"><span class="lbl">Pack name</span><input v-model="meta.title" type="text" /></label>
        <label class="field"><span class="lbl">Source (where the file came from)</span><input v-model="meta.source" type="text" /></label>
        <label class="field"><span class="lbl">Schedule date (YYYY-MM-DD)</span><input v-model="meta.revision" type="text" placeholder="e.g. 2026-10-26" inputmode="numeric" />
          <span class="hint">The date the schedule was issued, as stated by the source — this is what the age warning counts from.</span></label>
        <label class="field"><span class="lbl">Licence / terms of use</span><input v-model="meta.license" type="text" placeholder="e.g. free for private use, per the publisher" /></label>
        <div class="seg"><button class="primary" @click="installConverted">Install on this device</button><button @click="saveConverted">Save as pack file (.json)</button></div>
      </div>
    </details>
    <p class="muted" style="margin:0">Packs are plain JSON files you copy over yourself (USB stick, download on another computer). The app never fetches them and makes no update checks.</p>
  </div>
</template>
