import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { ObserverOutput } from './observer.agent';
import { ClassifierOutput } from './classifier.agent';
import { SkepticOutput } from './skeptic.agent';
import { GEMINI_PRO_MODEL } from '../../common/constants';

export type SynthesizerInput = {
  observations: ObserverOutput;
  hypotheses: ClassifierOutput;
  critique: SkepticOutput;
};

export type SynthesizerOutput = {
  final_classification: string;
  confidence_score: number; // 0-1, calibrated
  reasoning_trace: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
};

@Injectable()
export class SynthesizerAgent extends GeminiAgent<SynthesizerInput, SynthesizerOutput> {
  protected readonly logger = new Logger(SynthesizerAgent.name);
  protected readonly role = 'Synthesizer';
  protected readonly model = GEMINI_PRO_MODEL;

  constructor(gemini: OpenAI) {
    super(gemini);
  }

  buildPrompt(input: SynthesizerInput): string {
    return `
      ROLE: The Judge.
      TASK: Weigh the Hypotheses against the Critique. Produce a final, calibrated judgment.
      
      EVIDENCE:
      ${JSON.stringify(input.observations)}
      
      ARGUMENTS (PRO):
      ${JSON.stringify(input.hypotheses)}
      
      ARGUMENTS (CON):
      ${JSON.stringify(input.critique)}

      OUTPUT JSON:
      {
        "final_classification": "flood | fire | earthquake | landslide | volcano | whirlwind | tornado | tsunami | other",
        "confidence_score": 0.0 to 1.0 (Penalize uncertain situations. If event is clearly outside Indonesia, set confidence to 0.0),
        "severity": "low | medium | high",
        "title": "Short title for map (e.g. Major Flood in CBD)",
        "description": "User-facing description.",
        "reasoning_trace": "Why you decided this, given the critique. Explicitly mention if rejected due to location outside Indonesia."
      }
    `;
  }
}
