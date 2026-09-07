import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { EventMapQueryParams } from '@n-weis/shared';

@Controller(['incidents', 'events', 'api/v1/events'])
export class EventsController {
  constructor(private readonly db: DatabaseService) {}

  /**
   * GET /api/v1/events
   * Returns list of weather events with optional filtering
   */
  @Get()
  async getEvents(@Query() params: EventMapQueryParams) {
    const events = await this.db.getEvents(params);
    return {
      success: true,
      count: events.length,
      data: events,
    };
  }

  /**
   * GET /api/v1/events/map
   * Spatial viewport query for GIS Map
   */
  @Get('map')
  async getMapEvents(@Query() params: EventMapQueryParams) {
    const events = await this.db.getEvents(params);
    return events;
  }

  /**
   * GET /api/v1/events/:id
   * Single event intelligence detail
   */
  @Get(':id')
  async getEventById(@Param('id') id: string) {
    const event = await this.db.getEventById(id);
    if (!event) {
      throw new NotFoundException(`Weather event with ID ${id} not found.`);
    }

    const evidence = await this.db.getEventEvidence(id);
    const verifications = await this.db.getVerificationRecords(id);

    return {
      success: true,
      data: {
        ...event,
        evidence,
        verifications,
      },
    };
  }

  /**
   * GET /api/v1/events/:id/evidence
   * Returns corroborating evidence graph
   */
  @Get(':id/evidence')
  async getEventEvidence(@Param('id') id: string) {
    const evidence = await this.db.getEventEvidence(id);
    return {
      success: true,
      eventId: id,
      count: evidence.length,
      data: evidence,
    };
  }

  /**
   * GET /api/v1/events/:id/timeline
   * Chronological incident timeline
   */
  @Get(':id/timeline')
  async getEventTimeline(@Param('id') id: string) {
    const event = await this.db.getEventById(id);
    if (!event) {
      throw new NotFoundException(`Weather event with ID ${id} not found.`);
    }

    const timeline = [
      {
        time: event.first_detected_at,
        stage: 'DETECTED',
        description: `Initial signal cluster detected near ${event.city}, ${event.state}.`,
      },
      {
        time: event.last_updated_at,
        stage: 'CORROBORATED',
        description: `Corroborated across ${event.signal_count} independent observation vectors.`,
      },
    ];

    if (event.verified_at) {
      timeline.push({
        time: event.verified_at,
        stage: 'VERIFIED',
        description: `Verified with ${(event.confidence_score * 100).toFixed(0)}% confidence score.`,
      });
    }

    if (event.resolved_at) {
      timeline.push({
        time: event.resolved_at,
        stage: 'RESOLVED',
        description: 'Atmospheric conditions normalized; incident closed.',
      });
    }

    return {
      success: true,
      eventId: id,
      timeline,
    };
  }
}
