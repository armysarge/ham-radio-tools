<script setup lang="ts">
import { toRefs } from 'vue'
import type { UpdateResult } from '../platform/desktop'
import { desktopUpdateState } from '../core/desktopUpdates'
const desktop = window.hrtDesktop
const version = __APP_VERSION__
const { release, busy, action, downloaded, linux, message, error, percent } = toRefs(desktopUpdateState)
async function act(kind: 'check' | 'download' | 'install') {
  if (!desktop || busy.value) return
  busy.value = true; action.value = kind; error.value = ''; message.value = ''
  let unsubscribe: (() => void) | undefined
  try {
    if (kind === 'check') { release.value = null; downloaded.value = false }
    if (kind === 'download') {
      percent.value = 0; downloaded.value = false
      // Keep listening through navigation; the action owns the listener until it settles.
      unsubscribe = desktop.onUpdateProgress(value => {
        if (Number.isFinite(value)) percent.value = Math.max(percent.value, Math.min(100, Math.max(0, value)))
      })
    }
    const result: UpdateResult = await ({ check: desktop.checkUpdate, download: desktop.downloadUpdate, install: desktop.installUpdate })[kind]()
    if (result.error) error.value = result.error
    else if (result.canceled) message.value = 'Canceled. Nothing was installed.'
    else if (kind === 'check') { release.value = result.release ?? null; message.value = release.value ? `Version ${release.value.version} is available.` : 'You have the latest published stable version.' }
    else if (kind === 'download' && result.downloaded) { percent.value = 100; downloaded.value = true; linux.value = result.platform === 'linux'; message.value = 'Download complete. SHA-256 verified.' }
    else if (result.revealed) message.value = 'Installer shown in your file manager. For AppImage, allow execution in file properties, close this app, then run the new file. Keep your existing version until the new one works.'
  } catch { error.value = 'Update action failed. Check your connection and try again.' }
  finally { unsubscribe?.(); busy.value = false; action.value = null }
}
</script>
<template>
  <section v-if="desktop" class="card stack" aria-labelledby="desktop-updates-title">
    <h2 id="desktop-updates-title">Desktop updates</h2>
    <p>Installed version: <strong>{{ version }}</strong>. Checks contact GitHub only when you click. Downloads and installer launch are separate actions; there are no automatic update checks or downloads.</p>
    <p class="hint">Export important projects before updating. SHA-256 verifies the download against the release checksum. No account is required.</p>
    <div class="seg">
      <button :disabled="busy" @click="act('check')">Check for updates</button>
      <button v-if="release && !downloaded" :disabled="busy" @click="act('download')">Download {{ release.version }} ({{ (release.size / 1048576).toFixed(1) }} MB)</button>
      <button v-if="downloaded" :disabled="busy" @click="act('install')">{{ linux ? 'Show downloaded AppImage' : 'Open update installer' }}</button>
    </div>
    <p v-if="release" class="hint">{{ release.name }}</p>
    <div v-if="(busy && action === 'download') || downloaded" class="download-progress">
      <div class="download-caption"><strong>{{ downloaded ? 'Download verified' : percent === 100 ? 'Verifying download…' : 'Downloading update…' }}</strong><span class="mono">{{ downloaded ? 100 : percent }}%</span></div>
      <div class="download-track" :class="{ active: busy && action === 'download' && !downloaded }" role="progressbar" aria-label="Update download" :aria-valuenow="downloaded ? 100 : percent" aria-valuemin="0" aria-valuemax="100" :aria-valuetext="downloaded ? 'Downloaded and SHA-256 verified' : percent === 100 ? 'Download received; verifying SHA-256' : `${percent}% downloaded`">
        <span class="download-fill" :style="{ width: `${downloaded ? 100 : percent}%` }"></span>
      </div>
      <p v-if="!downloaded" class="hint">{{ percent === 100 ? 'Checking the file before making the installer available.' : 'You can keep using the tools while this download runs.' }}</p>
    </div>
    <p v-if="busy && action !== 'download'" role="status">{{ action === 'check' ? 'Checking GitHub for a newer release…' : 'Opening the update installer…' }}</p>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.download-progress { min-width: 0; }
.download-caption { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: .5rem; margin-bottom: .6rem; }
.download-track { height: 12px; overflow: hidden; border-radius: 8px; background: var(--panel2); border: 1px solid var(--line); }
.download-fill { display: block; height: 100%; border-radius: inherit; background: var(--accent); transition: width .25s ease; }
.download-track.active .download-fill { background-image: linear-gradient(120deg, transparent 25%, rgb(255 255 255 / .22) 25%, rgb(255 255 255 / .22) 50%, transparent 50%, transparent 75%, rgb(255 255 255 / .22) 75%); background-size: 28px 28px; animation: download-stripes 1s linear infinite; }
.download-progress .hint { margin: .5rem 0 0; }
@keyframes download-stripes { to { background-position: 28px 0; } }
@media (prefers-reduced-motion: reduce) { .download-fill { transition: none; } .download-track.active .download-fill { animation: none; } }
</style>
