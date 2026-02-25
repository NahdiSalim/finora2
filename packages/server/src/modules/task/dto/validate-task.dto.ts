import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum ValidationAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ValidateTaskDto {
  @ApiProperty({
    example: 'approve',
    enum: ValidationAction,
    description: 'Validation action',
  })
  @IsEnum(ValidationAction)
  @IsNotEmpty()
  action: ValidationAction;

  @ApiProperty({
    example: 'Bon travail, tâche validée',
    description: 'Validation comment',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
