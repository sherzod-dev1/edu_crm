import api from './api';

export const paymentApi = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  search: (query) => api.get('/payments/search', { params: { query } }),
};

export default paymentApi;
