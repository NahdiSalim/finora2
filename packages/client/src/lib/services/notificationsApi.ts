import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export interface NotificationDto {
  id: number;
  recipientId: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface GetNotificationsResponse {
  notifications: NotificationDto[];
  total: number;
  unreadCount: number;
}

export const notificationsApi = createApi({
  reducerPath: "notificationsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Notifications"],
  endpoints: (builder) => ({
    getNotifications: builder.query<
      GetNotificationsResponse,
      { limit?: number; offset?: number } | void
    >({
      query: (params) => {
        const safeParams = params ?? {};
        const search = new URLSearchParams();
        if (safeParams.limit != null)
          search.set("limit", String(safeParams.limit));
        if (safeParams.offset != null)
          search.set("offset", String(safeParams.offset));
        const qs = search.toString();
        return {
          url: `/notifications${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      providesTags: [{ type: "Notifications", id: "LIST" }],
    }),

    getUnreadNotificationsCount: builder.query<{ unreadCount: number }, void>({
      query: () => ({
        url: "/notifications/unread-count",
        method: "GET",
      }),
      providesTags: [{ type: "Notifications", id: "UNREAD_COUNT" }],
    }),

    markNotificationAsRead: builder.mutation<unknown, number>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: [
        { type: "Notifications", id: "LIST" },
        { type: "Notifications", id: "UNREAD_COUNT" },
      ],
    }),

    markAllNotificationsAsRead: builder.mutation<unknown, void>({
      query: () => ({
        url: "/notifications/mark-all-read",
        method: "POST",
      }),
      invalidatesTags: [
        { type: "Notifications", id: "LIST" },
        { type: "Notifications", id: "UNREAD_COUNT" },
      ],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = notificationsApi;
