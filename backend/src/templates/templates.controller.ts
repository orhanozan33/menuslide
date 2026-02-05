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
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateSystemTemplatesDto } from './dto/create-system-templates.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SaveTemplateFromScreenDto } from './dto/save-template-from-screen.dto';
import { ApplyTemplateDto } from './dto/apply-template.dto';
import { DuplicateTemplateDto } from './dto/duplicate-template.dto';
import { SaveAsTemplateDto } from './dto/save-as-template.dto';
import { SaveCanvasAsTemplateDto } from './dto/save-canvas-as-template.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('templates')
@UseGuards(AuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('user_id') userId?: string) {
    const hasTargetUser = userId != null && String(userId).trim() !== '';
    const targetUserId =
      (user.role === 'super_admin' || user.role === 'admin') && hasTargetUser
        ? userId!.trim()
        : user.id;
    return this.templatesService.findAll(targetUserId, user.role);
  }

  @Get('scope/:scope')
  findByScope(
    @Param('scope') scope: 'system' | 'user',
    @Query('business_id') businessId?: string,
    @Query('user_id') userId?: string,
    @CurrentUser() user?: any,
  ) {
    const targetUserId = (user?.role === 'super_admin' || user?.role === 'admin') && userId
      ? userId
      : user?.id;
    return this.templatesService.findByScope(scope, businessId, targetUserId, user?.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.templatesService.findOne(id, user.id, user.role);
  }

  @Get(':id/blocks')
  async getTemplateBlocks(@Param('id') id: string) {
    return this.templatesService.getTemplateBlocks(id);
  }

  @Post()
  create(@Body() createTemplateDto: CreateTemplateDto, @CurrentUser() user: any) {
    return this.templatesService.create(createTemplateDto, user.id, user.role);
  }

  /** Canvas editör tasarımını şablon olarak kaydet — POST /templates/from-canvas */
  @Post('from-canvas')
  saveFromCanvas(@Body() dto: SaveCanvasAsTemplateDto, @CurrentUser() user: any) {
    return this.templatesService.saveCanvasAsTemplate(dto, user.id, user.role);
  }

  /** Sistem şablonları toplu oluştur — POST /templates/bulk-system */
  @Post('bulk-system')
  createSystem(
    @Body() dto: CreateSystemTemplatesDto,
    @CurrentUser() user: any,
  ) {
    if (user?.role !== 'super_admin' && user?.role !== 'admin') {
      return Promise.reject({ statusCode: 403, message: 'Sadece admin veya super_admin bu işlemi yapabilir' });
    }
    return this.templatesService.createSystemTemplates(dto, user.id, user.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.update(id, updateTemplateDto, user.id, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.templatesService.remove(id, user.id, user.role);
  }

  @Post('save-from-screen')
  saveFromScreen(
    @Body() dto: SaveTemplateFromScreenDto,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.saveFromScreen(dto, user.id, user.role);
  }

  @Post('apply')
  applyToScreen(@Body() dto: ApplyTemplateDto) {
    return this.templatesService.applyToScreen(dto);
  }

  @Post(':id/duplicate')
  duplicate(
    @Param('id') id: string,
    @Body() dto: DuplicateTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.duplicate(id, dto, user.id);
  }

  @Post(':id/save-as')
  saveAs(
    @Param('id') id: string,
    @Body() dto: SaveAsTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.saveAs(id, dto, user.id, user.role);
  }

  @Post(':id/create-menu-from-products')
  createMenuFromProducts(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.createMenuFromProducts(id, user.id, user.role);
  }
}
