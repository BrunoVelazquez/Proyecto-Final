<script setup>
import { ref } from 'vue'
import { api } from '../api/api.js'

const emit = defineEmits(['success'])

const mail = ref('brunovelazquez327@gmail.com')
const password = ref('mypassword')
const error = ref('')
const loading = ref(false)

async function doLogin() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.post('/api/auth/login/', {
      mail: mail.value,
      password: password.value
    })
    if (data.token) {
      localStorage.setItem('token', data.token)
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }
      emit('success')
    }
  } catch (err) {
    error.value = err.response?.data?.detail ?? 'Error al iniciar sesión. Verifica tus credenciales.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-backdrop">
    <div class="login-card">
      <div class="login-header">
        <h2>Iniciar Sesión</h2>
        <p>Bienvenido al sistema de análisis de campañas</p>
      </div>

      <div class="login-body">
        <div v-if="error" class="error-banner">
          <span>⚠</span> {{ error }}
        </div>

        <form @submit.prevent="doLogin" class="login-form">
          <div class="field-group">
            <label>Correo Electrónico</label>
            <input type="email" v-model="mail" required class="login-input" placeholder="correo@ejemplo.com" />
          </div>

          <div class="field-group">
            <label>Contraseña</label>
            <input type="password" v-model="password" required class="login-input" placeholder="••••••••" />
          </div>

          <button type="submit" class="login-btn" :disabled="loading">
            <span v-if="loading" class="spinner-ring"></span>
            {{ loading ? 'Iniciando...' : 'Ingresar' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(7, 6, 20, 0.88);
  backdrop-filter: blur(14px);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #1a1535;
  border: 1px solid rgba(144, 205, 244, 0.2);
  border-radius: 20px;
  box-shadow: 0 40px 90px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255,255,255,0.03) inset;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.login-header {
  padding: 32px 32px 20px;
  text-align: center;
  border-bottom: 1px solid rgba(144, 205, 244, 0.12);
}

.login-header h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: #90cdf4;
}

.login-header p {
  margin: 8px 0 0;
  font-size: 0.9rem;
  color: rgba(167,167,220,0.7);
}

.login-body {
  padding: 32px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #e2e8f0;
}

.login-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(15, 52, 96, 0.15);
  border: 1px solid rgba(144, 205, 244, 0.22);
  border-radius: 10px;
  color: #e2e8f0;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.login-input:focus {
  border-color: #90cdf4;
  background: rgba(15, 52, 96, 0.35);
}

.login-btn {
  margin-top: 10px;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  background: #3b82f6;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.login-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.login-btn:disabled {
  background: rgba(59, 130, 246, 0.5);
  cursor: not-allowed;
}

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
  margin-bottom: 20px;
}

.spinner-ring {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
