import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import classroomApi from '../../services/classroomApi';

// Thunks
export const fetchClassrooms = createAsyncThunk(
  'classroom/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await classroomApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchClassroomById = createAsyncThunk(
  'classroom/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await classroomApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createClassroom = createAsyncThunk(
  'classroom/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await classroomApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateClassroom = createAsyncThunk(
  'classroom/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await classroomApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteClassroom = createAsyncThunk(
  'classroom/delete',
  async (id, { rejectWithValue }) => {
    try {
      await classroomApi.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const searchClassrooms = createAsyncThunk(
  'classroom/search',
  async (query, { rejectWithValue }) => {
    try {
      const res = await classroomApi.search(query);
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

export const classroomSlice = createSlice({
  name: 'classroom',
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
      .addCase(fetchClassrooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClassrooms.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
      })
      .addCase(fetchClassrooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchClassroomById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClassroomById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchClassroomById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createClassroom.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createClassroom.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createClassroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateClassroom.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateClassroom.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.success = true;
      })
      .addCase(updateClassroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteClassroom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteClassroom.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteClassroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Search
      .addCase(searchClassrooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchClassrooms.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(searchClassrooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = classroomSlice.actions;
export default classroomSlice.reducer;
