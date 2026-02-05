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
import { TemplateBlocksService } from './template-blocks.service';
import { CreateTemplateBlockDto } from './dto/create-template-block.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('template-blocks')
@UseGuards(AuthGuard)
export class TemplateBlocksController {
  constructor(private readonly service: TemplateBlocksService) {}

  @Get('template/:templateId')
  findByTemplate(@Param('templateId') templateId: string) {
    return this.service.findByTemplate(templateId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateTemplateBlockDto) {
    try {
      return await this.service.create(dto);
    } catch (err: any) {
      const code = err?.code;
      const msg = err?.message || String(err);
      if (code === '23505') {
        throw new HttpException('Bu blok indeksi zaten mevcut. Sayfayı yenileyip tekrar deneyin.', HttpStatus.CONFLICT);
      }
      if (code === '23503') {
        throw new HttpException('Geçersiz şablon. Şablon silinmiş olabilir.', HttpStatus.BAD_REQUEST);
      }
      console.error('[template-blocks] create error:', err);
      throw new HttpException(msg || 'Blok eklenemedi.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Post('batch-update')
  batchUpdate(@Body() body: { updates: Array<{ id: string; updates: { position_x?: number; position_y?: number; width?: number; height?: number; block_index?: number } }> }) {
    return this.service.batchUpdate(body.updates);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
