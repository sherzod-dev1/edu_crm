import api from './api';

export const parentApi = {
  getOverview: () => api.get('/parent/overview'),
  getStudentOverview: (studentId) => api.get(`/parent/student/${studentId}/overview`),
  getParentCredentials: (studentId) => api.get(`/parent/student/${studentId}/credentials`),
  updateParentCredentials: (studentId, data) => api.post(`/parent/student/${studentId}/credentials`, data),
};

export default parentApi;

