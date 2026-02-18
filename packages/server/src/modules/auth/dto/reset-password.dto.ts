import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'New password',
    example: 'StrongPass123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Please Write Password!' })
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'StrongPass123',
  })
  @IsString()
  @IsNotEmpty()
  confirmepassword: string;
}
