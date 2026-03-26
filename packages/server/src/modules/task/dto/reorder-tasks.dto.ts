import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class TaskOrderItemDto {
  @ApiProperty({ example: 1, description: 'Task ID' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 0, description: 'New order position (0-based)' })
  @IsInt()
  order: number;
}

export class ReorderTasksDto {
  @ApiProperty({
    type: [TaskOrderItemDto],
    description: 'Array of tasks with their new order positions',
    example: [
      { id: 1, order: 0 },
      { id: 3, order: 1 },
      { id: 7, order: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskOrderItemDto)
  tasks: TaskOrderItemDto[];

  @ApiProperty({
    example: 'todo',
    description: 'Filter reorder to a specific kanban column status (optional)',
    required: false,
    enum: ['todo', 'in_progress', 'in_review', 'completed', 'cancelled', 'archived'],
  })
  @IsString()
  @IsOptional()
  status?: string;
}
