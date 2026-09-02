<script setup>
import { ref, onMounted } from 'vue'
import 'leaflet/dist/leaflet.css'
import BaseMap from '../components/BaseMap.vue'
import CampaignSelector from '../components/CampaignSelector.vue'
import LoginScreen from '../components/LoginScreen.vue'

const baseMapRef = ref(null)

// UI state machine
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
/* Los estilos globales se movieron o mantienen en App.vue o main.css, pero pueden vivir en HomeView si solo aplican aquí. En este caso mejor usar App.vue para estilos body. */
</style>
