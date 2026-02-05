import { Controller, Post, Get, Patch, Body, Query, Param, UnauthorizedException, ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { AuthLocalService } from './auth-local.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './decorators/user.decorator';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthLocalService) {}

  /** Public: self-registration - creates user + business directly */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: any) {
    return await this.authService.getMe(user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateMe(@CurrentUser() user: any, @Body() body: { preferred_locale?: string }) {
    if (body.preferred_locale != null) {
      return await this.authService.updatePreferredLocale(user.id, body.preferred_locale);
    }
    return await this.authService.getMe(user.id);
  }

  @Get('account')
  @UseGuards(AuthGuard)
  async getAccount(@CurrentUser() user: any) {
    return await this.authService.getMyAccount(user.id);
  }

  /** Admin panel: referans bilgisi, getirdiği kullanıcılar, %30 gelir tablosu, ödeme durumları (sadece role=admin) */
  @Get('admin-dashboard')
  @UseGuards(AuthGuard)
  async getAdminDashboard(@CurrentUser() user: any) {
    const data = await this.authService.getAdminDashboard(user.id);
    if (!data) throw new ForbiddenException('Admin dashboard only for admin role');
    return data;
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(@CurrentUser() user: any, @Body() body: { current_password: string; new_password: string }) {
    return await this.authService.changePassword(user.id, body.current_password, body.new_password);
  }

  @Get('payments')
  @UseGuards(AuthGuard)
  async getMyPayments(
    @CurrentUser() user: any,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return await this.authService.getMyPayments(user.id, startDate, endDate);
  }

  /** Fatura detayı – sadece kendi işletmenin ödemeleri */
  @Get('invoices/:paymentId')
  @UseGuards(AuthGuard)
  async getInvoice(@CurrentUser() user: any, @Param('paymentId') paymentId: string) {
    const invoice = await this.authService.getInvoiceForUser(user.id, paymentId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      return await this.authService.login(body.email, body.password);
    } catch (error: any) {
      // Pasif hesap gibi özel mesajları koru
      const msg = error?.message || 'Invalid credentials';
      throw new UnauthorizedException(msg);
    }
  }

  @Post('impersonate')
  @UseGuards(AuthGuard)
  async impersonate(@CurrentUser() user: any, @Body() body: { user_id: string }) {
    try {
      return await this.authService.impersonate(user, body.user_id);
    } catch (error) {
      throw new UnauthorizedException((error as Error).message || 'Impersonate başarısız');
    }
  }
}
