import api from './api';

export const marketApi = {
  getCatalog: () => api.get('/market/catalog'),
  placeOrder: (data) => api.post('/market/orders', data),
  getStudentOrders: (studentId) => api.get(studentId ? `/market/orders/student/${studentId}` : '/market/orders/student'),
  getAllOrdersForAdmin: (params) => api.get('/market/orders/admin', { params }),
  updateOrderStatus: (id, data) => api.put(`/market/orders/${id}/status`, data),
};

export default marketApi;

