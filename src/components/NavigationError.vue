<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { navigationErrorDetail, saveNavigationReport } from '../core/navigationDiagnostics'

const router = useRouter()
const failure = ref<{ path: string; title: string; detail: ReturnType<typeof navigationErrorDetail> }>()
const alert = ref<HTMLElement>()
const desktop = !!window.hrtDesktop
const exportMessage = ref('')
const removeError = router.onError((error, to) => {
  failure.value = { path: to.fullPath, title: typeof to.meta.title === 'string' ? to.meta.title : 'this page', detail: navigationErrorDetail(error) }
  exportMessage.value = ''
  void nextTick(() => alert.value?.focus())
})
const removeAfter = router.afterEach((_to, _from, error) => { if (!error) failure.value = undefined })
onUnmounted(() => { removeError(); removeAfter() })
function retry() {
  if (failure.value) void router.push(failure.value.path).catch(() => { /* The router error handler keeps the alert visible. */ })
}
function reload() { location.reload() }
async function exportReport() {
  try { await saveNavigationReport(); exportMessage.value = '' }
  catch { exportMessage.value = 'Could not save the error report. Try another folder.' }
}
</script>

<template>
  <section v-if="failure" ref="alert" class="notice navigation-error" role="alert" tabindex="-1">
    <h2>Couldn’t open {{ failure.title }}</h2>
    <p v-if="['module-load', 'stylesheet-load'].includes(failure.detail.category)">A required application file could not load. The previous page is still open.</p>
    <p v-else>The page failed to open. The previous page is still open.</p>
    <p>Try again or choose another tool. If it keeps failing, save your work before reloading. Reloading clears unsaved inputs.</p>
    <div class="seg">
      <button @click="retry">Try again</button>
      <button v-if="desktop" @click="exportReport">Save error report</button>
      <button @click="reload">Reload app</button>
    </div>
    <p v-if="exportMessage">{{ exportMessage }}</p>
  </section>
</template>

<style scoped>
.navigation-error { margin-bottom:1rem; }
.navigation-error p { margin:.5rem 0; max-width:75ch; }
</style>
