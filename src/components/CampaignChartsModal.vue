<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../api/api.js'
import { getCampaigns } from '../api/campaignsApi.js'
import { useCategories } from './composables/useCategories.js'

const props = defineProps({
  show: { type: Boolean, required: true },
  initialCampaignId: { type: [Number, String], default: null },
})

const emit = defineEmits(['close'])

const { getCategoryColor } = useCategories()

const loading = ref(false)
const error = ref('')
const allFeatures = ref([])
const campaigns = ref([])
const selectedView = ref('total') // 'total' or 'campaign_X'

const currentFeatures = ref([])
const hoveredCategory = ref(null)

// Custom palette similar to reference image (bright lime, orange, cyan, deep blue, orange-red, green, violet)
const referenceColors = {
  solos: '#a3e635',
  haren_1: '#fcd34d',
  haren_2: '#60a5fa',
  haren_3: '#2563eb',
  haren_4: '#f97316',
  pareja_solitaria: '#22c55e',
  elefante_macho_alfa: '#a855f7',
}

function getColorForCategory(cat) {
  if (referenceColors[cat]) return referenceColors[cat]
  return getCategoryColor(cat)
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    // 1. Cargar lista de campañas
    try {
      const campRes = await getCampaigns()
      campaigns.value = campRes.data?.campaigns ?? []
    } catch (e) {
      console.warn('No se pudo cargar la lista de campañas', e)
    }

    // 2. Cargar todas las detecciones para el Total
    const geoRes = await api.get('/api/db/geojson/')
    allFeatures.value = geoRes.data?.features ?? []

    if (props.initialCampaignId) {
      selectedView.value = `campaign_${props.initialCampaignId}`
    } else {
      selectedView.value = 'total'
    }
    await updateCurrentFeatures()
  } catch (err) {
    error.value = 'Error al cargar los datos de detecciones para los gráficos.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function updateCurrentFeatures() {
  if (selectedView.value === 'total') {
    currentFeatures.value = allFeatures.value
    return
  }

  if (selectedView.value.startsWith('campaign_')) {
    const campId = selectedView.value.replace('campaign_', '')
    try {
      loading.value = true
      const { data } = await api.get(`/api/db/geojson/?campaign_id=${campId}`)
      currentFeatures.value = data?.features ?? []
    } catch (e) {
      console.warn(`No se pudieron cargar features de la campaña ${campId}, intentando filtrar en memoria`, e)
      currentFeatures.value = allFeatures.value.filter(f =>
        String(f.properties?.campaign_id) === String(campId) ||
        f.properties?.campaign?.id === Number(campId)
      )
    } finally {
      loading.value = false
    }
  }
}

watch(selectedView, () => {
  updateCurrentFeatures()
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    loadData()
  }
})

onMounted(() => {
  if (props.show) {
    loadData()
  }
})

// ── Estadística y Conteo de Categorías ──
const categoryStats = computed(() => {
  const counts = {}
  currentFeatures.value.forEach(f => {
    const dets = f.properties?.detections || []
    dets.forEach(d => {
      const cat = d.category || d.class_name || 'Desconocido'
      counts[cat] = (counts[cat] || 0) + 1
    })
  })

  const entries = Object.entries(counts).map(([cat, count]) => ({
    category: cat,
    count,
    color: getColorForCategory(cat),
  }))

  return entries.sort((a, b) => b.count - a.count)
})

const totalCount = computed(() => {
  return categoryStats.value.reduce((acc, curr) => acc + curr.count, 0)
})

// ── Cálculo del Donut Chart (SVG) ──
const donutRadius = 65
const donutCircumference = 2 * Math.PI * donutRadius // ~408.4

const donutSlices = computed(() => {
  if (totalCount.value === 0) return []
  let currentOffset = 0
  return categoryStats.value.map(item => {
    const percentage = item.count / totalCount.value
    const dashLength = percentage * donutCircumference
    const slice = {
      ...item,
      percentage: (percentage * 100).toFixed(1) + '%',
      strokeDasharray: `${dashLength} ${donutCircumference - dashLength}`,
      strokeDashoffset: -currentOffset,
    }
    currentOffset += dashLength
    return slice
  })
})

// ── Cálculo del Bar Chart (SVG) ──
const barChartMode = ref('por_categoria') // 'por_categoria' | 'por_campana'

const campaignBarStats = computed(() => {
  return campaigns.value.map(c => {
    // Intentar buscar features en allFeatures que coincidan con la campaña
    const matchingFeatures = allFeatures.value.filter(f =>
      String(f.properties?.campaign_id) === String(c.id) ||
      f.properties?.campaign?.id === c.id ||
      (c.title && f.properties?.campaign_title === c.title) ||
      (f.properties?.model_name && c.model_used && f.properties?.model_name === c.model_used)
    )
    let count = 0
    if (matchingFeatures.length > 0) {
      count = matchingFeatures.reduce((sum, f) => sum + (f.properties?.detections?.length || f.properties?.total_detections || 1), 0)
    } else {
      count = c.image_count || 0
    }

    return {
      label: c.title || c.name || `Campaña #${c.id}`,
      count: count,
      color: '#90cdf4',
      subtext: `${c.image_count || 0} imágenes`,
      id: c.id
    }
  }).sort((a, b) => b.count - a.count)
})

const activeBarItems = computed(() => {
  if (barChartMode.value === 'por_campana') {
    return campaignBarStats.value.map(s => ({
      category: s.label,
      count: s.count,
      color: s.color,
      subtext: s.subtext
    }))
  }
  return categoryStats.value
})

const maxBarValue = computed(() => {
  if (activeBarItems.value.length === 0) return 70
  const max = Math.max(...activeBarItems.value.map(s => s.count))
  return Math.max(10, Math.ceil(max / 10) * 10)
})

const yAxisTicks = computed(() => {
  const max = maxBarValue.value
  const step = Math.max(1, Math.round(max / 6))
  const ticks = []
  for (let v = 0; v <= max; v += step) {
    ticks.push(v)
  }
  if (ticks[ticks.length - 1] !== max) ticks.push(max)
  return ticks.reverse()
})
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-card">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-left">
            <div class="icon-badge">📊</div>
            <div>
              <h2 class="modal-title">Distribución y Conteo de Detecciones</h2>
              <p class="modal-subtitle">Visualización detallada por categorías y campañas</p>
            </div>
          </div>
          <button class="close-btn" @click="emit('close')" title="Cerrar">✕</button>
        </div>

        <!-- Toolbar / Selector -->
        <div class="charts-toolbar">
          <div class="view-selector-wrap">
            <label class="selector-label">Seleccionar vista:</label>
            <select v-model="selectedView" class="view-select">
              <option value="total">🌐 Total (Todas las campañas)</option>
              <option v-for="c in campaigns" :key="c.id" :value="`campaign_${c.id}`">
                🗺 {{ c.title || c.name || `Campaña #${c.id}` }}
              </option>
            </select>
          </div>
          <div class="total-summary-badge">
            Total detectado: <strong>{{ totalCount }}</strong>
          </div>
        </div>

        <!-- Loading / Error / Content -->
        <div v-if="loading" class="state-box">
          <span class="spinner-ring"></span>
          <span>Calculando estadísticas y gráficos...</span>
        </div>
        <div v-else-if="error" class="error-banner">
          <span>⚠</span> {{ error }}
        </div>
        <div v-else-if="totalCount === 0" class="state-box empty">
          <span class="empty-icon">📭</span>
          <span>No se encontraron detecciones para la vista seleccionada.</span>
        </div>
        <div v-else class="charts-body">
          <!-- Top Chart: Donut Chart (Label Distribution) -->
          <div class="chart-card donut-section">
            <div class="chart-card-header">
              <div class="card-title-group">
                <span class="grid-icon">::</span>
                <span class="card-title">Label Distribution</span>
                <span class="tag-badge">RectangleLabels</span>
              </div>
              <div class="card-actions">
                <span class="summary-label">Summary ∨</span>
              </div>
            </div>

            <!-- SVG Donut -->
            <div class="donut-container">
              <svg viewBox="0 0 180 180" class="donut-svg">
                <circle
                  cx="90"
                  cy="90"
                  :r="donutRadius"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.05)"
                  stroke-width="32"
                />
                <g transform="rotate(-90 90 90)">
                  <circle
                    v-for="slice in donutSlices"
                    :key="slice.category"
                    cx="90"
                    cy="90"
                    :r="donutRadius"
                    fill="transparent"
                    :stroke="slice.color"
                    stroke-width="32"
                    :stroke-dasharray="slice.strokeDasharray"
                    :stroke-dashoffset="slice.strokeDashoffset"
                    class="donut-slice"
                    :class="{ 'is-hovered': hoveredCategory === slice.category }"
                    @mouseenter="hoveredCategory = slice.category"
                    @mouseleave="hoveredCategory = null"
                  />
                </g>
                <!-- Center Text -->
                <text x="90" y="86" text-anchor="middle" class="donut-center-title">
                  {{ hoveredCategory ? hoveredCategory : 'TOTAL' }}
                </text>
                <text x="90" y="106" text-anchor="middle" class="donut-center-count">
                  {{
                    hoveredCategory
                      ? donutSlices.find(s => s.category === hoveredCategory)?.count +
                        ' (' +
                        donutSlices.find(s => s.category === hoveredCategory)?.percentage +
                        ')'
                      : totalCount
                  }}
                </text>
              </svg>
            </div>

            <!-- Legend Grid -->
            <div class="legend-grid">
              <div
                v-for="item in categoryStats"
                :key="item.category"
                class="legend-item"
                :class="{ 'is-hovered': hoveredCategory === item.category }"
                @mouseenter="hoveredCategory = item.category"
                @mouseleave="hoveredCategory = null"
              >
                <span class="legend-dot" :style="{ backgroundColor: item.color }"></span>
                <span class="legend-text">{{ item.category }}</span>
                <span class="legend-val">({{ item.count }})</span>
              </div>
            </div>
          </div>

          <!-- Bottom Chart: Bar Chart (Conteo por Categoría vs Campaña) -->
          <div class="chart-card bar-section">
            <div class="chart-card-header">
              <div class="card-title-group">
                <span class="card-title">
                  {{ barChartMode === 'por_categoria' ? 'Conteo por Categoría' : 'Comparativa por Campaña' }}
                </span>
                <div class="mode-toggle-pills">
                  <button
                    class="mode-pill"
                    :class="{ active: barChartMode === 'por_categoria' }"
                    @click="barChartMode = 'por_categoria'"
                  >Por Categorías</button>
                  <button
                    class="mode-pill"
                    :class="{ active: barChartMode === 'por_campana' }"
                    @click="barChartMode = 'por_campana'"
                  >Por Campañas</button>
                </div>
              </div>
              <div class="bar-summary">
                Máximo: <strong>{{ maxBarValue }}</strong>
              </div>
            </div>

            <!-- SVG Bar Chart -->
            <div class="bar-chart-container">
              <div class="y-axis">
                <div v-for="tick in yAxisTicks" :key="tick" class="y-tick">
                  <span>{{ tick }}</span>
                </div>
              </div>
              <div class="bars-area">
                <!-- Grid lines -->
                <div class="grid-lines">
                  <div v-for="tick in yAxisTicks" :key="tick" class="grid-line"></div>
                </div>
                <!-- Bars -->
                <div class="bars-row">
                  <div
                    v-for="item in activeBarItems"
                    :key="item.category"
                    class="bar-column"
                    @mouseenter="hoveredCategory = item.category"
                    @mouseleave="hoveredCategory = null"
                  >
                    <div class="bar-tooltip">{{ item.category }}: {{ item.count }} {{ item.subtext ? `(${item.subtext})` : '' }}</div>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        :style="{
                          height: (item.count / maxBarValue) * 100 + '%',
                          backgroundColor: hoveredCategory === item.category ? '#1a4a7a' : '#0f3460',
                          borderColor: item.color
                        }"
                      ></div>
                    </div>
                    <div class="bar-label" :title="item.category">{{ item.category }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-primary" @click="emit('close')">Cerrar visualización</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(7, 6, 20, 0.82);
  backdrop-filter: blur(10px);
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 860px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(145deg, #1a1535, #111029);
  border: 1px solid rgba(144, 205, 244, 0.25);
  border-radius: 20px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px 16px;
  border-bottom: 1px solid rgba(144, 205, 244, 0.15);
  background: rgba(15, 52, 96, 0.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-badge {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(15, 52, 96, 0.5);
  border: 1px solid rgba(144, 205, 244, 0.3);
  border-radius: 12px;
}

.modal-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: #90cdf4;
}

.modal-subtitle {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: rgba(167, 167, 220, 0.7);
}

.close-btn {
  background: transparent;
  border: none;
  color: #90cdf4;
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 8px;
  transition: all 0.2s;
}
.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

/* Toolbar */
.charts-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(144, 205, 244, 0.1);
  flex-wrap: wrap;
  gap: 12px;
}

.view-selector-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selector-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #a5b4fc;
}

.view-select {
  background: #0f3460;
  color: #90cdf4;
  border: 1px solid rgba(144, 205, 244, 0.35);
  padding: 7px 14px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}
.view-select:focus {
  border-color: #90cdf4;
}

.total-summary-badge {
  background: rgba(15, 52, 96, 0.4);
  border: 1px solid rgba(144, 205, 244, 0.25);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #e2e8f0;
}
.total-summary-badge strong {
  color: #90cdf4;
}

/* Body */
.charts-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chart-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(144, 205, 244, 0.15);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.chart-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grid-icon {
  color: #90cdf4;
  font-weight: bold;
  letter-spacing: -2px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #e2e8f0;
}

.tag-badge {
  background: rgba(144, 205, 244, 0.15);
  color: #90cdf4;
  border: 1px solid rgba(144, 205, 244, 0.3);
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}

.mode-toggle-pills {
  display: flex;
  background: rgba(15, 52, 96, 0.4);
  border: 1px solid rgba(144, 205, 244, 0.25);
  border-radius: 20px;
  padding: 2px;
  margin-left: 12px;
}

.mode-pill {
  background: transparent;
  border: none;
  color: rgba(203, 213, 225, 0.8);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-pill.active {
  background: #0f3460;
  color: #90cdf4;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.summary-label {
  font-size: 0.82rem;
  color: rgba(167, 167, 220, 0.7);
}

/* Donut Section */
.donut-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 10px 0 20px;
}

.donut-svg {
  width: 220px;
  height: 220px;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.4));
}

.donut-slice {
  transition: all 0.25s ease;
  cursor: pointer;
}
.donut-slice:hover,
.donut-slice.is-hovered {
  stroke-width: 36;
  filter: brightness(1.15);
}

.donut-center-title {
  fill: #a5b4fc;
  font-size: 11px;
  font-weight: 600;
}

.donut-center-count {
  fill: #fff;
  font-size: 14px;
  font-weight: 700;
}

/* Legend */
.legend-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px 22px;
  padding: 10px 14px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.83rem;
  color: #cbd5e1;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}
.legend-item:hover,
.legend-item.is-hovered {
  background: rgba(144, 205, 244, 0.12);
  color: #fff;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-val {
  color: #90cdf4;
  font-weight: 600;
}

/* Bar Section */
.bar-chart-container {
  display: flex;
  height: 240px;
  padding-top: 10px;
  gap: 12px;
}

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: right;
  width: 36px;
  color: rgba(167, 167, 220, 0.6);
  font-size: 0.75rem;
  padding-bottom: 24px;
}

.y-tick {
  height: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.bars-area {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.grid-line {
  width: 100%;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.bars-row {
  position: relative;
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 16px;
  padding: 0 10px 45px;
  z-index: 2;
}

.bar-column {
  flex: 1;
  max-width: 50px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
  cursor: pointer;
  min-width: 0;
}

.bar-track {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar-fill {
  width: 100%;
  max-width: 36px;
  border-top: 3px solid;
  border-radius: 4px 4px 0 0;
  transition: height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.bar-tooltip {
  position: absolute;
  top: -28px;
  background: #0f3460;
  color: #90cdf4;
  border: 1px solid rgba(144, 205, 244, 0.4);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.73rem;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
  transform: translateY(4px);
  z-index: 10;
}

.bar-column:hover .bar-tooltip {
  opacity: 1;
  transform: translateY(0);
}

.bar-label {
  position: absolute;
  top: 100%;
  right: 50%;
  transform: rotate(-45deg);
  transform-origin: top right;
  margin-top: 6px;
  font-size: 0.72rem;
  color: rgba(167, 167, 220, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
  text-align: left;
  font-weight: 600;
}

/* States */
.state-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 0;
  color: rgba(167, 167, 220, 0.7);
}

.state-box.empty {
  flex-direction: column;
}
.empty-icon {
  font-size: 2.2rem;
}

.spinner-ring {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(144, 205, 244, 0.2);
  border-top-color: #90cdf4;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  padding: 14px 20px;
  border-radius: 12px;
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Footer */
.modal-footer {
  padding: 16px 28px;
  background: rgba(15, 52, 96, 0.15);
  border-top: 1px solid rgba(144, 205, 244, 0.15);
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  background: #0f3460;
  color: #90cdf4;
  border: 1px solid rgba(144, 205, 244, 0.35);
  padding: 10px 22px;
  border-radius: 10px;
  font-weight: bold;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover {
  background: #1a4a7a;
  color: #bee3f8;
}
</style>
