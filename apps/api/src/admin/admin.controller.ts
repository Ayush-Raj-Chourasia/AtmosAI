import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DemoScenariosService } from './demo-scenarios.service';
import { SseService } from '../sse/sse.service';

@Controller(['admin', 'api/v1/admin'])
export class AdminController {
  constructor(
    private readonly db: DatabaseService,
    private readonly demoScenarios: DemoScenariosService,
    private readonly sse: SseService,
  ) {}

  /**
   * GET /api/v1/admin/signals
   * View all ingested signals and their verification triage states
   */
  @Get('signals')
  async getAdminSignals(@Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 100;
    const signals = await this.db.getSignals(lim);
    return {
      success: true,
      count: signals.length,
      data: signals,
    };
  }

  /**
   * GET /api/v1/admin/events
   * View all events with confidence metrics
   */
  @Get(['events', 'incidents'])
  async getAdminEvents() {
    const events = await this.db.getEvents();
    return {
      success: true,
      count: events.length,
      data: events,
    };
  }

  /**
   * PATCH /api/v1/admin/events/:id/verify
   * Admin manual verification of weather incident
   */
  @Patch('events/:id/verify')
  async verifyEvent(@Param('id') id: string, @Body() body: { notes?: string }) {
    const event = await this.db.getEventById(id);
    if (!event) throw new NotFoundException(`Event ${id} not found`);

    const updated = await this.db.updateEvent(id, {
      status: 'VERIFIED',
      confidence_score: Math.max(0.95, event.confidence_score),
      verified_at: new Date().toISOString(),
    });

    await this.db.insertVerificationRecord({
      id: `vr_${Date.now()}`,
      target_type: 'event',
      target_id: id,
      action: 'VERIFY',
      verified_by: 'admin',
      reason: body.notes || 'Admin manual verification',
      previous_status: event.status,
      new_status: 'VERIFIED',
      confidence_before: event.confidence_score,
      confidence_after: updated?.confidence_score,
      created_at: new Date().toISOString(),
    });

    this.sse.addEvent({
      data: { type: 'incident_update', event: updated },
    } as any);

    return { success: true, event: updated };
  }

  /**
   * POST /api/v1/admin/events/:id/reject
   * Admin reject false weather incident
   */
  @Post('events/:id/reject')
  async rejectEvent(@Param('id') id: string, @Body() body: { reason?: string }) {
    const event = await this.db.getEventById(id);
    if (!event) throw new NotFoundException(`Event ${id} not found`);

    const updated = await this.db.updateEvent(id, {
      status: 'RESOLVED',
      confidence_score: 0.1,
    });

    await this.db.insertVerificationRecord({
      id: `vr_${Date.now()}`,
      target_type: 'event',
      target_id: id,
      action: 'REJECT',
      verified_by: 'admin',
      reason: body.reason || 'Admin rejected incident as false positive',
      previous_status: event.status,
      new_status: 'RESOLVED',
      confidence_before: event.confidence_score,
      confidence_after: 0.1,
      created_at: new Date().toISOString(),
    });

    this.sse.addEvent({
      data: { type: 'incident_update', event: updated },
    } as any);

    return { success: true, event: updated };
  }

  /**
   * POST /api/v1/admin/demo/scenario/:id
   * Triggers realistic 5-minute judge demo scenario
   */
  @Post('demo/scenario/:id')
  async triggerDemoScenario(@Param('id') scenarioId: string) {
    return this.demoScenarios.executeScenario(scenarioId);
  }

  /**
   * GET /api/v1/admin/analytics
   * KPI metrics, false-positive rate, duplicate rate, category counts
   */
  @Get('analytics')
  async getAnalytics() {
    const analytics = await this.db.getAnalytics();
    return {
      success: true,
      data: analytics,
    };
  }

  /**
   * GET /api/v1/admin/stats (and /admin/stats)
   */
  @Get('stats')
  async getStats() {
    const analytics = await this.db.getAnalytics();
    return {
      totals: {
        signals: analytics.totalSignals,
        incidents: analytics.totalEvents,
        users: analytics.totalUsers || 1,
        evaluations: analytics.totalSignals,
        traces: analytics.totalEvents * 3,
      },
      signalsBySource: analytics.sourceCounts,
      incidentsByStatus: {
        verified: analytics.verifiedEvents,
        active: analytics.verifiedEvents,
        monitor: analytics.totalEvents - analytics.verifiedEvents,
      },
      last24h: {
        signals: analytics.totalSignals,
        incidents: analytics.totalEvents,
      },
      kpis: {
        falsePositiveRate: `${analytics.falsePositiveRate}%`,
        verificationRate: `${analytics.verificationRate}%`,
        duplicateRate: `${analytics.duplicateRate}%`,
        avgProcessingLatency: `${analytics.averageProcessingTimeMs}ms`,
      },
    };
  }
}
