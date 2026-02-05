import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { QrMenusLocalService } from './qr-menus-local.service';
import { DatabaseService } from '../database/database.service';

@Controller('qr-menus')
export class QrMenusController {
  constructor(
    private readonly qrMenusService: QrMenusLocalService,
    private readonly database: DatabaseService,
  ) {}

  @Get('token/:token')
  async getByToken(@Param('token') token: string) {
    return this.qrMenusService.getQrMenuByToken(token);
  }

  /** Public: resolve short /qr/{slug} to business_id and token (no auth) */
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.qrMenusService.getByBusinessSlug(slug);
  }

  @Get('business/:businessId')
  @UseGuards(AuthGuard)
  async getOrCreate(
    @Param('businessId') businessId: string,
    @Query('screenId') screenId?: string,
    @CurrentUser() user?: any,
  ) {
    // Verify access
    if (user.role !== 'super_admin') {
      const userResult = await this.database.query(
        'SELECT business_id FROM users WHERE id = $1',
        [user.id]
      );
      if (userResult.rows[0]?.business_id !== businessId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.qrMenusService.getOrCreateQrMenu(businessId, screenId);
  }

  @Post('view/:token')
  async recordView(
    @Param('token') token: string,
    @Req() req: Request,
    @Query('lang') lang: string = 'en',
  ) {
    const qrMenu = await this.qrMenusService.getQrMenuByToken(token);
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Detect device type
    let deviceType = 'desktop';
    if (/mobile|android|iphone|ipad/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    await this.qrMenusService.recordView(qrMenu.id, deviceType, userAgent, ipAddress, lang);
    
    return { success: true };
  }

  @Get('analytics/:qrMenuId')
  @UseGuards(AuthGuard)
  async getAnalytics(
    @Param('qrMenuId') qrMenuId: string,
    @Query('days') days: string = '30',
  ) {
    return this.qrMenusService.getAnalytics(qrMenuId, parseInt(days, 10));
  }

  @Put('settings/:qrMenuId')
  @UseGuards(AuthGuard)
  async updateSettings(
    @Param('qrMenuId') qrMenuId: string,
    @Body() settings: {
      show_allergens?: boolean;
      show_calories?: boolean;
      show_ingredients?: boolean;
      custom_css?: string;
    },
  ) {
    return this.qrMenusService.updateSettings(qrMenuId, settings);
  }
}
