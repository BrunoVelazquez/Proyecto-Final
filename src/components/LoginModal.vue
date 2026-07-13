<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const emit = defineEmits(['authenticated'])

const auth = useAuthStore()

// 'login' | 'register'
const mode = ref('login')

const form = ref({
  name: '',
  email: '',
  password: '',
})
const error = ref('')
const errors = ref([])
const loading = ref(false)

const isLogin = computed(() => mode.value === 'login')
const appTitle = import.meta.env.VITE_APP_TITLE || 'CoastSnap'

function switchMode(m) {
  mode.value = m
  error.value = ''
  errors.value = []
  form.value = { name: '', email: '', password: '' }
}

async function handleSubmit() {
  error.value = ''
  errors.value = []
  loading.value = true
  try {
    if (isLogin.value) {
      await auth.login(form.value.email, form.value.password)
    } else {
      await auth.register(form.value.name, form.value.email, form.value.password)
    }
    emit('authenticated')
  } catch (err) {
    const data = err.response?.data
    if (isLogin.value) {
      error.value = data?.error ?? 'Error al iniciar sesión. Verifica tus credenciales.'
    } else {
      errors.value = data?.errors ?? [data?.error ?? 'Error al crear la cuenta.']
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-backdrop">
    <div class="modal-card">
      <!-- Header -->
      <div class="modal-header">
        <h1 class="modal-title">{{ appTitle }}</h1>
        <p class="modal-subtitle">{{ isLogin ? 'Inicia sesión para acceder a tus campañas' : 'Crear una nueva cuenta' }}</p>
      </div>

      <!-- Tab switcher -->
      <div class="tab-row">
        <button
          id="tab-login"
          class="tab-btn"
          :class="{ active: isLogin }"
          @click="switchMode('login')"
        >Iniciar sesión</button>
        <button
          id="tab-register"
          class="tab-btn"
          :class="{ active: !isLogin }"
          @click="switchMode('register')"
        >Registrarse</button>
      </div>

      <!-- Form -->
      <form class="modal-form" @submit.prevent="handleSubmit">
        <!-- Error banners -->
        <div v-if="error" class="error-banner">
          <span class="error-icon">⚠</span> {{ error }}
        </div>
        <div v-if="errors.length" class="error-banner">
          <span class="error-icon">⚠</span>
          <ul class="error-list">
            <li v-for="e in errors" :key="e">{{ e }}</li>
          </ul>
        </div>

        <!-- Name (register only) -->
        <Transition name="field-slide">
          <div v-if="!isLogin" class="field-group">
            <label for="reg-name" class="field-label">Nombre completo</label>
            <div class="input-wrap">
              <span class="input-icon">👤</span>
              <input
                id="reg-name"
                v-model="form.name"
                type="text"
                class="field-input"
                placeholder="ej. Juan Pérez"
                required
                autocomplete="name"
              />
            </div>
          </div>
        </Transition>

        <div class="field-group">
          <label for="auth-email" class="field-label">Correo electrónico</label>
          <div class="input-wrap">
            <span class="input-icon">✉</span>
            <input
              id="auth-email"
              v-model="form.email"
              type="email"
              class="field-input"
              placeholder="tu@correo.com"
              required
              autocomplete="email"
            />
          </div>
        </div>

        <div class="field-group">
          <label for="auth-password" class="field-label">Contraseña</label>
          <div class="input-wrap">
            <span class="input-icon">🔒</span>
            <input
              id="auth-password"
              v-model="form.password"
              type="password"
              class="field-input"
              :placeholder="isLogin ? '••••••••' : 'Mínimo 8 caracteres'"
              required
              :minlength="isLogin ? undefined : 8"
              autocomplete="current-password"
            />
          </div>
        </div>

        <button id="auth-submit" type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="spinner-ring"></span>
          <span v-else>{{ isLogin ? 'Iniciar sesión' : 'Crear cuenta' }}</span>
        </button>
      </form>

      <!-- Footer switch hint -->
      <p class="switch-hint">
        <span v-if="isLogin">¿No tienes una cuenta?</span>
        <span v-else>¿Ya tienes una cuenta?</span>
        <button class="switch-btn" @click="switchMode(isLogin ? 'register' : 'login')">
          {{ isLogin ? 'Regístrate' : 'Inicia sesión' }}
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────── */
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

/* ── Card ─────────────────────────────────────────────── */
.modal-card {
  width: 100%;
  max-width: 420px;
  background: linear-gradient(145deg, #1a1535, #111029);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 24px;
  padding: 36px 36px 28px;
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
}

/* ── Header ───────────────────────────────────────────── */
.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(129, 140, 248, 0.15), rgba(192, 132, 252, 0.15));
  border: 1px solid rgba(129, 140, 248, 0.3);
  margin-bottom: 14px;
}

.modal-title {
  margin: 0 0 6px;
  font-size: 1.6rem;
  font-weight: 700;
  background: linear-gradient(90deg, #a5b4fc, #e879f9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.modal-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(167, 167, 220, 0.7);
}

/* ── Tabs ─────────────────────────────────────────────── */
.tab-row {
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
}

.tab-btn {
  flex: 1;
  padding: 9px 0;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: rgba(144, 205, 244, 0.5);
  font-size: 0.87rem;
  font-weight: 600;
  cursor: pointer;
}

.tab-btn.active {
  background: #0f3460;
  color: #90cdf4;
  border: 1px solid rgba(144, 205, 244, 0.3);
}

/* ── Form ─────────────────────────────────────────────── */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(167, 167, 220, 0.8);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  font-size: 0.95rem;
  pointer-events: none;
  opacity: 0.5;
}

.field-input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(129, 140, 248, 0.18);
  border-radius: 12px;
  color: #e2e2f0;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.field-input::placeholder {
  color: rgba(167, 167, 220, 0.35);
}

.field-input:focus {
  border-color: rgba(129, 140, 248, 0.55);
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.12);
}

/* ── Submit button ────────────────────────────────────── */
.submit-btn {
  width: 100%;
  padding: 13px;
  margin-top: 4px;
  background: #0f3460;
  border: 1px solid rgba(144, 205, 244, 0.3);
  border-radius: 12px;
  color: #90cdf4;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.submit-btn:hover:not(:disabled) {
  background: #1a4a7a;
  color: #bee3f8;
  border-color: rgba(144, 205, 244, 0.5);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Spinner ──────────────────────────────────────────── */
.spinner-ring {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Error banner ─────────────────────────────────────── */
.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  color: #fca5a5;
  font-size: 0.85rem;
  line-height: 1.4;
}

.error-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.error-list {
  margin: 0;
  padding-left: 16px;
}

/* ── Footer switch ────────────────────────────────────── */
.switch-hint {
  margin: 20px 0 0;
  text-align: center;
  font-size: 0.83rem;
  color: rgba(167, 167, 220, 0.55);
}

.switch-btn {
  background: none;
  border: none;
  color: #90cdf4;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  margin-left: 4px;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.switch-btn:hover {
  color: #bee3f8;
}

/* ── Name field slide-in/out transition ───────────────── */
.field-slide-enter-active,
.field-slide-leave-active {
  overflow: hidden;
}
.field-slide-enter-from,
.field-slide-leave-to {
  max-height: 0;
  opacity: 0;
}
.field-slide-enter-to,
.field-slide-leave-from {
  max-height: 80px;
  opacity: 1;
}
</style>
