import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Très intéressant!', description: 'Contenu du commentaire' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
