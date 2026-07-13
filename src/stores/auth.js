// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authLogin, authRegister, authMe } from '../api/authApi'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const ready = ref(false) // true once the boot session-restore check is done

  /**
   * On app boot: try to restore an existing session from sessionStorage.
   * Call this once from App.vue (or the top-level component).
   */
  async function init() {
    const token = sessionStorage.getItem('access_token')
    if (!token) {
      ready.value = true
      return
    }
    try {
      const { data } = await authMe()
      user.value = data.user
    } catch {
      sessionStorage.removeItem('access_token')
    } finally {
      ready.value = true
    }
  }

  async function login(email, password) {
    const { data } = await authLogin(email, password)
    sessionStorage.setItem('access_token', data.access_token)
    user.value = data.user
    return data.user
  }

  async function register(name, email, password) {
    const { data } = await authRegister(name, email, password)
    sessionStorage.setItem('access_token', data.access_token)
    user.value = data.user
    return data.user
  }

  function logout() {
    sessionStorage.removeItem('access_token')
    user.value = null
  }

  const isAuthenticated = () => !!user.value

  return { user, ready, init, login, register, logout, isAuthenticated }
})
