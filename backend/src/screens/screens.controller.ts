import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ScreensService } from './screens.service';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { AssignMenuDto } from './dto/assign-menu.dto';
import { PublishTemplatesDto } from './dto/publish-templates.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { SubscriptionLimitGuard } from '../subscriptions/subscription-limit.guard';

@Controller('screens')
@UseGuards(AuthGuard)
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  @Post()
  @UseGuards(AuthGuard, SubscriptionLimitGuard)
  create(
    @Body() createScreenDto: CreateScreenDto,
    @CurrentUser() user: any,
  ) {
    return this.screensService.create(createScreenDto, user.id, user.role);
  }

  @Post('fix-names')
  fixScreenNames(@CurrentUser() user: any, @Body() body?: { business_id?: string }) {
    return this.screensService.fixScreenNames(user.id, user.role, body?.business_id);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query('user_id') userId?: string, @Query() query?: Record<string, string>) {
    const userIdParam = userId ?? query?.['user_id'] ?? query?.['userId'];
    const targetUserId = (user.role === 'super_admin' || user.role === 'admin') && userIdParam && String(userIdParam).trim() !== ''
      ? String(userIdParam).trim()
      : undefined;
    return this.screensService.findAll(user.id, user.role, targetUserId);
  }

  /** Super admin: Aynı ekran linkinin birden fazla cihazda açık olduğu ekranlar */
  @Get('alerts/multi-device')
  getMultiDeviceAlerts(@CurrentUser() user: any) {
    return this.screensService.getMultiDeviceAlerts(user.id, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.screensService.findOne(id, user.id, user.role);
  }

  @Get(':id/menus')
  getScreenMenus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.screensService.getScreenMenus(id, user.id, user.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateScreenDto: UpdateScreenDto,
    @CurrentUser() user: any,
  ) {
    return this.screensService.update(id, updateScreenDto, user.id, user.role);
  }

  @Post(':id/assign-menu')
  assignMenu(
    @Param('id') id: string,
    @Body() assignMenuDto: AssignMenuDto,
    @CurrentUser() user: any,
  ) {
    return this.screensService.assignMenu(
      { ...assignMenuDto, screen_id: id },
      user.id,
      user.role,
    );
  }

  @Delete(':id/menus/:menuId')
  removeMenu(
    @Param('id') screenId: string,
    @Param('menuId') menuId: string,
    @CurrentUser() user: any,
  ) {
    return this.screensService.removeMenu(screenId, menuId, user.id, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.screensService.remove(id, user.id, user.role);
  }

  @Post(':id/publish-templates')
  publishTemplates(
    @Param('id') id: string,
    @Body() dto: PublishTemplatesDto,
    @CurrentUser() user: any,
  ) {
    return this.screensService.publishTemplates(id, dto, user.id, user.role);
  }

  @Post(':id/stop-publishing')
  stopPublishing(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.screensService.stopPublishing(id, user.id, user.role);
  }

  @Get(':id/template-rotations')
  getTemplateRotations(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.screensService.getTemplateRotations(id, user.id, user.role);
  }
}
