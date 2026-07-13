<script setup>
import { ref, onMounted } from 'vue'
import 'leaflet/dist/leaflet.css'
import BaseMap from './components/BaseMap.vue'
import LoginModal from './components/LoginModal.vue'
import CampaignSelector from './components/CampaignSelector.vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const baseMapRef = ref(null)

// UI state machine
// 'loading'  → restoring session
// 'login'    → show login modal
// 'select'   → show campaign selector
// 'map'      → map is active (no modals)
const screen = ref('loading')

onMounted(async () => {
  await auth.init()
  screen.value = auth.user ? 'select' : 'login'
})

// Listen for token expiry from the Axios interceptor
window.addEventListener('auth:unauthorized', () => {
  auth.logout()
  screen.value = 'login'
})

function onAuthenticated() {
  screen.value = 'select'
}

async function onCampaignSelected(campaign) {
  screen.value = 'map'
  // Give the map a tick to mount fully, then trigger load
  await new Promise((r) => setTimeout(r, 50))
  baseMapRef.value?.loadSelectedCampaign(campaign)
}

function onLogout() {
  auth.logout()
  screen.value = 'login'
}

function onRequestCampaignSelect() {
  screen.value = 'select'
}
</script>

<template>
  <!-- Full-screen loading spinner while restoring session -->
  <div v-if="screen === 'loading'" class="boot-screen">
    <span class="spinner-ring"></span>
  </div>

  <template v-else>
    <BaseMap
      v-show="screen === 'map'"
      ref="baseMapRef"
      @requestCampaignSelect="onRequestCampaignSelect"
      @logout="onLogout"
    />

    <!-- Auth modals are overlaid on top -->
    <LoginModal v-if="screen === 'login'" @authenticated="onAuthenticated" />
    <CampaignSelector
      v-if="screen === 'select'"
      @select="onCampaignSelected"
      @logout="onLogout"
    />
  </template>
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

/* Full-screen boot loader */
.boot-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d0b1e;
}

.spinner-ring {
  display: inline-block;
  width: 36px;
  height: 36px;
  border: 3px solid rgba(129, 140, 248, 0.2);
  border-top-color: #818cf8;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
