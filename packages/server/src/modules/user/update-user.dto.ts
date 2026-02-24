import { IsEmail, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { UserStatus } from 'src/common/enums/user-status.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  id_role?: number;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
