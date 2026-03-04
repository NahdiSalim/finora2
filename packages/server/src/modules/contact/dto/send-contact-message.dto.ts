import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class SendContactMessageDto {
  @ApiProperty({
    example: 'Jean Dupont',
    description: 'Nom complet du visiteur',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  visitorName: string;

  @ApiProperty({
    example: 'jean.dupont@example.com',
    description: 'Email du visiteur',
  })
  @IsEmail()
  @IsNotEmpty()
  visitorEmail: string;

  @ApiProperty({
    example: '+33612345678',
    description: 'Téléphone du visiteur',
    required: false,
  })
  @IsString()
  @IsOptional()
  visitorPhone?: string;

  @ApiProperty({
    example: 'Entreprise ABC',
    description: "Nom de l'entreprise du visiteur",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  visitorCompany?: string;

  @ApiProperty({
    example: "Demande d'information sur vos services",
    description: 'Sujet du message',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    example: "Bonjour, je souhaiterais obtenir plus d'informations sur vos services comptables...",
    description: 'Contenu du message',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}
