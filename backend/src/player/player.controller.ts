import { Body, Controller, Post } from '@nestjs/common';
import { PublicLocalService } from '../public/public-local.service';

/**
 * TV uygulaması: Yayın kodu (12345, 12344) ile display URL alır.
 * POST /player/resolve body: { code, deviceId } -> { streamUrl }
 */
@Controller('player')
export class PlayerController {
  constructor(private readonly publicLocal: PublicLocalService) {}

  @Post('resolve')
  async resolve(
    @Body() body: { code?: string; deviceId?: string },
  ): Promise<{ streamUrl?: string }> {
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const result = await this.publicLocal.resolveStreamUrlByBroadcastCode(code);
    if (!result) {
      return {};
    }
    return { streamUrl: result.streamUrl };
  }
}
