import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty, IsOptional, IsEnum, Min, Matches } from 'class-validator';

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CARD = 'card',
  OTHER = 'other',
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePaymentDto {
  @ApiProperty({ example: 500.0, description: 'Montant du paiement' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Le montant doit être supérieur à 0' })
  amount: number;

  @ApiProperty({ example: '2026-05-01', description: 'Date du paiement (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  @Matches(DATE_REGEX, { message: 'paymentDate doit être au format YYYY-MM-DD' })
  paymentDate: string;

  @ApiProperty({
    example: PaymentMethod.BANK_TRANSFER,
    enum: PaymentMethod,
    description: 'Moyen de paiement',
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    example: 'Virement reçu le 01/05',
    required: false,
    description: 'Note optionnelle',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
