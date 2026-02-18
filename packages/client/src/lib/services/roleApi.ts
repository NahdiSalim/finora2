import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';
import type {
  CreateRolePayload,
  PaginatedActionsResponse,
  PaginatedFeaturesResponse,
  PaginatedPagesResponse,
  RolesResponse,
  PaginatedRoleTypesResponse,
  Role,
  RoleWithPermissions,
  UpdateRolePayload,
} from 'src/types/roles';

type GetRolesQueryArg = {
  page?: number;
  limit?: number;
  search?: string;
};

type RolesPageParam = {
  page: number;
  limit: number;
};

export const rolesApi = createApi({
  reducerPath: 'rolesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Roles', 'RoleTypes', 'Features', 'Pages', 'Actions'],
  endpoints: (builder) => ({
    getRoles: builder.query<RolesResponse, GetRolesQueryArg>({
      query: ({ page = 1, limit = 5, search } = {}) => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (search && search.trim()) {
          params.append('search', search.trim());
        }

        return {
          url: `/roles/all?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.results.map(({ id }) => ({ type: 'Roles' as const, id })),
              { type: 'Roles', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'Roles', id: 'PARTIAL-LIST' }],
    }),

    getRoleById: builder.query<RoleWithPermissions, string>({
      query: (id) => `/roles/${id}`,
      providesTags: ['Roles'],
    }),

    getRolesForSelect: builder.infiniteQuery<RolesResponse, { search?: string }, RolesPageParam>({
      infiniteQueryOptions: {
        initialPageParam: {
          page: 1,
          limit: 5,
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
          url: `/roles/all?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Roles'],
    }),

    getRoleTypes: builder.infiniteQuery<
      PaginatedRoleTypesResponse,
      { search?: string },
      RolesPageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: {
          page: 1,
          limit: 5,
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
      query: ({ pageParam, queryArg }) => ({
        url: '/roles/types',
        params: {
          page: pageParam.page,
          limit: pageParam.limit,
          search: queryArg?.search || '',
        },
      }),
      providesTags: ['RoleTypes'],
    }),

    getFeatures: builder.infiniteQuery<PaginatedFeaturesResponse, void, RolesPageParam>({
      infiniteQueryOptions: {
        initialPageParam: {
          page: 1,
          limit: 5,
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
      query: ({ pageParam }) => ({
        url: '/roles/features',
        params: { page: pageParam.page, limit: pageParam.limit },
      }),
      providesTags: ['Features'],
    }),

    getPagesByFeature: builder.infiniteQuery<
      PaginatedPagesResponse,
      { featureId: string },
      { page: number; limit: number }
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
      query: ({ pageParam, queryArg }) => ({
        url: `/roles/${queryArg.featureId}/pages`,
        params: { page: pageParam.page, limit: pageParam.limit },
      }),
      providesTags: ['Pages'],
    }),

    getActionsByPage: builder.infiniteQuery<
      PaginatedActionsResponse,
      { pageId: string },
      { page: number; limit: number }
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
      query: ({ pageParam, queryArg }) => ({
        url: `/roles/page/${queryArg.pageId}/actions`,
        params: { page: pageParam.page, limit: pageParam.limit },
      }),
      providesTags: ['Actions'],
    }),

    createRole: builder.mutation<Role, CreateRolePayload>({
      query: (data) => ({
        url: '/roles',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Roles'],
    }),

    updateRole: builder.mutation<Role, UpdateRolePayload>({
      query: ({ id, ...data }) => ({
        url: `/roles/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Roles'],
    }),

    deleteRole: builder.mutation<void, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Roles'],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useGetRolesForSelectInfiniteQuery,
  useGetRoleTypesInfiniteQuery,
  useGetFeaturesInfiniteQuery,
  useGetPagesByFeatureInfiniteQuery,
  useGetActionsByPageInfiniteQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = rolesApi;
