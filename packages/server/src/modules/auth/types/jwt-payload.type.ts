export type JwtPayload = {
  sub: number;
  email: string;
  roleCode?: string;
  companyId?: number | null;
};
