import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";
import { io } from "socket.io-client";

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
      async onCacheEntryAdded(
        _arg,
        { cacheDataLoaded, cacheEntryRemoved, updateCachedData, dispatch },
      ) {
        await cacheDataLoaded;

        const token = localStorage.getItem("token");
        const apiUrl = import.meta.env.VITE_API_URL ?? "";
        if (!token || !apiUrl) return;

        const origin = new URL(apiUrl).origin;
        const socket = io(`${origin}/notifications`, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: true,
        });

        const onNotification = (payload: any) => {
          if (!payload || payload.id == null) return;
          updateCachedData((draft) => {
            const exists = draft.notifications.some(
              (n) => String(n.id) === String(payload.id),
            );
            if (exists) return;
            draft.notifications.unshift({
              id: Number(payload.id),
              recipientId: Number(payload.recipientId ?? 0),
              type: String(payload.type ?? "notification"),
              title: String(payload.title ?? "Notification"),
              message: String(payload.message ?? ""),
              data: payload.data ?? null,
              read: false,
              createdAt: String(payload.createdAt ?? new Date().toISOString()),
              updatedAt: payload.updatedAt
                ? String(payload.updatedAt)
                : undefined,
            });
            draft.total += 1;
            draft.unreadCount += 1;
          });

          dispatch(
            notificationsApi.util.invalidateTags([
              { type: "Notifications", id: "UNREAD_COUNT" },
            ]),
          );
        };

        const onNotificationUpdate = (payload: any) => {
          if (!payload) return;
          updateCachedData((draft) => {
            if (payload.allRead) {
              draft.notifications = draft.notifications.map((n) => ({
                ...n,
                read: true,
              }));
              draft.unreadCount = 0;
              return;
            }
            if (payload.notificationId != null) {
              const target = draft.notifications.find(
                (n) => String(n.id) === String(payload.notificationId),
              );
              if (target) target.read = !!payload.read;
              draft.unreadCount = draft.notifications.filter(
                (n) => !n.read,
              ).length;
            }
          });
        };

        socket.on("connect", () => {
          socket.emit("subscribe");
        });
        socket.on("notification", onNotification);
        socket.on("notificationUpdate", onNotificationUpdate);

        await cacheEntryRemoved;
        socket.off("notification", onNotification);
        socket.off("notificationUpdate", onNotificationUpdate);
        socket.disconnect();
      },
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
