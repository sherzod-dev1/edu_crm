import { STORAGE_KEYS } from '../constants/roles';

export const getAccessToken = () => {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null;
};

export const setAccessToken = (token) => {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }
};

export const getRefreshToken = () => {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null;
};

export const setRefreshToken = (token) => {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }
};

export const getUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }
};

export const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);
};
