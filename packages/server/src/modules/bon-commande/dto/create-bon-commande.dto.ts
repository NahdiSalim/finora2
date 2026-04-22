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

export class BonCommandeLineDto {
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

export class CreateBonCommandeDto {
  @ApiProperty()
  @IsString()
  number: string;

  @ApiProperty({ enum: ['brouillon', 'confirme', 'annule'] })
  @IsString()
  @IsIn(['brouillon', 'confirme', 'annule'])
  status: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  tvaRate: number;

  @ApiProperty()
  @IsDateString()
  validUntil: string;

  @ApiProperty({ type: [BonCommandeLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BonCommandeLineDto)
  lines: BonCommandeLineDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  supplierId?: number;
}
