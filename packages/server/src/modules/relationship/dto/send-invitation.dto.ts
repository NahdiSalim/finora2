import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendInvitationDto {
  @ApiProperty({
    example: 1,
    description: "ID de l'entreprise destinataire (client ou cabinet comptable)",
  })
  @IsInt()
  @IsNotEmpty()
  targetCompanyId: number;

  @ApiProperty({
    example: 'Je souhaiterais établir une relation professionnelle avec votre cabinet...',
    description: "Message d'invitation (optionnel)",
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  invitationMessage?: string;
}
