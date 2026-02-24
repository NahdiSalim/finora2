import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterAccountantDto {
  @ApiProperty({ example: 'jean.dupont@cabinet.fr', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+33612345678', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Cabinet Comptable Dupont', description: 'Accounting firm name' })
  @IsString()
  @IsNotEmpty()
  firmName: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Patent file (Patente)',
    required: false,
  })
  @IsOptional()
  patentFile?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'RNE file',
    required: false,
  })
  @IsOptional()
  rneFile?: any;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password for the account' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
