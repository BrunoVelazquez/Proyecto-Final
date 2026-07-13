<script setup>
import { ref, onMounted } from 'vue'
import { getCampaigns } from '../api/campaignsApi'

const emit = defineEmits(['select', 'logout'])

const campaigns = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await getCampaigns()
    campaigns.value = data.campaigns ?? []
  } catch {
    error.value = 'Error al cargar las campañas. Por favor, intenta nuevamente.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="modal-backdrop">
    <div class="modal-card">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-main">
          <div class="logo-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="url(#g2)" stroke-width="2"/>
              <path d="M8 12 L12 8 L16 12 L12 16 Z" fill="url(#g2)"/>
              <defs>
                <linearGradient id="g2" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#818cf8"/>
                  <stop offset="100%" stop-color="#c084fc"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="header-texts">
            <h2 class="modal-title">Seleccionar Campaña</h2>
            <p class="modal-subtitle">Elige qué campaña deseas cargar en el mapa</p>
          </div>
        </div>
        <button id="btn-logout" class="logout-btn" title="Cerrar sesión" @click="$emit('logout')">
          🚪 Cerrar sesión
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="state-box">
        <span class="spinner-ring"></span>
        <span>Cargando campañas…</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error-banner">
        <span>⚠</span> {{ error }}
      </div>

      <!-- Content when loaded without error -->
      <template v-else>
        <!-- Cargar nueva campaña button -->
        <div class="new-campaign-container">
          <div class="campaign-item new-campaign-item" @click="$emit('select', { id: null, title: 'Cargar nueva campaña' })">
            <div class="campaign-icon new-icon">➕</div>
            <div class="campaign-info">
              <span class="campaign-title">Cargar nueva campaña</span>
              <span class="campaign-desc">Explorar y cargar datos generales sin filtro de campaña</span>
            </div>
            <span class="campaign-arrow">→</span>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="!campaigns.length" class="state-box empty">
          <span class="empty-icon">📭</span>
          <span>No se encontraron otras campañas en tu cuenta.</span>
        </div>

        <!-- Campaign list -->
        <ul v-else class="campaign-list">
        <li
          v-for="c in campaigns"
          :key="c.id"
          class="campaign-item"
          :id="`campaign-item-${c.id}`"
          @click="$emit('select', c)"
        >
          <div class="campaign-icon">🗺</div>
          <div class="campaign-info">
            <span class="campaign-title">{{ c.title ?? c.name ?? `Campaña #${c.id}` }}</span>
            <span class="campaign-meta">
              <span v-if="c.status" class="badge">{{ c.status }}</span>
              <span v-if="c.image_count != null">{{ c.image_count }} imágenes</span>
              <span v-if="c.date">· {{ c.date }}</span>
            </span>
            <p v-if="c.description" class="campaign-desc">{{ c.description }}</p>
          </div>
          <span class="campaign-arrow">→</span>
        </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(7, 6, 20, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.modal-card {
  width: 100%;
  max-width: 620px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(145deg, #1a1535, #111029);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 24px;
  padding: 32px 32px 24px;
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  overflow: hidden;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(129, 140, 248, 0.15);
  flex-shrink: 0;
  width: 100%;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.logo-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(129,140,248,0.18), rgba(192,132,252,0.18));
  border: 1px solid rgba(129,140,248,0.28);
  flex-shrink: 0;
}

.header-texts {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}
.logout-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.55);
  transform: translateY(-1px);
}

.modal-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  background: linear-gradient(90deg, #a5b4fc, #e879f9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.modal-subtitle {
  margin: 0;
  font-size: 0.83rem;
  color: rgba(167,167,220,0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* States */
.state-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 0;
  color: rgba(167,167,220,0.7);
  font-size: 0.9rem;
}

.state-box.empty {
  flex-direction: column;
  gap: 8px;
}

.empty-icon { font-size: 2rem; }

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 10px;
  padding: 12px 16px;
  color: #fca5a5;
  font-size: 0.87rem;
}

/* Campaign list */
.campaign-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  padding-right: 4px;
}

.campaign-list::-webkit-scrollbar {
  width: 4px;
}
.campaign-list::-webkit-scrollbar-track {
  background: transparent;
}
.campaign-list::-webkit-scrollbar-thumb {
  background: rgba(129,140,248,0.25);
  border-radius: 4px;
}

.campaign-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(15, 52, 96, 0.15);
  border: 1px solid rgba(144, 205, 244, 0.12);
  border-radius: 14px;
  cursor: pointer;
}

.campaign-item:hover {
  background: rgba(15, 52, 96, 0.35);
  border-color: rgba(144, 205, 244, 0.35);
}

.new-campaign-container {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.new-campaign-item {
  background: rgba(15, 52, 96, 0.25);
  border: 1px solid rgba(144, 205, 244, 0.3);
}

.new-campaign-item:hover {
  background: rgba(26, 74, 122, 0.4);
  border-color: rgba(144, 205, 244, 0.55);
}

.new-icon {
  background: rgba(144, 205, 244, 0.15) !important;
  color: #90cdf4;
}

.campaign-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(129,140,248,0.08);
  border-radius: 10px;
}

.campaign-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.campaign-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e2f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.campaign-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.77rem;
  color: rgba(167,167,220,0.55);
}

.badge {
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(129,140,248,0.15);
  color: #a5b4fc;
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.campaign-desc {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(167,167,220,0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.campaign-arrow {
  color: rgba(144, 205, 244, 0.4);
  font-size: 1rem;
  flex-shrink: 0;
}

.campaign-item:hover .campaign-arrow {
  color: #90cdf4;
}

/* Spinner */
.spinner-ring {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(144, 205, 244, 0.2);
  border-top-color: #90cdf4;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
