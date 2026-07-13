// src/api/campaignsApi.js
import { api } from './api'

// Returns { count, campaigns: [...] }
// Token is injected automatically by the interceptor.
export const getCampaigns = () =>
  api.get('/api/campaigns/')
