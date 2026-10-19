<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { ITU_GLOSSARY, ITU_INFO_META, ITU_SECTIONS } from '../data/ituInfo'
import { ITU_META } from '../data/reference'

const q = ref('')
const t = computed(() => q.value.trim().toLowerCase())
const sections = computed(() => ITU_SECTIONS.filter((s) => !t.value || (s.heading + s.body.join(' ') + (s.list ?? []).join(' ')).toLowerCase().includes(t.value)))
const glossary = computed(() => ITU_GLOSSARY.filter((g) => !t.value || g.join(' ').toLowerCase().includes(t.value)))
</script>

<template>
  <ToolLayout id="itu-regulations" :references="[`${ITU_INFO_META.source} (revision ${ITU_INFO_META.revision}).`, 'ITU Radio Regulations, Articles 1, 5, 15, 19 and 25, and Appendix 42. Read the current edition on itu.int for anything that matters.']">
    <div class="notice">The ITU Radio Regulations are the international <strong>treaty</strong> that divides up the radio spectrum. Your <strong>national licence</strong> is what you must actually follow. This page is a plain-language summary, not legal text.</div>
    <div class="card stack" style="margin-top:1rem">
      <label class="field"><span class="lbl">Search this page</span><input v-model="q" type="text" autocomplete="off" placeholder="e.g. primary, Region 2, Article 25, WRC" /></label>
      <p class="hint" style="margin:0">Related tools: <router-link to="/tool/band-plans">Band Plans</router-link> (allocations per Region and per country) · <router-link to="/tool/callsign">Callsign Lookup</router-link> (Appendix 42 call-sign series).</p>
    </div>

    <p v-if="!sections.length && !glossary.length" class="empty" style="margin-top:1rem">Nothing on this page matches “{{ q }}”.</p>

    <article v-for="s in sections" :key="s.heading" class="card" style="margin-top:1rem">
      <h2>{{ s.heading }}</h2>
      <p v-for="(p, i) in s.body" :key="i">{{ p }}</p>
      <ul v-if="s.list" style="margin:.2rem 0 0;padding-left:1.2rem"><li v-for="l in s.list" :key="l" style="margin:.3rem 0">{{ l }}</li></ul>
    </article>

    <section v-if="glossary.length" class="card" style="margin-top:1rem">
      <h2>Glossary</h2>
      <div class="table-wrap"><table class="table"><tbody><tr v-for="g in glossary" :key="g[0]"><th scope="row" style="white-space:nowrap">{{ g[0] }}</th><td>{{ g[1] }}</td></tr></tbody></table></div>
    </section>

    <template #explain>
      <p>The bundled <strong>ITU region band plan</strong> in this app is simplified from Article 5 (revision {{ ITU_META.revision }}). It lists the main amateur bands only, per Region, and leaves out the footnotes and shared-service detail. Treat it as an orientation aid rather than a licence document.</p>
    </template>
  </ToolLayout>
</template>
