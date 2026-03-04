import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: 'Note de 1 à 5 étoiles', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 'Excellent service, très professionnel',
    description: 'Commentaire',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
