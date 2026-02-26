import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class JoinRoomDto {
  @ApiProperty({ description: 'ID de la salle à rejoindre', type: 'number' })
  @Type(() => Number)
  @IsNumber()
  roomId: number;
}
