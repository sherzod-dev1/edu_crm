import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import paymentMethodApi from '../../services/paymentMethodApi';

// Thunks
export const fetchPaymentMethods = createAsyncThunk(
  'paymentMethod/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await paymentMethodApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchPaymentMethodById = createAsyncThunk(
  'paymentMethod/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await paymentMethodApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createPaymentMethod = createAsyncThunk(
  'paymentMethod/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await paymentMethodApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updatePaymentMethod = createAsyncThunk(
  'paymentMethod/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await paymentMethodApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deletePaymentMethod = createAsyncThunk(
  'paymentMethod/delete',
  async (id, { rejectWithValue }) => {
    try {
      await paymentMethodApi.delete(id);
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

export const paymentMethodSlice = createSlice({
  name: 'paymentMethod',
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
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : action.payload?.data || [];
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchPaymentMethodById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentMethodById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchPaymentMethodById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createPaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createPaymentMethod.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createPaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updatePaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updatePaymentMethod.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        state.success = true;
      })
      .addCase(updatePaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deletePaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePaymentMethod.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deletePaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = paymentMethodSlice.actions;
export default paymentMethodSlice.reducer;
