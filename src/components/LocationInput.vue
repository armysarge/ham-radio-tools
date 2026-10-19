<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import NumField from './NumField.vue'
import { decode, encode, isValid, type Precision } from '../lib/maidenhead'
import { saveLocation, state } from '../core/store'

const props = defineProps<{ title: string; lat: number | null; lon: number | null; chars: Precision }>()
const emit = defineEmits<{ 'update:lat': [number | null]; 'update:lon': [number | null]; 'update:chars': [Precision] }>()
const id = useId()
const text = ref(''), focused = ref(false), err = ref('')
const name = ref(''), asStation = ref(false), savedMsg = ref('')

const auto = computed(() => (props.lat != null && props.lon != null ? encode(props.lat, props.lon, props.chars) : ''))
const shown = computed(() => (focused.value ? text.value : auto.value))

function onLoc(e: Event) {
  text.value = (e.target as HTMLInputElement).value
  const t = text.value.trim()
  if (!t) { err.value = ''; return }
  if (!isValid(t)) { err.value = 'Not a valid locator. Format: two letters A–R, two digits, two letters A–X, e.g. JN58td'; return }
  err.value = ''
  const c = decode(t)
  emit('update:lat', c.centerLat); emit('update:lon', c.centerLon); emit('update:chars', t.length as Precision)
}
function pick(e: Event) {
  const l = state.locations.find((x) => x.id === (e.target as HTMLSelectElement).value)
  if (l) { emit('update:lat', l.lat); emit('update:lon', l.lon); name.value = l.name }
}
function save() {
  if (props.lat == null || props.lon == null) return
  saveLocation(name.value || auto.value, props.lat, props.lon, asStation.value)
  savedMsg.value = `Saved “${name.value || auto.value}”.`
}
</script>

<template>
  <fieldset class="card stack" style="margin:0">
    <legend style="font-weight:700;padding:0 .4rem">{{ title }}</legend>
    <label v-if="state.locations.length" class="field"><span class="lbl">Saved location</span>
      <select @change="pick"><option value="">Choose…</option><option v-for="l in state.locations" :key="l.id" :value="l.id">{{ l.name }}{{ l.id === state.stationId ? ' (my station)' : '' }}</option></select></label>
    <div class="cols" style="grid-template-columns:1fr 1fr">
      <NumField :model-value="lat" label="Latitude" unit="° N+" :min="-90" :max="90" hint="South is negative" @update:model-value="emit('update:lat', $event)" />
      <NumField :model-value="lon" label="Longitude" unit="° E+" :min="-180" :max="180" hint="West is negative" @update:model-value="emit('update:lon', $event)" />
    </div>
    <div class="field">
      <label class="lbl" :for="id">Maidenhead locator</label>
      <input :id="id" type="text" class="mono" :value="shown" :aria-invalid="!!err" autocomplete="off" spellcheck="false" placeholder="e.g. JN58td"
        @input="onLoc" @focus="focused = true; text = auto" @blur="focused = false" />
      <div v-if="err" class="err" role="alert">{{ err }}</div>
      <div v-else class="hint">Type a locator to jump to its centre.</div>
    </div>
    <details>
      <summary style="cursor:pointer;min-height:36px">Save this location</summary>
      <div class="stack" style="margin-top:.5rem">
        <label class="field"><span class="lbl">Name</span><input v-model="name" type="text" placeholder="Home, Field Day site…" /></label>
        <label><input v-model="asStation" type="checkbox" /> Use as my station (default start point)</label>
        <div><button :disabled="lat == null || lon == null" @click="save">Save</button> <span v-if="savedMsg" role="status">{{ savedMsg }}</span></div>
      </div>
    </details>
  </fieldset>
</template>
