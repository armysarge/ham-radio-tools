import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './', // relative paths so dist/ works from any folder, a USB stick, or a desktop shell
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
})
