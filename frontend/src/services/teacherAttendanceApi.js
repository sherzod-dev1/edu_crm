import api from './api';

export const teacherAttendanceApi = {
  getAll: (params) => api.get('/teacher-attendances', { params }),
  getById: (id) => api.get(`/teacher-attendances/${id}`),
  create: (data) => api.post('/teacher-attendances', data),
  bulk: (data) => api.post('/teacher-attendances/bulk', data),
  update: (id, data) => api.put(`/teacher-attendances/${id}`, data),
  delete: (id) => api.delete(`/teacher-attendances/${id}`),
  getStats: (params) => api.get('/teacher-attendances/stats', { params }),
  getPayrollReport: (params) => api.get('/teacher-attendances/payroll-report', { params }),
  cleanupFuture: () => api.post('/teacher-attendances/cleanup-future'),
};

export default teacherAttendanceApi;
