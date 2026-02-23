import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiRoot() {
    return {
      ok: true,
      message: 'Finora API is running',
    };
  }
}


