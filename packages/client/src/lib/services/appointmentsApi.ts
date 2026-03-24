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
  color?: string | null; // ← add this line
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

export interface AvailabilityItem {
  id: number;
  accountantId: number;
  isRecurring: boolean;
  dayOfWeek?: string | null;
  specificDate?: string | null;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

export interface GetMyAvailabilitiesResponse {
  success: boolean;
  data: AvailabilityItem[];
}

export interface AvailableSlotItem {
  id: number;
  availabilityId: number;
  accountantId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: "available" | "booked";
}

export interface GetAvailableSlotsResponse {
  success: boolean;
  data: AvailableSlotItem[];
}

export interface CreateAppointmentBody {
  title: string;
  description?: string;
  type?: "meeting" | "consultation" | "review" | "other";
  startTime?: string;
  endTime?: string;
  date?: string;
  hour?: string;
  meetingType?: "in_person" | "online" | "phone";
  location?: string;
  accountantId?: number;
  clientId?: number;
  clientNotes?: string;
  color?: string;
  guests?: string[];
}

type GetAllAppointmentsParams = {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
};

export const appointmentsApi = createApi({
  reducerPath: "appointmentsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Appointments", "Availabilities"],
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

    createAppointment: builder.mutation<
      { success: boolean; message?: string; data?: AppointmentItem },
      CreateAppointmentBody
    >({
      query: (body) => ({
        url: "/appointments",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Appointments", id: "LIST" }],
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

    getMyAvailabilities: builder.query<
      GetMyAvailabilitiesResponse,
      { onlyActive?: boolean } | void
    >({
      query: (params) => {
        const p = params ?? {};
        const search = new URLSearchParams();
        if (typeof p.onlyActive === "boolean") {
          search.set("onlyActive", String(p.onlyActive));
        }
        const q = search.toString();
        return {
          url: `/appointments/availability/mine${q ? `?${q}` : ""}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((a) => ({
                type: "Availabilities" as const,
                id: a.id,
              })),
              { type: "Availabilities", id: "LIST" },
            ]
          : [{ type: "Availabilities", id: "LIST" }],
    }),

    getAvailableSlots: builder.query<
      GetAvailableSlotsResponse,
      { accountantId: number; date: string }
    >({
      query: ({ accountantId, date }) => {
        const search = new URLSearchParams();
        search.set("accountantId", String(accountantId));
        search.set("date", date);
        return {
          url: `/appointments/slots/available?${search.toString()}`,
          method: "GET",
        };
      },
    }),

    createAvailability: builder.mutation<
      { success: boolean; message?: string; data?: AvailabilityItem },
      {
        isRecurring: boolean;
        dayOfWeek?: string;
        specificDate?: string;
        startTime: string;
        endTime: string;
        slotDuration?: number;
      }
    >({
      query: (body) => ({
        url: "/appointments/availability",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Availabilities", id: "LIST" }],
    }),

    updateAvailability: builder.mutation<
      { success: boolean; message?: string; data?: AvailabilityItem },
      {
        id: number;
        body: {
          startTime?: string;
          endTime?: string;
          slotDuration?: number;
          isActive?: boolean;
        };
      }
    >({
      query: ({ id, body }) => ({
        url: `/appointments/availability/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _err, arg) => [
        { type: "Availabilities", id: arg.id },
        { type: "Availabilities", id: "LIST" },
      ],
    }),

    deleteAvailability: builder.mutation<
      { success: boolean; message?: string },
      number
    >({
      query: (id) => ({
        url: `/appointments/availability/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _err, id) => [
        { type: "Availabilities", id },
        { type: "Availabilities", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetAllAppointmentsQuery,
  useGetAppointmentByIdQuery,
  useCreateAppointmentMutation,
  useRespondAppointmentMutation,
  useUpdateAppointmentMutation,
  useCancelAppointmentMutation,
  useGetMyAvailabilitiesQuery,
  useGetAvailableSlotsQuery,
  useCreateAvailabilityMutation,
  useUpdateAvailabilityMutation,
  useDeleteAvailabilityMutation,
} = appointmentsApi;
