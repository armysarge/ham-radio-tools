<script setup lang="ts">
import { computed } from 'vue'
import { fmt } from '../lib/units'
import { platform } from '../platform'

const props = defineProps<{ label: string; value: number | string | null; unit?: string; sig?: number; big?: boolean; note?: string }>()
const shown = computed(() => (typeof props.value === 'number' || props.value == null ? fmt(props.value as number | null, props.sig ?? 4) : props.value))
const copyText = computed(() => `${props.label}: ${shown.value}${props.unit ? ' ' + props.unit : ''}`)
</script>

<template>
  <div class="result" :class="{ big }">
    <div>{{ label }}<div v-if="note" class="hint">{{ note }}</div></div>
    <div><span class="val">{{ shown }}</span> <span class="unit">{{ unit }}</span></div>
    <button class="copy ghost" :aria-label="'Copy ' + copyText" :disabled="shown === '—'" @click="platform.copyText(copyText)">Copy</button>
  </div>
</template>
