import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import courseModuleApi from '../../services/courseModuleApi';

// Thunks
export const fetchCourseModules = createAsyncThunk(
  'courseModule/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await courseModuleApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchCourseModuleById = createAsyncThunk(
  'courseModule/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await courseModuleApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createCourseModule = createAsyncThunk(
  'courseModule/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await courseModuleApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateCourseModule = createAsyncThunk(
  'courseModule/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await courseModuleApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteCourseModule = createAsyncThunk(
  'courseModule/delete',
  async (id, { rejectWithValue }) => {
    try {
      await courseModuleApi.delete(id);
      return id;
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

export const courseModuleSlice = createSlice({
  name: 'courseModule',
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
      .addCase(fetchCourseModules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourseModules.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
      })
      .addCase(fetchCourseModules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchCourseModuleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourseModuleById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchCourseModuleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createCourseModule.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createCourseModule.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createCourseModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateCourseModule.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateCourseModule.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.success = true;
      })
      .addCase(updateCourseModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteCourseModule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCourseModule.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteCourseModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = courseModuleSlice.actions;
export default courseModuleSlice.reducer;
