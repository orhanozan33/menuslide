import { Module } from '@nestjs/common';
import { InvoiceLayoutController } from './invoice-layout.controller';
import { InvoiceLayoutService } from './invoice-layout.service';

@Module({
  controllers: [InvoiceLayoutController],
  providers: [InvoiceLayoutService],
  exports: [InvoiceLayoutService],
})
export class InvoiceLayoutModule {}
