import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { GEMINI_FLASH_MODEL } from '../../common/constants';

export interface NewsAnalysisInput {
  title: string;
  description: string;
  content?: string;
  pubDate: string;
  source: string;
  link: string;
}

export interface NewsAnalysisResult {
  is_disaster_related: boolean;
  is_current_event: boolean;
  is_real_event: boolean;
  confidence_score: number;
  event_type: string | null;
  location_inference: string | null;
  summary: string | null;
  happened_at: string | null;
  reason: string;
}

@Injectable()
export class NewsAnalysisAgent extends GeminiAgent<NewsAnalysisInput, NewsAnalysisResult> {
  protected readonly logger = new Logger(NewsAnalysisAgent.name);
  protected readonly role = 'NewsAnalysis';
  protected readonly model = GEMINI_FLASH_MODEL;

  constructor(gemini: OpenAI) {
    super(gemini);
  }

  buildPrompt(input: NewsAnalysisInput): string {
    // Get current time in UTC+7 (Indonesia Western Time)
    const nowUtc7 = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('Z', '+07:00');

    return `
ROLE: Disaster Intelligence Analyst.
TASK: Analyze Indonesian news articles to identify REAL, CURRENT disaster events.

TIMEZONE CONTEXT:
- Current time: ${nowUtc7} (UTC+7 / Western Indonesia Time)
- All news publication times are in UTC+7
- "Current event" means it happened within the last 24-48 hours relative to current time
- Output happened_at in ISO format with UTC+7 offset (e.g., "2025-01-31T14:30:00+07:00")

You are a disaster intelligence analyst specializing in Indonesian news. Your task is to analyze news articles and determine:
1. Is this about a real disaster event (not speculation, prevention tips, or historical recap)?
2. Is this a CURRENT/ONGOING event (not old news being reshared)?
3. What type of disaster is it?
4. Where is it happening (city/region in Indonesia)?

You must be SKEPTICAL. Many articles are:
- Old news being republished
- General disaster preparedness articles
- Historical retrospectives
- Speculative warnings

Only mark as real and current if the article describes an ACTIVE incident with specific details.

Analyze this news article:

Title: ${input.title}
Description: ${input.description}
${input.content ? `Content: ${input.content.substring(0, 2000)}` : ''}
Published (UTC+7): ${input.pubDate}
Source: ${input.source}
Link: ${input.link}

Respond in JSON format:
{
  "is_disaster_related": boolean,
  "is_current_event": boolean,
  "is_real_event": boolean,
  "confidence_score": 0.0-1.0,
  "event_type": "flood|earthquake|fire|landslide|tsunami|volcano|whirlwind|tornado" (REQUIRED if is_real_event=true, pick closest match) or noise,
  "location_inference": "City, Province" format. MUST be in INDONESIA. If outside Indonesia, set is_real_event=false.
  "summary": "Brief 1-2 sentence summary of the incident" or null,
  "happened_at": "ISO timestamp with +07:00 offset" or null,
  "reason": "Brief explanation of your assessment"
}`;
  }
}
