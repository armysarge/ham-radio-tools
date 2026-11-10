<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const WORDS: Record<string, [word: string, pronunciation: string]> = {
  A: ['Alfa', 'AL-fah'],
  B: ['Bravo', 'BRAH-voh'],
  C: ['Charlie', 'CHAR-lee or SHAR-lee'],
  D: ['Delta', 'DELL-tah'],
  E: ['Echo', 'ECK-oh'],
  F: ['Foxtrot', 'FOKS-trot'],
  G: ['Golf', 'GOLF'],
  H: ['Hotel', 'hoh-TELL'],
  I: ['India', 'IN-dee-ah'],
  J: ['Juliett', 'JEW-lee-ETT'],
  K: ['Kilo', 'KEE-loh'],
  L: ['Lima', 'LEE-mah'],
  M: ['Mike', 'MIKE'],
  N: ['November', 'noh-VEM-ber'],
  O: ['Oscar', 'OSS-kah'],
  P: ['Papa', 'pah-PAH'],
  Q: ['Quebec', 'keh-BECK'],
  R: ['Romeo', 'ROH-mee-oh'],
  S: ['Sierra', 'see-AIR-rah'],
  T: ['Tango', 'TANG-goh'],
  U: ['Uniform', 'YOU-nee-form or OO-nee-form'],
  V: ['Victor', 'VIK-tah'],
  W: ['Whiskey', 'WISS-kee'],
  X: ['X-ray', 'ECKS-RAY'],
  Y: ['Yankee', 'YANG-kee'],
  Z: ['Zulu', 'ZOO-loo'],
  '0': ['Zero', 'ZEE-ROH'],
  '1': ['One', 'WUN'],
  '2': ['Two', 'TOO'],
  '3': ['Three', 'TREE'],
  '4': ['Four', 'FOW-er'],
  '5': ['Five', 'FIFE'],
  '6': ['Six', 'SIX'],
  '7': ['Seven', 'SEV-en'],
  '8': ['Eight', 'AYT'],
  '9': ['Nine', 'NINE-er'],
}
const text = ref('')
const spelled = computed(() => [...text.value.toUpperCase()].filter((c) => c in WORDS || c === ' ').map((c) => (c === ' ' ? '—' : `${c} ${WORDS[c][0]}`)))
</script>

<template>
  <ToolLayout id="phonetic" :references="[
    'ITU Radio Regulations (2024), Appendix 14, letter spelling table.',
    'FAA Aeronautical Information Manual, Table 4-2-2, radio digit pronunciations.',
    'Transport Canada Aeronautical Information Manual, COM 5.4, syllable stress.',
  ]">
    <div class="card stack">
      <label class="field"><span class="lbl">Type a callsign or word to spell it</span>
        <input v-model="text" type="text" class="mono" placeholder="e.g. W1AW" autocomplete="off" /></label>
      <p v-if="spelled.length" class="mono" style="font-size:1.4rem;margin:0" aria-live="polite">{{ spelled.join(' · ') }}</p>
      <p v-else class="muted" style="margin:0">The full pronunciation guide is below.</p>
    </div>
    <section aria-labelledby="phonetic-pronunciation" style="margin-top:1rem">
      <h2 id="phonetic-pronunciation">Pronunciation guide</h2>
      <p class="muted">Stress the syllables in capitals, as in hoh-TELL. The digits use aviation radio pronunciation.</p>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        <div v-for="([word, pronunciation], character) in WORDS" :key="character" class="card" style="padding:.5rem .8rem">
          <span class="mono" style="font-size:1.5rem;font-weight:700;color:var(--accent)">{{ character }}</span> <span style="font-size:1.1rem">{{ word }}</span>
          <p class="muted" style="margin:0">{{ pronunciation }}</p>
        </div>
      </div>
    </section>
    <template #explain><p>The international spelling alphabet helps operators tell similar-sounding letters apart on a noisy signal. Use one code word per letter when spelling out a callsign. You may also hear informal phonetics such as “Washington” or “Nancy” on air.</p></template>
  </ToolLayout>
</template>
