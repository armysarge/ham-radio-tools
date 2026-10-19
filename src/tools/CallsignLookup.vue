<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { lookup } from '../lib/callsign'
import { CALLSIGN_META } from '../data/callsigns'

const input = ref('DL/ZS6ABC/P')
const r = computed(() => lookup(input.value))
const EXAMPLES = ['W1AW', 'JA1ABC', 'ZS6ABC', 'VK9XX', 'KH6ABC', 'DL/W1AW', '3DA0RU', 'G4ABC/MM']
</script>

<template>
  <ToolLayout id="callsign" :references="[`${CALLSIGN_META.source} (revision ${CALLSIGN_META.revision}).`, 'Spot-checked against the public ITU prefix table on the revision date; verify anything critical against the ITU Radio Regulations.']">
    <div class="card stack">
      <label class="field"><span class="lbl">Call sign</span>
        <input v-model="input" type="text" class="mono" style="font-size:1.4rem;text-transform:uppercase" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="e.g. W1AW or DL/W1AW" /></label>
      <div class="seg" aria-label="Examples"><button v-for="e in EXAMPLES" :key="e" @click="input = e">{{ e }}</button></div>
    </div>

    <div class="card stack" style="margin-top:1rem" aria-live="polite">
      <p v-if="r.status === 'invalid'" class="err">{{ r.notes[0] }}</p>
      <template v-else>
        <div v-if="r.status === 'not-allocated'" class="notice">{{ r.notes[r.notes.length - 1] }}</div>
        <div v-if="r.issuedBy">
          <div class="muted">Issued by (call sign <span class="mono">{{ r.call }}</span>)</div>
          <div style="font-size:1.8rem;font-weight:700;color:var(--accent)">{{ r.issuedBy.holder }}</div>
          <div v-if="r.issuedBy.entity" style="font-size:1.1rem">{{ r.issuedBy.entity }}</div>
        </div>
        <div v-if="r.operating">
          <div class="muted">Operating from (prefix <span class="mono">{{ r.operating.matched }}</span>)</div>
          <div style="font-size:1.8rem;font-weight:700">{{ r.operating.holder }}</div>
          <div v-if="r.operating.entity" style="font-size:1.1rem">{{ r.operating.entity }}</div>
        </div>
        <div v-if="r.suffix" class="muted">Suffix: <span class="mono">/{{ r.suffix }}</span></div>
        <ul style="margin:0;padding-left:1.2rem"><li v-for="n in r.notes" :key="n" class="muted">{{ n }}</li></ul>
      </template>
    </div>

    <template #explain>
      <p>The ITU divides every possible call sign beginning into blocks and assigns each block to a country. Looking at the first one or two characters of a call sign tells you which country issued it; some blocks are split between countries by the third letter (SSA–SSM Egypt, SSN–SSZ Sudan; 3DA–3DM Eswatini, 3DN–3DZ Fiji).</p>
      <p>A <strong>prefix before a slash</strong> (DL/W1AW) means a visiting operator is using that country’s prefix while there. A <strong>suffix</strong> such as /P (portable), /M (mobile), /MM (maritime mobile) or /AM (aircraft) adds context but not a country. The island group or home nation (Hawaii, Scotland, Martinique…) comes from a short list of well-known prefixes; it is <strong>not</strong> the full DXCC entity list, and special-event calls, reciprocal licences and recent changes are not covered.</p>
    </template>
  </ToolLayout>
</template>
