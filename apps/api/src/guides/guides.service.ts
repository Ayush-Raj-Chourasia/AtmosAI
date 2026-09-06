import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { GuideAssistantAgent, GuideAssistantOutput } from '../reasoning/agents/guide-assistant.agent';
import { GUIDES, Guide } from '@disaster-app/shared';

@Injectable()
export class GuidesService {
  private readonly logger = new Logger(GuidesService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly guideAssistant: GuideAssistantAgent,
  ) { }

  private get db() {
    return this.supabase.getClient() as any;
  }

  /**
   * Get all guides, optionally filtered by disaster type
   * Now returns the hardcoded guides
   */
  async getAll(type?: string): Promise<Guide[]> {
    if (type && type !== 'all') {
      return GUIDES.filter(g => g.disaster_type === type);
    }
    return GUIDES;
  }

  /**
   * Get a single guide by ID
   */
  async getById(id: string): Promise<Guide | null> {
    const guide = GUIDES.find(g => g.id === id);
    return guide || null;
  }

  /**
   * Retrieve relevant guide content for a query using keyword matching
   * In production, this could be enhanced with vector similarity search
   */
  async getRelevantContext(query: string): Promise<{ context: string; guides: Guide[] }> {
    // Determine guides to search
    const guides = GUIDES;

    if (guides.length === 0) {
      return { context: '', guides: [] };
    }

    // Simple keyword matching - find guides that match query terms
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

    // Score each guide based on keyword matches
    const scoredGuides = guides.map((guide: Guide) => {
      const textToSearch = `${guide.title} ${guide.description} ${guide.content} ${guide.disaster_type}`.toLowerCase();
      let score = 0;

      for (const keyword of keywords) {
        if (textToSearch.includes(keyword)) {
          score += 1;
          // Boost score for title/type matches
          if (guide.title.toLowerCase().includes(keyword)) score += 2;
          if (guide.disaster_type.toLowerCase().includes(keyword)) score += 2;
        }
      }

      return { guide, score };
    });

    // Sort by score and take top relevant guides
    const relevantGuides = scoredGuides
      .filter(g => g.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(g => g.guide);

    // If no matches found, return all guides as fallback context
    const selectedGuides = relevantGuides.length > 0 ? relevantGuides : guides.slice(0, 3);

    // Build context string
    const locationContext = `
      LOCATION CONTEXT: Indonesia
      EMERGENCY CONTACTS:
      - Police Emergency: 110
      - Fire Department: 113
      - Ambulance: 118
      - BNPB (National Disaster Agency): 117
      - SAR (Search and Rescue): 115
      - PLN (Electricity): 123
      - PDAM (Water): 119
    `;

    const guideContext = selectedGuides.map((g: Guide) => `
      --- GUIDE: ${g.title} (${g.disaster_type}) ---
      ID: ${g.id}
      ${g.description}

      ${g.content}
      ---
    `).join('\n');

    return { context: locationContext + '\n\n' + guideContext, guides: selectedGuides };
  }

  /**
   * Ask a question and get an AI-powered response grounded in guide content
   */
  async askQuestion(query: string, lang: 'en' | 'id' = 'en'): Promise<GuideAssistantOutput> {
    this.logger.log(`Processing question: "${query}" (lang: ${lang})`);

    // Step 1: Retrieve relevant context
    const { context, guides } = await this.getRelevantContext(query);

    if (!context) {
      return {
        answer: lang === 'id'
          ? 'Maaf, saat ini tidak ada panduan yang tersedia. Silakan coba lagi nanti.'
          : 'Sorry, no guides are currently available. Please try again later.',
        sources: [],
        confidence: 0,
      };
    }

    // Step 2: Run RAG agent
    try {
      const { result } = await this.guideAssistant.run({
        query,
        context,
        lang,
      });

      // Enhance sources with actual guide data if not properly populated
      if (result.sources.length === 0 && guides.length > 0) {
        result.sources = guides.map(g => ({ id: g.id, title: g.title }));
      }

      return result;
    } catch (error) {
      this.logger.error('Guide assistant failed:', error);
      return {
        answer: lang === 'id'
          ? 'Maaf, terjadi kesalahan saat memproses pertanyaan Anda. Silakan coba lagi.'
          : 'Sorry, an error occurred while processing your question. Please try again.',
        sources: guides.map(g => ({ id: g.id, title: g.title })),
        confidence: 0,
      };
    }
  }
}
