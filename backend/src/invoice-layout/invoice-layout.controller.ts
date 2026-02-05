import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { InvoiceLayoutService, InvoiceLayoutDto } from './invoice-layout.service';

@Controller('invoice-layout')
export class InvoiceLayoutController {
  constructor(private readonly invoiceLayoutService: InvoiceLayoutService) {}

  @Get()
  findAll() {
    return this.invoiceLayoutService.findAll();
  }

  @Put()
  @UseGuards(AuthGuard)
  save(
    @Body() dto: Partial<InvoiceLayoutDto>,
    @CurrentUser() user: { role?: string },
  ) {
    return this.invoiceLayoutService.save(dto, user?.role || '');
  }
}
