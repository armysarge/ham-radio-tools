<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { installPack, installedPacks, packsError, refreshPacks, removePack } from '../core/packs'
import { ageDays, parsePack, type Pack } from '../lib/packs'

const err = ref(''), msg = ref('')
const pending = ref<{ pack: Pack; rows: number; skipped: string[]; file: string } | null>(null)
const STALE: Record<string, number> = { 'band-plan': 365, 'broadcast-schedule': 45 }
const KIND: Record<string, string> = { 'band-plan': 'Band plan', 'broadcast-schedule': 'Broadcast schedule' }
onMounted(refreshPacks)

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
</script>

<template>
  <div class="card stack">
    <h2>Content on this device</h2>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Content</th><th>Status</th><th>Source / revision</th></tr></thead>
      <tbody>
        <tr><td>Application, calculators, diagrams</td><td>Bundled</td><td>Included in the install</td></tr>
        <tr><td>World basemap (country outlines)</td><td>Bundled</td><td>Natural Earth 1:110m, public domain</td></tr>
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
    <p class="muted" style="margin:0">Packs are plain JSON files you copy over yourself (USB stick, download on another computer). The app never fetches them and makes no update checks.</p>
  </div>
</template>
