import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  getHealth: () => apiClient.get('/health').then(res => res.data),
  
  getNetwork: () => apiClient.get('/network').then(res => res.data),
  
  getVehicles: () => apiClient.get('/vehicles').then(res => res.data),
  
  getDemandForecast: () => apiClient.get('/demand-forecast').then(res => res.data),
  
  getCarbonIntensity: () => apiClient.get('/carbon-intensity').then(res => res.data),
  
  optimizeRoute: (payload) => apiClient.post('/optimize', payload).then(res => res.data),
  
  optimizeRouteV1: (payload) => apiClient.post('/v1/route-data', payload).then(res => res.data),

  optimizeFast: (payload) => apiClient.post('/optimize/fast', payload).then(res => res.data),

  getContracts: () => apiClient.get('/contracts').then(res => res.data),

  addContract: (payload) => apiClient.post('/contracts', payload).then(res => res.data),

  deleteContract: (id) => apiClient.delete(`/contracts/${id}`).then(res => res.data),

  searchPlaces: (query, limit = 8) => apiClient.get('/geocode/suggest', { params: { q: query, limit } })
    .then(res => res.data.results),

  reverseGeocode: (lat, lng) => apiClient.get('/geocode/reverse', { params: { lat, lng } })
    .then(res => res.data),
};

export default api;
