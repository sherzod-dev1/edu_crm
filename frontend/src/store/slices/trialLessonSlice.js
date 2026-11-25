import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import trialLessonApi from '../../services/trialLessonApi';

// Thunks
export const fetchTrialLessons = createAsyncThunk(
  'trialLesson/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await trialLessonApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchTrialLessonById = createAsyncThunk(
  'trialLesson/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await trialLessonApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createTrialLesson = createAsyncThunk(
  'trialLesson/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await trialLessonApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateTrialLesson = createAsyncThunk(
  'trialLesson/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await trialLessonApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteTrialLesson = createAsyncThunk(
  'trialLesson/delete',
  async (id, { rejectWithValue }) => {
    try {
      await trialLessonApi.delete(id);
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

export const trialLessonSlice = createSlice({
  name: 'trialLesson',
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
      .addCase(fetchTrialLessons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrialLessons.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
      })
      .addCase(fetchTrialLessons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchTrialLessonById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrialLessonById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchTrialLessonById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createTrialLesson.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createTrialLesson.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createTrialLesson.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateTrialLesson.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateTrialLesson.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.success = true;
      })
      .addCase(updateTrialLesson.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteTrialLesson.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTrialLesson.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteTrialLesson.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = trialLessonSlice.actions;
export default trialLessonSlice.reducer;
