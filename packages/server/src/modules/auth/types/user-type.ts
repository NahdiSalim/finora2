export type TUser = {
  id: number;
  email: string;
  username: string | null;
  isActive: boolean;
  roleId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CurrentUser = {
  id: number;
  email: string;
  roleId?: number;
};

export interface AuthRequest extends Request {
  user?: CurrentUser;
}
