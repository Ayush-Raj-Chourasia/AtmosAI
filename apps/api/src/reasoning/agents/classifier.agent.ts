import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { ObserverOutput } from './observer.agent';
import { GEMINI_PRO_MODEL } from '../../common/constants';

export type ClassifierInput = ObserverOutput;

export type ClassifierOutput = {
  hypotheses: {
    event_type: string;
    description: string;
    likelihood: number; // 0-1
    supporting_evidence: string[];
  }[];
};

@Injectable()
export class ClassifierAgent extends GeminiAgent<ClassifierInput, ClassifierOutput> {
  protected readonly logger = new Logger(ClassifierAgent.name);
  protected readonly role = 'Classifier';
  protected readonly model = GEMINI_PRO_MODEL;

  constructor(gemini: OpenAI) {
    super(gemini);
  }

  buildPrompt(input: ClassifierInput): string {
    return `
      ROLE: Hypothesizer (The Believer).
      TASK: Generate plausible hypotheses explaining the observations. Be creative but grounded.
      CURRENT_SYSTEM_TIME: ${new Date().toISOString()} (UTC) / ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} (WIB)
      GEOGRAPHIC CONSTRAINT: Only consider events within INDONESIA. If observations suggest foreign location, propose 'other' or 'irrelevant' with explanation.
      
      OBSERVATIONS:
      ${JSON.stringify(input)}

      OUTPUT JSON:
      {
        "hypotheses": [
          {
            "event_type": "disaster type (flood, fire, earthquake, volcano, etc)",
            "description": "What is happening? Mention if it is outside Indonesia.",
            "likelihood": 0.0 to 1.0,
            "supporting_evidence": ["Fact 1", "Fact 2"]
          }
        ]
      }
    `;
  }
}
