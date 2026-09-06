import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { GEMINI_FLASH_MODEL } from '../../common/constants';

export type ObserverInput = {
  signals: { source: string; text: string; created_at: string }[];
};

export type ObserverOutput = {
  observation_summary: string;
  key_facts: string[];
  timeline: string[];
};

@Injectable()
export class ObserverAgent extends GeminiAgent<ObserverInput, ObserverOutput> {
  protected readonly logger = new Logger(ObserverAgent.name);
  protected readonly role = 'Observer';
  protected readonly model = GEMINI_FLASH_MODEL;

  constructor(gemini: OpenAI) {
    super(gemini);
  }

  buildPrompt(input: ObserverInput): string {
    return `
      ROLE: impartial Observer.
      TASK: Read the raw signals and synthesize OBJECTIVE facts. Do not hypothesize or guess.
      CONTEXT: Timeline is in UTC+7 (Western Indonesia Time).
      CURRENT_SYSTEM_TIME: ${new Date().toISOString()} (UTC) / ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} (WIB)
      
      SIGNALS:
      ${input.signals.map(s => `- [${s.source} @ ${s.created_at}]: ${s.text}`).join('\n')}

      OUTPUT JSON:
      {
        "observation_summary": "Concise summary of WHAT was seen/heard.",
        "key_facts": ["List of verifiable facts extracted"],
        "timeline": ["Chronological list of events if discernible"]
      }
    `;
  }
}
