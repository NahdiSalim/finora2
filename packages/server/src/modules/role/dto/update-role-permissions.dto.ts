import { IsArray, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: 'Array of action IDs to assign to the role',
    example: [1, 2, 3, 5, 8],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  actionIds: number[];

  @ApiProperty({
    description: 'ID of the user granting these permissions',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  grantedById?: number;
}
