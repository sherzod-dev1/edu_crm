import api from './api';

export const groupStudentApi = {
  getAll: (params) => api.get('/group-students', { params }),
  getById: (id) => api.get(`/group-students/${id}`),
  create: (data) => api.post('/group-students', data),
  update: (id, data) => api.put(`/group-students/${id}`, data),
  delete: (id) => api.delete(`/group-students/${id}`),
};

export default groupStudentApi;
