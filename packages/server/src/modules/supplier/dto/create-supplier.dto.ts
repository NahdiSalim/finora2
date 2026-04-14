import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Dupont Matériaux', description: 'Supplier name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Dupont & Fils SARL', description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  company: string;

  @ApiProperty({ example: 'contact@dupont.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  email: string;

  @ApiProperty({ example: '+216 XX XXX XXX', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: '12 Rue des Oliviers, Tunis', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @ApiProperty({ example: '1234567/A/M/000', required: false, description: 'Matricule fiscal' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;
}
