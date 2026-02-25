import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TaskType, TaskPriority } from './create-task.dto';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class UpdateTaskDto {
  @ApiProperty({ example: 'Révision des comptes annuels', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Description mise à jour', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TaskType, required: false })
  @IsEnum(TaskType)
  @IsOptional()
  type?: TaskType;

  @ApiProperty({ enum: TaskPriority, required: false })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({ enum: TaskStatus, required: false })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ example: '2026-03-20T10:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    example: 5,
    description: 'Change assignee (single collaborator)',
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  assigneeId?: number;

  @ApiProperty({
    example: '[5,7,9]',
    description: 'Add multiple collaborators to this task (creates duplicate tasks)',
    required: false,
    type: String,
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map(Number);
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(Number) : [Number(value)];
      } catch {
        return value
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((n) => !isNaN(n));
      }
    }
    if (typeof value === 'number') {
      return [value];
    }
    return undefined;
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  addCollaborators?: number[];

  @ApiProperty({ example: 50, description: 'Progress 0-100', required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  progress?: number;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'New attachments to add to the task',
    required: false,
  })
  @IsOptional()
  attachments?: any;
}
