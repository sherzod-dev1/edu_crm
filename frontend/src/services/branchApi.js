import api from './api';

export const branchApi = {
  getAll: (params) => api.get('/branches', { params }),
  getById: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
  search: (query) => api.get('/branches/search', { params: { query } }),
};

export default branchApi;
