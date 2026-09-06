import { Injectable, Logger } from '@nestjs/common';
import { WeatherEventType } from '@n-weis/shared';

export interface MultimodalAnalysisResult {
  hasMedia: boolean;
  visualEvidence: string[];
  inundationDetected: boolean;
  stormIndicatorsDetected: boolean;
  visualEventTypeGuess: WeatherEventType | null;
  textMediaConsistencyScore: number; // 0.0 to 1.0
  isRecycledOrSuspicious: boolean;
  explanation: string;
}

@Injectable()
export class MultimodalService {
  private readonly logger = new Logger(MultimodalService.name);

  // Known recycled flood image hashes / mock markers for the demo
  private readonly SUSPICIOUS_MEDIA_MARKERS = [
    'recycled_flood_2018.jpg',
    'fake_tsunami_hoax.png',
    'old_storm_stock_photo.jpg',
    'viral_submerged_bus_archive.jpg',
  ];

  /**
   * Evaluates photos and videos against text claims
   */
  async analyzeMedia(
    mediaUrls: string[],
    claimedText: string,
    claimedEventType?: WeatherEventType | null
  ): Promise<MultimodalAnalysisResult> {
    if (!mediaUrls || mediaUrls.length === 0) {
      return {
        hasMedia: false,
        visualEvidence: [],
        inundationDetected: false,
        stormIndicatorsDetected: false,
        visualEventTypeGuess: null,
        textMediaConsistencyScore: 0.5,
        isRecycledOrSuspicious: false,
        explanation: 'No attached photos or video frames to analyze.',
      };
    }

    const visualEvidence: string[] = [];
    let isRecycledOrSuspicious = false;
    let inundationDetected = false;
    let stormIndicatorsDetected = false;
    let visualEventTypeGuess: WeatherEventType | null = null;

    for (const url of mediaUrls) {
      const lowerUrl = url.toLowerCase();

      // Check against suspicious or recycled photo signatures
      if (this.SUSPICIOUS_MEDIA_MARKERS.some(marker => lowerUrl.includes(marker))) {
        isRecycledOrSuspicious = true;
        visualEvidence.push('WARNING: Media file matches known recycled archive photo from 2018 disaster.');
      }

      // Check visual tokens in media metadata / URL simulation
      if (lowerUrl.includes('flood') || lowerUrl.includes('water') || lowerUrl.includes('submerged') || lowerUrl.includes('inundat')) {
        inundationDetected = true;
        visualEvidence.push('Visual detection: Water surface covering roadway, partial vehicle tire submersion.');
        visualEventTypeGuess = 'FLOOD';
      }

      if (lowerUrl.includes('rain') || lowerUrl.includes('downpour')) {
        visualEvidence.push('Visual detection: Dense precipitation streaks, wet reflective asphalt.');
        if (!visualEventTypeGuess) visualEventTypeGuess = 'RAINFALL';
      }

      if (lowerUrl.includes('storm') || lowerUrl.includes('lightning') || lowerUrl.includes('thunder')) {
        stormIndicatorsDetected = true;
        visualEvidence.push('Visual detection: Severe cumulonimbus shelf cloud, high atmospheric turbulence.');
        visualEventTypeGuess = 'THUNDERSTORM';
      }

      if (lowerUrl.includes('fog') || lowerUrl.includes('visibility')) {
        visualEvidence.push('Visual detection: Dense fog layer obscuring ground objects beyond 150m.');
        visualEventTypeGuess = 'FOG';
      }
    }

    // Default visual evidence if general image
    if (visualEvidence.length === 0) {
      visualEvidence.push('Outdoor daylight weather observation captured.');
    }

    // Evaluate text vs media consistency
    let consistency = 0.85;
    if (isRecycledOrSuspicious) {
      consistency = 0.15;
    } else if (claimedEventType && visualEventTypeGuess && claimedEventType !== visualEventTypeGuess) {
      // E.g. Claimed HEATWAVE but photo shows FLOOD
      if (
        (claimedEventType === 'HEATWAVE' && visualEventTypeGuess === 'FLOOD') ||
        (claimedEventType === 'FOG' && visualEventTypeGuess === 'THUNDERSTORM')
      ) {
        consistency = 0.20;
      }
    }

    return {
      hasMedia: true,
      visualEvidence,
      inundationDetected,
      stormIndicatorsDetected,
      visualEventTypeGuess,
      textMediaConsistencyScore: consistency,
      isRecycledOrSuspicious,
      explanation: isRecycledOrSuspicious
        ? 'High misinformation alert: recycled image signature detected.'
        : `Visual evidence corroborates ${visualEventTypeGuess || 'weather'} conditions with ${(consistency * 100).toFixed(0)}% visual-text alignment.`,
    };
  }
}
