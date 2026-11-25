import api from './api';

export const notificationApi = {
  getAll: (params) => api.get('/notifications', { params }),
  getById: (id) => api.get(`/notifications/${id}`),
  create: (data) => api.post('/notifications', data),
  update: (id, data) => api.put(`/notifications/${id}`, data),
  delete: (id) => api.delete(`/notifications/${id}`),
  markAllAsRead: (data) => api.patch('/notifications/read-all', typeof data === 'object' ? data : { userId: data }),
  clearAll: (data) => api.delete('/notifications/clear-all', { data: typeof data === 'object' ? data : { userId: data } }),
};

export default notificationApi;
