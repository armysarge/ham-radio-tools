<script setup lang="ts">
import { deleteLocation, state, storageOk } from '../core/store'
import { fmt } from '../lib/units'
import { encode } from '../lib/maidenhead'
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
        <label class="field"><span class="lbl">Length units</span>
          <select v-model="state.units"><option value="metric">Metric (m)</option><option value="imperial">Imperial (ft / in)</option></select></label>
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

    <div class="card">
      <h2>Content on this device</h2>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Content</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td>Application, calculators, diagrams</td><td>Bundled</td><td>Included in the install; no downloads.</td></tr>
          <tr><td>World basemap (Natural Earth, 1:110m)</td><td>Bundled</td><td>Country outlines only; public domain. Good to roughly continent/country scale.</td></tr>
          <tr><td>Detailed regional map packs</td><td>Unavailable</td><td>Planned. Will be imported from a file or USB stick.</td></tr>
          <tr><td>Regional band plans</td><td>Unavailable</td><td>Planned as dated, per-jurisdiction packs.</td></tr>
          <tr><td>Radio manual library</td><td>Unavailable</td><td>Planned. You will import your own PDFs.</td></tr>
          <tr><td>Offline AI assistant</td><td>Unavailable</td><td>Planned and optional.</td></tr>
        </tbody>
      </table></div>
      <p class="muted">This app makes no network requests: no telemetry, update checks or online map tiles.</p>
    </div>
  </div>
</template>
