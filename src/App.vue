<script setup>
import { ref, onMounted } from 'vue'
import 'leaflet/dist/leaflet.css'
import BaseMap from './components/BaseMap.vue'
import CampaignSelector from './components/CampaignSelector.vue'
import LoginScreen from './components/LoginScreen.vue'

const baseMapRef = ref(null)

// UI state machine
// 'login'  → show login screen
// 'select' → show campaign selector
// 'map'    → map is active (no modals)
const screen = ref('login')

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    screen.value = 'select'
  }
})

function onLoginSuccess() {
  screen.value = 'select'
}

function onLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  screen.value = 'login'
}

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
  <LoginScreen
    v-if="screen === 'login'"
    @success="onLoginSuccess"
  />

  <BaseMap
    v-show="screen === 'map'"
    ref="baseMapRef"
    @requestCampaignSelect="onRequestCampaignSelect"
    @logout="onLogout"
  />

  <CampaignSelector
    v-if="screen === 'select'"
    @select="onCampaignSelected"
    @logout="onLogout"
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
