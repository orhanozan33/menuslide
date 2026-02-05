import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ScreenBlocksService } from './screen-blocks.service';
import { AuthGuard } from '../auth/auth.guard';
import { UpdateScreenBlockDto } from './dto/update-screen-block.dto';

@Controller('screen-blocks')
@UseGuards(AuthGuard)
export class ScreenBlocksController {
  constructor(private readonly service: ScreenBlocksService) {}

  @Get('screen/:screenId')
  findByScreen(@Param('screenId') screenId: string) {
    return this.service.findByScreen(screenId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updates: UpdateScreenBlockDto,
  ) {
    return this.service.update(id, updates);
  }

  @Post('batch-update')
  batchUpdate(@Body() body: { updates: Array<{ id: string; updates: UpdateScreenBlockDto }> }) {
    return this.service.batchUpdate(body.updates);
  }

  @Post('screen/:screenId/layer-order')
  updateLayerOrder(
    @Param('screenId') screenId: string,
    @Body() body: { blockOrders: Array<{ id: string; z_index: number }> },
  ) {
    return this.service.updateLayerOrder(screenId, body.blockOrders);
  }

  @Post('initialize')
  initialize(@Body() body: { screen_id: string; template_id: string }) {
    return this.service.initializeScreenBlocks(body.screen_id, body.template_id);
  }
}
