import api from './api';

export const smsApi = {
  send: (data) => api.post('/sms/send', data),
};

export default smsApi;
