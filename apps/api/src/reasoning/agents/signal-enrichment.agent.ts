import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import { GoogleMapsTool } from '../tools/google-maps.tool';
import OpenAI from 'openai';
import { GEMINI_FLASH_MODEL } from '../../common/constants';

export type SignalSeverityInput = {
  text: string;
  source: string;
  lat?: string
  lng?: string
  city_hint?: string
};

export type SignalSeverityOutput = {
  severity: 'low' | 'medium' | 'high';
  urgency_score: number; // 0-1
  reason: string;
  location: string | null;
  event_type: string;
  lat: string | null;
  lng: string | null;
};

@Injectable()
export class SignalEnrichmentAgent extends GeminiAgent<SignalSeverityInput, SignalSeverityOutput> {
  protected readonly logger = new Logger(SignalEnrichmentAgent.name);
  protected readonly role = 'SignalEnrichment';
  protected readonly model = GEMINI_FLASH_MODEL;

  constructor(
    gemini: OpenAI,
    private readonly googleMapsTool: GoogleMapsTool
  ) {
    super(gemini);
    this.tools = [this.googleMapsTool.definition];
  }

  protected async executeTool(name: string, args: any): Promise<any> {
    if (name === 'geocode_location') {
      return this.googleMapsTool.geocode(args.address);
    }
    throw new Error(`Unknown tool: ${name}`);
  }


  async runBatch(inputs: SignalSeverityInput[]): Promise<{ results: SignalSeverityOutput[] }> {
    if (inputs.length === 0) return { results: [] };

    const batchPrompt = `
      ROLE: Emergency Triage.
      TASK: Rate the severity/urgency of multiple incoming signals.

      SIGNALS TO ANALYZE:
      ${inputs.map((input, index) => `
      --- SIGNAL ID: ${index} ---
      SOURCE: ${input.source}
      TEXT: ${input.text}
      LOCATION HINT: lat:${input.lat}, lng:${input.lng}, city:${input.city_hint}
      `).join('\n')}

      GUIDELINES:
      - TIMEZONE: UTC+7 (WIB).
      - CURRENT_SYSTEM_TIME: ${new Date().toISOString()} (UTC) / ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} (WIB)
      - Classify EACH signal independently.
      - Return an ARRAY of objects, matching the order of input signals.
      - LOCATION CHECK: REJECT any signal clearly outside of INDONESIA (e.g. Kuala Lumpur, New York). Set severity to 'low' and reason to 'Outside Indonesia'.

      OUTPUT JSON:
      {
        "results": [
          {
            "id": 0,
            "severity": "low | medium | high",
            "urgency_score": 0.0-1.0,
            "reason": "Max 5 words",
            "location": "Format must be '{City}, {Province}'. Example: 'Bandung, Jawa Barat'. NEVER return just 'Indonesia' or generic country names. If unknown city or outside Indonesia, return null.",
            "event_type": "REQUIRED - Must be one of: flood | fire | earthquake | tsunami | volcano | landslide | whirlwind | tornado. Choose the closest match. flood=flood/heavy rain/flash flood, fire=wildfire/building fire/gas leak, earthquake=earthquake/aftershock, whirlwind=cyclone/typhoon/hurricane. Use 'noise' for unlisted",
            "lat": "lat or null",
            "lng": "lng or null"
          },
          ...
        ]
      }
    `;

    try {
      this.logger.debug(`[${this.role}] Analyzing batch of ${inputs.length} signals...`);
      const completion = await this.gemini.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: batchPrompt }],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response');

      const parsed = JSON.parse(content);
      const results: SignalSeverityOutput[] = parsed.results || [];

      // Post-process: Geocode signals that have location but no lat/lng
      for (const result of results) {
        if (!result.lat && !result.lng && result.location) {
          try {
            this.logger.debug(`[${this.role}] Geocoding: ${result.location}`);
            const geocodeResult = await this.googleMapsTool.geocode(result.location);
            if ('lat' in geocodeResult && 'lng' in geocodeResult) {
              result.lat = String(geocodeResult.lat);
              result.lng = String(geocodeResult.lng);
              this.logger.debug(`[${this.role}] Geocoded ${result.location} -> ${result.lat}, ${result.lng}`);
            }
          } catch (err) {
            this.logger.warn(`[${this.role}] Geocoding failed for ${result.location}`, err);
          }
        }
      }

      return { results };

    } catch (error) {
      this.logger.error('Batch analysis failed', error);
      // Fallback: return low severity with 'noise' to skip incident creation
      // Signals will be persisted for review but not processed into incidents
      return {
        results: inputs.map((input) => ({
          severity: 'low' as const,
          urgency_score: 0,
          reason: 'Batch Analysis Failed - requires manual review',
          location: input.city_hint || null,
          event_type: 'noise', // Mark for filtering - will be saved but not processed
          lat: input.lat || null,
          lng: input.lng || null
        }))
      };
    }
  }

  buildPrompt(input: SignalSeverityInput): string {
    return `
      ROLE: Emergency Triage.
      TASK: Rate the severity/urgency of this incoming signal immediately. AND extract location and event type if possible.

      SIGNAL:
      [${input.source}] ${input.text}

      LOCATION HINT:
      - lat:  ${input.lat}
      - lng:  ${input.lng}
      - city_hint:  ${input.city_hint}

      GUIDELINES:
      - TIMEZONE: All dates and times are in UTC+7 (Western Indonesia Time / WIB).
      - CURRENT_SYSTEM_TIME: ${new Date().toISOString()} (UTC) / ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} (WIB)
      - HIGH: Life-threatening, verified disaster, "HELP", "SOS", widespread destruction.
      - MEDIUM: Property damage, potential threat, warning signs.
      - LOW: News discussion, past event, joke, minor inconvenience.
      - EVENT TYPE: MUST be one of: flood, earthquake, whirlwind, tornado, fire, landslide, volcano, tsunami. Choose the closest match. If truly unrelated to disasters, set severity to "low" and urgency_score to 0.

      OUTPUT JSON:
      {
        "severity": "low | medium | high",
        "urgency_score": 0.0 to 1.0,
        "reason": "Max 5 words",
        "location": "Infer location from title/description. Format MUST be '{City}, {Province}' (e.g. 'Surabaya, Jawa Timur'). NEVER return just 'Indonesia' or generic country. If city is unknown, return null.",
        "event_type": "REQUIRED - one of: flood | fire | earthquake | tsunami | volcano | landslide | whirlwind | tornado",
        "lat": "Infer latitude from location if possible. Center of the location.",
        "lng": "Longitude from tool or null"
      }
      
      IMPORTANT: If the signal text contains a specific location (e.g. 'Fire at Pasar Senen') but you don't have coordinates, USE the 'geocode_location' tool to get accurate lat/lng.
    `;
  }
}
