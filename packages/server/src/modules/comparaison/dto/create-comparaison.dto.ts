import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateComparaisonDto {
  @ApiProperty({
    description: 'ID of the programme to compare',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  idProgrammeToCompare: number;

  @ApiProperty({
    description: 'ID of the programme to compare to',
    example: 2,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  idProgrammeComparedTo: number;
}
