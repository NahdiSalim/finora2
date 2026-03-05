import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @ApiProperty({
    example: ['company_1/posts/image1.jpg', 'company_1/posts/image2.jpg'],
    description:
      'Array of existing image paths or URLs to keep (others will be deleted). Can be comma-separated string or array.',
    required: false,
    type: 'string',
  })
  @IsOptional()
  keepImages?: string | string[];
}
