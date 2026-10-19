<script setup lang="ts">
import { computed, ref } from 'vue'
import { deleteLocation, projectData, setProjectData, state, storageOk } from '../core/store'
import { tools } from '../core/registry'
import { platform } from '../platform'
import PackManager from '../components/PackManager.vue'
import GithubLink from '../components/GithubLink.vue'
import { analyticsAvailable } from '../core/analytics'
import { applyImport, exportProject, parseProject, type ImportReport } from '../lib/project'
import { fmt } from '../lib/units'
import { encode } from '../lib/maidenhead'

// ---- project backup ----
const version = __APP_VERSION__
const hasData = computed(() => state.locations.length + state.designs.length > 0)
const exportProjectFile = () => platform.saveFile(`ham-radio-tools-project-${new Date().toISOString().slice(0, 10)}.json`, exportProject(projectData()), 'application/json')
const pending = ref<ReturnType<typeof parseProject> | null>(null)
const fileName = ref('')
const importError = ref('')
const mode = ref<'merge' | 'replace'>('merge')
const confirmReplace = ref(false)
const report = ref<ImportReport | null>(null)
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  pending.value = null; report.value = null; importError.value = ''; confirmReplace.value = false
  if (!file) return
  fileName.value = file.name
  try { pending.value = parseProject(await file.text(), tools.map((t) => t.id)) } catch (err) { importError.value = (err as Error).message }
  input.value = '' // allow choosing the same file again
}
function doImport() {
  if (!pending.value) return
  const { next, report: r } = applyImport(projectData(), pending.value, mode.value)
  setProjectData(next); report.value = r; pending.value = null
}
</script>

<template>
  <h1>Settings &amp; content</h1>
  <div class="stack">
    <div class="card">
      <h2>Appearance &amp; units</h2>
      <div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
        <label class="field"><span class="lbl">Theme</span>
          <select v-model="state.theme"><option value="system">Match system</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <label class="field"><span class="lbl">Text size</span>
          <select v-model="state.textSize"><option value="normal">Normal</option><option value="large">Large</option><option value="xlarge">Extra large</option></select></label>
        <label class="field"><span class="lbl">Your callsign (optional)</span><input v-model="state.callsign" type="text" class="mono" style="text-transform:uppercase" maxlength="16" autocomplete="off" spellcheck="false" placeholder="e.g. ZS6SHZ" /><span class="hint">Used to pre-fill the callsign lookup. Stays on this device.</span></label>
        <label class="field"><span class="lbl">Measurement system</span>
          <select v-model="state.units"><option value="metric">Metric (m, km)</option><option value="imperial">Imperial (ft, in, miles)</option></select></label>
      </div>
      <p v-if="!storageOk" class="notice">This browser is blocking local storage, so settings, favorites and saved items will be lost when you close the page.</p>
    </div>

    <div class="card">
      <h2>Saved locations</h2>
      <p v-if="!state.locations.length" class="muted">None yet. Save one from the <router-link to="/tool/maidenhead">grid square tool</router-link>; mark one as “My station” to use it as the default.</p>
      <div v-else class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Latitude</th><th>Longitude</th><th>Locator</th><th>Station</th><th></th></tr></thead>
        <tbody>
          <tr v-for="l in state.locations" :key="l.id">
            <td>{{ l.name }}</td><td class="mono">{{ fmt(l.lat, 6) }}</td><td class="mono">{{ fmt(l.lon, 6) }}</td><td class="mono">{{ encode(l.lat, l.lon, 6) }}</td>
            <td><input type="radio" name="station" :checked="state.stationId === l.id" :aria-label="`Use ${l.name} as my station`" @change="state.stationId = l.id" /></td>
            <td><button class="ghost" :aria-label="`Delete ${l.name}`" @click="deleteLocation(l.id)">Delete</button></td>
          </tr>
        </tbody>
      </table></div>
    </div>

    <div class="card stack">
      <h2>Back up or move your projects</h2>
      <p class="muted" style="margin:0">Saves your <strong>saved designs and locations</strong> (and which one is your station) to a small JSON file. Copy it to a USB stick to move to another computer. Theme, units and favorites are per-device and are not included.</p>
      <div class="seg">
        <button class="primary" :disabled="!hasData" @click="exportProjectFile">Export project file</button>
        <label class="btn" style="display:inline-flex;align-items:center">Choose a project file to import…<input type="file" accept=".json,application/json" class="sr-only" aria-label="Import project file" @change="onFile" /></label>
      </div>
      <p v-if="!hasData" class="hint" style="margin:0">Nothing to export yet — save a design or a location first.</p>
      <p v-if="importError" class="err" role="alert">{{ importError }}</p>
      <div v-if="pending" class="notice" role="status">
        <strong>{{ fileName }}</strong> contains {{ pending.data.locations.length }} location(s) and {{ pending.data.designs.length }} design(s).
        <ul v-if="pending.invalid.length" style="margin:.4rem 0 0"><li v-for="m in pending.invalid" :key="m">Skipped: {{ m }}</li></ul>
        <div class="seg" role="group" aria-label="Import mode" style="margin:.6rem 0">
          <button :aria-pressed="mode === 'merge'" @click="mode = 'merge'; confirmReplace = false">Add to what I have</button>
          <button :aria-pressed="mode === 'replace'" @click="mode = 'replace'">Replace what I have</button>
        </div>
        <p v-if="mode === 'merge'" style="margin:0 0 .6rem">Items already on this device (same id) are kept as they are.</p>
        <label v-else style="display:block;margin-bottom:.6rem"><input v-model="confirmReplace" type="checkbox" /> I understand this removes my {{ state.locations.length }} saved location(s) and {{ state.designs.length }} saved design(s) first.</label>
        <button class="primary" :disabled="mode === 'replace' && !confirmReplace" @click="doImport">Import</button>
      </div>
      <p v-if="report" class="notice" role="status">Imported {{ report.addedLocations }} location(s) and {{ report.addedDesigns }} design(s); {{ report.skippedExisting }} already existed and were left unchanged{{ report.skippedInvalid.length ? `; ${report.skippedInvalid.length} invalid item(s) skipped` : '' }}.</p>
    </div>

    <PackManager />

    <div class="card stack" v-if="analyticsAvailable">
      <h2>Usage statistics</h2>
      <p style="margin:0">This public demo can send anonymous page-view statistics to Google Analytics, only if you allow it. It never sends your call sign, saved designs, locations, log or search text. The downloadable and desktop versions contain no analytics at all.</p>
      <div class="seg" role="group" aria-label="Usage statistics">
        <button :aria-pressed="state.analytics === 'on'" @click="state.analytics = 'on'">Allowed</button>
        <button :aria-pressed="state.analytics !== 'on'" @click="state.analytics = 'off'">Not allowed</button>
      </div>
      <p v-if="state.analytics === 'off'" class="muted" style="margin:0">Turned off. If it was on earlier in this visit, reload the page to stop the analytics script loading.</p>
    </div>
    <div class="card stack">
      <h2>About</h2>
      <p style="margin:0"><strong>Ham Radio Tools</strong> version <span class="mono">{{ version }}</span> · MIT licence</p>
      <p style="margin:0">Made by <strong class="mono">ZS6SHZ</strong>. 73!</p>
      <p style="margin:0"><GithubLink label /> <span class="muted">· source code, issues and releases (opens the web)</span></p>
      <p class="muted" style="margin:0">This app never checks for updates or contacts any server. To update, install the newer release you downloaded yourself.</p>
    </div>
  </div>
</template>
