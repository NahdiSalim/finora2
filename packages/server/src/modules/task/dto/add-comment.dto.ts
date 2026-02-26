import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddCommentDto {
  @ApiProperty({ example: 'Travail terminé, fichiers joints', description: 'Comment text' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Attachments/proofs',
    required: false,
  })
  @IsOptional()
  attachments?: any;
}
