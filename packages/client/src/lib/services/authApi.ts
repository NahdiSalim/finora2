import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  LoginInternalRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyUserResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterResponse,
  RegisterRequest,
} from "src/types/auth";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Auth"],
  endpoints: (builder) => ({
    loginInternal: builder.mutation<LoginResponse, LoginInternalRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),
    forgotPassword: builder.mutation<
      ForgotPasswordResponse,
      ForgotPasswordRequest
    >({
      query: (data) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: data,
      }),
    }),
    resetPassword: builder.mutation<
      ResetPasswordResponse,
      ResetPasswordRequest
    >({
      query: (data) => ({
        url: `/auth/reset-password/${data.token}`,
        method: "POST",
        body: data,
      }),
    }),
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (data) => ({
        url: "/auth/register/client",
        method: "POST",
        body: data,
      }),
    }),

    registerAccountant: builder.mutation({
      query: (formData: FormData) => ({
        url: "/auth/register/accountant",
        method: "POST",
        body: formData,
      }),
    }),
    verifyUser: builder.query<VerifyUserResponse, void>({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
      providesTags: ["Auth"],
    }),
    refreshToken: builder.mutation<RefreshTokenResponse, RefreshTokenRequest>({
      query: (data) => ({
        url: "/auth/refresh-token",
        method: "POST",
        body: data,
        headers: {
          Authorization: "",
        },
      }),
    }),
  }),
});

export const {
  useLoginInternalMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyUserQuery,
  useRegisterMutation,
  useRegisterAccountantMutation,
  useRefreshTokenMutation,
} = authApi;
