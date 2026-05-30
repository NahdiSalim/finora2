import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConvertBonLivraisonToInvoiceDto {
  @ApiProperty({ example: 'FAC-2026-015' })
  @IsString()
  invoiceNumber: string;
}
