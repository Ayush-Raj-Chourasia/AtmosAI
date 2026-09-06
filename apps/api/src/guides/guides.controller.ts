import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { GuidesService } from './guides.service';

type AskQuestionDto = {
  query: string;
  lang?: 'en' | 'id';
};

@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) { }

  @Get()
  async getAll(@Query('type') type?: string) {
    return this.guidesService.getAll(type);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.guidesService.getById(id);
  }

  @Post('ask')
  async askQuestion(@Body() dto: AskQuestionDto) {
    return this.guidesService.askQuestion(dto.query, dto.lang || 'en');
  }
}
