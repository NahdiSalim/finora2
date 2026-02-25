import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum AppointmentAction {
  CONFIRM = 'confirm',
  REJECT = 'reject',
}

export class RespondAppointmentDto {
  @ApiProperty({
    example: 'confirm',
    enum: AppointmentAction,
    description: 'Action to take on the appointment',
  })
  @IsEnum(AppointmentAction)
  @IsNotEmpty()
  action: AppointmentAction;

  @ApiProperty({
    example: 'Rendez-vous confirmé. À bientôt!',
    description: 'Accountant notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: 'Créneau non disponible',
    description: 'Rejection reason (required if action is reject)',
    required: false,
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
