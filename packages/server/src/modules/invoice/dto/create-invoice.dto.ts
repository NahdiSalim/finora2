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

export class InvoiceLineDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  invoiceNumber: string;

  @ApiProperty({
    enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'])
  status?: string;

  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate: number;

  @ApiProperty({ enum: ['percentage', 'fixed'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['percentage', 'fixed'])
  discountType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiProperty({ type: [InvoiceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines: InvoiceLineDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsNumber()
  supplierId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;
}
