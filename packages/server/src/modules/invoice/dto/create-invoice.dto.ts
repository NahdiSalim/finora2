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

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  PARTIAL = 'partial',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export class CreateInvoiceLineDto {
  @ApiProperty({ example: 'Conseil en comptabilité', description: 'Description de la ligne' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 2, description: 'Quantité' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001, { message: 'La quantité doit être supérieure à 0' })
  quantity!: number;

  @ApiProperty({ example: 150.0, description: 'Prix unitaire HT' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Le prix unitaire ne peut pas être négatif' })
  unitPrice!: number;
}

export class CreateInvoiceDto {
  @ApiProperty({
    example: InvoiceStatus.DRAFT,
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
    required: false,
    description: 'Statut de la facture',
  })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiProperty({
    example: '2026-05-15',
    description: "Date d'échéance (YYYY-MM-DD)",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(DATE_REGEX, { message: 'dueDate doit être au format YYYY-MM-DD' })
  dueDate!: string;

  @ApiProperty({
    example: 19,
    description: 'Taux de TVA en pourcentage (ex: 19)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Le taux de TVA ne peut pas être négatif' })
  @Max(100, { message: 'Le taux de TVA ne peut pas dépasser 100%' })
  vatRate!: number;

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
    example: 'Paiement à 30 jours. Pénalités de retard applicables.',
    required: false,
    description: 'Notes ou conditions spécifiques',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    type: [CreateInvoiceLineDto],
    description: 'Lignes de produit / service',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'La facture doit contenir au moins une ligne' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines!: CreateInvoiceLineDto[];
}
