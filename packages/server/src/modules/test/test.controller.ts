import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TestService } from './test.service';

@ApiTags('test')
@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}
  @Get()
  @ApiOkResponse({ description: 'List test rows' })
  getHello(): Promise<{ test: string; id: number; createdAt: Date }[]> {
    return this.testService.findAll();
  }
}
