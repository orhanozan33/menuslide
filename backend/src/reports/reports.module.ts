import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DatabaseModule } from '../database/database.module';
import { RegistrationRequestsModule } from '../registration-requests/registration-requests.module';

@Module({
  imports: [DatabaseModule, RegistrationRequestsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
