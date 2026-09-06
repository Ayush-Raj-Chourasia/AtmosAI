import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Whitelist of allowed sort fields per endpoint to prevent SQL injection
const ALLOWED_SORT_FIELDS = {
  signals: ['created_at', 'updated_at', 'status', 'source', 'event_type'],
  incidents: ['created_at', 'updated_at', 'status', 'event_type', 'severity', 'confidence_score', 'city'],
  traces: ['created_at', 'session_id', 'incident_id'],
  evaluations: ['created_at', 'incident_id'],
  users: ['created_at', 'updated_at', 'name', 'email'],
  verifications: ['created_at', 'type', 'incident_id'],
  lifecycle: ['created_at', 'incident_id', 'to_status'],
  notifications: ['created_at', 'day'],
  tiktok_posts: ['created_at', 'author'],
} as const;

type EndpointType = keyof typeof ALLOWED_SORT_FIELDS;

function validateSortField(endpoint: EndpointType, sortBy: string | undefined, defaultField: string): string {
  if (!sortBy) {
    return defaultField;
  }
  const allowedFields = ALLOWED_SORT_FIELDS[endpoint];
  if (!(allowedFields as readonly string[]).includes(sortBy)) {
    throw new BadRequestException(`Invalid sort field: ${sortBy}. Allowed: ${allowedFields.join(', ')}`);
  }
  return sortBy;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private db() {
    return this.supabase.getClient();
  }

  // ============================================================
  // SIGNALS
  // ============================================================
  async getSignals(params: PaginationParams & { status?: string; source?: string }) {
    const { page = 1, limit = 50, sortBy, sortOrder = 'desc', status, source } = params;
    const validatedSortBy = validateSortField('signals', sortBy, 'created_at');
    const offset = (page - 1) * limit;

    let query = this.db()
      .from('signals')
      .select('*', { count: 'exact' })
      .order(validatedSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (source) query = query.eq('source', source);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('Failed to fetch signals', error);
      throw error;
    }

    return { data, total: count, page, limit };
  }

  // ============================================================
  // INCIDENTS
  // ============================================================
  async getIncidents(params: PaginationParams & { status?: string; eventType?: string }) {
    const { page = 1, limit = 50, sortBy, sortOrder = 'desc', status, eventType } = params;
    const validatedSortBy = validateSortField('incidents', sortBy, 'updated_at');
    const offset = (page - 1) * limit;

    let query = this.db()
      .from('incidents')
      .select(`
        *,
        incident_signals(signal_id),
        incident_metrics(*)
      `, { count: 'exact' })
      .order(validatedSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (eventType) query = query.eq('event_type', eventType);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('Failed to fetch incidents', error);
      throw error;
    }

    // Transform to include signal count
    const transformed = data?.map((inc: any) => ({
      ...inc,
      signal_count: inc.incident_signals?.length || 0,
      metrics: inc.incident_metrics?.[0] || null,
    }));

    return { data: transformed, total: count, page, limit };
  }

  // ============================================================
  // AI TRACES
  // ============================================================
  async getTraces(params: PaginationParams & { sessionId?: string; incidentId?: string }) {
    const { page = 1, limit = 100, sortBy, sortOrder = 'desc', sessionId, incidentId } = params;
    const validatedSortBy = validateSortField('traces', sortBy, 'created_at');
    const offset = (page - 1) * limit;

    let query = this.db()
      .from('agent_traces')
      .select('*', { count: 'exact' })
      .order(validatedSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (sessionId) query = query.eq('session_id', sessionId);
    if (incidentId) query = query.eq('incident_id', incidentId);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('Failed to fetch traces', error);
      throw error;
    }

    return { data, total: count, page, limit };
  }

  // ============================================================
  // AI EVALUATIONS
  // ============================================================
  async getEvaluations(params: PaginationParams & { incidentId?: string }) {
    const { page = 1, limit = 50, sortBy, sortOrder = 'desc', incidentId } = params;
    const validatedSortBy = validateSortField('evaluations', sortBy, 'created_at');
    const offset = (page - 1) * limit;

    let query = this.db()
      .from('ai_evaluations')
      .select('*', { count: 'exact' })
      .order(validatedSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (incidentId) query = query.eq('incident_id', incidentId);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('Failed to fetch evaluations', error);
      throw error;
    }

    return { data, total: count, page, limit };
  }

  // ============================================================
  // USERS
  // ============================================================
  async getUsers(params: PaginationParams) {
    const { page = 1, limit = 50, sortBy, sortOrder = 'desc' } = params;
    const validatedSortBy = validateSortField('users', sortBy, 'created_at');
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.db()
      .from('users')
      .select(`
        *,
        user_places:user_places!user_places_user_id_fkey(id, label)
      `, { count: 'exact' })
      .order(validatedSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to fetch users', error);
      throw error;
    }

    return { data, total: count, page, limit };
  }

  // ============================================================
  // VERIFICATIONS
  // ============================================================
  async getVerifications(params: PaginationParams & { type?: string; incidentId?: string }) {
    const { page = 1, limit = 50, sortBy, sortOrder = 'desc', type, incidentId } = params;
    const validatedSortBy = validateSortField('verifications', sortBy, 'created_at');
    const offset = (page - 1) * limit;

    let query = this.db()
      .from('verifications')
      .select(`
        *,
        users(id, name, avatar_url)
      `, { count: 'exact' })
      .order(validatedSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('type', type);
    if (incidentId) query = query.eq('incident_id', incidentId);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('Failed to fetch verifications', error);
      throw error;
    }

    return { data, total: count, page, limit };
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================
  async getLifecycle(params: PaginationParams & { incidentId?: string }) {
    const { page = 1, limit = 50, sortBy, sortOrder = 'desc', incidentId } = params;
    const validatedSortBy = validateSortField('lifecycle', sortBy, 'created_at');
    const offset = (page - 1) * limit;

    let query = this.db()
      .from('incident_lifecycle')
      .select('*', { count: 'exact' })
      .order(validatedSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (incidentId) query = query.eq('incident_id', incidentId);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('Failed to fetch lifecycle', error);
      throw error;
    }

    return { data, total: count, page, limit };
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  async getNotifications(params: PaginationParams & { tab?: 'outbox' | 'audit' | 'states' }) {
    const { page = 1, limit = 50, sortBy, sortOrder = 'desc', tab = 'outbox' } = params;
    const offset = (page - 1) * limit;

    let tableName: string;
    switch (tab) {
      case 'audit':
        tableName = 'notification_audit';
        break;
      case 'states':
        tableName = 'user_notification_state';
        break;
      default:
        tableName = 'notification_outbox';
    }

    const validatedSortBy = tab === 'audit' ? 'day' : validateSortField('notifications', sortBy, 'created_at');

    const { data, error, count } = await this.db()
      .from(tableName)
      .select('*', { count: 'exact' })
      .order(validatedSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error(`Failed to fetch ${tableName}`, error);
      throw error;
    }

    return { data, total: count, page, limit };
  }

  // ============================================================
  // TIKTOK POSTS
  // ============================================================
  async getTikTokPosts(params: PaginationParams) {
    const { page = 1, limit = 50, sortBy, sortOrder = 'desc' } = params;
    const validatedSortBy = validateSortField('tiktok_posts', sortBy, 'created_at');
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.db()
      .from('tiktok_posts')
      .select('*', { count: 'exact' })
      .order(validatedSortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to fetch tiktok posts', error);
      throw error;
    }

    return { data, total: count, page, limit };
  }

  // ============================================================
  // SYSTEM STATS
  // ============================================================
  async getStats() {
    const [signals, incidents, users, evaluations, traces] = await Promise.all([
      this.db().from('signals').select('id', { count: 'exact', head: true }),
      this.db().from('incidents').select('id', { count: 'exact', head: true }),
      this.db().from('users').select('id', { count: 'exact', head: true }),
      this.db().from('ai_evaluations').select('id', { count: 'exact', head: true }),
      this.db().from('agent_traces').select('id', { count: 'exact', head: true }),
    ]);

    // Get signals by source
    const { data: signalsBySource } = await this.db()
      .from('signals')
      .select('source')
      .then(result => {
        const counts: Record<string, number> = {};
        result.data?.forEach((s: any) => {
          counts[s.source] = (counts[s.source] || 0) + 1;
        });
        return { data: counts };
      });

    // Get incidents by status
    const { data: incidentsByStatus } = await this.db()
      .from('incidents')
      .select('status')
      .then(result => {
        const counts: Record<string, number> = {};
        result.data?.forEach((i: any) => {
          counts[i.status] = (counts[i.status] || 0) + 1;
        });
        return { data: counts };
      });

    // Recent activity (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [recentSignals, recentIncidents] = await Promise.all([
      this.db().from('signals').select('id', { count: 'exact', head: true }).gte('created_at', yesterday),
      this.db().from('incidents').select('id', { count: 'exact', head: true }).gte('created_at', yesterday),
    ]);

    return {
      totals: {
        signals: signals.count || 0,
        incidents: incidents.count || 0,
        users: users.count || 0,
        evaluations: evaluations.count || 0,
        traces: traces.count || 0,
      },
      signalsBySource,
      incidentsByStatus,
      last24h: {
        signals: recentSignals.count || 0,
        incidents: recentIncidents.count || 0,
      },
    };
  }
}
