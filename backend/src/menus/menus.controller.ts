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
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('menus')
@UseGuards(AuthGuard)
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post()
  create(
    @Body() createMenuDto: CreateMenuDto,
    @CurrentUser() user: any,
  ) {
    return this.menusService.create(createMenuDto, user.id, user.role);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query('user_id') targetUserId?: string) {
    return this.menusService.findAll(user.id, user.role, targetUserId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.menusService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMenuDto: UpdateMenuDto,
    @CurrentUser() user: any,
  ) {
    return this.menusService.update(id, updateMenuDto, user.id, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.menusService.remove(id, user.id, user.role);
  }

  @Get('stats/summary')
  getStats(@CurrentUser() user: any) {
    return this.menusService.getStats(user.id, user.role);
  }
}
