import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authApi from '../../services/authApi';
import {
  getAccessToken,
  setAccessToken,
  setRefreshToken,
  getUser,
  setUser,
  clearAuthStorage,
} from '../../utils/helpers/storage';

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      const data = response.data;
      if (data.accessToken) {
        setAccessToken(data.accessToken);
      }
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      if (data.user) {
        setUser(data.user);
      }
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.response?.data || 'Kirishda xatolik yuz berdi'
      );
    }
  }
);

const initialState = {
  user: getUser(),
  token: getAccessToken(),
  isAuthenticated: !!getAccessToken(),
  loading: false,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      clearAuthStorage();
    },
    updateCurrentUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      setUser(state.user);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError, updateCurrentUser } = authSlice.actions;
export default authSlice.reducer;
