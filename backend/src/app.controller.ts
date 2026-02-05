import { Controller, Get } from '@nestjs/common';
import { SeedService } from './seed/seed.service';

@Controller()
export class AppController {
  constructor(private readonly seed: SeedService) {}

  @Get()
  root() {
    return {
      ok: true,
      service: 'tvproje-backend',
      message: 'API is running. Use frontend URL for the app.',
    };
  }
}
