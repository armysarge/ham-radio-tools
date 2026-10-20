<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type {} from '../platform/desktop'
const desktop = window.hrtDesktop
const maximized = ref(false)
let unsubscribe: (() => void) | undefined
onMounted(async () => {
  if (!desktop) return
  document.documentElement.classList.add('desktop-app')
  unsubscribe = desktop.onState(state => { maximized.value = state.maximized })
  maximized.value = (await desktop.getState()).maximized
})
onUnmounted(() => { unsubscribe?.(); document.documentElement.classList.remove('desktop-app') })
</script>
<template>
  <header v-if="desktop" class="desktop-titlebar" aria-label="Application window">
    <div class="desktop-drag" @dblclick="desktop.toggleMaximize()"><img :src="'./app-icon.svg'" alt="" />Ham Radio Tools</div>
    <div class="desktop-controls">
      <button aria-label="Minimize window" title="Minimize" @click="desktop.minimize()"><svg viewBox="0 0 16 16"><path d="M3 8h10" /></svg></button>
      <button :aria-label="maximized ? 'Restore window' : 'Maximize window'" :title="maximized ? 'Restore' : 'Maximize'" @click="desktop.toggleMaximize()"><svg viewBox="0 0 16 16"><path v-if="maximized" d="M5 5V3h8v8h-2M3 5h8v8H3z" /><path v-else d="M3 3h10v10H3z" /></svg></button>
      <button class="desktop-close" aria-label="Close window" title="Close" @click="desktop.close()"><svg viewBox="0 0 16 16"><path d="m3 3 10 10M13 3 3 13" /></svg></button>
    </div>
  </header>
</template>
<style>
.desktop-titlebar{position:fixed;inset:0 0 auto;height:44px;display:flex;z-index:50;background:var(--panel);color:var(--ink);border-bottom:1px solid var(--line);user-select:none}
.desktop-drag{flex:1;display:flex;align-items:center;gap:10px;padding-left:12px;font-size:12px;font-weight:600;app-region:drag;-webkit-app-region:drag}
.desktop-drag img{width:24px;height:24px}
.desktop-controls{display:flex;app-region:no-drag;-webkit-app-region:no-drag}
.desktop-controls button{width:48px;height:44px;padding:0;border:0;border-radius:0;background:transparent;color:inherit;display:grid;place-items:center}
.desktop-controls button:hover{background:var(--line)}
.desktop-controls .desktop-close:hover{background:#c42b35;color:white}
.desktop-controls svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.2}
.desktop-app,.desktop-app body{height:100%;overflow:hidden}
.desktop-app .shell{position:absolute;inset:44px 0 0;min-height:0;overflow:auto}
.desktop-app .topbar{top:0}
.desktop-app .sidebar{top:61px;height:calc(100vh - 105px)}
@media(max-width:900px){.desktop-app .sidebar{top:44px;height:auto}.desktop-app .backdrop{top:44px}}
@media print{.desktop-titlebar{display:none}.desktop-app,.desktop-app body{height:auto;overflow:visible}.desktop-app .shell{position:static;overflow:visible}}
</style>


