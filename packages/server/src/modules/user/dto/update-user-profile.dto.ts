import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiProperty({ example: 'Jean', description: 'First name', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Dupont', description: 'Last name', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    example: 'jean.dupont@example.com',
    description: 'Email address',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+33612345678', description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Directeur', description: 'Position', required: false })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({ example: 'Finance', description: 'Department', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ example: 'AB123456', description: 'CIN', required: false })
  @IsString()
  @IsOptional()
  cin?: string;

  @ApiProperty({ example: 'Master Finance', description: 'Diploma', required: false })
  @IsString()
  @IsOptional()
  diploma?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'User photo',
    required: false,
  })
  @IsOptional()
  photo?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'User cover photo',
    required: false,
  })
  @IsOptional()
  coverPhoto?: any;
}
