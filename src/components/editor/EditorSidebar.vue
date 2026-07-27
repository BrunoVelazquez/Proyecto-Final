<script setup>
import { computed, ref } from 'vue'
import ButtonComp from '../ButtonComp.vue'
import CampaignChartsModal from '../CampaignChartsModal.vue'

const props = defineProps({
  editorTool: { type: String, required: true },
  selectedBoxIndex: { type: Number, required: true },
  currentImageFeatures: { type: Array, required: true },
  availableCategories: { type: Array, required: true },
  getCategoryColor: { type: Function, required: true },
  showCharts: { type: Boolean, required: true },
  detectionStats: { type: Array, required: true },
  totalDetections: { type: Number, required: true },
  saveStatus: { type: String, default: '' },
  // Undo / redo
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  // Visibilidad
  hiddenCategories: { type: Object, default: () => new Set() },
  hiddenBoxes: { type: Object, default: () => new Set() },
  allHidden: { type: Boolean, default: false },
})

defineEmits([
  'update:editorTool',
  'update:selectedBoxIndex',
  'update:showCharts',
  'removeBox',
  'changeCategory',
  'save',
  'undo',
  'redo',
  'toggleAllBoxes',
  'toggleCategory',
  'toggleBoxVisibility',
  'zoomToBox',
])

const groupedFeatures = computed(() => {
  const groups = {}
  props.availableCategories.forEach(cat => { groups[cat] = [] })
  props.currentImageFeatures.forEach((box, index) => {
    if (!groups[box.category]) groups[box.category] = []
    groups[box.category].push({ box, index })
  })
  return groups
})

const showChartsModal = ref(false)
const hoveredCategory = ref(null)

const donutRadius = 46
const donutCircumference = 2 * Math.PI * donutRadius

const donutSlices = computed(() => {
  if (props.totalDetections === 0) return []
  let currentOffset = 0
  return props.detectionStats.map(stat => {
    const percentage = stat.count / props.totalDetections
    const dashLength = percentage * donutCircumference
    const slice = {
      ...stat,
      percentage: (percentage * 100).toFixed(1) + '%',
      strokeDasharray: `${dashLength} ${donutCircumference - dashLength}`,
      strokeDashoffset: -currentOffset,
    }
    currentOffset += dashLength
    return slice
  })
})

const maxBarValue = computed(() => {
  if (props.detectionStats.length === 0) return 10
  const max = Math.max(...props.detectionStats.map(s => s.count))
  return Math.max(5, Math.ceil(max / 5) * 5)
})

const yAxisTicks = computed(() => {
  const max = maxBarValue.value
  const step = Math.max(1, Math.round(max / 4))
  const ticks = []
  for (let v = 0; v <= max; v += step) {
    ticks.push(v)
  }
  if (ticks[ticks.length - 1] !== max) ticks.push(max)
  return ticks.reverse()
})
</script>

<template>
  <div class="lb-sidebar">
    <h4>Editor de detecciones</h4>

    <div class="lb-sidebar-scroll">
      <!-- Herramientas principales -->
      <div class="lb-tools">
        <ButtonComp
          class="lb-tool-btn"
          :class="{ active: editorTool === 'draw' }"
          @click="$emit('update:editorTool', 'draw')"
        >
          ✏ Crear
        </ButtonComp>
        <ButtonComp
          class="lb-tool-btn lb-tool-btn-delete"
          @click="$emit('removeBox', selectedBoxIndex)"
          :disabled="selectedBoxIndex < 0"
        >
          🗑 Borrar
        </ButtonComp>
      </div>

      <!-- Undo / Redo -->
      <div class="lb-tools lb-tools-undo">
        <ButtonComp
          class="lb-tool-btn"
          :disabled="!canUndo"
          @click="$emit('undo')"
          title="Deshacer (Ctrl+Z)"
        >
          ↩ Deshacer
        </ButtonComp>
        <ButtonComp
          class="lb-tool-btn"
          :disabled="!canRedo"
          @click="$emit('redo')"
          title="Rehacer (Ctrl+Y)"
        >
          ↪ Rehacer
        </ButtonComp>
      </div>

      <!-- Cambiar a -->
      <div class="lb-change-section">
        <label class="lb-change-label">Cambiar a</label>
        <select
          class="lb-class-select"
          :value="selectedBoxIndex >= 0 ? currentImageFeatures[selectedBoxIndex]?.category : ''"
          @change="(e) => $emit('changeCategory', e.target.value)"
          :disabled="selectedBoxIndex < 0"
        >
          <option v-for="cat in availableCategories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
      </div>

      <!-- Visibilidad y Objetos Unificados -->
      <div class="lb-section-title lb-vis-header-main">
        <span>Objetos por categoría</span>
        <button
          class="lb-vis-toggle-all"
          :class="{ active: allHidden }"
          @click.prevent="$emit('toggleAllBoxes')"
          :title="allHidden ? 'Mostrar todos' : 'Ocultar todos'"
        >
          {{ allHidden ? '👁 Mostrar' : '🚫 Ocultar' }}
        </button>
      </div>

      <div class="lb-category-list">
        <details
          v-for="cat in availableCategories.toSorted()"
          :key="cat"
          class="lb-cat-details"
          :open="groupedFeatures[cat]?.length > 0"
        >
          <summary class="lb-cat-summary" :class="{ hidden: allHidden || hiddenCategories.has(cat) }">
            <span class="lb-vis-dot" :style="{ background: getCategoryColor(cat) }"></span>
            <span class="lb-vis-label">{{ cat }} ({{ groupedFeatures[cat]?.length || 0 }})</span>
            <span class="lb-vis-eye" @click.prevent="$emit('toggleCategory', cat)">
              {{ allHidden || hiddenCategories.has(cat) ? '🙈' : '👁' }}
            </span>
          </summary>

          <div class="lb-cat-items" v-if="groupedFeatures[cat]?.length">
            <div
              v-for="item in groupedFeatures[cat]"
              :key="item.index"
              class="lb-box-item"
              :class="{
                 selected: selectedBoxIndex === item.index,
                 hidden: allHidden || hiddenCategories.has(cat) || hiddenBoxes.has(item.box)
              }"
              @click="$emit('update:selectedBoxIndex', item.index)"
              @dblclick="$emit('zoomToBox', item.index)"
            >
              <span class="lb-box-label">Objeto {{ item.index + 1 }}</span>
              <span class="lb-vis-eye" @click.stop="$emit('toggleBoxVisibility', item.box)">
                {{ allHidden || hiddenCategories.has(cat) || hiddenBoxes.has(item.box) ? '🙈' : '👁' }}
              </span>
            </div>
          </div>
          <div class="lb-cat-empty" v-else>Sin detecciones</div>
        </details>
      </div>
    </div>

    <!-- Footer buttons -->
    <div class="lb-sidebar-footer">
      <!-- Panel de gráficos (Drop-up) -->
      <Transition name="fade">
        <div v-if="showCharts" class="lb-charts-panel">
          <div class="lb-chart-header">
            <span>Imagen: <b>{{ totalDetections }}</b> detecciones</span>
            <button class="btn-open-global-charts" @click="showChartsModal = true" title="Ver gráficos por campaña y totales globales">
              📊 Ver Todas las Campañas
            </button>
          </div>

          <!-- Donut Chart -->
          <div class="lb-chart-section">
            <div class="lb-section-title">Label Distribution</div>
            <div class="lb-donut-wrap">
              <svg class="lb-donut-svg" viewBox="0 0 130 130">
                <circle cx="65" cy="65" :r="donutRadius" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="20" />
                <g transform="rotate(-90 65 65)">
                  <circle
                    v-for="slice in donutSlices"
                    :key="slice.category"
                    cx="65"
                    cy="65"
                    :r="donutRadius"
                    fill="transparent"
                    :stroke="slice.color"
                    stroke-width="20"
                    :stroke-dasharray="slice.strokeDasharray"
                    :stroke-dashoffset="slice.strokeDashoffset"
                    class="lb-donut-slice"
                    @mouseenter="hoveredCategory = slice.category"
                    @mouseleave="hoveredCategory = null"
                  />
                </g>
                <text x="65" y="62" text-anchor="middle" class="lb-donut-title">
                  {{ hoveredCategory || 'TOTAL' }}
                </text>
                <text x="65" y="76" text-anchor="middle" class="lb-donut-count">
                  {{
                    hoveredCategory
                      ? detectionStats.find(s => s.category === hoveredCategory)?.count
                      : totalDetections
                  }}
                </text>
              </svg>
            </div>
            <!-- Legend -->
            <div class="lb-legend-grid">
              <div v-for="stat in detectionStats" :key="stat.category" class="lb-legend-item">
                <span class="lb-legend-dot" :style="{ backgroundColor: stat.color }"></span>
                <span class="lb-legend-text">{{ stat.category }}</span>
                <span class="lb-legend-val">({{ stat.count }})</span>
              </div>
            </div>
          </div>

          <!-- Vertical Bar Chart -->
          <div class="lb-chart-section">
            <div class="lb-section-title">Conteo por Categoría</div>
            <div class="lb-bar-container">
              <div class="lb-y-axis">
                <div v-for="tick in yAxisTicks" :key="tick" class="lb-y-tick">{{ tick }}</div>
              </div>
              <div class="lb-bars-area">
                <div class="lb-grid-lines">
                  <div v-for="tick in yAxisTicks" :key="tick" class="lb-grid-line"></div>
                </div>
                <div class="lb-bars-row">
                  <div v-for="stat in detectionStats" :key="stat.category" class="lb-bar-col">
                    <div class="lb-bar-tooltip">{{ stat.category }}: {{ stat.count }}</div>
                    <div class="lb-bar-track">
                      <div
                        class="lb-bar-fill"
                        :style="{
                          height: (stat.count / maxBarValue) * 100 + '%',
                          backgroundColor: hoveredCategory === stat.category ? '#1a4a7a' : '#0f3460',
                          borderColor: stat.color
                        }"
                      ></div>
                    </div>
                    <div class="lb-bar-lbl" :title="stat.category">{{ stat.category }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
      <!-- Botón de gráficos -->
      <ButtonComp class="lb-chart-btn" @click="$emit('update:showCharts', !showCharts)">
        {{ showCharts ? 'Ocultar' : 'Ver' }} conteo
      </ButtonComp>

      <!-- Guardar -->
      <ButtonComp class="lb-save-btn" @click="$emit('save')" :disabled="!canUndo">Actualizar</ButtonComp>
    </div>

    <CampaignChartsModal
      :show="showChartsModal"
      @close="showChartsModal = false"
    />
  </div>
</template>

<style scoped>
.lb-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: #16213e;
  border-left: 1px solid #0f3460;
  display: flex;
  flex-direction: column;
  color: #cbd5e0;
  overflow: hidden;
}
.lb-sidebar h4 {
  padding: 12px;
  margin: 0;
  font-size: 14px;
  background: #0f3460;
  color: #90cdf4;
  border-bottom: 1px solid #2d3748;
  flex-shrink: 0;
}

.lb-sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Herramientas ── */
.lb-tools {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.lb-tools-undo {
  padding-top: 0;
}
.lb-tool-btn {
  flex: 1;
}
button.btn.lb-tool-btn {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid #4a5568;
  border-radius: 6px;
  background: #2d3748;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}
button.btn.lb-tool-btn:hover,
button.btn.lb-tool-btn.active {
  background: #1d9e75;
  border-color: #1d9e75;
  color: white;
}
button.btn.lb-tool-btn-delete {
  background: #4a1f1f;
  border-color: #e53e3e;
  color: #fc8181;
}
button.btn.lb-tool-btn-delete:hover {
  background: #e53e3e;
  color: white;
}
button.btn.lb-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #2d3748;
  border-color: #4a5568;
  color: #a0aec0;
}

/* ── Cambiar a ── */
.lb-change-section {
  padding: 8px 12px;
  border-top: 1px solid #2d3748;
  border-bottom: 1px solid #2d3748;
  flex-shrink: 0;
}
.lb-change-label {
  display: block;
  font-size: 11px;
  color: #a0aec0;
  margin-bottom: 4px;
}
.lb-class-select {
  width: 100%;
  background: #1a202c;
  border: 1px solid #4a5568;
  color: #e2e8f0;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  cursor: pointer;
}
.lb-class-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Visibilidad y Categorías Unificadas ── */
.lb-vis-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lb-vis-toggle-all {
  background: none;
  border: 1px solid #4a5568;
  border-radius: 4px;
  color: #a0aec0;
  font-size: 10px;
  padding: 2px 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.lb-vis-toggle-all:hover,
.lb-vis-toggle-all.active {
  background: #2d3748;
  color: #fc8181;
  border-color: #fc8181;
}

.lb-category-list {
  display: flex;
  flex-direction: column;
}

.lb-cat-summary {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
  list-style: none;
}
.lb-cat-summary::-webkit-details-marker {
  display: none;
}
.lb-cat-summary:hover {
  background: #1a202c;
}
.lb-cat-summary.hidden {
  opacity: 0.5;
}

.lb-cat-summary::before {
  content: "▶";
  font-size: 9px;
  color: #a0aec0;
  display: inline-block;
  transition: transform 0.2s;
}
.lb-cat-details[open] .lb-cat-summary::before {
  transform: rotate(90deg);
}

.lb-vis-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lb-vis-label {
  flex: 1;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.lb-vis-eye {
  font-size: 12px;
  cursor: pointer;
  padding: 2px;
}
.lb-vis-eye:hover {
  transform: scale(1.1);
}

.lb-cat-items {
  padding: 0 8px 8px 24px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.lb-cat-empty {
  padding: 0 8px 8px 24px;
  font-size: 11px;
  color: #718096;
  font-style: italic;
}

.lb-box-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s, opacity 0.15s;
}
.lb-box-item:hover {
  background: rgba(255, 255, 255, 0.05);
}
.lb-box-item.selected {
  background: rgba(144, 205, 244, 0.15);
  color: #90cdf4;
}
.lb-box-item.hidden {
  opacity: 0.45;
}

.lb-box-label {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  color: #cbd5e0;
  min-width: 0;
}

/* ── Section titles ── */
.lb-section-title {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #90cdf4;
  flex-shrink: 0;
  user-select: none;
}

/* ── Charts ── */
.lb-charts-panel {
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 100%;
  max-height: 480px;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 12px;
  background: #1a202c;
  border-top: 1px solid #2d3748;
  border-bottom: 1px solid #2d3748;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.4);
  z-index: 10;
}
.lb-chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #a0aec0;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #2d3748;
}
.btn-open-global-charts {
  background: #0f3460;
  color: #90cdf4;
  border: 1px solid rgba(144, 205, 244, 0.4);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-open-global-charts:hover {
  background: #1a4a7a;
  transform: scale(1.03);
}
.lb-chart-section {
  margin-bottom: 14px;
}
.lb-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 8px;
}
.lb-donut-wrap {
  display: flex;
  justify-content: center;
  margin: 6px 0 10px;
}
.lb-donut-svg {
  width: 130px;
  height: 130px;
}
.lb-donut-slice {
  transition: all 0.2s;
  cursor: pointer;
}
.lb-donut-slice:hover {
  stroke-width: 24;
}
.lb-donut-title {
  fill: #a5b4fc;
  font-size: 10px;
  font-weight: 600;
}
.lb-donut-count {
  fill: #fff;
  font-size: 13px;
  font-weight: 700;
}
.lb-legend-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  max-height: 100px;
  overflow-y: auto;
}
.lb-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #cbd5e0;
  min-width: 0;
}
.lb-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lb-legend-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.lb-legend-val {
  color: #90cdf4;
  font-weight: 600;
}
.lb-bar-container {
  display: flex;
  gap: 6px;
  height: 145px;
  padding-top: 10px;
  background: rgba(0,0,0,0.15);
  border-radius: 6px;
  padding: 8px;
}
.lb-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 9px;
  color: #718096;
  text-align: right;
  width: 18px;
}
.lb-bars-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: flex-end;
  min-width: 0;
}
.lb-grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 25px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}
.lb-grid-line {
  width: 100%;
  height: 1px;
  background: rgba(255,255,255,0.06);
}
.lb-bars-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  width: 100%;
  height: 100%;
  gap: 4px;
  padding-bottom: 25px;
}
.lb-bar-col {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-width: 0;
}
.lb-bar-track {
  flex: 1;
  width: 100%;
  max-width: 24px;
  display: flex;
  align-items: flex-end;
}
.lb-bar-fill {
  width: 100%;
  border-top: 2px solid;
  border-radius: 3px 3px 0 0;
  transition: height 0.3s ease;
}
.lb-bar-lbl {
  position: absolute;
  top: 100%;
  right: 50%;
  transform: rotate(-45deg);
  transform-origin: top right;
  margin-top: 2px;
  font-size: 8px;
  color: #a0aec0;
  max-width: 45px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}
.lb-bar-tooltip {
  position: absolute;
  bottom: 100%;
  background: #0f3460;
  color: #fff;
  font-size: 9px;
  padding: 2px 5px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 20;
}
.lb-bar-col:hover .lb-bar-tooltip {
  opacity: 1;
}

/* ── Sidebar Footer ── */
.lb-sidebar-footer {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background: #1a202c;
  border-top: 1px solid #2d3748;
  position: relative;
}

button.btn.lb-chart-btn {
  width: 100%;
  margin: 0;
  padding: 14px;
  border: none;
  border-bottom: 1px solid #2d3748;
  border-radius: 0;
  background: #2d3748;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.15s;
  text-align: center;
}
button.btn.lb-chart-btn:hover {
  background: #3c4a63;
  color: #90cdf4;
}

button.btn.lb-save-btn {
  width: 100%;
  margin: 0;
  padding: 14px;
  border: none;
  border-radius: 0;
  background: #1d9e75;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.15s;
}
button.btn.lb-save-btn:hover {
  background: #178a64;
}
button.btn.lb-save-btn:disabled {
  background: #2d3748;
  color: #a0aec0;
  cursor: not-allowed;
}
</style>
