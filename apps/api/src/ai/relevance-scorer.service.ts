import { Injectable } from '@nestjs/common';
import { SourceType, WeatherEventType } from '@n-weis/shared';

export interface RelevanceScoreResult {
  compositeScore: number; // 0.0 to 1.0
  textScore: number;
  spatialScore: number;
  temporalScore: number;
  sourceScore: number;
  isWeatherRelevant: boolean;
  explanation: string;
}

@Injectable()
export class RelevanceScorerService {
  /**
   * Hanny-inspired Multimodal Spatial-Temporal Relevance Engine
   */
  calculateRelevance(
    text: string,
    lat: number | null,
    lng: number | null,
    timestamp: string,
    sourceType: SourceType,
    eventCandidate?: WeatherEventType | null
  ): RelevanceScoreResult {
    // 1. Text Relevance Score
    const textScore = this.evaluateTextRelevance(text, eventCandidate);

    // 2. Spatial Relevance Score
    const spatialScore = this.evaluateSpatialRelevance(lat, lng);

    // 3. Temporal Relevance Score (Freshness decay)
    const temporalScore = this.evaluateTemporalRelevance(timestamp);

    // 4. Source Relevance Score
    const sourceScore = this.evaluateSourceScore(sourceType);

    // Composite Weighted Fusion (Hanny GeoAI formula adapted for AtmosAI)
    // 35% Text + 25% Spatial + 20% Temporal + 20% Source
    const compositeScore = Number(
      (
        textScore * 0.35 +
        spatialScore * 0.25 +
        temporalScore * 0.20 +
        sourceScore * 0.20
      ).toFixed(2)
    );

    const isWeatherRelevant = compositeScore >= 0.50 && textScore >= 0.40;

    return {
      compositeScore,
      textScore,
      spatialScore,
      temporalScore,
      sourceScore,
      isWeatherRelevant,
      explanation: `Text relevance: ${(textScore * 100).toFixed(0)}%, Spatial: ${(spatialScore * 100).toFixed(0)}%, Freshness: ${(temporalScore * 100).toFixed(0)}%, Source weight: ${(sourceScore * 100).toFixed(0)}%`,
    };
  }

  private evaluateTextRelevance(text: string, eventCandidate?: WeatherEventType | null): number {
    const lower = text.toLowerCase();
    let score = 0.2;

    const weatherTerms = ['rain', 'flood', 'water', 'storm', 'wind', 'heat', 'temperature', 'fog', 'cloud', 'lightning', 'imd', 'alert', 'weather', 'monsoon', 'cyclone', 'hail'];
    let matches = 0;
    for (const term of weatherTerms) {
      if (lower.includes(term)) matches++;
    }

    score += Math.min(0.6, matches * 0.15);

    if (eventCandidate && eventCandidate !== 'OTHER') {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  private evaluateSpatialRelevance(lat: number | null, lng: number | null): number {
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      return 0.30; // Ungeotagged default
    }

    // Inside India bounding box
    if (lat >= 6.5 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5) {
      return 0.95;
    }

    return 0.10; // Outside India territory
  }

  private evaluateTemporalRelevance(timestamp: string): number {
    try {
      const signalTime = new Date(timestamp).getTime();
      const now = Date.now();
      const diffMinutes = Math.max(0, (now - signalTime) / (1000 * 60));

      if (diffMinutes <= 30) return 1.0;
      if (diffMinutes <= 120) return 0.90;
      if (diffMinutes <= 360) return 0.75; // 6 hours
      if (diffMinutes <= 1440) return 0.50; // 24 hours
      return 0.25; // Older than a day
    } catch {
      return 0.50;
    }
  }

  private evaluateSourceScore(sourceType: SourceType): number {
    switch (sourceType) {
      case 'imd': return 1.0;
      case 'weather_api': return 0.90;
      case 'news': return 0.85;
      case 'citizen': return 0.70;
      case 'public_dataset': return 0.80;
      case 'social_media': return 0.50;
      default: return 0.50;
    }
  }
}
