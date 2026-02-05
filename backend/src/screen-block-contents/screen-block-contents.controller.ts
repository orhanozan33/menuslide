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
import { ScreenBlockContentsService } from './screen-block-contents.service';
import { CreateScreenBlockContentDto } from './dto/create-screen-block-content.dto';
import { UpdateScreenBlockContentDto } from './dto/update-screen-block-content.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('screen-block-contents')
@UseGuards(AuthGuard)
export class ScreenBlockContentsController {
  constructor(private readonly service: ScreenBlockContentsService) {}

  @Get('screen-block/:screenBlockId')
  findByScreenBlock(@Param('screenBlockId') screenBlockId: string) {
    return this.service.findByScreenBlock(screenBlockId);
  }

  @Get('block/:blockId')
  findByBlock(@Param('blockId') blockId: string) {
    return this.service.findByScreenBlock(blockId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() createDto: CreateScreenBlockContentDto) {
    try {
      // Base64 boyut kontrolü: resim 5MB, video 90MB
      const maxUrlSize = createDto.content_type === 'video' ? 90 * 1024 * 1024 : 5 * 1024 * 1024;
      if (createDto.image_url && createDto.image_url.length > maxUrlSize) {
        throw new HttpException(
          createDto.content_type === 'video'
            ? 'Video çok büyük (maksimum ~90MB). Lütfen daha küçük bir video seçin.'
            : 'Resim çok büyük (maksimum 5MB). Lütfen daha küçük bir resim seçin.',
          HttpStatus.BAD_REQUEST
        );
      }

      // screen_block_id validation
      if (!createDto.screen_block_id) {
        throw new HttpException(
          'screen_block_id gerekli',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.service.create(createDto);
    } catch (error: any) {
      console.error('Error creating screen block content:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'İçerik oluşturulamadı',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateScreenBlockContentDto) {
    try {
      // Base64 boyut kontrolü: resim 5MB, video 90MB
      const maxUrlSize = updateDto.content_type === 'video' ? 90 * 1024 * 1024 : 5 * 1024 * 1024;
      if (updateDto.image_url && updateDto.image_url.length > maxUrlSize) {
        throw new HttpException(
          updateDto.content_type === 'video'
            ? 'Video çok büyük (maksimum ~90MB). Lütfen daha küçük bir video seçin.'
            : 'Resim çok büyük (maksimum 5MB). Lütfen daha küçük bir resim seçin.',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.service.update(id, updateDto);
    } catch (error: any) {
      console.error('Error updating screen block content:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'İçerik güncellenemedi',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
