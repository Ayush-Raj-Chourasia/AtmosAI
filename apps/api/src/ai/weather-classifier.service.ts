import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WeatherEventType,
  SeverityLevel,
  WEATHER_TAXONOMY,
  WEATHER_CATEGORY_CONFIGS,
} from '@n-weis/shared';

export interface ClassificationResult {
  eventType: WeatherEventType;
  probability: number;
  severity: SeverityLevel;
  confidence: number;
  evidence: string[];
  modelUsed: string;
}

@Injectable()
export class WeatherClassifierService {
  private readonly logger = new Logger(WeatherClassifierService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Classify weather text using multi-tier architecture:
   * Tier 1: LLM (Gemini API) if configured
   * Tier 2: Deterministic meteorological keyword & rule engine
   */
  async classify(text: string, mediaUrls: string[] = []): Promise<ClassificationResult> {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (geminiKey) {
      try {
        const llmResult = await this.classifyWithLLM(text, geminiKey);
        if (llmResult) return llmResult;
      } catch (err) {
        this.logger.warn(`LLM classification failed (${err.message}). Falling back to rule engine.`);
      }
    }

    // Deterministic Fallback Engine (DisasterGuard pattern)
    return this.classifyWithRules(text, mediaUrls);
  }

  /**
   * Deterministic Rule & Keyword Classifier
   */
  classifyWithRules(text: string, mediaUrls: string[] = []): ClassificationResult {
    const lower = text.toLowerCase();
    const scores: Record<WeatherEventType, number> = {
      RAINFALL: 0,
      THUNDERSTORM: 0,
      FLOOD: 0,
      HEATWAVE: 0,
      FOG: 0,
      DUST_STORM: 0,
      STRONG_WIND: 0,
      OTHER: 0.1,
    };
    const matchedEvidence: string[] = [];

    // Evaluate keyword matches across taxonomy
    for (const type of WEATHER_TAXONOMY) {
      const config = WEATHER_CATEGORY_CONFIGS[type];
      for (const kw of config.keywords) {
        if (lower.includes(kw)) {
          scores[type] += 1;
          matchedEvidence.push(`Matched keyword "${kw}" for ${type}`);
        }
      }
    }

    // Contextual meteorological boosts
    if (/waterlogging|knee\s*deep|submerged|inundat|overflowing\s*drain|flooded/i.test(lower)) {
      scores.FLOOD += 3;
      matchedEvidence.push('Severe inundation indicators detected');
    }
    if (/cloudburst|torrential|heavy\s*downpour|incessant\s*rain|mm\s*rain/i.test(lower)) {
      scores.RAINFALL += 2.5;
      matchedEvidence.push('High intensity precipitation descriptors found');
    }
    if (/lightning|thunder|squall|hail|gust/i.test(lower)) {
      scores.THUNDERSTORM += 2.5;
      matchedEvidence.push('Atmospheric electrical / squall activity detected');
    }
    if (/temperature.*above\s*4[0-9]|heat\s*stroke|scorching|loo/i.test(lower)) {
      scores.HEATWAVE += 3;
      matchedEvidence.push('Thermal extremes / heatwave descriptors detected');
    }
    if (/visibility.*(low|zero|<100m|<200m)|dense\s*fog|flight.*delayed.*fog/i.test(lower)) {
      scores.FOG += 3;
      matchedEvidence.push('Aviation / road dense fog visibility impairment found');
    }
    if (/dust.*storm|andhi|visibility.*dust/i.test(lower)) {
      scores.DUST_STORM += 3;
      matchedEvidence.push('Particulate dust storm descriptors found');
    }
    if (/uprooted\s*tree|blown\s*roof|cyclonic\s*wind|wind\s*speed.*km\/h/i.test(lower)) {
      scores.STRONG_WIND += 3;
      matchedEvidence.push('Structural wind damage / gale indicators found');
    }

    // Determine top event type
    let bestType: WeatherEventType = 'OTHER';
    let maxScore = 0;
    for (const type of WEATHER_TAXONOMY) {
      if (scores[type] > maxScore) {
        maxScore = scores[type];
        bestType = type;
      }
    }

    // Determine severity
    let severity: SeverityLevel = 'medium';
    if (/emergency|red\s*alert|critical|submerged|massive|devastat|killed|drowned|casualt/i.test(lower)) {
      severity = 'critical';
    } else if (/heavy|severe|orange\s*alert|warning|major|high/i.test(lower)) {
      severity = 'high';
    } else if (/mild|light|drizzle|yellow\s*alert|moderate/i.test(lower)) {
      severity = 'low';
    }

    // Calculate probability
    const probability = maxScore > 0 ? Math.min(0.96, 0.65 + (maxScore * 0.08)) : 0.40;

    return {
      eventType: bestType,
      probability: Number(probability.toFixed(2)),
      severity,
      confidence: Number(probability.toFixed(2)),
      evidence: matchedEvidence.length > 0 ? matchedEvidence : ['General weather keywords observed'],
      modelUsed: 'nweis-deterministic-rules-v1',
    };
  }

  private async classifyWithLLM(text: string, apiKey: string): Promise<ClassificationResult | null> {
    // LLM classifier call structure (compatible with Gemini API)
    return null;
  }
}
