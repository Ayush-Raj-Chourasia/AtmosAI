import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { ObserverOutput } from './observer.agent';
import { ClassifierOutput } from './classifier.agent';
import { GEMINI_PRO_MODEL } from '../../common/constants';

/**
 * Source breakdown for multi-vector detection
 */
export type SourceBreakdown = {
  official: number;      // Count of official sources (bmkg, etc.)
  user_report: number;   // Direct user reports
  social_media: number;  // TikTok, Twitter, etc.
  news: number;          // RSS/News articles
  total: number;         // Total signals
  unique_sources: string[]; // List of unique source names
};

export type SkepticInput = {
  observations: ObserverOutput;
  hypotheses: ClassifierOutput;
  source_breakdown?: SourceBreakdown; // Optional for backward compatibility
};

export type SkepticOutput = {
  concerns: string[];
  contradictions: string[];
  alternative_explanations: string[];
  assessment: string;
  // Multi-vector detection fields
  source_diversity_assessment: 'single_source' | 'weak_corroboration' | 'moderate_corroboration' | 'strong_corroboration';
  confidence_adjustment: number; // -0.3 to +0.2
  multi_vector_flags: string[]; // e.g. ['single_source_only', 'possible_viral_content', 'official_source_present']
};

@Injectable()
export class SkepticAgent extends GeminiAgent<SkepticInput, SkepticOutput> {
  protected readonly logger = new Logger(SkepticAgent.name);
  protected readonly role = 'Skeptic';
  protected readonly model = GEMINI_PRO_MODEL;

  constructor(gemini: OpenAI) {
    super(gemini);
  }

  buildPrompt(input: SkepticInput): string {
    const sourceBreakdownSection = input.source_breakdown
      ? `
      SOURCE BREAKDOWN (Multi-Vector Analysis):
      - Official Sources (e.g., BMKG): ${input.source_breakdown.official}
      - User Reports: ${input.source_breakdown.user_report}
      - Social Media: ${input.source_breakdown.social_media}
      - News: ${input.source_breakdown.news}
      - Total Signals: ${input.source_breakdown.total}
      - Unique Sources: ${input.source_breakdown.unique_sources.join(', ')}
      `
      : '';

    return `
      ROLE: The Skeptic (The Critic) with Multi-Vector Awareness.
      TASK: Aggressively challenge the proposed hypotheses. Look for missing data, bias, or jumping to conclusions.
      CURRENT_SYSTEM_TIME: ${new Date().toISOString()} (UTC) / ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} (WIB)
      
      CRITICAL MULTI-VECTOR ANALYSIS REQUIREMENTS:
      1. How many INDEPENDENT sources support this hypothesis?
      2. Are sources from DIFFERENT categories (official, user, social media, news)?
      3. Is there any single point of failure in the evidence?
      4. Could this be viral misinformation spreading across platforms?
      5. Do the sources corroborate each other or just repeat the same information?

      WEIGHTING RULES:
      - Official sources (bmkg, government) have HIGHEST trust
      - Multiple independent user reports > single viral social media post
      - Cross-platform agreement (TikTok + News + User Report) is STRONGER than same-platform volume
      - Single-source incidents should receive a confidence PENALTY
      - Viral content that spreads without new information is SUSPICIOUS
      - LOCATION CHECK: Events outside INDONESIA must be challenged intensely. Confidence penalty should be severe (-0.5 to -1.0) if location is confirmed outside Indonesia.

      ${sourceBreakdownSection}
      
      OBSERVATIONS:
      ${JSON.stringify(input.observations)}
      
      PROPOSED HYPOTHESES:
      ${JSON.stringify(input.hypotheses)}

      OUTPUT JSON:
      {
        "concerns": ["List of logical gaps or weak evidence"],
        "contradictions": ["Facts that contradict the hypotheses"],
        "alternative_explanations": ["Benign explanations? e.g. Just rain, not flood"],
        "assessment": "Brief critique including multi-vector analysis.",
        "source_diversity_assessment": "single_source | weak_corroboration | moderate_corroboration | strong_corroboration",
        "confidence_adjustment": -0.3 to +0.2 (negative if single source or suspicious pattern, positive if strong multi-vector corroboration),
        "multi_vector_flags": ["Flags such as: single_source_only, possible_viral_content, official_source_present, cross_platform_agreement, temporal_mismatch, geographic_inconsistency"]
      }
    `;
  }
}
