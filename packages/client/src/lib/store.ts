import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { authApi } from "./services/authApi";
import { usersApi } from "./services/usersApi";
import { collaboratorsApi } from "./services/collaboratorsApi";
import { rolesApi } from "./services/roleApi";
import authReducer, { logout } from "./slices/authSlice";
import { clientsApi } from "./services/clientApi";
import { publicAccountantsApi } from "./services/publicAccountantsApi";
import { accountantProfileApi } from "./services/accountantProfileApi";
import { postsApi } from "./services/postsApi";
import { reviewsApi } from "./services/reviewsApi";
import { contactApi } from "./services/contactApi";
import { relationshipsApi } from "./services/relationshipsApi";
import { documentsApi } from "./services/documentsApi";
import { requestApi } from "./services/requestApi";
import { tasksApi } from "./services/tasksApi";
import { invoicesApi } from "./services/invoicesApi";
import { appointmentsApi } from "./services/appointmentsApi";
import { locationApi } from "./services/locationApi";
import { chatApi } from "./services/chatApi";
import { notificationsApi } from "./services/notificationsApi";
import { devisApi } from "./services/devisApi";
import { factureApi } from "./services/factureApi";

const apiMiddlewares = [
  authApi.middleware,
  usersApi.middleware,
  collaboratorsApi.middleware,
  clientsApi.middleware,
  rolesApi.middleware,
  publicAccountantsApi.middleware,
  accountantProfileApi.middleware,
  postsApi.middleware,
  reviewsApi.middleware,
  contactApi.middleware,
  relationshipsApi.middleware,
  documentsApi.middleware,
  requestApi.middleware,
  tasksApi.middleware,
  invoicesApi.middleware,
  appointmentsApi.middleware,
  locationApi.middleware,
  chatApi.middleware,
  notificationsApi.middleware,
  devisApi.middleware,
  factureApi.middleware,
];

const apiResetters = [
  authApi.util.resetApiState,
  usersApi.util.resetApiState,
  collaboratorsApi.util.resetApiState,
  clientsApi.util.resetApiState,
  rolesApi.util.resetApiState,
  publicAccountantsApi.util.resetApiState,
  accountantProfileApi.util.resetApiState,
  postsApi.util.resetApiState,
  contactApi.util.resetApiState,
  relationshipsApi.util.resetApiState,
  documentsApi.util.resetApiState,
  requestApi.util.resetApiState,
  tasksApi.util.resetApiState,
  invoicesApi.util.resetApiState,
  appointmentsApi.util.resetApiState,
  locationApi.util.resetApiState,
  chatApi.util.resetApiState,
  notificationsApi.util.resetApiState,
  devisApi.util.resetApiState,
  factureApi.util.resetApiState,
];

const appReducer = combineReducers({
  auth: authReducer,
  [authApi.reducerPath]: authApi.reducer,
  [usersApi.reducerPath]: usersApi.reducer,
  [clientsApi.reducerPath]: clientsApi.reducer,
  [collaboratorsApi.reducerPath]: collaboratorsApi.reducer,
  [rolesApi.reducerPath]: rolesApi.reducer,
  [publicAccountantsApi.reducerPath]: publicAccountantsApi.reducer,
  [accountantProfileApi.reducerPath]: accountantProfileApi.reducer,
  [postsApi.reducerPath]: postsApi.reducer,
  [reviewsApi.reducerPath]: reviewsApi.reducer,
  [contactApi.reducerPath]: contactApi.reducer,
  [relationshipsApi.reducerPath]: relationshipsApi.reducer,
  [documentsApi.reducerPath]: documentsApi.reducer,
  [requestApi.reducerPath]: requestApi.reducer,
  [tasksApi.reducerPath]: tasksApi.reducer,
  [invoicesApi.reducerPath]: invoicesApi.reducer,
  [appointmentsApi.reducerPath]: appointmentsApi.reducer,
  [locationApi.reducerPath]: locationApi.reducer,
  [chatApi.reducerPath]: chatApi.reducer,
  [notificationsApi.reducerPath]: notificationsApi.reducer,
  [devisApi.reducerPath]: devisApi.reducer,
  [factureApi.reducerPath]: factureApi.reducer,
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
