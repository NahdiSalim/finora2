import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class ConvertToTaskDto {
  @ApiProperty({
    example: 5,
    description: 'Collaborator ID to assign the task to',
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  assigneeId: number;

  @ApiProperty({
    example: '2026-03-20T10:00:00Z',
    description: 'Task due date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    example: 'high',
    enum: TaskPriority,
    description: 'Task priority',
    required: false,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;
}
