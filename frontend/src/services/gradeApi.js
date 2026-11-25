import api from './api';

export const gradeApi = {
  getMyCoins: () => api.get('/grades/my-coins'),
  getGroupGrades: (params) => api.get('/grades/group', { params }),
  saveGrade: (data) => api.post('/grades', data),
  bulkSaveGrades: (data) => api.post('/grades/bulk', data),
  getAllForAdmin: (params) => api.get('/grades/admin', { params }),
  getLeaderboard: () => api.get('/grades/leaderboard'),
  getStudentGrades: (studentId, params) => api.get(studentId ? `/grades/student/${studentId}` : '/grades/student', { params }),
};

export default gradeApi;

