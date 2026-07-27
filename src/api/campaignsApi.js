// src/api/campaignsApi.js
import { api } from './api'

// Returns { count, campaigns: [...] }
export const getCampaigns = () =>
  api.get('/api/campaigns/')

// Returns { campaign: { id, title, description, status, date, model_used, image_count } }
export const createCampaign = (payload) =>
  api.post('/api/campaigns/', payload)
