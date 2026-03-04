import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAccountantProfileDto {
  @ApiProperty({
    example: 'Jean',
    description: 'First name',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    example: 'Dupont',
    description: 'Last name',
    required: false,
  })
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

  @ApiProperty({
    example: '+33612345678',
    description: 'Phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'Expert-comptable',
    description: 'Position/Specialty',
    required: false,
  })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({
    example: 'Audit et Conseil',
    description: 'Department',
    required: false,
  })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({
    example: 'AB123456',
    description: 'CIN',
    required: false,
  })
  @IsString()
  @IsOptional()
  cin?: string;

  @ApiProperty({
    example: 'DSCG - Diplôme Supérieur de Comptabilité et de Gestion',
    description: 'Diploma',
    required: false,
  })
  @IsString()
  @IsOptional()
  diploma?: string;

  @ApiProperty({
    example: 15,
    description: 'Years of experience for the company',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  experience?: number;

  @ApiProperty({
    example: 'Cabinet spécialisé en audit et conseil fiscal',
    description: 'Company description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: ['Comptabilité générale', 'Audit financier', 'Conseil fiscal'],
    description: 'Company specialties (array of strings)',
    required: false,
    type: [String],
  })
  @IsOptional()
  specialties?: string[];

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
