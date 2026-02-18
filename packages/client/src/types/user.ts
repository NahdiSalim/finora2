export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING = 'PENDING',
  DELETED = 'DELETED',
}

export type UserGenderApi = 'male' | 'female';

export type UserGender = 'male' | 'female';

export type UserFormData = {
  full_name: string;
  email: string;
  phone: string;
  roleCode: string;
  sex: 'male' | 'female';
  dateOfBirth: string;
  shopName: string;
  legalIdentifier: string;
  address: string;
  patenteFile: File | null | undefined;
  activitySector: string[] | undefined;
  password?: string;
  confirmPassword?: string;
};

export type ClientFormData = {
  full_name: string;
  email: string;
  phone: string;
  roleCode: string;
  gender?: 'male' | 'female';
  birth_date: string;
  address: string;
  origin_country: string;
  region: string;
  residence_type: string;
  document_type: string;
  photo: File | null;
  document_main: File | null;
  document_back: File | null;
};

export type BackofficeFormData = {
  full_name: string;
  email: string;
  phone: string;
  roleCode: string;
  password: string;
  confirmPassword: string;
};

export interface RoleType {
  id: string;
  code: string;
  name: string;
  allows_custom_permissions: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  legal_identifier?: string;
  address?: string;
  city?: string;
  patent?: string;
  phone?: string;
  sector_activity?: string[] | null;
  sectors?: Array<{ id: string; name: string }>;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  type: string;
  file_path: string;
  created_at: string;
}

export interface ResidencyDocument {
  id: string;
  document_type: string;
  type: string;
  file_url: string;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'VERIFIED';
  rejection_reason: string | null;
  issued_at: string | null;
  submitted_at: string;
  verified_at: string | null;
  verified_by_user: string | null;
  created_at: string;
  updated_at: string;
}

export interface OriginCountry {
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

export interface ResidenceType {
  id: string;
  value: string;
  name_en: string;
  name_fr: string;
  name_ar: string;
  created_at: string;
  updated_at: string;
}

export interface ClientData {
  id: string;
  gender: 'male' | 'female';
  birth_date: string;
  address: string;
  email_verified: boolean;
  phone_verified: boolean;
  photo: string;
  origin_country: OriginCountry | null;
  region: Region | null;
  residence_type: ResidenceType | null;
  residencyDocuments: ResidencyDocument[];
}

export interface User {
  id: string;
  full_name: string;
  email?: string;
  phone: string;
  role: string | UserRole;
  organization?: Organization;
  documents?: Document[];
  status?: string;
  is_active: boolean;
  is_email_verified?: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;

  client: ClientData | null;

  sex?: UserGenderApi;
  dateOfBirth?: string;
  address?: string;
  originCountry?: string;
  region?: string;
  documentType?: string;
  profile_picture?: string;
  activitySector?: string[];
}

export interface UsersResponse {
  message: string;
  data: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserByIdResponse {
  message: string;
  user: User;
}

export interface CreateUserResponse {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  is_active: boolean;
  user: string;
  organization?: Organization;
  patenteUploaded: boolean;
}
