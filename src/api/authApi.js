// src/api/authApi.js
import { api } from './api'

export const authRegister = (name, email, password) =>
  api.post('/api/auth/register', { name, email, password })

export const authLogin = (email, password) =>
  api.post('/api/auth/login', { email, password })

export const authMe = () =>
  api.get('/api/auth/me')
