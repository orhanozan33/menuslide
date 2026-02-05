import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { PublicService } from './public.service';
import { DisplayRateLimitService } from './display-rate-limit.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly rateLimit: DisplayRateLimitService,
  ) {}

  /**
   * Public endpoint for TV screens
   * No authentication required - uses public token
   * GET /public/screen/:publicToken?rotationIndex=0
   * Rate-limited and cached for scale (1000+ TVs).
   */
  @Get('screen/:publicToken')
  @Header('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=40')
  async getScreen(
    @Param('publicToken') publicToken: string,
    @Query('rotationIndex') rotationIndex?: string,
  ) {
    this.rateLimit.check(publicToken);
    const index = rotationIndex ? parseInt(rotationIndex, 10) : undefined;
    try {
      return await this.publicService.getScreenByToken(publicToken, index);
    } catch (err: any) {
      console.error('[PublicController] getScreen error:', err?.message || err);
      console.error('[PublicController] Stack:', err?.stack);
      throw err;
    }
  }

  /**
   * Display sayfasından periyodik heartbeat; aynı linkin birden fazla cihazda açık olup olmadığı tespit edilir
   * POST /public/screen/:publicToken/heartbeat body: { sessionId: string }
   */
  @Post('screen/:publicToken/heartbeat')
  async heartbeat(
    @Param('publicToken') publicToken: string,
    @Body() body: { sessionId?: string },
  ) {
    const sessionId = body?.sessionId && String(body.sessionId).trim();
    const result = await this.publicService.recordViewerHeartbeat(
      publicToken,
      sessionId || `anon-${Date.now()}`,
    );
    return result;
  }
}
