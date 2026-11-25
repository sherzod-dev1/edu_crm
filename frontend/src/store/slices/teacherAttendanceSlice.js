import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import teacherAttendanceApi from '../../services/teacherAttendanceApi';

// Thunks
export const fetchTeacherAttendances = createAsyncThunk(
  'teacherAttendance/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await teacherAttendanceApi.getAll(params);
      return res.data?.data || res.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const saveTeacherAttendance = createAsyncThunk(
  'teacherAttendance/save',
  async (data, { rejectWithValue }) => {
    try {
      const res = await teacherAttendanceApi.create(data);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const bulkSaveTeacherAttendance = createAsyncThunk(
  'teacherAttendance/bulkSave',
  async ({ items, meta }, { rejectWithValue }) => {
    try {
      const res = await teacherAttendanceApi.bulk({ items, meta });
      return res.data?.data || res.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchTeacherAttendanceStats = createAsyncThunk(
  'teacherAttendance/fetchStats',
  async (params, { rejectWithValue }) => {
    try {
      const res = await teacherAttendanceApi.getStats(params);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteTeacherAttendance = createAsyncThunk(
  'teacherAttendance/delete',
  async (id, { rejectWithValue }) => {
    try {
      await teacherAttendanceApi.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const initialState = {
  items: [],
  stats: null,
  loading: false,
  saving: false,
  error: null,
};

const teacherAttendanceSlice = createSlice({
  name: 'teacherAttendance',
  initialState,
  reducers: {
    clearTeacherAttendanceError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTeacherAttendances
      .addCase(fetchTeacherAttendances.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeacherAttendances.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTeacherAttendances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // saveTeacherAttendance
      .addCase(saveTeacherAttendance.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveTeacherAttendance.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        } else {
          state.items.unshift(action.payload);
        }
      })
      .addCase(saveTeacherAttendance.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // bulkSaveTeacherAttendance
      .addCase(bulkSaveTeacherAttendance.pending, (state) => {
        state.saving = true;
      })
      .addCase(bulkSaveTeacherAttendance.fulfilled, (state, action) => {
        state.saving = false;
        const updatedList = [...state.items];
        (action.payload || []).forEach((savedItem) => {
          const idx = updatedList.findIndex(
            (i) => i.id === savedItem.id || (i.teacher_id === savedItem.teacher_id && i.date === savedItem.date)
          );
          if (idx !== -1) {
            updatedList[idx] = savedItem;
          } else {
            updatedList.push(savedItem);
          }
        });
        state.items = updatedList;
      })
      .addCase(bulkSaveTeacherAttendance.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // fetchTeacherAttendanceStats
      .addCase(fetchTeacherAttendanceStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })

      // deleteTeacherAttendance
      .addCase(deleteTeacherAttendance.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      });
  },
});

export const { clearTeacherAttendanceError } = teacherAttendanceSlice.actions;
export default teacherAttendanceSlice.reducer;
