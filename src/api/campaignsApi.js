// src/api/campaignsApi.js
import { api } from './api'

// Returns { count, campaigns: [...] }
export const getCampaigns = (grupoId = null) => {
  const url = grupoId ? `/api/campaigns/?grupo=${grupoId}` : '/api/campaigns/'
  return api.get(url)
}

// Returns { campaign: { id, title, description, status, date, model_used, image_count } }
export const createCampaign = (payload) =>
  api.post('/api/campaigns/', payload)
