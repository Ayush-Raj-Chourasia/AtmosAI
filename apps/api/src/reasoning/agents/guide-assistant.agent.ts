import { Injectable, Logger } from '@nestjs/common';
import { GeminiAgent } from './base.agent';
import OpenAI from 'openai';
import { GEMINI_PRO_MODEL } from '../../common/constants';

export type GuideAssistantInput = {
  query: string;
  context: string; // Retrieved guide content
  lang: 'en' | 'id';
};

export type GuideAssistantOutput = {
  answer: string;
  sources: { id: string; title: string }[];
  confidence: number;
  suggested_action?: string;
};

@Injectable()
export class GuideAssistantAgent extends GeminiAgent<GuideAssistantInput, GuideAssistantOutput> {
  protected readonly logger = new Logger(GuideAssistantAgent.name);
  protected readonly role = 'GuideAssistant';
  protected readonly model = GEMINI_PRO_MODEL;

  constructor(gemini: OpenAI) {
    super(gemini);
  }

  buildPrompt(input: GuideAssistantInput): string {
    const langInstructions = input.lang === 'id' 
      ? 'Respond in Bahasa Indonesia. Use clear, simple language suitable for emergency situations.'
      : 'Respond in English. Use clear, simple language suitable for emergency situations.';

    return `
ROLE: Disaster Safety Assistant
You are a helpful assistant that answers questions about disaster preparedness and safety.
Your responses must be grounded in the provided guide content only.

${langInstructions}

IMPORTANT RULES:
1. Only answer based on the provided CONTEXT below. Do not make up information.
2. If the context doesn't contain relevant information, say so politely and suggest what topics you can help with.
3. Keep responses concise and actionable - this may be used during emergencies.
4. Use bullet points or numbered lists for step-by-step instructions.
5. If the question is about an ongoing emergency, prioritize immediate safety actions.

CONTEXT (Guide Content):
${input.context}

USER QUESTION:
${input.query}

OUTPUT JSON:
{
  "answer": "Your helpful response with safety information",
  "sources": [{"id": "guide-uuid", "title": "Guide Title"}],
  "confidence": 0.0 to 1.0 (how confident you are that the answer is complete and accurate),
  "suggested_action": "Optional: immediate action if this is an emergency situation"
}
    `.trim();
  }
}
