import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RespondRequestDto {
  @ApiProperty({
    example: 'Votre demande a été traitée. Voici les documents nécessaires...',
    description: 'Response to the request',
  })
  @IsString()
  @IsNotEmpty()
  response: string;
}
