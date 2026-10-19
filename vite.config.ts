import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { frameHeaders, guardSource, headersFile, parseAllowed } from './scripts/frame-guard.mjs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Only the demo build (`npm run build:demo`, mode "demo", sets VITE_GA_ID) may talk to Google Analytics, and only after the visitor opts in.
// Its Content-Security-Policy is widened for exactly those hosts; every other build keeps the strict same-origin policy.
const gaCsp: Plugin = {
  name: 'demo-csp',
  transformIndexHtml: (html: string) => html.replace(
    /<meta http-equiv="Content-Security-Policy" content="[^"]*" \/>/,
    `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com" />`,
  ),
}

// Fills the version into the page metadata, so the JSON-LD never disagrees with package.json.
const pageMeta: Plugin = { name: 'page-meta', transformIndexHtml: (html: string) => html.replaceAll('%APP_VERSION%', pkg.version) }

// Refuses to be framed except by the origins listed in ALLOWED_FRAME_ANCESTORS (.env). See scripts/frame-guard.mjs.
const frameGuard = (allowed: string[]): Plugin => ({
  name: 'frame-guard',
  transformIndexHtml: () => [{ tag: 'script', attrs: { src: './frame-guard.js' }, injectTo: 'head-prepend' }],
  configureServer(server) { server.middlewares.use('/frame-guard.js', (_q, r) => { r.setHeader('Content-Type', 'text/javascript'); r.end(guardSource(allowed)) }) },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'frame-guard.js', source: guardSource(allowed) })
    this.emitFile({ type: 'asset', fileName: '_headers', source: headersFile(allowed) })
  },
})

export default defineConfig(({ mode }) => {
  const allowed = parseAllowed(loadEnv(mode, process.cwd(), '').ALLOWED_FRAME_ANCESTORS)
  const headers = frameHeaders(allowed)
  return {
    plugins: [vue(), pageMeta, frameGuard(allowed), ...(mode === 'demo' ? [gaCsp] : [])],
    define: { __APP_VERSION__: JSON.stringify(pkg.version) }, // single source of truth: package.json
    base: './', // relative paths so dist/ works from any folder, a USB stick, or a desktop shell
    server: { headers },
    preview: { allowedHosts: ['hamradiotools.armysarge.co.za'], headers }, // the public demo host serves `vite preview`
    test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
  }
})
