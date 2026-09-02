<script setup>
import { getCampaignShapeSvg } from '../utils/shapeUtils.js'
defineProps({
  availableCategories: { type: Array, required: true },
  selectedCategories: { type: Array, required: true },
  getCategoryColor: { type: Function, required: true },
  availableCampaigns: { type: Array, default: () => [] },
  visibleCampaignIds: { type: Array, default: () => [] },
})

defineEmits(['change', 'toggleCampaign', 'clearCategories', 'selectAllCategories'])
</script>

<template>
  <div class="floating-filter-card">
    <div class="card-header">
      <h4>Filtros</h4>
    </div>
    
    <div class="filter-section" v-if="availableCampaigns.length > 1">
      <span class="section-title">Campañas ({{ visibleCampaignIds.length }}/{{ availableCampaigns.length }})</span>
      <div class="filter-scroll-area">
        <div v-for="(c, i) in availableCampaigns" :key="c.id" class="checkbox-row">
          <input
            type="checkbox"
            :id="'camp-' + c.id"
            :value="c.id"
            :checked="visibleCampaignIds.includes(c.id)"
            @change="$emit('toggleCampaign', c.id)"
          />
          <span class="legend-shape-icon" v-html="getCampaignShapeSvg(i, '#5b5394', 6)"></span>
          <label :for="'camp-' + c.id">{{ c.title ?? c.name ?? `Campaña #${c.id}` }}</label>
        </div>
      </div>
    </div>

    <div class="filter-section">
      <div class="section-header-row">
        <span class="section-title">Categorías ({{ selectedCategories.length }}/{{ availableCategories.length }})</span>
        <div class="section-actions">
          <button class="action-link" @click="$emit('selectAllCategories')">Todas</button>
          <button class="action-link" @click="$emit('clearCategories')">Ninguna</button>
        </div>
      </div>
      <div class="filter-scroll-area">
        <div v-for="cat in availableCategories.toSorted()" :key="cat" class="checkbox-row">
          <input
            type="checkbox"
            :id="'filter-' + cat"
            :value="cat"
            :checked="selectedCategories.includes(cat)"
            @change="$emit('change', cat)"
          />
          <span class="legend-color-dot" :style="{ backgroundColor: getCategoryColor(cat) }"></span>
          <label :for="'filter-' + cat">{{ cat }}</label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.floating-filter-card {
  width: 100%;
  max-height: 400px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #5b5394;
  padding-bottom: 8px;
}
.card-header h4 {
  margin: 0;
  font-size: 15px;
  color: #303133;
}
.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-actions {
  display: flex;
  gap: 6px;
}
.action-link {
  background: transparent;
  border: none;
  color: #5b5394;
  font-size: 11px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}
.action-link:hover {
  color: #3a3363;
}
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 150px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
}
.filter-scroll-area {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #606266;
}
.checkbox-row label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.checkbox-row input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 15px;
  height: 15px;
  min-width: 15px;
  min-height: 15px;
  border: 2px solid #9da8b7;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  transition: background 0.15s, border-color 0.15s;
}
.checkbox-row input[type="checkbox"]:checked {
  background: #5b5394;
  border-color: #5b5394;
}
.checkbox-row input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0px;
  width: 5px;
  height: 9px;
  border: 2px solid white;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}
.legend-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  flex-shrink: 0;
}
.legend-shape-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}
</style>
