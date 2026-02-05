import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsLocalService } from './subscriptions-local.service';
import { StripeService } from './stripe.service';
import { StripeLocalService } from './stripe-local.service';
import { SubscriptionLimitGuard } from './subscription-limit.guard';
import { DatabaseModule } from '../database/database.module';
import { ScreensModule } from '../screens/screens.module';

@Module({
  imports: [DatabaseModule, ScreensModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsLocalService, StripeService, StripeLocalService, SubscriptionLimitGuard],
  exports: [SubscriptionsService, StripeService, StripeLocalService, SubscriptionLimitGuard],
})
export class SubscriptionsModule {}
