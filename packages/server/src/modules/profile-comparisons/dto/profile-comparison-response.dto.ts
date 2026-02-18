import { ApiProperty } from '@nestjs/swagger';

class ModuleMatchDto {
  @ApiProperty({ example: 'Data Structures' })
  module: string;

  @ApiProperty({ example: 'Data Structures' })
  module_en: string;

  @ApiProperty({ example: 0.21 })
  similarity_score: number;

  @ApiProperty({ example: false })
  is_similar: boolean;
}

export class TaskMatchDto {
  @ApiProperty({ example: 'Algorithm Analysis' })
  task: string;

  @ApiProperty({ example: 'Algorithm Analysis' })
  task_en: string;

  @ApiProperty({ type: [ModuleMatchDto] })
  matches: ModuleMatchDto[];
}

class ProfileComparisonDataDto {
  @ApiProperty()
  ProgrammeToCompare: string;

  @ApiProperty()
  ProgrammeToCompare_en: string;

  @ApiProperty()
  ProgrammeComparedTo: string;

  @ApiProperty()
  ProgrammeComparedTo_en: string;

  @ApiProperty({ example: 'tasks_to_modules' })
  comparison_type: string;

  @ApiProperty({ example: 'DIRECT' })
  direction: string;

  @ApiProperty({ example: 0.23 })
  average_similarity_score: number;

  @ApiProperty({ type: [TaskMatchDto] })
  matches: TaskMatchDto[];

  @ApiProperty({ example: 'Comparison loaded from database' })
  message: string;
}

export class ProfileComparisonResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ example: 200 })
  code: number;

  @ApiProperty({ type: ProfileComparisonDataDto })
  data: ProfileComparisonDataDto;
}
