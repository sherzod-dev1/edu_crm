import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationApi from '../../services/notificationApi';

// Thunks
export const fetchNotifications = createAsyncThunk(
  'notification/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await notificationApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchNotificationById = createAsyncThunk(
  'notification/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await notificationApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createNotification = createAsyncThunk(
  'notification/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await notificationApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateNotification = createAsyncThunk(
  'notification/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await notificationApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notification/delete',
  async (id) => {
    try {
      await notificationApi.delete(id);
    } catch (err) {
      console.warn("Delete notification backend warning:", err?.message || err);
    }
    return id;
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notification/markAllRead',
  async (payload) => {
    try {
      const res = await notificationApi.markAllAsRead(payload);
      return res.data;
    } catch (err) {
      console.warn("markAllNotificationsRead warning:", err?.message || err);
      return { success: true };
    }
  }
);

export const clearAllNotifications = createAsyncThunk(
  'notification/clearAll',
  async (payload) => {
    try {
      await notificationApi.clearAll(payload);
    } catch (err) {
      console.warn("Clear all notifications backend warning:", err?.message || err);
    }
    return [];
  }
);

const initialState = {
  items: [],
  selectedItem: null,
  loading: false,
  error: null,
  success: false,
};

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    clearSelectedItem: (state) => {
      state.selectedItem = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchNotificationById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotificationById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchNotificationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createNotification.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateNotification.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          String(item.id) === String(action.payload?.id) ? { ...item, ...action.payload } : item
        );
        state.success = true;
      })
      .addCase(updateNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => String(item.id) !== String(action.payload));
        if (state.selectedItem && String(state.selectedItem.id) === String(action.payload)) {
          state.selectedItem = null;
        }
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark All Read
      .addCase(markAllNotificationsRead.fulfilled, (state, action) => {
        state.loading = false;
        const targetIds = action.meta?.arg?.ids;
        if (Array.isArray(targetIds) && targetIds.length > 0) {
          const idSet = new Set(targetIds.map(String));
          state.items = state.items.map((item) =>
            idSet.has(String(item.id)) ? { ...item, is_read: true } : item
          );
        } else {
          state.items = state.items.map((item) => ({ ...item, is_read: true }));
        }
      })
      // Clear All
      .addCase(clearAllNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const targetIds = action.meta?.arg?.ids;
        if (Array.isArray(targetIds) && targetIds.length > 0) {
          const idSet = new Set(targetIds.map(String));
          state.items = state.items.filter((item) => !idSet.has(String(item.id)));
        } else {
          state.items = [];
        }
        state.selectedItem = null;
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = notificationSlice.actions;
export default notificationSlice.reducer;
