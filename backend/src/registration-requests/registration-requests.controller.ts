import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RegistrationRequestsService } from './registration-requests.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { CreateRegistrationRequestDto } from './dto/create-registration-request.dto';

@Controller('registration-requests')
export class RegistrationRequestsController {
  constructor(private readonly service: RegistrationRequestsService) {}

  /** Public: Kullanıcı kayıt talebi gönderir */
  @Post()
  create(@Body() dto: CreateRegistrationRequestDto) {
    return this.service.create(dto);
  }

  /** Admin: Başvuruyu siler */
  @Delete(':id')
  @UseGuards(AuthGuard)
  delete(@Param('id') id: string, @CurrentUser() user: { role?: string }) {
    return this.service.delete(id, user?.role || '');
  }

  /** Admin: Tüm başvuruları listeler */
  @Get()
  @UseGuards(AuthGuard)
  findAll(@CurrentUser() user: { id?: string; role?: string }) {
    return this.service.findAll(user?.id || '', user?.role || '');
  }

  /** Admin: Başvuru durumunu günceller */
  @Patch(':id/status')
  @UseGuards(AuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'pending' | 'approved' | 'rejected' },
    @CurrentUser() user: { id?: string; role?: string },
  ) {
    return this.service.updateStatus(id, body.status, user?.id || '', user?.role || '');
  }
}
