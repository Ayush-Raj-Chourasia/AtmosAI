import { Controller, Get, Param, Query, BadRequestException, Patch, Post, Body } from '@nestjs/common';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get('map')
  async getMap(
    @Query('minLat') minLat: string,
    @Query('minLng') minLng: string,
    @Query('maxLat') maxLat: string,
    @Query('maxLng') maxLng: string,
  ) {
    const fMinLat = parseFloat(minLat || '0');
    const fMinLng = parseFloat(minLng || '0');
    const fMaxLat = parseFloat(maxLat || '0');
    const fMaxLng = parseFloat(maxLng || '0');

    if (!this.incidentsService.isValidBBox(fMinLat, fMinLng, fMaxLat, fMaxLng)) {
      throw new BadRequestException('Invalid BBox');
    }

    return this.incidentsService.getIncidentsInViewport(fMinLat, fMinLng, fMaxLat, fMaxLng);
  }

  @Get('nearby')
  async getNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string
  ) {
    const fLat = parseFloat(lat);
    const fLng = parseFloat(lng);
    const fRadius = parseFloat(radius || '50000'); // Default 50km

    if (isNaN(fLat) || isNaN(fLng)) {
      throw new BadRequestException('Invalid lat/lng');
    }

    return this.incidentsService.getNearbyIncidents(fLat, fLng, fRadius);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.incidentsService.getIncidentById(id);
  }

  @Get(':id/signals')
  async getSignals(@Param('id') id: string) {
    return this.incidentsService.getIncidentSignals(id);
  }

  @Get(':id/lifecycle')
  async getLifecycle(@Param('id') id: string) {
    return this.incidentsService.getIncidentLifecycle(id);
  }

  @Get(':id/traces')
  async getTraces(@Param('id') id: string) {
    return this.incidentsService.getIncidentTraces(id);
  }

  @Patch(':id/resolve')
  async resolve(@Param('id') id: string) {
    return this.incidentsService.resolveIncident(id);
  }

  @Post(':id/feedback')
  async submitFeedback(
    @Param('id') id: string,
    @Body() body: { user_id: string; type: 'confirm' | 'reject' }
  ) {
    if (!body.user_id || !body.type) {
      throw new BadRequestException('user_id and type are required');
    }
    return this.incidentsService.submitFeedback(id, body.user_id, body.type);
  }
}
