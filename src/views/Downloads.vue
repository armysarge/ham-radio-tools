<script setup lang="ts">
import { REPO_URL } from '../core/meta'
const version = __APP_VERSION__
const release = `${REPO_URL}/releases/tag/v${version}`
const asset = (file: string) => `${REPO_URL}/releases/download/v${version}/${file}`
const downloads = [
  { name: 'Windows', format: 'x64 installer', file: `ham-radio-tools-${version}-win-x64.exe`, text: 'Install for your user account. Includes the runtime; no separate Node.js installation. Unsigned builds may show a Windows reputation warning.' },
  { name: 'Linux AppImage', format: 'x64 portable app', file: `ham-radio-tools-${version}-linux-x64.AppImage`, text: 'Make the file executable, then run it. Your distribution may need FUSE support. Keep your old copy until the new one works.' },
  { name: 'Debian / Ubuntu', format: 'x64 package', file: `ham-radio-tools-${version}-linux-x64.deb`, text: 'Install with your distribution’s package manager. Package installation can require administrator permission.' },
  { name: 'Web bundle', format: 'ZIP for local hosting', file: `ham-radio-tools-web-${version}.zip`, text: 'Extract and serve with a local static web server, or deploy to your own host. This standard build contains no analytics.' },
]
</script>
<template>
  <section class="stack downloads">
    <header><h1>Download Ham Radio Tools</h1><p class="muted">Windows, Linux or your browser. Calculators, reference tables and the basic world map are included.</p></header>
    <div class="card download-demo"><div><h2>Try it before installing</h2><p>The hosted demo opens in your browser and needs a connection to load. Your saved work stays in that browser.</p></div><a class="btn primary" href="https://hamradiotools.armysarge.co.za/" target="_blank" rel="noopener noreferrer">Open the demo</a></div>
    <div><h2>Download version {{ version }}</h2><p>These links open GitHub. Files become available when the release is published. <a :href="release" target="_blank" rel="noopener noreferrer">Read the release notes</a> or <a :href="`${REPO_URL}/releases/latest`" target="_blank" rel="noopener noreferrer">find the latest release</a>.</p></div>
    <div class="grid"><article v-for="d in downloads" :key="d.file" class="card stack"><div><h2>{{ d.name }}</h2><span class="muted">{{ d.format }}</span></div><p>{{ d.text }}</p><a class="btn" :href="asset(d.file)" rel="noopener noreferrer">Download {{ d.name }}</a><span class="hint download-filename">{{ d.file }}</span></article></div>
    <div class="card stack"><h2>Keep your saved work</h2><p>Before moving devices or updating, export your designs and locations from <router-link to="/settings">Settings &amp; content</router-link>. Export your logbook separately as ADIF. The browser and desktop app use separate storage.</p><p>Check downloads against <a :href="asset('SHA256SUMS.txt')">SHA256SUMS.txt</a>. Checksums verify file integrity; they do not establish publisher identity. Desktop updates are available in Settings and only contact GitHub when you request a check.</p></div>
  </section>
</template>
<style scoped>
.download-demo{display:flex;gap:1.5rem;align-items:center;justify-content:space-between}
.download-demo p{margin-bottom:0;max-width:65ch}
.downloads .btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;flex-shrink:0}
.downloads article{display:flex;flex-direction:column;align-items:stretch}
.downloads article .btn{margin-top:auto}
.download-filename{display:block;overflow-wrap:anywhere;margin-top:.65rem}
.download-demo .primary{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
@media(max-width:600px){.download-demo{align-items:stretch;flex-direction:column}}
</style>
