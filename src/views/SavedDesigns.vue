<script setup lang="ts">
import { deleteDesign, state } from '../core/store'
import { toolById } from '../core/registry'
</script>

<template>
  <h1>Saved designs</h1>
  <p class="muted">Stored only in this browser/device. Nothing is uploaded.</p>
  <div v-if="!state.designs.length" class="empty">
    <p><strong>No saved designs yet.</strong></p>
    <p>Open an antenna tool such as the <router-link to="/tool/dipole">half-wave dipole</router-link> and press “Save design”.</p>
  </div>
  <div v-else class="table-wrap"><table class="table">
    <thead><tr><th>Name</th><th>Tool</th><th>Summary</th><th>Saved</th><th></th></tr></thead>
    <tbody>
      <tr v-for="d in state.designs" :key="d.id">
        <td>{{ d.name }}</td><td>{{ toolById(d.toolId)?.title ?? d.toolId }}</td><td class="mono">{{ d.summary }}</td>
        <td>{{ new Date(d.saved).toLocaleDateString() }}</td>
        <td>
          <router-link :to="{ path: `/tool/${d.toolId}`, query: { load: d.id } }">Open</router-link>
          <button class="ghost" :aria-label="`Delete ${d.name}`" @click="deleteDesign(d.id)">Delete</button>
        </td>
      </tr>
    </tbody>
  </table></div>
</template>
