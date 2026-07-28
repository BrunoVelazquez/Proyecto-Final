<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCampaigns } from '../api/campaignsApi'
import { api } from '../api/api.js'
import CampaignChartsModal from './CampaignChartsModal.vue'

const campaigns = ref([])
const loading = ref(true)
const error = ref('')

const showChartsModal = ref(false)
const selectedChartsCampaignId = ref(null)

function openChartsForCampaign(campaignId) {
  selectedChartsCampaignId.value = campaignId
  showChartsModal.value = true
}

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

// ── Upload Campaign Modal ──────────────────────────────────────────────────
const showUploadModal = ref(false)
const imageFiles = ref([])
const gpsFile = ref(null)
const campaignTitle = ref('')
const campaignDescription = ref('')
const campaignDate = ref('')
const isDraggingImages = ref(false)
const isDraggingGps = ref(false)
const uploadStatus = ref('idle') // 'idle' | 'uploading' | 'success' | 'error'
const uploadProgress = ref(0)
const uploadError = ref('')

const imagePreviewUrls = computed(() =>
  imageFiles.value.map(f => ({ name: f.name, url: URL.createObjectURL(f), size: formatSize(f.size) }))
)
const totalSize = computed(() =>
  formatSize(imageFiles.value.reduce((acc, f) => acc + f.size, 0) + (gpsFile.value?.size ?? 0))
)
const canUpload = computed(() => imageFiles.value.length > 0 && campaignTitle.value.trim() !== '' && uploadStatus.value !== 'uploading')

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
function addImages(files) {
  const valid = Array.from(files).filter(f => /\.(jpe?g|png|webp)$/i.test(f.name))
  imageFiles.value = [...imageFiles.value, ...valid]
}
function removeImage(index) {
  imageFiles.value = imageFiles.value.filter((_, i) => i !== index)
}
function setGpsFile(file) {
  if (!file) return
  if (!/\.txt$/i.test(file.name)) { uploadError.value = 'El archivo GPS debe ser un .txt'; return }
  uploadError.value = ''
  gpsFile.value = file
}
function onImageDrop(e) {
  isDraggingImages.value = false
  addImages(e.dataTransfer.files)
}
function onGpsDrop(e) {
  isDraggingGps.value = false
  if (e.dataTransfer.files[0]) setGpsFile(e.dataTransfer.files[0])
}
function clearUpload() {
  imageFiles.value = []
  gpsFile.value = null
  campaignTitle.value = ''
  campaignDescription.value = ''
  campaignDate.value = ''
  uploadStatus.value = 'idle'
  uploadProgress.value = 0
  uploadError.value = ''
}
function closeUploadModal() {
  showUploadModal.value = false
  clearUpload()
}
async function doUpload() {
  if (!canUpload.value) return
  uploadStatus.value = 'uploading'
  uploadProgress.value = 0
  uploadError.value = ''
  try {
    const form = new FormData()
    form.append('title', campaignTitle.value)
    if (campaignDescription.value) form.append('description', campaignDescription.value)
    if (campaignDate.value) form.append('date', campaignDate.value)
    imageFiles.value.forEach(f => form.append('imagenes', f))
    if (gpsFile.value) form.append('gps_log', gpsFile.value)
    await api.post('/api/analizar/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress(e) {
        if (e.total) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      },
    })
    uploadStatus.value = 'success'
    uploadProgress.value = 100
    setTimeout(() => {
      closeUploadModal()
      // Refresh campaign list
      getCampaigns().then(({ data }) => { campaigns.value = data.campaigns ?? [] }).catch(() => {})
    }, 2000)
  } catch (err) {
    uploadStatus.value = 'error'
    uploadError.value =
      err.response?.data?.detail ??
      err.response?.data?.error ??
      'Ocurrió un error al procesar la campaña. Intenta de nuevo.'
  }
}
</script>

<template>
  <div class="modal-backdrop">
    <div class="modal-card">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-main">
          <div class="header-texts">
            <h2 class="modal-title">Seleccionar Campaña</h2>
            <p class="modal-subtitle">Elige qué campaña deseas cargar en el mapa</p>
          </div>
        </div>
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
          <div class="campaign-item new-campaign-item" @click="showUploadModal = true">
            <div class="campaign-info">
              <span class="campaign-title">Cargar nueva campaña</span>
              <span class="campaign-desc">Subir imágenes y un log GPS opcional para analizar</span>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="!campaigns.length" class="state-box empty">
          <span>No hay campañas disponibles aún.</span>
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
          <div class="campaign-info">
            <span class="campaign-title">{{ c.title ?? c.name ?? `Campaña #${c.id}` }}</span>
            <span class="campaign-meta">
              <span v-if="c.status" class="badge">{{ c.status }}</span>
              <span v-if="c.image_count != null">{{ c.image_count }} imágenes</span>
              <span v-if="c.date">· {{ c.date }}</span>
            </span>
            <p v-if="c.description" class="campaign-desc">{{ c.description }}</p>
          </div>
          <div class="item-actions">
            <button class="item-chart-btn" title="Ver estadísticas de esta campaña" @click.stop="openChartsForCampaign(c.id)">📊</button>
          </div>
        </li>
        </ul>
      </template>
    </div>

    <CampaignChartsModal
      :show="showChartsModal"
      :initialCampaignId="selectedChartsCampaignId"
      @close="showChartsModal = false; selectedChartsCampaignId = null"
    />

    <!-- Upload Campaign Modal -->
    <Teleport to="body">
      <Transition name="uc-fade">
        <div v-if="showUploadModal" class="uc-backdrop" @click.self="closeUploadModal">
          <div class="uc-card">
            <!-- Header -->
            <div class="uc-header">
              <div class="uc-header-left">
                <div>
                  <h2 class="uc-title">Cargar Nueva Campaña</h2>
                  <p class="uc-subtitle">Procesa imágenes con el modelo de detección</p>
                </div>
              </div>
              <button class="uc-close" @click="closeUploadModal">✕</button>
            </div>

            <!-- Body -->
            <div class="uc-body">
              <!-- SUCCESS -->
              <div v-if="uploadStatus === 'success'" class="uc-success">
                <h3>¡Campaña enviada!</h3>
                <p>Tus imágenes están siendo procesadas. La campaña aparecerá en la lista en breve.</p>
              </div>

              <template v-else>
                <!-- Metadata section -->
                <div class="uc-label">
                  <span>Detalles de la Campaña</span>
                  <span class="uc-badge required">título requerido</span>
                </div>
                <div class="uc-field-group">
                  <input type="text" v-model="campaignTitle" placeholder="Título de la campaña (ej. Censo 2024)" class="uc-input" />
                  <textarea v-model="campaignDescription" placeholder="Descripción opcional" class="uc-input uc-textarea" rows="2"></textarea>
                  <input 
                    type="text" 
                    v-model="campaignDate" 
                    placeholder="Fecha opcional" 
                    class="uc-input" 
                    onfocus="(this.type='date')" 
                    onblur="(this.value === '' ? this.type='text' : this.type='date')"
                  />
                </div>

                <!-- Images section -->
                <div class="uc-label" style="margin-top: 10px;">
                  <span>Imágenes</span>
                  <span class="uc-badge required">requerido</span>
                  <span v-if="imageFiles.length" class="uc-file-count">{{ imageFiles.length }} archivo{{ imageFiles.length !== 1 ? 's' : '' }} · {{ totalSize }}</span>
                </div>

                <div
                  class="uc-dropzone"
                  :class="{ 'drag-over': isDraggingImages, 'has-files': imageFiles.length > 0 }"
                  @dragover.prevent="isDraggingImages = true"
                  @dragleave.prevent="isDraggingImages = false"
                  @drop.prevent="onImageDrop"
                >
                  <div v-if="imageFiles.length === 0" class="uc-dz-empty">
                    <p class="uc-dz-text">Arrastrá imágenes aquí<br><span>o hacé clic para seleccionar</span></p>
                    <p class="uc-dz-hint">JPG, PNG o WebP · Sin límite</p>
                    <label class="uc-pick-btn">
                      Seleccionar imágenes
                      <input type="file" multiple accept=".jpg,.jpeg,.png,.webp" class="uc-sr-only"
                        @change="e => addImages(e.target.files)" />
                    </label>
                  </div>
                  <div v-else class="uc-preview-grid">
                    <div
                      v-for="(img, i) in imagePreviewUrls"
                      :key="img.name + i"
                      class="uc-thumb"
                      :title="img.name"
                    >
                      <img :src="img.url" :alt="img.name" />
                      <div class="uc-thumb-info">
                        <span class="uc-thumb-name">{{ img.name }}</span>
                        <span class="uc-thumb-size">{{ img.size }}</span>
                      </div>
                      <button class="uc-thumb-remove" @click.stop="removeImage(i)">✕</button>
                    </div>
                    <label class="uc-add-more">
                      <span>+</span>
                      <input type="file" multiple accept=".jpg,.jpeg,.png,.webp" class="uc-sr-only"
                        @change="e => addImages(e.target.files)" />
                    </label>
                  </div>
                </div>

                <!-- GPS section -->
                <div class="uc-label">
                  <span>Log GPS de trayectoria</span>
                  <span class="uc-badge optional">opcional</span>
                </div>

                <div
                  class="uc-dropzone uc-gps-zone"
                  :class="{ 'drag-over': isDraggingGps, 'has-files': gpsFile !== null }"
                  @dragover.prevent="isDraggingGps = true"
                  @dragleave.prevent="isDraggingGps = false"
                  @drop.prevent="onGpsDrop"
                >
                  <div v-if="!gpsFile" class="uc-dz-empty uc-gps-empty">
                    <p class="uc-dz-text">Arrastrá tu .txt aquí<br><span>o hacé clic para seleccionarlo</span></p>
                    <label class="uc-pick-btn secondary">
                      Seleccionar archivo
                      <input type="file" accept=".txt" class="uc-sr-only"
                        @change="e => setGpsFile(e.target.files[0])" />
                    </label>
                  </div>
                  <div v-else class="uc-gps-row">
                    <span class="uc-gps-icon">📄</span>
                    <div class="uc-gps-info">
                      <span class="uc-gps-name">{{ gpsFile.name }}</span>
                      <span class="uc-gps-size">{{ formatSize(gpsFile.size) }}</span>
                    </div>
                    <button class="uc-gps-remove" @click="gpsFile = null">✕ Quitar</button>
                  </div>
                </div>

                <!-- Error -->
                <div v-if="uploadError" class="uc-error">⚠ {{ uploadError }}</div>

                <!-- Progress -->
                <div v-if="uploadStatus === 'uploading'" class="uc-progress-wrap">
                  <div class="uc-progress-bar">
                    <div class="uc-progress-fill" :style="{ width: uploadProgress + '%' }"></div>
                  </div>
                  <span class="uc-progress-label">{{ uploadProgress }}% · Procesando…</span>
                </div>
              </template>
            </div>

            <!-- Footer -->
            <div v-if="uploadStatus !== 'success'" class="uc-footer">
              <button class="uc-btn-secondary" @click="clearUpload" :disabled="uploadStatus === 'uploading'">Limpiar todo</button>
              <button
                class="uc-btn-primary"
                @click="doUpload"
                :disabled="!canUpload"
                :class="{ 'is-uploading': uploadStatus === 'uploading' }"
              >
                <span v-if="uploadStatus === 'uploading'" class="uc-spinner"></span>
                {{ uploadStatus === 'uploading' ? 'Procesando…' : 'Iniciar análisis' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.charts-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid rgba(144, 205, 244, 0.35);
  background: #0f3460;
  color: #90cdf4;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.charts-trigger-btn:hover {
  background: #1a4a7a;
  border-color: rgba(144, 205, 244, 0.6);
  transform: translateY(-1px);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.item-chart-btn {
  background: rgba(15, 52, 96, 0.6);
  border: 1px solid rgba(144, 205, 244, 0.3);
  border-radius: 8px;
  color: #90cdf4;
  padding: 6px 10px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}
.item-chart-btn:hover {
  background: #1a4a7a;
  transform: scale(1.08);
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

/* ─── Upload Campaign Modal ────────────────────────────────────────────── */
.uc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(7, 6, 20, 0.88);
  backdrop-filter: blur(14px);
  padding: 20px;
}
.uc-card {
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(145deg, #1a1535, #0e0d2a);
  border: 1px solid rgba(144, 205, 244, 0.2);
  border-radius: 24px;
  box-shadow: 0 40px 90px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255,255,255,0.03) inset;
  overflow: hidden;
}

/* Header */
.uc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px 18px;
  border-bottom: 1px solid rgba(144, 205, 244, 0.12);
  background: rgba(15, 52, 96, 0.2);
  flex-shrink: 0;
}
.uc-header-left { display: flex; align-items: center; gap: 14px; }
.uc-icon {
  font-size: 1.5rem;
  width: 46px; height: 46px;
  background: rgba(15, 52, 96, 0.5);
  border: 1px solid rgba(144,205,244,0.3);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.uc-title { margin: 0; font-size: 1.22rem; font-weight: 700; color: #90cdf4; }
.uc-subtitle { margin: 3px 0 0; font-size: 0.8rem; color: rgba(167,167,220,0.6); }
.uc-close {
  background: transparent; border: none; color: #90cdf4;
  font-size: 1.3rem; cursor: pointer; padding: 4px 10px; border-radius: 8px;
  transition: all 0.2s;
}
.uc-close:hover { background: rgba(239,68,68,0.2); color: #fca5a5; }

/* Body */
.uc-body {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 22px 28px;
  display: flex; flex-direction: column; gap: 10px;
}

/* Section labels */
.uc-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.87rem; font-weight: 600; color: #e2e8f0;
}
.uc-badge {
  padding: 1px 7px; border-radius: 20px;
  font-size: 0.68rem; font-weight: 600;
}
.uc-badge.required { background: rgba(168,85,247,0.18); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); }
.uc-badge.optional { background: rgba(144,205,244,0.1); color: #90cdf4; border: 1px solid rgba(144,205,244,0.2); }
.uc-file-count { margin-left: auto; font-size: 0.76rem; font-weight: 400; color: rgba(167,167,220,0.55); }

/* Fields */
.uc-field-group {
  display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px;
}
.uc-input {
  width: 100%; padding: 10px 14px;
  background: rgba(15, 52, 96, 0.15);
  border: 1px solid rgba(144, 205, 244, 0.22);
  border-radius: 10px; color: #e2e8f0;
  font-size: 0.85rem; outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}
.uc-input:focus { border-color: #90cdf4; background: rgba(15, 52, 96, 0.35); }
.uc-input::placeholder { color: rgba(167, 167, 220, 0.4); }
.uc-textarea { resize: vertical; min-height: 56px; font-family: inherit; }

/* Drop zones */
.uc-dropzone {
  border: 2px dashed rgba(144, 205, 244, 0.22);
  border-radius: 14px;
  background: rgba(15, 52, 96, 0.08);
  transition: border-color 0.2s, background 0.2s;
  cursor: default;
}
.uc-dropzone.drag-over { border-color: #90cdf4; background: rgba(15, 52, 96, 0.28); }
.uc-dropzone.has-files { border-style: solid; border-color: rgba(144, 205, 244, 0.28); }
.uc-gps-zone { cursor: pointer; }

/* Empty drop zone */
.uc-dz-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 5px; padding: 26px 20px; text-align: center;
}
.uc-gps-empty { padding: 16px 20px; }
.uc-dz-icon { font-size: 2rem; }
.uc-dz-text {
  margin: 0; font-size: 0.88rem; color: rgba(203,213,225,0.75); line-height: 1.5;
}
.uc-dz-text span { font-size: 0.78rem; color: rgba(167,167,220,0.5); }
.uc-dz-hint { margin: 0; font-size: 0.73rem; color: rgba(167,167,220,0.38); }
.uc-pick-btn {
  display: inline-flex; align-items: center;
  margin-top: 6px; padding: 7px 18px; border-radius: 20px;
  background: #0f3460; border: 1px solid rgba(144,205,244,0.38);
  color: #90cdf4; font-size: 0.8rem; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
}
.uc-pick-btn:hover { background: #1a4a7a; }
.uc-pick-btn.secondary {
  background: rgba(15,52,96,0.35);
  border-color: rgba(144,205,244,0.2);
  color: rgba(144,205,244,0.7);
}
.uc-pick-btn.secondary:hover { background: rgba(15,52,96,0.6); }
.uc-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }

/* Preview grid */
.uc-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
  gap: 8px; padding: 12px;
}
.uc-thumb {
  position: relative; border-radius: 10px; overflow: hidden;
  background: rgba(15,52,96,0.3); border: 1px solid rgba(144,205,244,0.12);
  aspect-ratio: 1; display: flex; flex-direction: column;
}
.uc-thumb img { width: 100%; flex: 1; object-fit: cover; display: block; }
.uc-thumb-info { padding: 3px 5px; background: rgba(0,0,0,0.55); display: flex; flex-direction: column; gap: 1px; }
.uc-thumb-name { font-size: 0.58rem; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uc-thumb-size { font-size: 0.52rem; color: rgba(167,167,220,0.5); }
.uc-thumb-remove {
  position: absolute; top: 4px; right: 4px;
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(239,68,68,0.88); border: none; color: white;
  font-size: 0.58rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.15s;
}
.uc-thumb:hover .uc-thumb-remove { opacity: 1; }
.uc-add-more {
  aspect-ratio: 1; border-radius: 10px;
  border: 2px dashed rgba(144,205,244,0.22);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; color: rgba(144,205,244,0.38); cursor: pointer;
  transition: all 0.2s;
}
.uc-add-more:hover { border-color: rgba(144,205,244,0.6); color: #90cdf4; background: rgba(15,52,96,0.18); }

/* GPS row */
.uc-gps-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.uc-gps-icon { font-size: 1.4rem; }
.uc-gps-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.uc-gps-name { font-size: 0.87rem; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uc-gps-size { font-size: 0.73rem; color: rgba(167,167,220,0.5); }
.uc-gps-remove {
  background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.28);
  border-radius: 8px; color: #fca5a5; padding: 4px 10px;
  cursor: pointer; font-size: 0.78rem; transition: all 0.2s; flex-shrink: 0;
}
.uc-gps-remove:hover { background: rgba(239,68,68,0.28); }

/* Error */
.uc-error {
  display: flex; align-items: center; gap: 8px;
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.28);
  border-radius: 10px; padding: 10px 14px; color: #fca5a5; font-size: 0.83rem;
}

/* Progress */
.uc-progress-wrap { display: flex; flex-direction: column; gap: 6px; }
.uc-progress-bar {
  height: 6px; border-radius: 6px;
  background: rgba(144,205,244,0.1); overflow: hidden;
}
.uc-progress-fill {
  height: 100%; border-radius: 6px;
  background: linear-gradient(90deg, #0f3460, #90cdf4);
  transition: width 0.3s ease;
}
.uc-progress-label { font-size: 0.76rem; color: rgba(167,167,220,0.6); text-align: center; }

/* Success */
.uc-success {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; padding: 50px 20px; text-align: center;
}
.uc-success-icon { font-size: 3.2rem; animation: uc-pop 0.45s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes uc-pop { from { transform: scale(0); } to { transform: scale(1); } }
.uc-success h3 { margin: 0; font-size: 1.25rem; color: #90cdf4; }
.uc-success p { margin: 0; font-size: 0.85rem; color: rgba(167,167,220,0.65); max-width: 340px; }

/* Footer */
.uc-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 12px;
  padding: 15px 28px 20px; border-top: 1px solid rgba(144,205,244,0.1);
  flex-shrink: 0;
}
.uc-btn-secondary {
  background: transparent; border: 1px solid rgba(144,205,244,0.2);
  color: rgba(167,167,220,0.65); padding: 9px 20px; border-radius: 20px;
  font-size: 0.83rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.uc-btn-secondary:hover { border-color: rgba(144,205,244,0.4); color: #e2e8f0; }
.uc-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
.uc-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #0f3460, #1a4a7a);
  border: 1px solid rgba(144,205,244,0.4);
  color: #90cdf4; padding: 9px 24px; border-radius: 20px;
  font-size: 0.87rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.uc-btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1a4a7a, #2563a8);
  border-color: rgba(144,205,244,0.7);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(15,52,96,0.5);
}
.uc-btn-primary:disabled { opacity: 0.42; cursor: not-allowed; transform: none; }
.uc-btn-primary.is-uploading { animation: uc-pulse 1.4s ease-in-out infinite; }
@keyframes uc-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.68; } }

.uc-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(144,205,244,0.28);
  border-top-color: #90cdf4; border-radius: 50%;
  animation: spin 0.7s linear infinite; flex-shrink: 0;
}

/* Transition */
.uc-fade-enter-active, .uc-fade-leave-active { transition: all 0.25s ease; }
.uc-fade-enter-from, .uc-fade-leave-to { opacity: 0; transform: scale(0.96); }
</style>
