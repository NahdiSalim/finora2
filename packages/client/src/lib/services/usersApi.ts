import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';
import type {
  User,
  UsersResponse,
  UserByIdResponse,
  CreateUserResponse,
  RoleType,
} from 'src/types/user';

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  role_type: RoleType | null;
  created_at: string;
  updated_at: string;
}

export interface RolesResponse {
  results: Role[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ResidenceType {
  id: string;
  value: string;
  name_en: string;
  name_fr: string;
  name_ar: string;
  created_at: string;
  updated_at: string;
}

export interface Country {
  id: string;
  value: string;
  name_en: string;
  name_fr: string;
  name_ar: string;
  created_at: string;
  updated_at: string;
}

export interface Region {
  id: string;
  value: string;
  name_en: string;
  name_fr: string;
  name_ar: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type GetUsersQueryArg = {
  page?: number;
  limit?: number;
  search?: string;
  clientVerificationStatus?: string;
  isActiveStatus?: string;
};

type PageParam = {
  page: number;
  limit: number;
};

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Users', 'Roles'],
  endpoints: (builder) => ({
    getUsers: builder.query<UsersResponse, GetUsersQueryArg>({
      query: ({ page = 1, limit = 5, search, clientVerificationStatus, isActiveStatus } = {}) => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (search && search.trim()) {
          params.append('search', search.trim());
        }
        if (clientVerificationStatus) {
          params.append('clientVerificationStatus', clientVerificationStatus);
        }
        if (isActiveStatus) {
          params.append('isActiveStatus', isActiveStatus);
        }

        return {
          url: `/auth/all?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Users' as const, id })),
              { type: 'Users', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'Users', id: 'PARTIAL-LIST' }],
    }),

    createUser: builder.mutation<CreateUserResponse, FormData>({
      query: (formData) => ({
        url: '/auth/create',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Users'],
    }),

    updateUser: builder.mutation<CreateUserResponse, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `/auth/update/${id}`,
        method: 'PATCH',
        body: formData,
      }),
      invalidatesTags: ['Users'],
    }),

    getUserById: builder.query<User, string>({
      query: (id) => `/auth/backoffice/${id}`,
      transformResponse: (response: UserByIdResponse) => response.user,
      providesTags: ['Users'],
    }),

    manageUserStatus: builder.mutation<
      void,
      { userId: string; is_active?: boolean; status?: string }
    >({
      query: ({ userId, is_active, status }) => ({
        url: `/auth/${userId}/status`,
        method: 'PATCH',
        body: { is_active, status },
      }),
      invalidatesTags: ['Users'],
    }),

    updateDocumentStatus: builder.mutation<
      void,
      { clientId: string; documentType: string; status: string; rejectionReason?: string }
    >({
      query: ({ clientId, documentType, status, rejectionReason }) => ({
        url: `/auth/update-status`,
        method: 'POST',
        body: {
          clientId,
          documentType,
          status,
          rejectionReason,
        },
      }),
      invalidatesTags: ['Users'],
    }),

    getResidenceTypesForSelect: builder.infiniteQuery<
      PaginatedResponse<ResidenceType>,
      { search?: string },
      PageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: {
          page: 1,
          limit: 10,
        },
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          if (lastPage.page >= lastPage.totalPages) {
            return undefined;
          }
          return {
            ...lastPageParam,
            page: lastPageParam.page + 1,
          };
        },
        getPreviousPageParam: (_firstPage, _allPages, firstPageParam) => {
          if (firstPageParam.page > 1) {
            return {
              ...firstPageParam,
              page: firstPageParam.page - 1,
            };
          }
          return undefined;
        },
      },
      query: ({ pageParam, queryArg }) => {
        const params = new URLSearchParams();
        params.append('page', pageParam.page.toString());
        params.append('limit', pageParam.limit.toString());
        if (queryArg?.search && queryArg.search.trim()) {
          params.append('search', queryArg.search.trim());
        }

        return {
          url: `/residence-types/paginated?${params.toString()}`,
          method: 'GET',
        };
      },
    }),

    getCountriesForSelect: builder.infiniteQuery<
      PaginatedResponse<Country>,
      { search?: string },
      PageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: {
          page: 1,
          limit: 10,
        },
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          if (lastPage.page >= lastPage.totalPages) {
            return undefined;
          }
          return {
            ...lastPageParam,
            page: lastPageParam.page + 1,
          };
        },
        getPreviousPageParam: (_firstPage, _allPages, firstPageParam) => {
          if (firstPageParam.page > 1) {
            return {
              ...firstPageParam,
              page: firstPageParam.page - 1,
            };
          }
          return undefined;
        },
      },
      query: ({ pageParam, queryArg }) => {
        const params = new URLSearchParams();
        params.append('page', pageParam.page.toString());
        params.append('limit', pageParam.limit.toString());
        if (queryArg?.search && queryArg.search.trim()) {
          params.append('search', queryArg.search.trim());
        }

        return {
          url: `/countries/paginated?${params.toString()}`,
          method: 'GET',
        };
      },
    }),

    getRegionsForSelect: builder.infiniteQuery<
      PaginatedResponse<Region>,
      { search?: string },
      PageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: {
          page: 1,
          limit: 10,
        },
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          if (lastPage.page >= lastPage.totalPages) {
            return undefined;
          }
          return {
            ...lastPageParam,
            page: lastPageParam.page + 1,
          };
        },
        getPreviousPageParam: (_firstPage, _allPages, firstPageParam) => {
          if (firstPageParam.page > 1) {
            return {
              ...firstPageParam,
              page: firstPageParam.page - 1,
            };
          }
          return undefined;
        },
      },
      query: ({ pageParam, queryArg }) => {
        const params = new URLSearchParams();
        params.append('page', pageParam.page.toString());
        params.append('limit', pageParam.limit.toString());
        if (queryArg?.search && queryArg.search.trim()) {
          params.append('search', queryArg.search.trim());
        }

        return {
          url: `/regions/paginated?${params.toString()}`,
          method: 'GET',
        };
      },
    }),

    getUsersForSelect: builder.infiniteQuery<
      PaginatedResponse<User>,
      { search?: string },
      PageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: {
          page: 1,
          limit: 10,
        },
        getNextPageParam: (lastPage, _allPages, lastPageParam) => {
          if (lastPage.page >= lastPage.totalPages) {
            return undefined;
          }
          return {
            ...lastPageParam,
            page: lastPageParam.page + 1,
          };
        },
        getPreviousPageParam: (_firstPage, _allPages, firstPageParam) => {
          if (firstPageParam.page > 1) {
            return {
              ...firstPageParam,
              page: firstPageParam.page - 1,
            };
          }
          return undefined;
        },
      },
      query: ({ pageParam, queryArg }) => {
        const params = new URLSearchParams();
        params.append('page', pageParam.page.toString());
        params.append('limit', pageParam.limit.toString());
        if (queryArg?.search && queryArg.search.trim()) {
          params.append('search', queryArg.search.trim());
        }

        return {
          url: `/auth/all?${params.toString()}`,
          method: 'GET',
        };
      },
      transformResponse: (response: UsersResponse): PaginatedResponse<User> => {
        return {
          data: response.data,
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
        };
      },
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetUserByIdQuery,
  useManageUserStatusMutation,
  useUpdateDocumentStatusMutation,
  useGetResidenceTypesForSelectInfiniteQuery,
  useGetCountriesForSelectInfiniteQuery,
  useGetRegionsForSelectInfiniteQuery,
  useGetUsersForSelectInfiniteQuery,
} = usersApi;
