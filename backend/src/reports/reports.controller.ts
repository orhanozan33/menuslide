import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('users')
  getUsersWithSubscription(@CurrentUser() user: { role?: string }) {
    return this.reportsService.getUsersWithSubscriptionStatus(user?.role || '');
  }

  @Get('stats')
  getStats(
    @CurrentUser() user: { role?: string },
    @Query('revenueFrom') revenueFrom?: string,
    @Query('revenueTo') revenueTo?: string,
  ) {
    return this.reportsService.getStats(user?.role || '', revenueFrom, revenueTo);
  }

  @Get('payment-status')
  getPaymentStatus(@CurrentUser() user: { role?: string }) {
    return this.reportsService.getPaymentStatus(user?.role || '');
  }

  @Post('subscription/:subscriptionId/mark-paid')
  markSubscriptionPaid(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() user: { role?: string },
    @Body() body: { period_months?: number },
  ) {
    return this.reportsService.markSubscriptionPaid(
      subscriptionId,
      user?.role || '',
      body?.period_months ?? 1,
    );
  }

  @Post('test/simulate-payment-failed')
  simulatePaymentFailed(
    @CurrentUser() user: { role?: string },
    @Body() body: { business_id: string },
  ) {
    return this.reportsService.simulatePaymentFailed(body?.business_id || '', user?.role || '');
  }

  @Post('test/simulate-payment-received')
  simulatePaymentReceived(
    @CurrentUser() user: { role?: string },
    @Body() body: { subscription_id: string },
  ) {
    return this.reportsService.simulatePaymentReceived(body?.subscription_id || '', user?.role || '');
  }

  @Post('test/seed-payment-examples')
  seedPaymentExamples(@CurrentUser() user: { role?: string }) {
    return this.reportsService.seedPaymentExamples(user?.role || '');
  }

  @Post('test/seed-orhan-scenario')
  seedOrhanScenario(@CurrentUser() user: { role?: string }) {
    return this.reportsService.seedOrhanScenario(user?.role || '');
  }

  @Post('test/delete-test-data')
  deleteTestData(@CurrentUser() user: { role?: string }) {
    return this.reportsService.deleteTestData(user?.role || '');
  }

  @Get('user/:userId')
  getUserDetailReport(
    @Param('userId') userId: string,
    @CurrentUser() user: { id?: string; role?: string },
  ) {
    return this.reportsService.getUserDetailReport(userId, user?.id || '', user?.role || '');
  }

  /** Admin hareket günlüğüne kayıt ekle (frontend’den aksiyon sonrası çağrılır) */
  @Post('activity')
  logActivity(
    @CurrentUser() user: { id?: string; role?: string },
    @Body() body: { action_type: string; page_key: string; resource_type?: string; resource_id?: string; details?: Record<string, unknown> },
  ) {
    return this.reportsService.logActivity(user?.id || '', user?.role || '', body);
  }

  /** Admin hareket günlüğünü listele (tarih aralığı, kullanıcı filtreli) */
  @Get('activity')
  getActivityLog(
    @CurrentUser() user: { role?: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('user_id') userId?: string,
  ) {
    return this.reportsService.getActivityLog(user?.role || '', from, to, userId);
  }

  /** Admin kullanıcı listesi (hareket raporu filtre dropdown için) */
  @Get('activity-users')
  getActivityAdminUsers(@CurrentUser() user: { role?: string }) {
    return this.reportsService.getActivityAdminUsers(user?.role || '');
  }
}
