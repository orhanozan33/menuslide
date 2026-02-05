import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RemoveBackgroundService } from './remove-background.service';

@Controller('ai')
@UseGuards(AuthGuard)
export class RemoveBackgroundController {
  constructor(private readonly removeBackgroundService: RemoveBackgroundService) {}

  @Post('remove-background')
  async removeBackground(@Body() body: { image?: string; src?: string; url?: string }) {
    const imageSrc = body?.image ?? body?.src ?? body?.url;
    if (!imageSrc || typeof imageSrc !== 'string') {
      throw new HttpException(
        'Görsel verisi gerekli (image, src veya url)',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const dataUrl = await this.removeBackgroundService.removeBackground(imageSrc);
      return { dataUrl };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Arka plan kaldırılamadı';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
