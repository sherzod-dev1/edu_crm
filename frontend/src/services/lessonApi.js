import api from './api';

export const lessonApi = {
  getAll: (params) => api.get('/lessons', { params }),
  getById: (id) => api.get(`/lessons/${id}`),
  create: (data) => api.post('/lessons', data),
  update: (id, data) => api.put(`/lessons/${id}`, data),
  delete: (id) => api.delete(`/lessons/${id}`),
};

export default lessonApi;
