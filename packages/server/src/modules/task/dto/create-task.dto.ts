import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum TaskType {
  ACCOUNTING = 'accounting',
  REVIEW = 'review',
  MEETING = 'meeting',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Révision des comptes annuels', description: 'Task title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Vérifier les écritures comptables du mois de janvier',
    description: 'Task description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'accounting',
    enum: TaskType,
    description: 'Task type',
    default: TaskType.OTHER,
  })
  @IsEnum(TaskType)
  @IsOptional()
  type?: TaskType;

  @ApiProperty({
    example: 'high',
    enum: TaskPriority,
    description: 'Task priority',
    default: TaskPriority.MEDIUM,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({
    example: '2026-03-15T10:00:00Z',
    description: 'Due date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    example: '[5,7,9]',
    description:
      'Assignee user IDs (one or multiple collaborators) - can be JSON array or comma-separated string',
    required: false,
    type: String,
  })
  @Transform(({ value }) => {
    // Handle different input formats
    if (Array.isArray(value)) {
      return value.map(Number);
    }
    if (typeof value === 'string') {
      // Try to parse as JSON array
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(Number) : [Number(value)];
      } catch {
        // If not JSON, try comma-separated
        return value
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((n) => !isNaN(n));
      }
    }
    if (typeof value === 'number') {
      return [value];
    }
    return [];
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  assigneeIds?: number[];

  @ApiProperty({
    example: 2,
    description: 'Client user ID (optional - company will be auto-detected)',
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  clientId?: number;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Attachments',
    required: false,
  })
  @IsOptional()
  attachments?: any;
}
