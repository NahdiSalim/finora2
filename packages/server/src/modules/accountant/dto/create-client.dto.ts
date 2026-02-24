import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Jean', description: 'Client first name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Martin', description: 'Client last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'jean.martin@entreprise.fr', description: 'Client email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+33612345678', description: 'Client phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Entreprise Martin SARL', description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

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

  @ApiProperty({ example: '123 Rue de la Paix', description: 'Company address', required: false })
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

  @ApiProperty({ example: 'SecurePass123!', description: 'Password for the client account' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
