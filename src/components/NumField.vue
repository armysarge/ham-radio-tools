<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { fmt, type Unit } from '../lib/units'

// v-model is always the CANONICAL value (Hz, m, W…); the unit selector only changes how it is shown/typed.
const props = defineProps<{
  label: string; modelValue: number | null; units?: Unit[]; unit?: string
  min?: number; max?: number; minExclusive?: boolean; hint?: string; disabled?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [number | null]; 'update:unit': [string] }>()

const id = useId()
const unitLabel = ref(props.unit ?? props.units?.[0]?.label ?? '')
const factor = computed(() => props.units?.find((u) => u.label === unitLabel.value)?.factor ?? 1)
const text = ref('')
const focused = ref(false)
const error = ref('')

const show = () => { text.value = props.modelValue == null ? '' : fmt(props.modelValue / factor.value, 7) }
show()
watch(() => props.modelValue, () => { if (!focused.value) show() })
watch(unitLabel, (u) => { emit('update:unit', u); show(); validate(text.value) })
watch(() => props.unit, (u) => { if (u && u !== unitLabel.value) unitLabel.value = u })

function bound(v: number) { return `${fmt(v / factor.value, 6)} ${unitLabel.value}`.trim() }
function validate(raw: string) {
  const s = raw.trim().replace(',', '.')
  if (s === '') { error.value = 'Enter a value'; return null }
  const n = Number(s)
  if (!Number.isFinite(n)) { error.value = `“${raw.trim()}” is not a number — use digits, e.g. 14.2`; return null }
  const c = n * factor.value
  if (props.min !== undefined && (props.minExclusive ? c <= props.min : c < props.min)) {
    error.value = `Must be ${props.minExclusive ? 'greater than' : 'at least'} ${bound(props.min)}`; return null
  }
  if (props.max !== undefined && c > props.max) { error.value = `Must be no more than ${bound(props.max)}`; return null }
  error.value = ''
  return c
}
function onInput(e: Event) {
  text.value = (e.target as HTMLInputElement).value
  emit('update:modelValue', validate(text.value))
}
function onBlur() { focused.value = false; if (!error.value) show() }
</script>

<template>
  <div class="field">
    <label class="lbl" :for="id">{{ label }}</label>
    <div class="row">
      <input :id="id" type="text" inputmode="decimal" autocomplete="off" :value="text" :disabled="disabled"
        :aria-invalid="!!error" :aria-describedby="id + '-d'" @input="onInput" @focus="focused = true" @blur="onBlur" />
      <select v-if="units" v-model="unitLabel" :aria-label="label + ' unit'">
        <option v-for="u in units" :key="u.label" :value="u.label">{{ u.label }}</option>
      </select>
      <span v-else-if="unit" class="muted" style="align-self:center">{{ unit }}</span>
    </div>
    <div :id="id + '-d'">
      <div v-if="error" class="err" role="alert">{{ error }}</div>
      <div v-else-if="hint" class="hint">{{ hint }}</div>
    </div>
  </div>
</template>
