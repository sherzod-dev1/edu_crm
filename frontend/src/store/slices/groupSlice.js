import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import groupApi from '../../services/groupApi';

// Thunks
export const fetchGroups = createAsyncThunk(
  'group/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await groupApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchGroupById = createAsyncThunk(
  'group/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await groupApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createGroup = createAsyncThunk(
  'group/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await groupApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateGroup = createAsyncThunk(
  'group/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await groupApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteGroup = createAsyncThunk(
  'group/delete',
  async (id, { rejectWithValue }) => {
    try {
      await groupApi.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.response?.data || err.message);
    }
  }
);

export const searchGroups = createAsyncThunk(
  'group/search',
  async (query, { rejectWithValue }) => {
    try {
      const res = await groupApi.search(query);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const initialState = {
  items: [],
  selectedItem: null,
  loading: false,
  error: null,
  success: false,
};

export const groupSlice = createSlice({
  name: 'group',
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
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchGroupById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchGroupById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.success = true;
      })
      .addCase(updateGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => String(item.id) !== String(action.payload));
        if (state.selectedItem && String(state.selectedItem.id) === String(action.payload)) {
          state.selectedItem = null;
        }
      })
      .addCase(deleteGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Search
      .addCase(searchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(searchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = groupSlice.actions;
export default groupSlice.reducer;
