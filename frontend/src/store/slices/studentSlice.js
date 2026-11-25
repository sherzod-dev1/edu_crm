import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import studentApi from '../../services/studentApi';

// Thunks
export const fetchStudents = createAsyncThunk(
  'student/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await studentApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchStudentById = createAsyncThunk(
  'student/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await studentApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createStudent = createAsyncThunk(
  'student/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await studentApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateStudent = createAsyncThunk(
  'student/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await studentApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteStudent = createAsyncThunk(
  'student/delete',
  async (id, { rejectWithValue }) => {
    try {
      await studentApi.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const searchStudents = createAsyncThunk(
  'student/search',
  async (query, { rejectWithValue }) => {
    try {
      const res = await studentApi.search(query);
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

export const studentSlice = createSlice({
  name: 'student',
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
      .addCase(fetchStudents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchStudentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchStudentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createStudent.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createStudent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateStudent.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.success = true;
      })
      .addCase(updateStudent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteStudent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteStudent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Search
      .addCase(searchStudents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(searchStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = studentSlice.actions;
export default studentSlice.reducer;
