import { applyDecorators, UseGuards } from '@nestjs/common';
import { SubscriptionLimitGuard } from './subscription-limit.guard';

/**
 * Decorator to enforce subscription limits on screen creation
 * Use on POST /screens endpoint
 */
export function RequireSubscriptionLimit() {
  return applyDecorators(UseGuards(SubscriptionLimitGuard));
}
