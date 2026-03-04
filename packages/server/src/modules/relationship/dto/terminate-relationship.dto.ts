import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class TerminateRelationshipDto {
  @ApiProperty({
    example: 'Changement de prestataire comptable',
    description: 'Raison de la résiliation',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  terminationReason: string;
}
