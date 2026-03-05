import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCompanyDto {
  @ApiProperty({ example: 'Entreprise SARL', description: 'Company name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Entreprise SARL Officiel', description: 'Legal name', required: false })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiProperty({ example: '12345678901234', description: 'SIRET number', required: false })
  @IsString()
  @IsOptional()
  siret?: string;

  @ApiProperty({ example: 'FR12345678901', description: 'VAT number', required: false })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiProperty({ example: 'SARL', description: 'Legal form', required: false })
  @IsString()
  @IsOptional()
  legalForm?: string;

  @ApiProperty({ example: '123 Rue de la Paix', description: 'Address', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Paris', description: 'City', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: '75001', description: 'Postal code', required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ example: 'France', description: 'Country', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: '+33612345678', description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: '+33612345678', description: 'WhatsApp number', required: false })
  @IsString()
  @IsOptional()
  numWhatsapp?: string;

  @ApiProperty({ example: 'contact@entreprise.fr', description: 'Email', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'https://entreprise.fr', description: 'Website', required: false })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ example: '6201Z', description: 'Activity code', required: false })
  @IsString()
  @IsOptional()
  activityCode?: string;

  @ApiProperty({ example: 'Services', description: 'Sector', required: false })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiProperty({ example: 50, description: 'Employee count', required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  employeeCount?: number;

  @ApiProperty({ example: '15 ans', description: 'Experience description', required: false })
  @IsString()
  @IsOptional()
  experience?: string;

  @ApiProperty({
    example: "Description de l'entreprise",
    description: 'Description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Company logo',
    required: false,
  })
  @IsOptional()
  logo?: any;
}
