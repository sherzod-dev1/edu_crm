import api from './api';

export const trialLessonApi = {
  getAll: (params) => api.get('/trial-lessons', { params }),
  getById: (id) => api.get(`/trial-lessons/${id}`),
  create: (data) => api.post('/trial-lessons', data),
  update: (id, data) => api.put(`/trial-lessons/${id}`, data),
  delete: (id) => api.delete(`/trial-lessons/${id}`),
};

export default trialLessonApi;
