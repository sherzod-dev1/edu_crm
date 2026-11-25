import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import groupStudentApi from '../../services/groupStudentApi';

// Thunks
export const fetchGroupStudents = createAsyncThunk(
  'groupStudent/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await groupStudentApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchGroupStudentById = createAsyncThunk(
  'groupStudent/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await groupStudentApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createGroupStudent = createAsyncThunk(
  'groupStudent/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await groupStudentApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateGroupStudent = createAsyncThunk(
  'groupStudent/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await groupStudentApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteGroupStudent = createAsyncThunk(
  'groupStudent/delete',
  async (id, { rejectWithValue }) => {
    try {
      await groupStudentApi.delete(id);
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

export const groupStudentSlice = createSlice({
  name: 'groupStudent',
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
      .addCase(fetchGroupStudents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
      })
      .addCase(fetchGroupStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchGroupStudentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupStudentById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchGroupStudentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createGroupStudent.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createGroupStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createGroupStudent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateGroupStudent.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateGroupStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.success = true;
      })
      .addCase(updateGroupStudent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteGroupStudent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteGroupStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteGroupStudent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = groupStudentSlice.actions;
export default groupStudentSlice.reducer;
