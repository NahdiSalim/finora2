import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiRoot() {
    return {
      ok: true,
      message: 'THAMM+ API is running',
    };
  }
}


