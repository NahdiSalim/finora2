import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RespondReviewDto {
  @ApiProperty({ example: 'Merci pour votre retour!', description: 'Réponse du comptable' })
  @IsString()
  @IsNotEmpty()
  response: string;
}
