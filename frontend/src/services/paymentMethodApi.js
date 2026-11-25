import api from './api';

export const paymentMethodApi = {
  getAll: (params) => api.get('/payment-methods', { params }),
  getById: (id) => api.get(`/payment-methods/${id}`),
  create: (data) => api.post('/payment-methods', data),
  update: (id, data) => api.put(`/payment-methods/${id}`, data),
  delete: (id) => api.delete(`/payment-methods/${id}`),
};

export default paymentMethodApi;
