import {
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  IsOptional,
  IsIn,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DevisLineDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateDevisDto {
  @ApiProperty({ description: 'Devis number (e.g. DEV-2026-001)' })
  @IsString()
  number: string;

  @ApiProperty({ enum: ['en_attente', 'accepte', 'refuse'] })
  @IsString()
  @IsIn(['en_attente', 'accepte', 'refuse'])
  status: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  tvaRate: number;

  @ApiProperty()
  @IsDateString()
  validUntil: string;

  @ApiProperty({ enum: ['percentage', 'fixed'] })
  @IsString()
  @IsIn(['percentage', 'fixed'])
  discountType: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiProperty({ type: [DevisLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevisLineDto)
  lines: DevisLineDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, description: 'For accountants creating devis for clients' })
  @IsOptional()
  @IsNumber()
  clientCompanyId?: number;

  @ApiProperty({ required: false, description: 'Supplier (recipient) ID' })
  @IsOptional()
  @IsNumber()
  supplierId?: number;
}
