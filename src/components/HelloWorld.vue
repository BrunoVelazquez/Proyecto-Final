<script setup>
import { ref } from 'vue'
defineProps({
  msg: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['close', 'upload'])

const file = ref(null)

const handleFileUpload = (event) => {
  file.value = event.target.files[0]
}

const submitUpload = () => {
  if (file.value) {
    emit('upload', file.value)
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content">
      <h2>Upload Campaign</h2>
      <input type="file" @change="handleFileUpload" />
      <div class="actions">
        <button @click="$emit('close')">Cancel</button>
        <button @click="submitUpload">Upload</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
}

.actions {
  margin-top: 1rem;
  display: flex;
  gap: 10px;
}
</style>
