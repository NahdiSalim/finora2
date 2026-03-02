import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum InvitationResponse {
  ACCEPT = 'accept',
  REJECT = 'reject',
}

export class RespondInvitationDto {
  @ApiProperty({
    example: 'accept',
    enum: InvitationResponse,
    description: "Réponse à l'invitation",
  })
  @IsEnum(InvitationResponse)
  response: InvitationResponse;

  @ApiProperty({
    example: 'Nous ne pouvons pas accepter de nouveaux clients pour le moment...',
    description: 'Raison du rejet (requis si reject)',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;
}
