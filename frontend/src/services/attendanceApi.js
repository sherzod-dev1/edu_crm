import api from './api';

export const attendanceApi = {
  getAll: (params) => api.get('/attendances', { params }),
  getLiveMonitor: (params) => api.get('/attendances/live-monitor', { params }),
  getById: (id) => api.get(`/attendances/${id}`),
  create: (data) => api.post('/attendances', data),
  update: (id, data) => api.put(`/attendances/${id}`, data),
  delete: (id) => api.delete(`/attendances/${id}`),
};

export default attendanceApi;
