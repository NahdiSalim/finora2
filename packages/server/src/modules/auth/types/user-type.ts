import { UserStatus } from 'src/common/enums/user-status.enum';

export type TUser = {
  id: number;
  email: string;
  username: string | null;
  status: UserStatus;
  roleId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CurrentUser = {
  id: number;
  email: string;
  roleId?: number;
  role?: {
    id: number;
    code: string;
    nameFr: string;
    nameEn: string;
  };
};

export interface AuthRequest extends Request {
  user?: CurrentUser;
}
