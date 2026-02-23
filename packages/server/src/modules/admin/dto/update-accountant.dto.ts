import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateAccountantDto {
  @ApiProperty({ example: 'jean.dupont@cabinet.fr', description: 'Email address', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+33612345678', description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}
