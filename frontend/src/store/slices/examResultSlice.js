import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import examResultApi from '../../services/examResultApi';

// Thunks
export const fetchExamResults = createAsyncThunk(
  'examResult/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await examResultApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchExamResultById = createAsyncThunk(
  'examResult/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await examResultApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createExamResult = createAsyncThunk(
  'examResult/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await examResultApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateExamResult = createAsyncThunk(
  'examResult/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await examResultApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteExamResult = createAsyncThunk(
  'examResult/delete',
  async (id, { rejectWithValue }) => {
    try {
      await examResultApi.delete(id);
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

export const examResultSlice = createSlice({
  name: 'examResult',
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
      .addCase(fetchExamResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExamResults.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
      })
      .addCase(fetchExamResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchExamResultById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExamResultById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchExamResultById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createExamResult.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createExamResult.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createExamResult.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateExamResult.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateExamResult.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.success = true;
      })
      .addCase(updateExamResult.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteExamResult.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExamResult.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteExamResult.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = examResultSlice.actions;
export default examResultSlice.reducer;
