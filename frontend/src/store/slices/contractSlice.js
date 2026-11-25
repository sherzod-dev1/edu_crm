import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import contractApi from '../../services/contractApi';

// Thunks
export const fetchContracts = createAsyncThunk(
  'contract/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const res = await contractApi.getAll(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchMyContract = createAsyncThunk(
  'contract/fetchMyContract',
  async (_, { rejectWithValue }) => {
    try {
      const res = await contractApi.getMyContract();
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchContractById = createAsyncThunk(
  'contract/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await contractApi.getById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createContract = createAsyncThunk(
  'contract/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await contractApi.create(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateContract = createAsyncThunk(
  'contract/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await contractApi.update(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const renewContract = createAsyncThunk(
  'contract/renew',
  async ({ id, months = 1 }, { rejectWithValue }) => {
    try {
      const res = await contractApi.renew(id, { months });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteContract = createAsyncThunk(
  'contract/delete',
  async (id, { rejectWithValue }) => {
    try {
      await contractApi.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const initialState = {
  items: [],
  myContract: null,
  stats: {
    total: 0,
    active: 0,
    expiring_soon: 0,
    expired: 0,
    total_monthly_revenue: 0,
    standard_price: 1200000,
    premium_price: 1800000,
  },
  selectedItem: null,
  loading: false,
  error: null,
  success: false,
};

export const contractSlice = createSlice({
  name: 'contract',
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
      .addCase(fetchContracts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContracts.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.data) {
          state.items = action.payload.data;
          state.stats = action.payload.stats || state.stats;
        } else {
          state.items = Array.isArray(action.payload) ? action.payload : [];
        }
      })
      .addCase(fetchContracts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch My Contract
      .addCase(fetchMyContract.fulfilled, (state, action) => {
        state.myContract = action.payload;
      })
      // Fetch By Id
      .addCase(fetchContractById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContractById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchContractById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createContract.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createContract.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.success = true;
      })
      .addCase(createContract.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateContract.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateContract.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedItem = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        );
        if (state.myContract?.id === action.payload.id) {
          state.myContract = action.payload;
        }
        state.success = true;
      })
      .addCase(updateContract.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Renew
      .addCase(renewContract.fulfilled, (state, action) => {
        const updated = action.payload.data;
        if (updated) {
          state.items = state.items.map((item) =>
            item.id === updated.id ? updated : item
          );
          if (state.myContract?.id === updated.id) {
            state.myContract = updated;
          }
        }
      })
      // Delete
      .addCase(deleteContract.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      });
  },
});

export const { clearSelectedItem, clearError, clearSuccess } = contractSlice.actions;
export default contractSlice.reducer;
