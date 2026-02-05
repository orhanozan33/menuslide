import { Module, Global } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthLocalService } from './auth-local.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../database/database.module';
import { RegistrationRequestsModule } from '../registration-requests/registration-requests.module';
import { InvoiceLayoutModule } from '../invoice-layout/invoice-layout.module';

@Global()
@Module({
  imports: [DatabaseModule, RegistrationRequestsModule, InvoiceLayoutModule],
  controllers: [AuthController],
  providers: [AuthGuard, AuthLocalService],
  exports: [AuthGuard, AuthLocalService],
})
export class AuthModule {}
