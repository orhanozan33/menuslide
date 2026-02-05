import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TemplateBlockContentsService } from './template-block-contents.service';
import { CreateTemplateBlockContentDto } from './dto/create-template-block-content.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('template-block-contents')
@UseGuards(AuthGuard)
export class TemplateBlockContentsController {
  constructor(private readonly service: TemplateBlockContentsService) {}

  @Get('block/:blockId')
  async findByBlock(@Param('blockId') blockId: string) {
    try {
      const result = await this.service.findByBlock(blockId);
      return result || [];
    } catch (error: any) {
      console.error('Error finding template block contents:', error);
      console.error('Error stack:', error.stack);
      console.error('Block ID:', blockId);
      throw new HttpException(
        error.message || 'Blok içerikleri yüklenemedi',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.service.findOne(id);
    } catch (error: any) {
      console.error('Error finding template block content:', error);
      throw new HttpException(
        error.message || 'İçerik bulunamadı',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post()
  async create(@Body() dto: CreateTemplateBlockContentDto) {
    try {
      return await this.service.create(dto);
    } catch (error: any) {
      console.error('Error creating template block content:', error);
      throw new HttpException(
        error.message || 'İçerik oluşturulamadı',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    try {
      return await this.service.update(id, dto);
    } catch (error: any) {
      console.error('Error updating template block content:', error);
      throw new HttpException(
        error.message || 'İçerik güncellenemedi',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.service.remove(id);
    } catch (error: any) {
      console.error('Error removing template block content:', error);
      throw new HttpException(
        error.message || 'İçerik silinemedi',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
