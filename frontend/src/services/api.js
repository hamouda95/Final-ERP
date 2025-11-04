import axios from 'axios';
import { useAuthStore } from '../store';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/token/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  getCurrentUser: () => api.get('/auth/me/'),
  requestPasswordReset: (email) => api.post('/auth/password-reset/', { email }),
  confirmPasswordReset: (data) => api.post('/auth/password-reset-confirm/', data),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products/', { params }),
  getById: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.patch(`/products/${id}/`, data),
  delete: (id) => api.delete(`/products/${id}/`),
  searchByBarcode: (barcode) => api.get(`/products/barcode/${barcode}/`),
};

// Clients API
export const clientsAPI = {
  getAll: (params) => api.get('/clients/', { params }),
  getById: (id) => api.get(`/clients/${id}/`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.patch(`/clients/${id}/`, data),
  delete: (id) => api.delete(`/clients/${id}/`),
  search: (query) => api.get(`/clients/search/?q=${query}`),
};

// Orders API
export const ordersAPI = {
  getAll: (params) => api.get('/orders/', { params }),
  getById: (id) => api.get(`/orders/${id}/`),
  create: (data) => api.post('/orders/', data),
  update: (id, data) => api.patch(`/orders/${id}/`, data),
  delete: (id) => api.delete(`/orders/${id}/`),
};

// Invoices API
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices/', { params }),
  getById: (id) => api.get(`/invoices/${id}/`),
  generatePDF: (id) => api.post(`/invoices/${id}/generate-pdf/`),
  downloadPDF: (id) => api.get(`/invoices/${id}/download/`, { responseType: 'blob' }),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard/'),
  getSalesStats: (params) => api.get('/analytics/sales/', { params }),
  getProductStats: () => api.get('/analytics/products/'),
  getClientStats: () => api.get('/analytics/clients/'),
};

export default api;
