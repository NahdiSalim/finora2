import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCompleteProfileDto {
  // ========== USER FIELDS ==========
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

  @ApiProperty({ example: 'Expert-comptable', description: 'Position/Specialty', required: false })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({ example: 'Audit et Conseil', description: 'Department', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ example: 'AB123456', description: 'CIN number', required: false })
  @IsString()
  @IsOptional()
  cin?: string;

  @ApiProperty({ example: 'DSCG', description: 'Diploma name', required: false })
  @IsString()
  @IsOptional()
  diploma?: string;

  // ========== USER FILES ==========
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

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'CIN document (PDF, image)',
    required: false,
  })
  @IsOptional()
  cinFile?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Diploma document (PDF, image)',
    required: false,
  })
  @IsOptional()
  diplomaFile?: any;

  // ========== COMPANY FIELDS ==========
  @ApiProperty({ example: 'Cabinet Comptable SARL', description: 'Company name', required: false })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({
    example: 'Cabinet Comptable SARL Officiel',
    description: 'Legal company name',
    required: false,
  })
  @IsString()
  @IsOptional()
  companyLegalName?: string;

  @ApiProperty({ example: '12345678901234', description: 'SIRET number', required: false })
  @IsString()
  @IsOptional()
  companySiret?: string;

  @ApiProperty({ example: 'FR12345678901', description: 'VAT number', required: false })
  @IsString()
  @IsOptional()
  companyVatNumber?: string;

  @ApiProperty({ example: 'SARL', description: 'Legal form', required: false })
  @IsString()
  @IsOptional()
  companyLegalForm?: string;

  @ApiProperty({ example: '123 Rue de la Paix', description: 'Company address', required: false })
  @IsString()
  @IsOptional()
  companyAddress?: string;

  @ApiProperty({ example: 'Paris', description: 'Company city', required: false })
  @IsString()
  @IsOptional()
  companyCity?: string;

  @ApiProperty({ example: '75001', description: 'Company postal code', required: false })
  @IsString()
  @IsOptional()
  companyPostalCode?: string;

  @ApiProperty({ example: 'France', description: 'Company country', required: false })
  @IsString()
  @IsOptional()
  companyCountry?: string;

  @ApiProperty({ example: '+33612345678', description: 'Company phone', required: false })
  @IsString()
  @IsOptional()
  companyPhone?: string;

  @ApiProperty({ example: 'contact@cabinet.fr', description: 'Company email', required: false })
  @IsEmail()
  @IsOptional()
  companyEmail?: string;

  @ApiProperty({ example: 'https://cabinet.fr', description: 'Company website', required: false })
  @IsString()
  @IsOptional()
  companyWebsite?: string;

  @ApiProperty({
    example: 'Cabinet spécialisé en audit',
    description: 'Company description',
    required: false,
  })
  @IsString()
  @IsOptional()
  companyDescription?: string;

  @ApiProperty({ example: 15, description: 'Years of experience', required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  companyExperience?: number;

  @ApiProperty({ example: '6201Z', description: 'Activity code (NAF/APE)', required: false })
  @IsString()
  @IsOptional()
  companyActivityCode?: string;

  @ApiProperty({ example: 'Services', description: 'Business sector', required: false })
  @IsString()
  @IsOptional()
  companySector?: string;

  @ApiProperty({ example: 50, description: 'Number of employees', required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  companyEmployeeCount?: number;

  @ApiProperty({
    example: ['Comptabilité générale', 'Audit financier', 'Conseil fiscal'],
    description: 'Company specialties (comma-separated or array)',
    required: false,
    type: [String],
  })
  @IsOptional()
  companySpecialties?: string | string[];

  @ApiProperty({ example: '123456', description: 'Patent number', required: false })
  @IsString()
  @IsOptional()
  companyPatentNumber?: string;

  // ========== COMPANY FILES ==========
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Company logo',
    required: false,
  })
  @IsOptional()
  companyLogo?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Patent file (PDF, image)',
    required: false,
  })
  @IsOptional()
  companyPatentFile?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'RNE file (PDF, image)',
    required: false,
  })
  @IsOptional()
  companyRneFile?: any;
}
