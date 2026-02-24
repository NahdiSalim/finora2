import type { Organization, Document } from "./user";

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  sex: string | null;
  dateOfBirth: string | null;
  status: string;
  address: string | null;
  phone: string;
  is_active: boolean;
  is_email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  role: Role | string;
  organization?: Organization | null;
  documents?: Document[];
}

export interface Action {
  id: string;
  name: string;
  code: "READ" | "CREATE" | "UPDATE" | "DELETE";
}

export interface Page {
  id: string;
  name: string;
  code: string;
  route: string;
  actions: Action[];
}

export interface Feature {
  id: string;
  name: string;
  code: string;
  pages: Page[];
}

export interface LoginInternalRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    message: string;

    accessToken: string;
    refreshToken: string;
    user: User & {
      features: Feature[];
    };
  };
}
export interface RegisterRequest {
  email: string;
  password: string;
  phoneNumber: string;
  role: "CLIENT" | "COMPTABLE";
}

export interface RegisterResponse {
  message: string;
  // adapte selon ton backend
  data?: any;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmepassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface VerifyUserResponse extends User {
  features: Feature[];
  token: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}
