import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum PostVisibility {
  PUBLIC = 'public',
  CLIENTS_ONLY = 'clients_only',
  PRIVATE = 'private',
}

export class CreatePostDto {
  @ApiProperty({ example: 'Nouveautés fiscales 2024', description: 'Titre du post' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Découvrez les nouvelles mesures fiscales...',
    description: 'Contenu du post',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: ['fiscalité', 'actualités'],
    description: 'Tags (séparés par des virgules si string)',
    required: false,
    type: 'string',
  })
  @IsOptional()
  tags?: string | string[];

  @ApiProperty({
    example: 'public',
    enum: PostVisibility,
    description: 'Visibilité du post',
    required: false,
    default: 'public',
  })
  @IsOptional()
  visibility?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Images du post (max 5)',
    required: false,
  })
  @IsOptional()
  images?: any[];
}
