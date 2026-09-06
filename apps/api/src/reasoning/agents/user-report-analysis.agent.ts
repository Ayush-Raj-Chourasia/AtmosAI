import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { extractMediaMetadata, MediaMetadata } from '../../lib/exif-extractor';
import { GEMINI_PRO_MODEL } from '../../common/constants';

export type UserReportAnalysisInput = {
  description: string;
  event_type: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  userLocation?: { lat: number; lng: number };
  mediaMetadata?: MediaMetadata;
  // Deprecated: verify backward compatibility map in run()
  exifData?: MediaMetadata; 
  confidence: 'direct_observation' | 'uncertain' | 'hearsay';
};

export type { MediaMetadata }; // Re-export for service usage

export type UserReportAnalysisOutput = {
  // Analysis results
  verified_event_type: string;
  summary: string;
  severity_level: 'low' | 'medium' | 'high';
  confidence_score: number;

  // Authenticity assessment
  authenticity: {
    score: number; // 0.0 - 1.0
    is_likely_authentic: boolean;
    concerns: string[];
    reasoning: string;
  };

  // Location inference
  location_inference: string | null;
  use_exif_location: boolean;

  // Time inference
  happened_at: string;

  // Additional context
  visual_description?: string;
  recommended_action: 'accept' | 'reject';
};

@Injectable()
export class UserReportAnalysisAgent extends GeminiAgent<UserReportAnalysisInput, UserReportAnalysisOutput> {
  protected readonly logger = new Logger(UserReportAnalysisAgent.name);
  protected readonly role = 'UserReportAnalysis';
  protected readonly model = GEMINI_PRO_MODEL;

  constructor(gemini: OpenAI) {
    super(gemini);
  }

  buildPrompt(input: UserReportAnalysisInput): string {
    return 'Analyzing user report...';
  }

  async run(input: UserReportAnalysisInput) {
    const now = new Date();

    // 1. Resolve Metadata (Provided > Extract from URL)
    let metadata = input.mediaMetadata || input.exifData; // Support both new and old field

    if (!metadata && input.mediaUrl) {
      try {
        this.logger.debug(`No metadata provided, attempting extraction from URL: ${input.mediaUrl}`);
        const extracted = await extractMediaMetadata(input.mediaUrl);
        if (extracted) {
          metadata = extracted;
          this.logger.debug('Successfully extracted metadata in Agent');
        }
      } catch (err) {
        this.logger.warn(`Agent failed to extract metadata from URL: ${err.message}`);
      }
    }

    // Capture processed metadata for trace output
    const processedInput = { ...input, mediaMetadata: metadata };

    // Build Metadata context
    let mediaContext = 'No Media Metadata available.';
    if (metadata) {
      const m = metadata;
      const isVideo = input.mediaType === 'video' || m.mimeType?.startsWith('video');

      mediaContext = `
${isVideo ? 'VIDEO' : 'IMAGE'} METADATA AVAILABLE:
- Device: ${m.make || 'Unknown'} ${m.model || ''}
- Software: ${m.software || 'Unknown'}
- Original DateTime: ${m.dateTimeOriginal || 'Not available'}
- Create Date: ${m.createDate || 'Not available'}
- GPS Coordinates: ${m.latitude && m.longitude ? `${m.latitude}, ${m.longitude}` : 'Not available'}
- Dimensions: ${m.width && m.height ? `${m.width}x${m.height}` : 'Unknown'}
${m.duration ? `- Duration: ${m.duration}s` : ''}
${m.mimeType ? `- Type: ${m.mimeType}` : ''}
`;
    }

    // Build location context
    let locationContext = '';
    if (input.userLocation) {
      locationContext = `User's current GPS location: ${input.userLocation.lat}, ${input.userLocation.lng}`;
    }
    if (metadata?.latitude && metadata?.longitude) {
      locationContext += `\nMedia Metadata GPS: ${metadata.latitude}, ${metadata.longitude}`;
    }

    const prompt = `
ROLE: User Report Analyst for Disaster Management System
TASK: Analyze a user-submitted disaster report for authenticity and relevance.

CURRENT TIME: ${now.toISOString()}

USER REPORT DETAILS:
- Reported Event Type: ${input.event_type}
- User Description: "${input.description}"
- User Confidence Level: ${input.confidence}
- Media Type: ${input.mediaType || 'None'}
${locationContext ? `\nLOCATION DATA:\n${locationContext}` : ''}

${mediaContext}

ANALYSIS TASKS:

1. VERIFY EVENT TYPE: Confirm or correct the user's classification based on their description and any visual evidence.

2. AUTHENTICITY ASSESSMENT:
   - Check if Media Metadata is present and consistent (files with metadata are more trustworthy)
   - Compare Metadata timestamp with current time (should be recent for real disasters)
   - Check if Metadata GPS matches user's reported location (if both available)
   - Assess if the media appears genuine or potentially recycled/fake
   - Consider the user's stated confidence level

   RED FLAGS:
   - No metadata on "original" media (might be processed/screenshot)
   - Metadata date is old but claimed as current event
   - Metadata location significantly differs from user's GPS location
   - Description seems generic or copy-pasted

3. SEVERITY ASSESSMENT: Rate as low/medium/high based on described impact.

4. LOCATION INFERENCE:
   - If Metadata GPS is available and seems legitimate, recommend using it
   - Otherwise, try to infer location from description or media

5. TIME INFERENCE: Determine when the event likely happened based on Metadata and description.

6. RECOMMENDATION:
   - "accept": Report appears genuine, process normally
   - "reject": Clear signs of fake/spam/irrelevant content OR location is clearly outside INDONESIA.

OUTPUT JSON:
{
  "verified_event_type": "flood|earthquake|fire|landslide|volcano|whirlwind|tornado|tsunami" (REQUIRED - pick the closest match, use "noise" for unlisted),
  "summary": "Brief summary of what the user is reporting",
  "severity_level": "low|medium|high",
  "confidence_score": 0.0-1.0,
  "authenticity": {
    "score": 0.0-1.0,
    "is_likely_authentic": true/false,
    "concerns": ["list of any concerns"],
    "reasoning": "Brief explanation of authenticity assessment"
  },
  "location_inference": "City, Province or null",
  "use_exif_location": true/false,
  "happened_at": "ISO timestamp",
  "visual_description": "What is visible in the media (if any)",
  "recommended_action": "accept|reject"
}
`;

    try {
      this.logger.debug(`[${this.role}] analyzing user report...`);

      // Build messages - with or without media
      const messages: any[] = [
        { role: 'system', content: 'You are a disaster report analyst assessing user-submitted reports for authenticity and relevance.' }
      ];

      if (input.mediaUrl && input.mediaType) {
        // Multimodal analysis with image/video
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: input.mediaUrl } }
          ]
        });
      } else {
        // Text-only analysis
        messages.push({
          role: 'user',
          content: prompt
        });
      }

      const completion = await this.gemini.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from AI');

      const result = JSON.parse(content) as UserReportAnalysisOutput;

      return {
        result,
        trace: {
          step: this.role,
          input: { ...processedInput, mediaUrl: input.mediaUrl ? '[REDACTED]' : undefined },
          output: result,
          model: this.model,
          timestamp: new Date().toISOString(),
        }
      };

    } catch (error) {
      this.logger.error(`[${this.role}] Agent Failed:`, error);
      throw error;
    }
  }
}
