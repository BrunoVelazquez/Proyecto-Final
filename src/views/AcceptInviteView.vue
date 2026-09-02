<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { acceptInvitacion } from '../api/gruposApi'

const route = useRoute()
const router = useRouter()
const token = route.params.token

const status = ref('pending') // pending, success, error
const errorMessage = ref('')

const nombre = ref('')
const password = ref('')

// If user is already logged in, we can try to accept it directly
onMounted(async () => {
  const userToken = localStorage.getItem('token')
  if (userToken) {
    try {
      await acceptInvitacion(token)
      status.value = 'success'
      setTimeout(() => router.push('/'), 2000)
    } catch (e) {
      // If error is 400 bad request, it might need name/password (user not registered)
      // but they are logged in... edge case.
      status.value = 'error'
      errorMessage.value = e.response?.data?.error || 'Error al aceptar invitación'
    }
  } else {
    // We stay in pending, prompt user for name/pass if needed
  }
})

async function submitAccept() {
  try {
    const payload = {}
    if (nombre.value) payload.nombre = nombre.value
    if (password.value) payload.password = password.value
    
    const res = await acceptInvitacion(token, payload)
    
    // Si la API nos devuelve un token (ej. se registró / logueó), lo guardamos
    if (res.data.token) {
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user || {}))
    }
    
    status.value = 'success'
    setTimeout(() => router.push('/'), 2000)
  } catch (e) {
    status.value = 'error'
    errorMessage.value = e.response?.data?.error || e.response?.data?.detail || 'Error al aceptar invitación'
  }
}
</script>

<template>
  <div class="invite-container">
    <div class="invite-card">
      <div v-if="status === 'success'" class="success-box">
        <h2>¡Invitación Aceptada!</h2>
        <p>Redirigiendo a tus campañas...</p>
      </div>

      <div v-else-if="status === 'error'" class="error-box">
        <h2>Oops</h2>
        <p>{{ errorMessage }}</p>
        <button class="btn-primary" @click="router.push('/')">Volver al inicio</button>
      </div>

      <div v-else class="form-box">
        <h2>Aceptar Invitación</h2>
        <p>Estás a punto de unirte al grupo de investigación.</p>
        <div class="field">
          <label>Nombre (Opcional si ya tienes cuenta)</label>
          <input v-model="nombre" type="text" placeholder="Tu nombre" />
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input v-model="password" type="password" placeholder="Ingresa tu contraseña (o crea una)" />
        </div>
        <button class="btn-primary" @click="submitAccept">Unirme al Grupo</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invite-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #0f172a;
}
.invite-card {
  background: #1e293b;
  padding: 40px;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  color: white;
  text-align: center;
}
.form-box, .success-box, .error-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 8px;
}
input {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0f172a;
  color: white;
}
.btn-primary {
  padding: 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
.btn-primary:hover {
  background: #2563eb;
}
.error-box p {
  color: #ef4444;
}
.success-box p {
  color: #10b981;
}
</style>
