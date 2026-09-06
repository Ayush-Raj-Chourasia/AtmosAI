import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { MAX_SIGNAL_AGE, GEMINI_FLASH_MODEL } from '../../common/constants';

export type VideoAnalysisInput = {
  text: string;
  author: string;
  likes: number;
  videoUrl: string;
  timestamp: number; // Unix timestamp in seconds
};

export type VideoAnalysisOutput = {
  event_type: string;
  summary: string;
  reason: string;
  location_inference: string | null;
  confidence_score: number;
  severity_level: 'low' | 'medium' | 'high';
  is_real_event: boolean;
  happened_at: string;
};

@Injectable()
export class VideoAnalysisAgent extends GeminiAgent<VideoAnalysisInput, VideoAnalysisOutput> {
  protected readonly logger = new Logger(VideoAnalysisAgent.name);
  protected readonly role = 'VideoAnalysis';
  protected readonly model = GEMINI_FLASH_MODEL;

  constructor(gemini: OpenAI) {
    super(gemini);
  }

  // Not used directly because we override run, but required by abstract class
  buildPrompt(input: VideoAnalysisInput): string {
    return 'Analyzing video...';
  }

  async run(input: VideoAnalysisInput) {
    const videoTime = new Date(input.timestamp * 1000);
    const now = new Date();

    // Format constants for prompt
    const rules = Object.entries(MAX_SIGNAL_AGE)
      .map(([type, hours]) => `- ${type}: ${hours} hours`)
      .join('\n');

    const prompt = `
ROLE: Social Media Disaster Analyst.
TASK: Analyze this video post to determine if it depicts a real, current disaster event.

Analyze this social media post (TikTok) about a potential disaster in Indonesia.
Metadata:
- Caption: "${input.text}"
- Author: ${input.author}
- Likes: ${input.likes}
- Video URL: ${input.videoUrl}

TIME CONTEXT:
- Current Time: ${now.toISOString()}
- Video Created: ${videoTime.toISOString()}

FRESHNESS RULES (Max Signal Age):
${rules}

Task Details:
1. Determine the event type (flood, earthquake, whirlwind (Puting Beliung), fire, landslide, power_outage, accident, other).
2. Summarize what is visually happening (1-2 sentences).
3. Infer location (City/Province) from text/visuals if possible with this format: "City, Province".
4. Assess confidence (0.0-1.0) that this is a REAL, CURRENT disaster event.
5. Estimate severity (low/medium/high).
6. Determine the time of the event in timestamp format as "happened_at" field. Fallback to "created_at".
7. FRESHNESS CHECK: Calculate the age of the video (Current Time - happened_at). Compare with FRESHNESS RULES for the determined event type.
   - IF AGE > MAX AGE: Set "is_real_event" to false and append "[EXPIRED]" to summary.
8. LOCATION CHECK: Must be in INDONESIA. If clearly outside Indonesia (e.g. USA, Malaysia), set "is_real_event" to false and reason "Outside Indonesia".

Output JSON only:
{
  "event_type": "string",
  "summary": "string",
  "reason": "string",
  "location_inference": "string | null",
  "confidence_score": number,
  "severity_level": "low" | "medium" | "high",
  "is_real_event": boolean,
  "happened_at": string
}
    `;

    try {
      this.logger.debug(`[${this.role}] analyzing video ${input.videoUrl}...`);

      const messages: any[] = [
        { role: 'system', content: 'You are a disaster intelligence analyst.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            // Treating video URL as image_url for multimodal input as per instructions
            { type: 'image_url', image_url: { url: input.videoUrl } }
          ]
        }
      ];

      const completion = await this.gemini.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from AI');

      const result = JSON.parse(content) as VideoAnalysisOutput;

      return {
        result,
        trace: {
          step: this.role,
          input,
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
