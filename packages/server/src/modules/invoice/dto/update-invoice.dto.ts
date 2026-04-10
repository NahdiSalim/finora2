import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  Min,
  Max,
  ArrayMinSize,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, DiscountType } from './create-invoice.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ─── Line DTO ─────────────────────────────────────────────────────────────────

export class UpdateInvoiceLineDto {
  @ApiProperty({ example: 'Conseil en comptabilité', description: 'Description de la ligne' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 2, description: 'Quantité' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001, { message: 'La quantité doit être supérieure à 0' })
  quantity: number;

  @ApiProperty({ example: 150.0, description: 'Prix unitaire HT' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Le prix unitaire ne peut pas être négatif' })
  unitPrice: number;
}

// ─── Invoice DTO ──────────────────────────────────────────────────────────────

/**
 * All fields are optional — only provided fields are written to the database.
 * Backend always recalculates monetary totals; frontend values are ignored.
 */
export class UpdateInvoiceDto {
  @ApiProperty({
    example: InvoiceStatus.SENT,
    enum: InvoiceStatus,
    required: false,
    description: 'Nouveau statut de la facture',
  })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiProperty({
    example: '2026-06-30',
    required: false,
    description: "Date d'échéance (YYYY-MM-DD)",
  })
  @IsString()
  @Matches(DATE_REGEX, { message: 'dueDate doit être au format YYYY-MM-DD' })
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    example: 19,
    required: false,
    description: 'Taux de TVA en pourcentage (ex: 19)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Le taux de TVA ne peut pas être négatif' })
  @Max(100, { message: 'Le taux de TVA ne peut pas dépasser 100%' })
  @IsOptional()
  vatRate?: number;

  @ApiProperty({
    example: DiscountType.PERCENTAGE,
    enum: DiscountType,
    required: false,
    description: 'Type de remise',
  })
  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;

  @ApiProperty({
    example: 10,
    required: false,
    description: 'Valeur de la remise (% ou montant fixe selon discountType)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'La valeur de remise ne peut pas être négative' })
  @IsOptional()
  discountValue?: number;

  @ApiProperty({
    example: 'Paiement à 30 jours.',
    required: false,
    description: 'Notes ou conditions spécifiques',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    type: [UpdateInvoiceLineDto],
    required: false,
    description:
      'Lignes de produit. Si fournies, les lignes existantes sont remplacées intégralement.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'La facture doit contenir au moins une ligne' })
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceLineDto)
  @IsOptional()
  lines?: UpdateInvoiceLineDto[];
}
