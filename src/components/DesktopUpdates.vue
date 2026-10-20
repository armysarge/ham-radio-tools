<script setup lang="ts">
import { onUnmounted, toRefs } from 'vue'
import type { UpdateResult } from '../platform/desktop'
import { desktopUpdateState } from '../core/desktopUpdates'
const desktop = window.hrtDesktop
const version = __APP_VERSION__
const { release, busy, downloaded, linux, message, error, percent } = toRefs(desktopUpdateState)
const unsubscribe = desktop?.onUpdateProgress(value => { percent.value = value })
onUnmounted(() => unsubscribe?.())
async function act(kind: 'check' | 'download' | 'install') {
  if (!desktop || busy.value) return
  busy.value = true; error.value = ''; message.value = ''
  try {
    if (kind === 'check') { release.value = null; downloaded.value = false }
    if (kind === 'download') percent.value = 0
    const result: UpdateResult = await ({ check: desktop.checkUpdate, download: desktop.downloadUpdate, install: desktop.installUpdate })[kind]()
    if (result.error) error.value = result.error
    else if (result.canceled) message.value = 'Canceled. Nothing was installed.'
    else if (kind === 'check') { release.value = result.release ?? null; message.value = release.value ? `Version ${release.value.version} is available.` : 'You have the latest published stable version.' }
    else if (kind === 'download') { downloaded.value = !!result.downloaded; linux.value = result.platform === 'linux'; message.value = 'Download complete. SHA-256 verified.' }
    else if (result.revealed) message.value = 'Installer shown in your file manager. For AppImage, allow execution in file properties, close this app, then run the new file. Keep your existing version until the new one works.'
  } catch { error.value = 'Update action failed. Check your connection and try again.' }
  finally { busy.value = false }
}
</script>
<template>
  <section v-if="desktop" class="card stack" aria-labelledby="desktop-updates-title">
    <h2 id="desktop-updates-title">Desktop updates</h2>
    <p>Installed version: <strong>{{ version }}</strong>. Checks contact GitHub only when you click. Downloads and installer launch are separate actions; nothing runs in the background.</p>
    <p class="hint">Export important projects before updating. SHA-256 verifies the download against the release; it does not replace publisher signing. No account is required.</p>
    <div class="seg">
      <button :disabled="busy" @click="act('check')">Check for updates</button>
      <button v-if="release && !downloaded" :disabled="busy" @click="act('download')">Download {{ release.version }} ({{ (release.size / 1048576).toFixed(1) }} MB)</button>
      <button v-if="downloaded" :disabled="busy" @click="act('install')">{{ linux ? 'Show downloaded AppImage' : 'Open update installer' }}</button>
    </div>
    <p v-if="release" class="hint">{{ release.name }}</p>
    <p v-if="busy" role="status">Working… {{ percent ? `${percent}% downloaded` : '' }}</p>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
  </section>
</template>
