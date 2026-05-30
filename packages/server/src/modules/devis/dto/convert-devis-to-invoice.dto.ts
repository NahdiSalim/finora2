import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class ConvertDevisToInvoiceDto {
  @ApiProperty({ example: 'FAC-2026-001' })
  @IsString()
  invoiceNumber: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  dueDate: string;
}
