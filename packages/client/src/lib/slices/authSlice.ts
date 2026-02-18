import { createSlice } from '@reduxjs/toolkit';
import { authApi } from '../services/authApi';
import type { User, Feature } from 'src/types/auth';

type AuthState = {
  isAuth: boolean | null;
  user: User | null;
  features: Feature[];
  token: string | null;
  refresh_token: string | null;
};

const initialState: AuthState = {
  isAuth: null,
  user: null,
  features: [],
  token: null,
  refresh_token: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuth = null;
      state.user = null;
      state.features = [];
      state.token = null;
      state.refresh_token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    },
    setTokens: (state, action) => {
      state.token = action.payload.token;
      state.refresh_token = action.payload.refresh_token;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(authApi.endpoints.verifyUser.matchFulfilled, (state, { payload }) => {
      const { features, token, ...userProps } = payload;
      state.user = {
        id: userProps.id,
        email: userProps.email,
        full_name: userProps.full_name,
        sex: userProps.sex,
        dateOfBirth: userProps.dateOfBirth,
        status: userProps.status,
        address: userProps.address,
        phone: userProps.phone,
        is_active: userProps.is_active,
        role: userProps.role,
        organization: userProps.organization,
        documents: userProps.documents,
        is_email_verified: userProps.is_email_verified,
        created_at: userProps.created_at,
        updated_at: userProps.updated_at,
      };
      state.features = features;
      state.token = token;
      state.isAuth = true;
    });
    builder.addMatcher(authApi.endpoints.loginInternal.matchFulfilled, (state, { payload }) => {
      const { features, ...userProps } = payload.user;
      state.user = userProps;
      state.features = features;
      state.token = payload.token.access_token;
      state.refresh_token = payload.token.refresh_token;
      state.isAuth = true;
      localStorage.setItem('token', payload.token.access_token);
      localStorage.setItem('refresh_token', payload.token.refresh_token);
    });
  },
});

export const { logout, setTokens } = authSlice.actions;
export default authSlice.reducer;
