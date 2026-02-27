import { IsString, IsInt, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD',
}

export class CreateAuditLogDto {
  @IsInt()
  @IsOptional()
  userId?: number;

  @IsEnum(AuditAction)
  action: AuditAction;

  @IsString()
  entity: string;

  @IsInt()
  @IsOptional()
  entityId?: number;

  @IsObject()
  @IsOptional()
  changes?: any;

  @IsObject()
  @IsOptional()
  metadata?: any;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsInt()
  @IsOptional()
  companyId?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;
}
