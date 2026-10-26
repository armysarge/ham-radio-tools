<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const failure = ref<{ path: string; title: string }>()
const alert = ref<HTMLElement>()
const removeError = router.onError((_error, to) => {
  failure.value = { path: to.fullPath, title: typeof to.meta.title === 'string' ? to.meta.title : 'this page' }
  void nextTick(() => alert.value?.focus())
})
const removeAfter = router.afterEach((_to, _from, error) => { if (!error) failure.value = undefined })
onUnmounted(() => { removeError(); removeAfter() })
function retry() {
  if (failure.value) void router.push(failure.value.path).catch(() => { /* The router error handler keeps the alert visible. */ })
}
function reload() { location.reload() }
</script>

<template>
  <section v-if="failure" ref="alert" class="notice navigation-error" role="alert" tabindex="-1">
    <h2>Couldn’t open {{ failure.title }}</h2>
    <p>The page failed to open. The previous page is still open.</p>
    <p>Try again or choose another tool. If it keeps failing, save your work before reloading. Reloading clears unsaved inputs.</p>
    <div class="seg">
      <button @click="retry">Try again</button>
      <button @click="reload">Reload app</button>
    </div>
  </section>
</template>

<style scoped>
.navigation-error { margin-bottom:1rem; }
.navigation-error p { margin:.5rem 0; max-width:75ch; }
</style>
