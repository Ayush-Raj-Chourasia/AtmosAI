import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ObserverAgent } from './agents/observer.agent';
import { ClassifierAgent } from './agents/classifier.agent';
import { SkepticAgent, SourceBreakdown } from './agents/skeptic.agent';
import { SynthesizerAgent } from './agents/synthesizer.agent';
import { ActionAgent } from './agents/action.agent';
import { ReasoningCacheService } from './reasoning-cache.service';
import * as crypto from 'crypto';

/**
 * Multi-Vector Detection Result
 * Contains source diversity analysis for confidence adjustment
 */
export interface MultiVectorResult {
  sourceBreakdown: SourceBreakdown;
  diversityBonus: number;
  categoryCount: number;
  hasOfficialSource: boolean;
}

@Injectable()
export class ReasoningService {
  private readonly logger = new Logger(ReasoningService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly observer: ObserverAgent,
    private readonly classifier: ClassifierAgent,
    private readonly skeptic: SkepticAgent,
    private readonly synthesizer: SynthesizerAgent,
    private readonly action: ActionAgent,
    private readonly cacheService: ReasoningCacheService,
  ) {}

  /**
   * Calculate source breakdown for multi-vector detection
   * Categorizes signals by source type for diversity analysis
   */
  calculateSourceBreakdown(signals: { source: string; text: string; created_at: string }[]): SourceBreakdown {
    const breakdown: SourceBreakdown = {
      official: 0,
      user_report: 0,
      social_media: 0,
      news: 0,
      total: signals.length,
      unique_sources: [],
    };

    const uniqueSources = new Set<string>();

    for (const signal of signals) {
      const source = signal.source.toLowerCase();
      uniqueSources.add(source);

      // Categorize by source type
      if (source === 'bmkg' || source === 'bnpb' || source === 'official') {
        breakdown.official++;
      } else if (source === 'user_report' || source === 'user') {
        breakdown.user_report++;
      } else if (source === 'social_media' || source === 'tiktok' || source === 'twitter' || source === 'instagram') {
        breakdown.social_media++;
      } else if (source === 'news' || source === 'rss') {
        breakdown.news++;
      } else {
        // Unknown sources count as user reports (conservative)
        breakdown.user_report++;
      }
    }

    breakdown.unique_sources = Array.from(uniqueSources);
    return breakdown;
  }

  /**
   * Calculate source diversity bonus for multi-vector detection
   * Returns a deterministic confidence adjustment based on source diversity
   */
  getSourceDiversityBonus(breakdown: SourceBreakdown): MultiVectorResult {
    const categories = {
      official: breakdown.official > 0,
      user: breakdown.user_report > 0,
      social: breakdown.social_media > 0,
      news: breakdown.news > 0,
    };

    const categoryCount = Object.values(categories).filter(Boolean).length;
    const hasOfficialSource = categories.official;

    let diversityBonus = 0;

    // Base diversity bonus
    if (categoryCount >= 3) {
      diversityBonus = 0.15; // Strong multi-vector corroboration
    } else if (categoryCount >= 2) {
      diversityBonus = 0.10; // Moderate corroboration
    } else if (categoryCount === 1 && breakdown.total > 1) {
      diversityBonus = 0.05; // Weak corroboration (same source, multiple signals)
    } else {
      diversityBonus = 0; // Single source, no bonus
    }

    // Official source bonus
    if (hasOfficialSource) {
      diversityBonus += 0.05;
    }

    // Penalty for single-source incidents
    if (categoryCount === 1 && breakdown.total === 1) {
      diversityBonus = -0.05;
    }

    this.logger.debug(
      `Multi-Vector Analysis: ${categoryCount} categories, ` +
      `${breakdown.total} signals, official=${hasOfficialSource}, ` +
      `diversityBonus=${diversityBonus}`
    );

    return {
      sourceBreakdown: breakdown,
      diversityBonus,
      categoryCount,
      hasOfficialSource,
    };
  }

  async runReasoningLoop(
    signals: { source: string; text: string; created_at: string }[],
    existingIncidents: { id: string; type: string; city: string }[],
    incidentId?: string
  ) {
    const sessionId = crypto.randomUUID();
    this.logger.log(`Starting Reasoning Session ${sessionId} for ${signals.length} signals`);

    try {
      // Calculate multi-vector source breakdown
      const sourceBreakdown = this.calculateSourceBreakdown(signals);
      const multiVectorResult = this.getSourceDiversityBonus(sourceBreakdown);

      this.logger.log(
        `Multi-Vector Detection: ${multiVectorResult.categoryCount} source categories, ` +
        `diversityBonus=${multiVectorResult.diversityBonus.toFixed(2)}`
      );

      // Check cache first
      const city = existingIncidents[0]?.city || 'unknown';
      const eventType = existingIncidents[0]?.type || 'other';
      const cacheKey = this.cacheService.generateCacheKey(city, eventType, signals);
      const cached = this.cacheService.get(cacheKey);

      if (cached) {
        this.logger.log(`Using cached reasoning result for session ${sessionId}`);
        return {
          ...cached,
          sessionId,
          fromCache: true,
        };
      }

      // 1. Observer
      const { result: observation, trace: t1 } = await this.observer.run({ signals });
      await this.saveTrace(sessionId, t1, incidentId);

      // 2. Classifier
      const { result: hypotheses, trace: t2 } = await this.classifier.run(observation);
      await this.saveTrace(sessionId, t2, incidentId);

      // 3. Skeptic (with multi-vector awareness)
      const { result: critique, trace: t3 } = await this.skeptic.run({
        observations: observation,
        hypotheses,
        source_breakdown: sourceBreakdown, // Pass source breakdown for multi-vector analysis
      });
      await this.saveTrace(sessionId, t3, incidentId);

      // 4. Synthesizer
      const { result: conclusion, trace: t4 } = await this.synthesizer.run({ observations: observation, hypotheses, critique });
      await this.saveTrace(sessionId, t4, incidentId);

      // Apply multi-vector diversity bonus to confidence
      const adjustedConfidence = Math.max(0, Math.min(1,
        conclusion.confidence_score + multiVectorResult.diversityBonus
      ));
      conclusion.confidence_score = adjustedConfidence;

      // 5. Action
      const { result: decision, trace: t5 } = await this.action.run({ conclusion, existingIncidents });
      await this.saveTrace(sessionId, t5, incidentId);

      const result = {
        conclusion,
        decision,
        sessionId,
        multiVector: multiVectorResult, 
      };

      // Store in cache
      this.cacheService.set(cacheKey, result);

      return result;

    } catch (error) {
      this.logger.error('Reasoning Loop Failed:', error);
      throw error;
    }
  }

  private async saveTrace(sessionId: string, trace: any, incidentId?: string) {
    // Fire and forget trace logging
    (this.supabase.getClient().from('agent_traces') as any).insert({
      session_id: sessionId,
      incident_id: incidentId,
      step: trace.step,
      input_context: trace.input,
      output_result: trace.output,
      model_used: trace.model,
      created_at: trace.timestamp
    }).then(({ error }: { error: any }) => {
      if (error) this.logger.warn('Failed to save trace:', error);
    });
  }

  /**
   * Update agent_traces with incident_id after incident creation
   * Used when runReasoningLoop is called before incident exists
   */
  async updateTracesIncidentId(sessionId: string, incidentId: string) {
    const { error } = await (this.supabase.getClient().from('agent_traces') as any)
      .update({ incident_id: incidentId })
      .eq('session_id', sessionId);

    if (error) {
      this.logger.warn(`Failed to update traces with incident_id for session ${sessionId}:`, error);
    } else {
      this.logger.debug(`Updated agent_traces for session ${sessionId} with incident_id ${incidentId}`);
    }
  }
}
