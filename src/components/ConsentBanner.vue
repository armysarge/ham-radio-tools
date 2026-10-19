<script setup lang="ts">
import { analyticsAvailable } from '../core/analytics'
import { state } from '../core/store'
</script>

<template>
  <div v-if="analyticsAvailable && state.analytics === 'unset'" class="consent" role="region" aria-label="Usage statistics">
    <p style="margin:0">Help improve this site? Allow anonymous usage statistics (Google Analytics: which pages are opened, no call sign, no saved data, no search text). Nothing is sent unless you accept.</p>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">
      <button @click="state.analytics = 'on'">Allow</button>
      <button class="ghost" @click="state.analytics = 'off'">No thanks</button>
    </div>
  </div>
</template>

<style scoped>
.consent { position: fixed; left: .75rem; right: .75rem; bottom: .75rem; z-index: 60; max-width: 42rem; margin: 0 auto; display: grid; gap: .6rem; padding: .8rem 1rem; background: var(--panel); border: 1.5px solid var(--line); border-radius: 12px; box-shadow: 0 6px 24px rgb(0 0 0 / .25); }
</style>
