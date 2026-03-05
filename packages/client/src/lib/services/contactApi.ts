import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export type SendContactMessagePayload = {
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string;
  visitorCompany?: string;
  subject: string;
  message: string;
};

export type SendContactMessageResponse = {
  success: boolean;
  message: string;
  contactMessageId?: number;
};

export const contactApi = createApi({
  reducerPath: "contactApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    sendContactMessage: builder.mutation<
      SendContactMessageResponse,
      { accountantId: number; body: SendContactMessagePayload }
    >({
      query: ({ accountantId, body }) => ({
        url: `/contact/accountant/${accountantId}`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useSendContactMessageMutation } = contactApi;
