import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsInt } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  nameFr: string;

  @ApiProperty()
  @IsString()
  nameEn: string;

  @ApiProperty()
  @IsString()
  descriptionFr: string;

  @ApiProperty()
  @IsString()
  descriptionEn: string;

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  Features?: number[];

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  Pages?: number[];

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  Tasks?: number[];
}
