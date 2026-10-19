<script setup lang="ts">
// Shared page for the three simple filterable reference lists, chosen by the `which` prop.
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { platform } from '../platform'
import { ABBREVIATIONS, ABBR_META, CONSTANTS, CONSTANTS_META, CTCSS, CTCSS_META } from '../data/reference'

const props = defineProps<{ which: 'ctcss' | 'abbreviations' | 'constants' }>()
const q = ref('')
const t = computed(() => q.value.trim().toLowerCase())
const ctcss = computed(() => CTCSS.filter(([hz, std]) => !t.value || String(hz).includes(t.value) || (t.value === 'extended' && !std) || (t.value === 'standard' && std)))
const abbr = computed(() => ABBREVIATIONS.filter((r) => !t.value || r.join(' ').toLowerCase().includes(t.value)))
const consts = computed(() => CONSTANTS.filter((c) => !t.value || [c.name, c.symbol, c.note, c.unit].join(' ').toLowerCase().includes(t.value)))
const meta = computed(() => ({ ctcss: CTCSS_META, abbreviations: ABBR_META, constants: CONSTANTS_META })[props.which])
const ids = { ctcss: 'ctcss', abbreviations: 'abbreviations', constants: 'constants' }
</script>

<template>
  <ToolLayout :id="ids[which]" :references="[`${meta.source} (revision ${meta.revision}).`]">
    <div class="card stack">
      <label class="field"><span class="lbl">Filter</span>
        <input v-model="q" type="text" autocomplete="off" :placeholder="which === 'ctcss' ? 'e.g. 88.5, standard, extended' : which === 'constants' ? 'e.g. light, noise, impedance' : 'e.g. 73, power, CW'" /></label>
      <p v-if="meta.note" class="hint" style="margin:0">{{ meta.note }}</p>
    </div>

    <div v-if="which === 'ctcss'" class="stack" style="margin-top:1rem">
      <p v-if="!ctcss.length" class="empty">No tone matches “{{ q }}”.</p>
      <div v-else class="grid" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">
        <button v-for="[hz, std] in ctcss" :key="hz" class="card" style="text-align:left" :aria-label="`${hz} hertz, ${std ? 'standard' : 'extended'} tone. Copy`" @click="platform.copyText(hz.toFixed(1) + ' Hz')">
          <span class="mono" style="font-size:1.3rem;font-weight:700">{{ hz.toFixed(1) }}</span> <span class="muted">Hz</span><br /><span class="hint">{{ std ? 'standard' : 'extended' }}</span>
        </button>
      </div>
      <p class="hint">Tap a tone to copy it. Tones are sub-audible and only open a repeater’s squelch; they are not security.</p>
    </div>

    <div v-else-if="which === 'abbreviations'" style="margin-top:1rem">
      <p v-if="!abbr.length" class="empty">No abbreviation matches “{{ q }}”.</p>
      <div v-else class="table-wrap"><table class="table"><thead><tr><th>Abbreviation</th><th>Meaning</th><th>Used in</th></tr></thead>
        <tbody><tr v-for="r in abbr" :key="r[0]"><td class="mono" style="font-weight:700;color:var(--accent)">{{ r[0] }}</td><td>{{ r[1] }}</td><td>{{ r[2] }}</td></tr></tbody></table></div>
    </div>

    <div v-else style="margin-top:1rem">
      <p v-if="!consts.length" class="empty">No constant matches “{{ q }}”.</p>
      <div v-else class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Symbol</th><th>Value</th><th>Type</th><th></th></tr></thead>
        <tbody><tr v-for="c in consts" :key="c.name"><td>{{ c.name }}<div class="hint">{{ c.note }}</div></td><td class="mono">{{ c.symbol }}</td>
          <td class="mono">{{ c.display }} {{ c.unit }}</td><td>{{ c.kind }}</td>
          <td><button class="ghost" :aria-label="`Copy ${c.name}`" @click="platform.copyText(String(c.value))">Copy</button></td></tr></tbody></table></div>
    </div>

    <template #explain>
      <p v-if="which === 'ctcss'">CTCSS (also called PL or “tone squelch”) mixes a continuous sub-audible tone, 67–254 Hz, into FM transmissions. A repeater or receiver set to the same tone only opens for signals carrying it. The 38 EIA-603 tones are the standard set; the 12 “extended” tones appear on some radios but are not universal. DCS (digital codes) is not listed yet.</p>
      <p v-else-if="which === 'abbreviations'">Many abbreviations came from CW, where every character costs time. On phone, plain language is better; keep these for CW and written logs. Meanings are paraphrased and some vary slightly between regions.</p>
      <p v-else>“Exact” values are definitions of the SI and carry no uncertainty. “Measured” values come from CODATA 2022 with the uncertainty shown in brackets. “Convention” values are agreed standards. “Rule” rows are empirical rules of thumb and are used (with k factors) in the antenna tools. Copy buttons give the full-precision number.</p>
    </template>
  </ToolLayout>
</template>
