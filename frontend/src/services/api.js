import axios from 'axios';
import { getAccessToken, clearAuthStorage } from '../utils/helpers/storage';

const resolveBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // If custom URL is explicitly set and not mistakenly left as localhost on a remote server/IP
    if (envUrl && (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') || isLocalhost)) {
      return envUrl;
    }

    // On a remote production domain or IP without custom env URL:
    if (!isLocalhost) {
      // Standard HTTP/HTTPS ports (80/443) behind Nginx reverse proxy
      if (window.location.port === '' || window.location.port === '80' || window.location.port === '443') {
        return '/api/v1';
      }
      // Direct access on server IP with port 5000
      return `${window.location.protocol}//${hostname}:5000/api/v1`;
    }
  }
  return envUrl || 'http://localhost:5000/api/v1';
};

// Active requests tracker for Global Loading indicator
let activeRequestsCount = 0;
const loadingListeners = new Set();

export const subscribeToLoading = (callback) => {
  loadingListeners.add(callback);
  callback(activeRequestsCount > 0, activeRequestsCount);
  return () => loadingListeners.delete(callback);
};

const notifyLoading = (delta) => {
  activeRequestsCount = Math.max(0, activeRequestsCount + delta);
  const isLoading = activeRequestsCount > 0;
  loadingListeners.forEach((fn) => {
    try {
      fn(isLoading, activeRequestsCount);
    } catch (e) {
      console.error(e);
    }
  });
};

const api = axios.create({
  baseURL: resolveBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor — add Bearer token to headers & track loading
api.interceptors.request.use(
  (config) => {
    notifyLoading(1);
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    notifyLoading(-1);
    return Promise.reject(error);
  }
);

// Response interceptor — handle global HTTP errors & finish loading
api.interceptors.response.use(
  (response) => {
    notifyLoading(-1);
    return response;
  },
  (error) => {
    notifyLoading(-1);
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      clearAuthStorage();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
