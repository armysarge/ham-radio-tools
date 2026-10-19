import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [vue()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) }, // single source of truth: package.json
  base: './', // relative paths so dist/ works from any folder, a USB stick, or a desktop shell
  preview: { allowedHosts: ['hamradiotools.armysarge.co.za'] }, // the public demo host serves `vite preview`
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
})
