import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { HowToUseContentService } from './how-to-use-content.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { UpdateHowToUseContentDto } from './dto/update-how-to-use-content.dto';

@Controller('how-to-use-content')
export class HowToUseContentController {
  constructor(private readonly service: HowToUseContentService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Put()
  @UseGuards(AuthGuard)
  save(
    @Body() dto: UpdateHowToUseContentDto,
    @CurrentUser() user: { role?: string },
  ) {
    return this.service.save(dto as any, user?.role || '');
  }
}
