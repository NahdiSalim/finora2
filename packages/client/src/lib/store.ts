import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { authApi } from "./services/authApi";
import { usersApi } from "./services/usersApi";
import { collaboratorsApi } from "./services/collaboratorsApi";

import { rolesApi } from "./services/roleApi";
import authReducer, { logout } from "./slices/authSlice";

const apiMiddlewares = [
  authApi.middleware,
  usersApi.middleware,
  collaboratorsApi.middleware,

  rolesApi.middleware,
];

const apiResetters = [
  authApi.util.resetApiState,
  usersApi.util.resetApiState,
  collaboratorsApi.util.resetApiState,

  rolesApi.util.resetApiState,
];

const appReducer = combineReducers({
  auth: authReducer,
  [authApi.reducerPath]: authApi.reducer,
  [usersApi.reducerPath]: usersApi.reducer,
  [collaboratorsApi.reducerPath]: collaboratorsApi.reducer,
  [rolesApi.reducerPath]: rolesApi.reducer,
});

const baseStore = configureStore({
  reducer: appReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(...apiMiddlewares),
});

export type AppDispatch = typeof baseStore.dispatch;
export type RootState = ReturnType<typeof baseStore.getState>;

const resetApp = () => {
  baseStore.dispatch(logout());

  apiResetters.forEach((reset) => baseStore.dispatch(reset()));
};

export const store = Object.assign(baseStore, { resetApp });
