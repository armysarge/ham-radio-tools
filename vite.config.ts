import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Only the demo build (`npm run build:demo`, mode "demo", sets VITE_GA_ID) may talk to Google Analytics, and only after the visitor opts in.
// Its Content-Security-Policy is widened for exactly those hosts; every other build keeps the strict same-origin policy.
const gaCsp = {
  name: 'demo-csp',
  transformIndexHtml: (html: string) => html.replace(
    /<meta http-equiv="Content-Security-Policy" content="[^"]*" \/>/,
    `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com" />`,
  ),
}

export default defineConfig(({ mode }) => ({
  plugins: [vue(), ...(mode === 'demo' ? [gaCsp] : [])],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) }, // single source of truth: package.json
  base: './', // relative paths so dist/ works from any folder, a USB stick, or a desktop shell
  preview: { allowedHosts: ['hamradiotools.armysarge.co.za'] }, // the public demo host serves `vite preview`
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
}))
