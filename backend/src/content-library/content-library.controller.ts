import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentLibraryService } from './content-library.service';
import { CreateContentLibraryItemDto } from './dto/create-content-library-item.dto';
import { UpdateContentLibraryItemDto } from './dto/update-content-library-item.dto';
import { CreateContentLibraryCategoryDto } from './dto/create-content-library-category.dto';
import { UpdateContentLibraryCategoryDto } from './dto/update-content-library-category.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('content-library')
@UseGuards(AuthGuard)
export class ContentLibraryController {
  constructor(private readonly service: ContentLibraryService) {}

  // ========== Categories (specific routes before :id) ==========
  @Get('categories')
  findAllCategories() {
    return this.service.findAllCategories(false);
  }

  @Post('categories')
  createCategory(@Body() body: CreateContentLibraryCategoryDto) {
    return this.service.createCategory(body);
  }

  @Patch('categories/reorder')
  reorderCategories(@Body() body: { updates: { id: string; display_order: number }[] }) {
    return this.service.reorderCategories(body.updates);
  }

  @Get('categories/:id')
  findOneCategory(@Param('id') id: string) {
    return this.service.findOneCategory(id);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateContentLibraryCategoryDto
  ) {
    const data: { slug?: string; label?: string; icon?: string; display_order?: number } = {};
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.label !== undefined) data.label = body.label;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.display_order !== undefined) data.display_order = body.display_order;
    return this.service.updateCategory(id, data);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }

  // ========== Items ==========
  /** Admin: tüm kullanıcı yüklemeleri */
  @Get('user-uploads')
  findUserUploads() {
    return this.service.findUserUploads();
  }

  /** Giriş yapan kullanıcının sadece kendi yüklemeleri (resim/video) */
  @Get('my-uploads')
  findMyUploads(@CurrentUser() user: { id?: string }) {
    return this.service.findMyUploads(user?.id || '');
  }

  @Post('reorder')
  reorderItems(@Body() body: { updates: { id: string; display_order: number }[] }) {
    return this.service.reorder(body.updates);
  }

  @Post('remove-duplicates-by-name')
  removeDuplicatesByName() {
    return this.service.removeDuplicatesByName();
  }

  @Post()
  create(@Body() createDto: CreateContentLibraryItemDto, @CurrentUser() user?: { id: string }) {
    return this.service.create(createDto, user?.id);
  }

  @Get()
  findAll(@Query('category') category?: string, @Query('type') type?: string) {
    if (category || type) {
      return this.service.findAll(category, type);
    }
    return this.service.findAllGrouped();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateContentLibraryItemDto) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
