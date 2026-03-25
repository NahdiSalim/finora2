import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export interface TaskUser {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface TaskComment {
  id: string;
  userId: number;
  username: string;
  comment: string;
  attachments: string[];
  createdAt: string;
  user?: TaskUser;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  type: "accounting" | "review" | "meeting" | "document" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status:
    | "todo"
    | "in_progress"
    | "in_review"
    | "completed"
    | "cancelled"
    | "archived";
  dueDate: string | null;
  progress: number;
  order: number;
  assigneeId: number;
  assignee: TaskUser;
  createdById: number;
  createdBy: TaskUser;
  clientId: number | null;
  client: TaskUser | null;
  companyId: number | null;
  company: {
    id: number;
    name: string;
  } | null;
  attachments: string[];
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface GetTasksResponse {
  success: boolean;
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts?: {
    todo: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  type?: "accounting" | "review" | "meeting" | "document" | "other";
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  assigneeIds: number[];
  clientId?: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  type?: "accounting" | "review" | "meeting" | "document" | "other";
  priority?: "low" | "medium" | "high" | "urgent";
  status?:
    | "todo"
    | "in_progress"
    | "in_review"
    | "completed"
    | "cancelled"
    | "archived";
  dueDate?: string;
  assigneeId?: number;
  addCollaborators?: number[];
  progress?: number;
}

export interface AddCommentDto {
  comment: string;
}

export interface ReorderTasksDto {
  tasks: { id: number; order: number }[];
  status?: string;
}

export const tasksApi = createApi({
  reducerPath: "tasksApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Tasks", "Task"],
  endpoints: (builder) => ({
    // Get tasks created by me (Accountant)
    getMyCreatedTasks: builder.query<
      GetTasksResponse,
      {
        page?: number;
        limit?: number;
        status?: string;
      }
    >({
      query: ({ page = 1, limit = 100, status } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (status) params.append("status", status);

        return {
          url: `/tasks/my-created-tasks?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Task" as const,
                id,
              })),
              { type: "Tasks", id: "MY_CREATED_LIST" },
            ]
          : [{ type: "Tasks", id: "MY_CREATED_LIST" }],
    }),

    // Get my assigned tasks (Collaborator)
    getMyTasks: builder.query<
      GetTasksResponse,
      {
        page?: number;
        limit?: number;
        status?: string;
        priority?: string;
        sortBy?: "priority" | "dueDate" | "createdAt";
      }
    >({
      query: ({
        page = 1,
        limit = 100,
        status,
        priority,
        sortBy = "dueDate",
      } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (status) params.append("status", status);
        if (priority) params.append("priority", priority);
        params.append("sortBy", sortBy);

        return {
          url: `/tasks/my-tasks?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Task" as const,
                id,
              })),
              { type: "Tasks", id: "MY_ASSIGNED_LIST" },
            ]
          : [{ type: "Tasks", id: "MY_ASSIGNED_LIST" }],
    }),

    // Get task by ID
    getTaskById: builder.query<{ success: boolean; data: Task }, number>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Task", id }],
    }),

    // Create task (with file uploads)
    createTask: builder.mutation<
      { success: boolean; message: string; data: Task | Task[] },
      FormData
    >({
      query: (formData) => ({
        url: "/tasks",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "Tasks", id: "MY_CREATED_LIST" }],
    }),

    // Update task (with file uploads)
    updateTask: builder.mutation<
      { success: boolean; message: string; data: Task },
      { id: number; data: FormData }
    >({
      query: ({ id, data }) => ({
        url: `/tasks/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Task", id },
        { type: "Tasks", id: "MY_CREATED_LIST" },
        { type: "Tasks", id: "MY_ASSIGNED_LIST" },
      ],
    }),

    // Start task (mark as in progress)
    startTask: builder.mutation<
      { success: boolean; message: string; data: Task },
      number
    >({
      query: (id) => ({
        url: `/tasks/${id}/start`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Task", id },
        { type: "Tasks", id: "MY_CREATED_LIST" },
        { type: "Tasks", id: "MY_ASSIGNED_LIST" },
      ],
    }),

    // Submit task for review (Collaborator)
    submitForReview: builder.mutation<
      { success: boolean; message: string; data: Task },
      number
    >({
      query: (id) => ({
        url: `/tasks/${id}/review`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Task", id },
        { type: "Tasks", id: "MY_CREATED_LIST" },
        { type: "Tasks", id: "MY_ASSIGNED_LIST" },
      ],
    }),

    // Complete task (Accountant only)
    completeTask: builder.mutation<
      { success: boolean; message: string; data: Task },
      number
    >({
      query: (id) => ({
        url: `/tasks/${id}/complete`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Task", id },
        { type: "Tasks", id: "MY_CREATED_LIST" },
        { type: "Tasks", id: "MY_ASSIGNED_LIST" },
      ],
    }),

    // Archive task (Accountant only)
    archiveTask: builder.mutation<
      { success: boolean; message: string; data: Task },
      number
    >({
      query: (id) => ({
        url: `/tasks/${id}/archive`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Task", id },
        { type: "Tasks", id: "MY_CREATED_LIST" },
        { type: "Tasks", id: "MY_ASSIGNED_LIST" },
      ],
    }),

    // Add comment to task
    addComment: builder.mutation<
      { success: boolean; message: string; data: TaskComment },
      { id: number; data: FormData }
    >({
      query: ({ id, data }) => ({
        url: `/tasks/${id}/comments`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Task", id }],
    }),

    // Delete task
    deleteTask: builder.mutation<{ success: boolean; message: string }, number>(
      {
        query: (id) => ({
          url: `/tasks/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: (result, error, id) => [
          { type: "Task", id },
          { type: "Tasks", id: "MY_CREATED_LIST" },
        ],
      },
    ),

    // Reorder tasks (drag & drop)
    reorderTasks: builder.mutation<
      { success: boolean; message: string },
      ReorderTasksDto
    >({
      query: (dto) => ({
        url: "/tasks/reorder/bulk",
        method: "PUT",
        body: dto,
      }),
      invalidatesTags: [
        { type: "Tasks", id: "MY_CREATED_LIST" },
        { type: "Tasks", id: "MY_ASSIGNED_LIST" },
      ],
    }),
  }),
});

export const {
  useGetMyCreatedTasksQuery,
  useGetMyTasksQuery,
  useGetTaskByIdQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useStartTaskMutation,
  useSubmitForReviewMutation,
  useCompleteTaskMutation,
  useArchiveTaskMutation,
  useAddCommentMutation,
  useDeleteTaskMutation,
  useReorderTasksMutation,
} = tasksApi;
