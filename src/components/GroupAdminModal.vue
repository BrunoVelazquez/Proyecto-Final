<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { getGrupo, updateGrupo, deleteGrupo, getMiembros, invitarUsuario, removeMiembro, updateRolMiembro } from '../api/gruposApi'

const props = defineProps({
  show: Boolean,
  grupoId: Number
})

const emit = defineEmits(['close', 'deleted'])

const loading = ref(true)
const error = ref('')

const grupo = ref(null)
const miembros = ref([])

// Edit state
const isEditing = ref(false)
const editNombre = ref('')
const editDesc = ref('')

// Invite state
const inviteMail = ref('')
const inviteRol = ref('IA')
const inviteStatus = ref('')

const isIP = computed(() => grupo.value?.mi_rol === 'IP')

watch(() => props.show, (newVal) => {
  if (newVal && props.grupoId) {
    loadGrupo()
  } else {
    resetState()
  }
})

function resetState() {
  grupo.value = null
  miembros.value = []
  isEditing.value = false
  error.value = ''
  inviteStatus.value = ''
  inviteMail.value = ''
}

async function loadGrupo() {
  loading.value = true
  error.value = ''
  try {
    const [grupoRes, miembrosRes] = await Promise.all([
      getGrupo(props.grupoId),
      getMiembros(props.grupoId)
    ])
    grupo.value = grupoRes.data
    miembros.value = miembrosRes.data.members || []
  } catch (err) {
    error.value = 'Error al cargar los datos del grupo.'
  } finally {
    loading.value = false
  }
}

function startEdit() {
  editNombre.value = grupo.value.nombre
  editDesc.value = grupo.value.descripcion || ''
  isEditing.value = true
}

async function saveEdit() {
  try {
    const { data } = await updateGrupo(props.grupoId, {
      nombre: editNombre.value,
      descripcion: editDesc.value
    })
    grupo.value.nombre = data.nombre
    grupo.value.descripcion = data.descripcion
    isEditing.value = false
  } catch (err) {
    alert(err.response?.data?.error || 'Error al actualizar grupo')
  }
}

async function handleDeleteGrupo() {
  if (!confirm('¿Estás seguro de que deseas eliminar este grupo? Sus campañas pasarán a ser personales.')) return
  try {
    await deleteGrupo(props.grupoId)
    emit('deleted')
    emit('close')
  } catch (err) {
    alert(err.response?.data?.error || 'Error al eliminar grupo')
  }
}

async function handleInvite() {
  if (!inviteMail.value) return
  inviteStatus.value = 'Enviando...'
  try {
    const { data } = await invitarUsuario(props.grupoId, {
      mail: inviteMail.value,
      rol: inviteRol.value
    })
    inviteStatus.value = data.message || 'Invitación enviada con éxito'
    inviteMail.value = ''
    loadGrupo() // recargar miembros si se agregó directo
    setTimeout(() => { inviteStatus.value = '' }, 3000)
  } catch (err) {
    inviteStatus.value = err.response?.data?.error || 'Error al invitar'
  }
}

async function handleRemoveMember(miembro) {
  if (!confirm(`¿Quitar a ${miembro.user.nombre || miembro.user.mail}?`)) return
  try {
    await removeMiembro(props.grupoId, miembro.user.id)
    loadGrupo()
  } catch (err) {
    alert(err.response?.data?.error || 'Error al remover miembro')
  }
}

async function handleChangeRol(miembro, newRol) {
  try {
    await updateRolMiembro(props.grupoId, miembro.user.id, { rol: newRol })
    miembro.rol = newRol
  } catch (err) {
    alert(err.response?.data?.error || 'Error al cambiar rol')
    loadGrupo() // rollback
  }
}

</script>

<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2 class="modal-title">Administración del Grupo</h2>
        <button class="uc-close" @click="$emit('close')">✕</button>
      </div>

      <div v-if="loading" class="state-box">
        <span class="spinner-ring"></span> Cargando grupo...
      </div>
      <div v-else-if="error" class="error-banner">
        ⚠ {{ error }}
      </div>
      <div v-else class="modal-body">
        
        <!-- Info Section -->
        <section class="section">
          <div class="section-header">
            <h3>Detalles</h3>
            <button v-if="isIP && !isEditing" class="btn-text" @click="startEdit">Editar</button>
          </div>
          
          <div v-if="isEditing" class="edit-box">
            <input v-model="editNombre" type="text" class="uc-input" placeholder="Nombre" />
            <textarea v-model="editDesc" class="uc-input" placeholder="Descripción"></textarea>
            <div class="edit-actions">
              <button class="uc-btn-secondary" @click="isEditing = false">Cancelar</button>
              <button class="uc-btn-primary" @click="saveEdit">Guardar</button>
            </div>
          </div>
          <div v-else class="info-box">
            <h4>{{ grupo.nombre }}</h4>
            <p>{{ grupo.descripcion || 'Sin descripción' }}</p>
            <small>Tu rol: <strong>{{ grupo.mi_rol }}</strong></small>
          </div>
        </section>

        <!-- Miembros Section -->
        <section class="section">
          <h3>Miembros ({{ miembros.length }})</h3>
          
          <ul class="member-list">
            <li v-for="m in miembros" :key="m.id" class="member-item">
              <div class="member-info">
                <span class="member-name">{{ m.user.nombre || 'Sin Nombre' }}</span>
                <span class="member-mail">{{ m.user.mail }}</span>
              </div>
              <div class="member-actions">
                <select v-if="isIP && m.user.id !== grupo.created_by?.id" 
                        :value="m.rol" 
                        @change="handleChangeRol(m, $event.target.value)"
                        class="rol-select">
                  <option value="IP">IP</option>
                  <option value="IA">IA</option>
                </select>
                <span v-else class="rol-badge">{{ m.rol }}</span>
                
                <button v-if="isIP && m.user.id !== grupo.created_by?.id" 
                        class="btn-icon" 
                        @click="handleRemoveMember(m)" 
                        title="Quitar">
                  ✕
                </button>
              </div>
            </li>
          </ul>
        </section>

        <!-- Invitar Section -->
        <section v-if="isIP" class="section">
          <h3>Invitar Miembro</h3>
          <div class="invite-row">
            <input v-model="inviteMail" type="email" class="uc-input" placeholder="Email del investigador" />
            <select v-model="inviteRol" class="rol-select">
              <option value="IP">IP</option>
              <option value="IA">IA</option>
            </select>
            <button class="uc-btn-primary" @click="handleInvite" :disabled="!inviteMail">Invitar</button>
          </div>
          <p v-if="inviteStatus" class="invite-status">{{ inviteStatus }}</p>
        </section>

        <!-- Danger Zone -->
        <section v-if="isIP" class="section danger-zone">
          <button class="btn-danger" @click="handleDeleteGrupo">Eliminar Grupo</button>
        </section>

      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; z-index: 3000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(7, 6, 20, 0.8); backdrop-filter: blur(8px);
}
.modal-card {
  width: 100%; max-width: 550px; max-height: 90vh;
  background: #1a1535; border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 20px; display: flex; flex-direction: column;
  overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.6);
  color: #e2e2f0;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; border-bottom: 1px solid rgba(129, 140, 248, 0.15);
}
.modal-title { margin: 0; font-size: 1.2rem; color: #a5b4fc; }
.uc-close { background: none; border: none; color: #90cdf4; font-size: 1.2rem; cursor: pointer; }
.modal-body {
  padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 24px;
}
.section h3 { margin: 0 0 12px 0; font-size: 1.05rem; color: #90cdf4; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-header h3 { margin: 0; }
.btn-text { background: none; border: none; color: #a5b4fc; cursor: pointer; font-size: 0.9rem; }
.btn-text:hover { text-decoration: underline; }

.edit-box { display: flex; flex-direction: column; gap: 10px; }
.edit-actions { display: flex; justify-content: flex-end; gap: 8px; }
.info-box h4 { margin: 0 0 4px 0; font-size: 1.1rem; }
.info-box p { margin: 0 0 8px 0; font-size: 0.9rem; color: rgba(226,226,240,0.7); }

.member-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.member-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: rgba(15, 52, 96, 0.2); border-radius: 10px;
}
.member-info { display: flex; flex-direction: column; }
.member-name { font-weight: 600; font-size: 0.95rem; }
.member-mail { font-size: 0.8rem; color: rgba(226,226,240,0.6); }
.member-actions { display: flex; align-items: center; gap: 8px; }

.rol-badge {
  padding: 2px 8px; background: rgba(129, 140, 248, 0.2);
  border-radius: 12px; font-size: 0.8rem; color: #a5b4fc;
}
.rol-select {
  background: rgba(15, 52, 96, 0.4); border: 1px solid rgba(129, 140, 248, 0.3);
  color: white; border-radius: 6px; padding: 4px;
}
.btn-icon { background: none; border: none; color: #fca5a5; cursor: pointer; padding: 4px; }

.invite-row { display: flex; gap: 8px; }
.invite-row .uc-input { flex: 1; }
.invite-status { margin: 8px 0 0 0; font-size: 0.85rem; color: #10b981; }

.danger-zone { border-top: 1px solid rgba(239, 68, 68, 0.2); padding-top: 16px; margin-top: 8px; text-align: right; }
.btn-danger {
  background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;
}
.btn-danger:hover { background: rgba(239, 68, 68, 0.3); }

/* Common inputs from CampaignSelector but local here */
.uc-input {
  background: rgba(15, 52, 96, 0.2); border: 1px solid rgba(144, 205, 244, 0.2);
  border-radius: 8px; padding: 10px; color: white;
}
.uc-btn-primary {
  background: #3b82f6; border: none; color: white; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;
}
.uc-btn-secondary {
  background: transparent; border: 1px solid rgba(144, 205, 244, 0.3); color: #90cdf4; padding: 10px 16px; border-radius: 8px; cursor: pointer;
}
.spinner-ring {
  display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(144, 205, 244, 0.2);
  border-top-color: #90cdf4; border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
