import api from './api';

const contractApi = {
  getAll: (params) => api.get('/contracts', { params }),
  getById: (id) => api.get(`/contracts/${id}`),
  getMyContract: () => api.get('/contracts/my'),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  renew: (id, data) => api.post(`/contracts/${id}/renew`, data),
  delete: (id) => api.delete(`/contracts/${id}`),
};

export default contractApi;
