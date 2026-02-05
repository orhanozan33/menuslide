import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Get()
  findAll() {
    return this.languagesService.findAll();
  }

  @Get('default')
  findDefault() {
    return this.languagesService.findDefault();
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() createLanguageDto: CreateLanguageDto,
    @CurrentUser() user: any,
  ) {
    return this.languagesService.create(createLanguageDto, user.id, user.role);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
    @CurrentUser() user: any,
  ) {
    return this.languagesService.update(id, updateLanguageDto, user.id, user.role);
  }
}
