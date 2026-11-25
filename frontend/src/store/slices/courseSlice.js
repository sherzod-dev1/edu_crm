import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import courseApi from '../../services/courseApi';

// Thunks
export const fetchCourses = createAsyncThunk(
  'course/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await courseApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchCourseById = createAsyncThunk(
  'course/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await courseApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createCourse = createAsyncThunk(
  'course/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await courseApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateCourse = createAsyncThunk(
  'course/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await courseApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteCourse = createAsyncThunk(
  'course/delete',
  async (id, { rejectWithValue }) => {
    try {
      await courseApi.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.response?.data || err.message);
    }
  }
);

export const searchCourses = createAsyncThunk(
  'course/search',
  async (query, { rejectWithValue }) => {
    try {
      const res = await courseApi.search(query);
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

export const courseSlice = createSlice({
  name: 'course',
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
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchCourseById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourseById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchCourseById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateCourse.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.success = true;
      })
      .addCase(updateCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => String(item.id) !== String(action.payload));
        if (state.selectedItem && String(state.selectedItem.id) === String(action.payload)) {
          state.selectedItem = null;
        }
      })
      .addCase(deleteCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Search
      .addCase(searchCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchCourses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(searchCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = courseSlice.actions;
export default courseSlice.reducer;
