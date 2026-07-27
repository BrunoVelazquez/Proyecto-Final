<script setup>
import { ref } from 'vue'
import 'leaflet/dist/leaflet.css'
import BaseMap from './components/BaseMap.vue'
import CampaignSelector from './components/CampaignSelector.vue'

const baseMapRef = ref(null)

// UI state machine
// 'select' → show campaign selector
// 'map'    → map is active (no modals)
const screen = ref('select')

async function onCampaignSelected(campaign) {
  screen.value = 'map'
  // Give the map a tick to mount fully, then trigger load
  await new Promise((r) => setTimeout(r, 50))
  baseMapRef.value?.loadSelectedCampaign(campaign)
}

function onRequestCampaignSelect() {
  screen.value = 'select'
}
</script>

<template>
  <BaseMap
    v-show="screen === 'map'"
    ref="baseMapRef"
    @requestCampaignSelect="onRequestCampaignSelect"
  />

  <CampaignSelector
    v-if="screen === 'select'"
    @select="onCampaignSelected"
  />
</template>

<style>
body,
html,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}
</style>
