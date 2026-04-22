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

export class BonLivraisonLineDto {
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

export class CreateBonLivraisonDto {
  @ApiProperty()
  @IsString()
  number: string;

  @ApiProperty({ enum: ['en_attente', 'livre', 'annule'] })
  @IsString()
  @IsIn(['en_attente', 'livre', 'annule'])
  status: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  tvaRate: number;

  @ApiProperty()
  @IsDateString()
  deliveryDate: string;

  @ApiProperty({ type: [BonLivraisonLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BonLivraisonLineDto)
  lines: BonLivraisonLineDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  supplierId?: number;
}
