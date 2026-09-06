import { Injectable, Logger } from '@nestjs/common';
import {
  WeatherEventType,
  SignalVerificationStatus,
  SourceType,
} from '@n-weis/shared';
import { MultimodalAnalysisResult } from '../ai/multimodal.service';

export interface MisinformationAssessment {
  misinformationProbability: number; // 0.0 to 1.0
  credibilityScore: number; // 0.0 to 1.0
  verificationStatus: SignalVerificationStatus;
  reasonCodes: string[];
  explanation: string;
}

@Injectable()
export class MisinformationService {
  private readonly logger = new Logger(MisinformationService.name);

  /**
   * The Skeptic Layer: Evaluate signal authenticity against multiple fraud signals
   */
  evaluateAuthenticity(
    rawText: string,
    sourceType: SourceType,
    sourceCredibility: number,
    multimodal: MultimodalAnalysisResult,
    eventCandidate?: WeatherEventType | null,
    locationConfidence: number = 0.5,
    isOfficialCorroborated: boolean = false
  ): MisinformationAssessment {
    const reasonCodes: string[] = [];
    let riskScore = 0.05;

    // 1. Check Recycled or Fake Media
    if (multimodal.hasMedia && multimodal.isRecycledOrSuspicious) {
      riskScore += 0.70;
      reasonCodes.push('RECYCLED_MEDIA_SIGNATURE');
    }

    // 2. Check Media vs Text Consistency
    if (multimodal.hasMedia && multimodal.textMediaConsistencyScore < 0.35) {
      riskScore += 0.40;
      reasonCodes.push('MEDIA_TEXT_MISMATCH');
    }

    // 3. Source Credibility Check
    if (sourceCredibility < 0.40) {
      riskScore += 0.20;
      reasonCodes.push('LOW_CREDIBILITY_SOURCE');
    } else if (sourceCredibility >= 0.85) {
      riskScore -= 0.25;
      reasonCodes.push('HIGH_CREDIBILITY_SOURCE');
    }

    // 4. Extreme Sensationalism / Clickbait Text Analysis
    if (/(world\s*war|apocalypse|alien\s*weather|government\s*hiding|conspiracy|hoax)/i.test(rawText)) {
      riskScore += 0.50;
      reasonCodes.push('SENSATIONALIST_HOAX_MARKERS');
    }

    // 5. Geographic Plausibility
    if (locationConfidence < 0.30) {
      riskScore += 0.15;
      reasonCodes.push('VAGUE_OR_UNVERIFIED_LOCATION');
    } else {
      reasonCodes.push('LOCATION_GEOGRAPHICALLY_GROUNDED');
    }

    // 6. Official Corroboration Protection
    if (isOfficialCorroborated || sourceType === 'imd') {
      riskScore = Math.max(0.02, riskScore - 0.40);
      reasonCodes.push('OFFICIAL_METEOROLOGICAL_CORROBORATION');
    }

    const finalMisinformationProb = Number(Math.max(0.01, Math.min(0.99, riskScore)).toFixed(2));
    const finalCredibility = Number(Math.max(0.05, Math.min(1.0, sourceCredibility * (1 - (finalMisinformationProb * 0.8)))).toFixed(2));

    let verificationStatus: SignalVerificationStatus = 'UNVERIFIED';
    if (finalMisinformationProb >= 0.65) {
      verificationStatus = 'REJECTED';
    } else if (finalMisinformationProb >= 0.35) {
      verificationStatus = 'SUSPECTED';
    } else if (finalCredibility >= 0.75 && locationConfidence >= 0.70) {
      verificationStatus = 'VERIFIED';
    } else {
      verificationStatus = 'PROCESSING';
    }

    return {
      misinformationProbability: finalMisinformationProb,
      credibilityScore: finalCredibility,
      verificationStatus,
      reasonCodes,
      explanation: reasonCodes.join(' | '),
    };
  }
}
