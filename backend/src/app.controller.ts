import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      ok: true,
      service: 'tvproje-backend',
      message: 'API is running. Use frontend URL for the app.',
    };
  }
}
