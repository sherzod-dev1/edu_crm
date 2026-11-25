import api from './api';

export const classroomApi = {
  getAll: (params) => api.get('/classrooms', { params }),
  getById: (id) => api.get(`/classrooms/${id}`),
  create: (data) => api.post('/classrooms', data),
  update: (id, data) => api.put(`/classrooms/${id}`, data),
  delete: (id) => api.delete(`/classrooms/${id}`),
  search: (query) => api.get('/classrooms/search', { params: { query } }),
};

export default classroomApi;
