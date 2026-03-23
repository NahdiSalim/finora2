import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "rejected"
  | "cancelled"
  | "completed";

export interface AppointmentUser {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  username?: string | null;
}

export interface AppointmentItem {
  id: number;
  title: string;
  description?: string | null;
  status: AppointmentStatus;
  startTime: string;
  endTime: string;
  duration: number;
  meetingType: "in_person" | "online" | "phone";
  location?: string | null;
  rejectionReason?: string | null;
  accountantNotes?: string | null;
  clientNotes?: string | null;
  minutesFileName?: string | null;
  minutesFileSizeKb?: number | null;
  minutesFileUrl?: string | null;
  client?: AppointmentUser;
  accountant?: AppointmentUser;
}

export interface GetAllAppointmentsResponse {
  success: boolean;
  data: AppointmentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts?: Partial<Record<AppointmentStatus, number>>;
}

export interface GetAppointmentByIdResponse {
  success: boolean;
  data: AppointmentItem;
}

type GetAllAppointmentsParams = {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
};

export const appointmentsApi = createApi({
  reducerPath: "appointmentsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Appointments"],
  endpoints: (builder) => ({
    getAllAppointments: builder.query<
      GetAllAppointmentsResponse,
      GetAllAppointmentsParams | void
    >({
      query: (params) => {
        const p: GetAllAppointmentsParams = params ?? {};
        const search = new URLSearchParams();
        if (p.page) search.set("page", String(p.page));
        if (p.limit) search.set("limit", String(p.limit));
        if (p.status) search.set("status", p.status);
        return { url: `/appointments/all?${search.toString()}`, method: "GET" };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((a) => ({
                type: "Appointments" as const,
                id: a.id,
              })),
              { type: "Appointments", id: "LIST" },
            ]
          : [{ type: "Appointments", id: "LIST" }],
    }),

    getAppointmentById: builder.query<GetAppointmentByIdResponse, number>({
      query: (id) => ({ url: `/appointments/${id}`, method: "GET" }),
      providesTags: (_result, _err, id) => [{ type: "Appointments", id }],
    }),

    respondAppointment: builder.mutation<
      { success: boolean; message?: string; data?: AppointmentItem },
      {
        id: number;
        action: "confirm" | "reject";
        notes?: string;
        rejectionReason?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/appointments/${id}/respond`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _err, arg) => [
        { type: "Appointments", id: arg.id },
        { type: "Appointments", id: "LIST" },
      ],
    }),

    updateAppointment: builder.mutation<
      { success: boolean; message?: string; data?: AppointmentItem },
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/appointments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _err, arg) => [
        { type: "Appointments", id: arg.id },
        { type: "Appointments", id: "LIST" },
      ],
    }),

    cancelAppointment: builder.mutation<
      { success: boolean; message?: string },
      number
    >({
      query: (id) => ({ url: `/appointments/${id}/cancel`, method: "POST" }),
      invalidatesTags: (_result, _err, id) => [
        { type: "Appointments", id },
        { type: "Appointments", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetAllAppointmentsQuery,
  useGetAppointmentByIdQuery,
  useRespondAppointmentMutation,
  useUpdateAppointmentMutation,
  useCancelAppointmentMutation,
} = appointmentsApi;
