import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { HomeChannelsService } from './home-channels.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { UpdateHomeChannelsDto } from './dto/update-home-channels.dto';

@Controller('home-channels')
export class HomeChannelsController {
  constructor(private readonly homeChannelsService: HomeChannelsService) {}

  /** Public: Ana sayfa kanallarını döner */
  @Get()
  async findAll() {
    return this.homeChannelsService.findAll();
  }

  /** Admin: Kanalları kaydet (super_admin) */
  @Put()
  @UseGuards(AuthGuard)
  async save(
    @Body() dto: UpdateHomeChannelsDto,
    @CurrentUser() user: { role?: string },
  ) {
    const channels = Array.isArray(dto?.channels) ? dto.channels : [];
    return this.homeChannelsService.save(channels, user?.role || '');
  }
}
