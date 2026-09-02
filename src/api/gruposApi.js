import { api } from './api'

export const getGrupos = () => api.get('/api/grupos/')

export const createGrupo = (data) => api.post('/api/grupos/', data)

export const getGrupo = (id) => api.get(`/api/grupos/${id}/`)

export const updateGrupo = (id, data) => api.put(`/api/grupos/${id}/`, data)

export const deleteGrupo = (id) => api.delete(`/api/grupos/${id}/`)

export const getMiembros = (id) => api.get(`/api/grupos/${id}/members/`)

export const removeMiembro = (id, userId) => api.delete(`/api/grupos/${id}/members/${userId}/`)

export const updateRolMiembro = (id, userId, data) => api.patch(`/api/grupos/${id}/members/${userId}/`, data)

export const invitarUsuario = (id, data) => api.post(`/api/grupos/${id}/invite/`, data)

// Notar que la url es /api/invitations/...
export const acceptInvitacion = (token, data) => api.post(`/api/invitations/${token}/accept/`, data || {})
