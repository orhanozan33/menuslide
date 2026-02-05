import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ContactInfoService } from './contact-info.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { UpdateContactInfoDto } from './dto/update-contact-info.dto';

@Controller('contact-info')
export class ContactInfoController {
  constructor(private readonly contactInfoService: ContactInfoService) {}

  @Get()
  async findAll() {
    return this.contactInfoService.findAll();
  }

  @Put()
  @UseGuards(AuthGuard)
  async save(
    @Body() dto: UpdateContactInfoDto,
    @CurrentUser() user: { role?: string },
  ) {
    return this.contactInfoService.save(dto as any, user?.role || '');
  }
}
