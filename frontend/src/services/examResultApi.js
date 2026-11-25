import api from './api';

export const examResultApi = {
  getAll: (params) => api.get('/exam-results', { params }),
  getById: (id) => api.get(`/exam-results/${id}`),
  create: (data) => api.post('/exam-results', data),
  update: (id, data) => api.put(`/exam-results/${id}`, data),
  delete: (id) => api.delete(`/exam-results/${id}`),
};

export default examResultApi;
