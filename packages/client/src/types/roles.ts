export interface RoleType {
  id: string;
  code: string;
  name: string;
  allows_custom_permissions: boolean;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  role_type: RoleType;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions {
  role: Role;
  features: Feature[];
}

export interface Action {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
  selected?: boolean;
}

export interface Page {
  id: string;
  name: string;
  path: string;
  actions: Action[];
  created_at: string;
  updated_at: string;
  selected?: boolean;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  pages: Page[];
  created_at: string;
  updated_at: string;
  selected?: boolean;
}

export interface RolesResponse {
  results: Role[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedRoleTypesResponse {
  results: RoleType[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedFeaturesResponse {
  results: Feature[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedPagesResponse {
  pages: Page[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedActionsResponse {
  actions: Action[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RoleFormData {
  name: string;
  description: string;
  roleTypeId: string;
  actionIds?: string[];
}

export interface CreateRolePayload {
  name: string;
  description: string;
  roleTypeId: string;
  actionIds?: string[];
}

export interface UpdateRolePayload extends CreateRolePayload {
  id: string;
}
