import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { AITemplateGeneratorService } from './ai-template-generator.service';
import { GenerateTemplateDto } from './dto/generate-template.dto';

@Controller('ai-templates')
@UseGuards(AuthGuard)
export class AITemplatesController {
  constructor(private readonly aiTemplateService: AITemplateGeneratorService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateTemplateDto, @CurrentUser() user: any) {
    try {
      if (!user || !user.id) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }
      return await this.aiTemplateService.generateTemplate(dto, user.id);
    } catch (error: any) {
      console.error('Error generating AI template:', error);
      console.error('Error stack:', error.stack);
      console.error('Error code:', error.code);
      console.error('Error detail:', error.detail);
      throw new HttpException(
        error.message || 'AI template oluşturulamadı',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
