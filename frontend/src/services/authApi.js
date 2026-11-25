import api from './api';

export const authApi = {
  login: (credentials) => api.post('/users/login', credentials),
  register: (userData) => api.post('/users', userData),
  getProfile: (id) => api.get(`/users/${id}`),
};

export default authApi;
