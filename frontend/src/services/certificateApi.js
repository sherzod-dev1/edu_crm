import api from './api';

export const certificateApi = {
  getAll: (params) => api.get('/certificates', { params }),
  getById: (id) => api.get(`/certificates/${id}`),
  create: (data) => api.post('/certificates', data),
  update: (id, data) => api.put(`/certificates/${id}`, data),
  delete: (id) => api.delete(`/certificates/${id}`),
};

export default certificateApi;
