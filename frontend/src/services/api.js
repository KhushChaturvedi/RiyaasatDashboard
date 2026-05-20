import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 120000,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'Network error'
    return Promise.reject(new Error(message))
  }
)

export const salesAPI = {
  getSummary: (params) => api.get('/api/sales/summary', { params }).then((r) => r.data),
  getBrands: (params) => api.get('/api/sales/brands', { params }).then((r) => r.data),
  getSalesmenCompany: (params) => api.get('/api/sales/salesmen/company', { params }).then((r) => r.data),
  getSalesmenBranch: (params) => api.get('/api/sales/salesmen/branch', { params }).then((r) => r.data),
  getDesigns: (params) => api.get('/api/sales/designs', { params }).then((r) => r.data),
  getDepartments: (params) => api.get('/api/sales/departments', { params }).then((r) => r.data),
  getBranches: () => api.get('/api/sales/branches').then((r) => r.data),
  getTargetVsActual: (params) => api.get('/api/sales/target-vs-actual', { params }).then((r) => r.data),
  getTargetDaywise: (params) => api.get('/api/sales/target-daywise', { params }).then((r) => r.data),
}

export const uploadAPI = {
  uploadDump: (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/upload/dump', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }).then((r) => r.data)
  },
  uploadDaily: (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/upload/daily', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }).then((r) => r.data)
  },
  uploadTarget: (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/upload/target', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }).then((r) => r.data)
  },
  uploadFootfall: (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/upload/footfall', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }).then((r) => r.data)
  },
  resetSales: () => api.delete('/api/upload/reset').then((r) => r.data),
  resetTarget: () => api.delete('/api/upload/reset-target').then((r) => r.data),
  resetFootfall: () => api.delete('/api/upload/reset-footfall').then((r) => r.data),
  getStatus: () => api.get('/api/upload/status').then((r) => r.data),
}

export const columnMappingAPI = {
  get: () => api.get('/api/column-mapping').then((r) => r.data),
  save: (mapping) => api.post('/api/column-mapping', { mapping }).then((r) => r.data),
}

export const footfallAPI = {
  getSummary: (params) => api.get('/api/footfall/summary', { params }).then((r) => r.data),
  getMonthlyTrend: (params) => api.get('/api/footfall/monthly-trend', { params }).then((r) => r.data),
  getDaily: (params) => api.get('/api/footfall/daily', { params }).then((r) => r.data),
  getConversion: (params) => api.get('/api/footfall/conversion', { params }).then((r) => r.data),
  getBranches: () => api.get('/api/footfall/branches').then((r) => r.data),
  getAvailableMonths: () => api.get('/api/footfall/available-months').then((r) => r.data),
}

export default api
