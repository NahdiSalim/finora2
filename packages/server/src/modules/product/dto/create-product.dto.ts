import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Ordinateur portable Dell XPS 15', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 1299.99, description: 'Unit price' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  unitPrice: number;
}
