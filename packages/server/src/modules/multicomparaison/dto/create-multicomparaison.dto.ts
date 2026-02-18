import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class CreateMultiComparaisonDto {
  @ApiProperty({
    description: 'ID of the programme to compare',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  idProgrammeToCompare: number;

  @ApiProperty({
    description: 'Array of programme IDs to compare to',
    example: [2, 3, 4],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsNotEmpty()
  idProgrammeComparedTo: number[];
}

export class MultiComparaisonEcartsClassificationItem {
  @ApiProperty({
    description: 'Comparaison ID to classify',
    example: 101,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  comparaison_id: number;

  @ApiProperty({
    description: 'Tasks to classify for this comparaison',
    type: 'array',
    example: [
      { module: 'Module A', ecart: 'Gap description' },
      { module: 'Module B', ecart: 'Another gap' },
    ],
  })
  @IsArray()
  tasks: Array<Record<string, unknown>>;
}

export class MultiComparaisonEcartsClassificationDto {
  @ApiProperty({
    description: 'Language (fr or en), default fr',
    required: false,
    example: 'fr',
    type: String,
  })
  lang?: string;

  @ApiProperty({
    description: 'List of comparaison IDs with their tasks to classify',
    type: [MultiComparaisonEcartsClassificationItem],
  })
  @IsArray()
  @ArrayMinSize(1)
  items: MultiComparaisonEcartsClassificationItem[];
}
