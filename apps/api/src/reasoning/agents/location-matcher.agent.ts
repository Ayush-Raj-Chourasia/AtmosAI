import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { GEMINI_FLASH_MODEL } from '../../common/constants';

export type LocationMatcherInput = {
  location1: string;
  location2: string;
};

export type LocationMatcherOutput = {
  same_location: boolean;
  reason: string;
};

@Injectable()
export class LocationMatcherAgent extends GeminiAgent<LocationMatcherInput, LocationMatcherOutput> {
  protected readonly logger = new Logger(LocationMatcherAgent.name);
  protected readonly role = 'LocationMatcher';
  protected readonly model = GEMINI_FLASH_MODEL;

  constructor(gemini: OpenAI) {
    super(gemini);
  }

  buildPrompt(input: LocationMatcherInput): string {
    return `
ROLE: Location matching expert for disaster incident management.
TASK: Determine if two locations refer to the SAME general area/city for disaster incident grouping purposes.

LOCATION 1: "${input.location1}"
LOCATION 2: "${input.location2}"

RULES:
- Consider them SAME if they are in the same city/municipality (e.g., "Jakarta Selatan" and "South Jakarta" are SAME)
- Consider them SAME if one is a district/neighborhood within the other's city (e.g., "Kemang, South Jakarta" and "Jakarta" are SAME)
- Consider them SAME if they refer to the same administrative area with different naming conventions
- Consider them DIFFERENT if they are in different cities/municipalities (e.g., "Bandung" and "Jakarta" are DIFFERENT)
- Consider them DIFFERENT if they are in different provinces/regions
- For formatted addresses (containing street names, postal codes), focus on the city/municipality part
- Be strict: when in doubt, say DIFFERENT to avoid merging unrelated incidents

EXAMPLES:
- "Jl. Sudirman, Jakarta Pusat, DKI Jakarta" vs "Jakarta" → SAME (same city)
- "Kemang, South Jakarta, Indonesia" vs "Jakarta" → SAME (district within city)
- "Jakarta Selatan" vs "South Jakarta" → SAME (same area, different language)
- "Bandung, West Java" vs "Jakarta" → DIFFERENT (different cities)
- "Surabaya" vs "Jakarta" → DIFFERENT (different cities)

OUTPUT JSON:
{
  "same_location": true or false,
  "reason": "Brief explanation of why they are the same or different"
}
    `;
  }
}
