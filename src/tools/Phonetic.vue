<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const WORDS: Record<string, string> = {
  A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima', M: 'Mike',
  N: 'November', O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
  '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine',
}
const text = ref('')
const spelled = computed(() => [...text.value.toUpperCase()].filter((c) => c in WORDS || c === ' ').map((c) => (c === ' ' ? '—' : `${c} ${WORDS[c]}`)))
</script>

<template>
  <ToolLayout id="phonetic" :references="['ITU Radio Regulations, Appendix 14 / ICAO spelling alphabet (“Alfa”, “Juliett”).']">
    <div class="card stack">
      <label class="field"><span class="lbl">Type a callsign or word to spell it</span>
        <input v-model="text" type="text" class="mono" placeholder="e.g. W1AW" autocomplete="off" /></label>
      <p v-if="spelled.length" class="mono" style="font-size:1.4rem;margin:0" aria-live="polite">{{ spelled.join(' · ') }}</p>
      <p v-else class="muted" style="margin:0">Nothing typed yet — the full table is below.</p>
    </div>
    <div class="grid" style="margin-top:1rem;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
      <div v-for="(w, c) in WORDS" :key="c" class="card" style="padding:.5rem .8rem">
        <span class="mono" style="font-size:1.5rem;font-weight:700;color:var(--accent)">{{ c }}</span> <span style="font-size:1.1rem">{{ w }}</span>
      </div>
    </div>
    <template #explain><p>The international spelling alphabet. Other informal phonetics are common on air (e.g. “Washington”, “Nancy”), and are fine when the other operator understands them, but this table is the standard.</p></template>
  </ToolLayout>
</template>
