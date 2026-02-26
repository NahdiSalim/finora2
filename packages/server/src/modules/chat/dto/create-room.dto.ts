import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateRoomDto {
  @ApiPropertyOptional({ description: 'Nom de la salle' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Type de salle',
    enum: ['direct', 'group', 'request', 'ticket', 'meeting', 'company'],
  })
  @IsEnum(['direct', 'group', 'request', 'ticket', 'meeting', 'company'])
  type: string;

  @ApiPropertyOptional({ description: 'Description de la salle' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'IDs des participants',
    type: 'array',
    items: { type: 'number' },
    example: [1, 2, 3],
  })
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  participants: number[];

  @ApiPropertyOptional({ description: 'ID du contexte (request, ticket, etc.)', type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contextId?: number;

  @ApiPropertyOptional({ description: 'Type de contexte' })
  @IsOptional()
  @IsEnum(['request', 'ticket', 'meeting', 'company'])
  contextType?: string;
}
