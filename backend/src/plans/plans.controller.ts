import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  @Get('admin')
  @UseGuards(AuthGuard)
  findAllForAdmin(@CurrentUser() user: any) {
    return this.plansService.findAllForAdmin(user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() createPlanDto: CreatePlanDto,
    @CurrentUser() user: any,
  ) {
    return this.plansService.create(createPlanDto, user.id, user.role);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
    @CurrentUser() user: any,
  ) {
    return this.plansService.update(id, updatePlanDto, user.id, user.role);
  }
}
