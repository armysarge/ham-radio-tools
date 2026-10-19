<script setup lang="ts">
import { computed, useId } from 'vue'
import { parseValue } from '../lib/components'

// Text box for component values written the way people write them: 4.7k, 4k7, 2M2, 100n, R47.
const props = defineProps<{ label: string; modelValue: string; hint?: string; unit?: string; min?: number }>()
const emit = defineEmits<{ 'update:modelValue': [string]; value: [number | null] }>()
const id = useId()
const parsed = computed(() => {
  try {
    const v = parseValue(props.modelValue)
    if (props.min !== undefined && v < props.min) return { v: null as number | null, err: `Must be at least ${props.min}` }
    return { v: v as number | null, err: '' }
  } catch (e) { return { v: null as number | null, err: (e as Error).message } }
})
function onInput(e: Event) {
  const text = (e.target as HTMLInputElement).value
  emit('update:modelValue', text)
  try { const v = parseValue(text); emit('value', props.min !== undefined && v < props.min ? null : v) } catch { emit('value', null) }
}
</script>

<template>
  <div class="field">
    <label class="lbl" :for="id">{{ label }}</label>
    <div class="row">
      <input :id="id" type="text" class="mono" :value="modelValue" autocomplete="off" spellcheck="false" :aria-invalid="!!parsed.err" :aria-describedby="id + '-d'" @input="onInput" />
      <span v-if="unit" class="muted" style="align-self:center">{{ unit }}</span>
    </div>
    <div :id="id + '-d'">
      <div v-if="parsed.err" class="err" role="alert">{{ parsed.err }}</div>
      <div v-else-if="hint" class="hint">{{ hint }}</div>
    </div>
  </div>
</template>
