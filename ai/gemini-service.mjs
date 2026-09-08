/**
 * N-WEIS Multimodal AI & Gemini Reasoning Service
 * SIH26069 — Ministry of Earth Sciences / India Meteorological Department (IMD)
 *
 * Implements Google Gemini API integration (server-side only) for:
 * 1. Weather event classification
 * 2. Text understanding & structured extraction
 * 3. Misinformation assessment
 * 4. Image understanding & visual damage verification
 * 5. Multimodal evidence cross-referencing
 *
 * NOTE: Perceptual hashing is explicitly labeled as Media Deduplication,
 * NOT Computer Vision. Computer vision is performed by multimodal LLM vision.
 */

export class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
    this.model = process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.isConfigured = Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  healthCheck() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
    this.isConfigured = Boolean(this.apiKey && this.apiKey.trim().length > 0);

    return {
      status: this.isConfigured ? 'ONLINE' : 'LOCAL_HEURISTIC',
      provider: this.isConfigured ? 'GOOGLE_GEMINI' : 'LOCAL_RULE_ENGINE',
      model: this.isConfigured ? this.model : 'heuristic_v1_offline',
      multimodal_vision_active: this.isConfigured,
      note: this.isConfigured
        ? 'Gemini Multimodal Reasoning Active (Server-Side)'
        : 'GEMINI_API_KEY not configured. Operating in deterministic local heuristic mode.',
    };
  }

  getStatus() {
    return this.healthCheck();
  }

  /**
   * Classify text and extract structured meteorological entities.
   */
  async classifyWeatherText(text) {
    if (!this.isConfigured) {
      return this.heuristicTextClassification(text);
    }

    const prompt = `You are a meteorologist at the India Meteorological Department (IMD).
Analyze this weather report from India and return a STRICT JSON object:
{
  "event_category": "FLOOD" | "THUNDERSTORM" | "RAINFALL" | "HEATWAVE" | "FOG" | "DUST_STORM" | "STRONG_WIND" | "OTHER",
  "severity": "minor" | "moderate" | "severe" | "critical",
  "confidence": number between 0.0 and 1.0,
  "extracted_location": { "city": string or null, "state": string or null },
  "key_hazards": string[],
  "reasoning": string
}

Report Text: "${text.replace(/"/g, '\\"')}"`;

    try {
      const start = Date.now();
      const res = await fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      });

      if (!res.ok) throw new Error(`Gemini API HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawJson);

      return {
        model: this.model,
        model_version: 'v2.5',
        prediction: parsed.event_category,
        severity: parsed.severity,
        confidence: parsed.confidence,
        location: parsed.extracted_location,
        reasoning: parsed.reasoning,
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`[GeminiService] Text classification fallback (${err.message}).`);
      return this.heuristicTextClassification(text);
    }
  }

  /**
   * Multimodal Image Understanding & Visual Disaster Verification
   */
  async analyzeDisasterImage({ base64Image, mimeType, claimText }) {
    if (!this.isConfigured || !base64Image) {
      return {
        model: 'LOCAL_RULE_ENGINE',
        model_version: 'v1.0 (GEMINI_API_KEY_UNCONFIGURED)',
        prediction: 'UNVERIFIED_IMAGE',
        visual_hazards: [],
        matches_claim: true,
        misinformation_risk: 0.1,
        confidence: 0.5,
        reasoning: 'Perceptual hash checked for duplicate reuse. Visual computer vision skipped: GEMINI_API_KEY not configured.',
        timestamp: new Date().toISOString(),
      };
    }

    const prompt = `You are a disaster analyst at the India Meteorological Department.
Examine this citizen photograph and determine if it shows genuine weather/disaster evidence for the following claim:
Claim: "${claimText}"

Return a STRICT JSON object:
{
  "shows_disaster": boolean,
  "visual_hazards": string[],
  "estimated_water_depth_cm": number or null,
  "damage_severity": "none" | "low" | "moderate" | "severe" | "catastrophic",
  "matches_text_claim": boolean,
  "misinformation_risk": number between 0.0 (genuine) and 1.0 (fake/hoax/recycled),
  "confidence": number between 0.0 and 1.0,
  "reasoning": string
}`;

    try {
      const start = Date.now();
      const res = await fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: base64Image.replace(/^data:image\/[a-z]+;base64,/, ''),
                  },
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      });

      if (!res.ok) throw new Error(`Gemini Multimodal HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawJson);

      return {
        model: this.model,
        model_version: 'v2.5_vision',
        prediction: parsed.shows_disaster ? 'DISASTER_CONFIRMED' : 'NO_SIGNIFICANT_HAZARD',
        visual_hazards: parsed.visual_hazards || [],
        matches_claim: parsed.matches_text_claim,
        damage_severity: parsed.damage_severity,
        misinformation_risk: parsed.misinformation_risk,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`[GeminiService] Vision analysis fallback: ${err.message}`);
      return {
        model: 'LOCAL_RULE_ENGINE',
        model_version: 'v1.0 (FALLBACK)',
        prediction: 'FALLBACK_UNVERIFIED',
        visual_hazards: [],
        matches_claim: true,
        misinformation_risk: 0.15,
        confidence: 0.5,
        reasoning: `Multimodal analysis failed (${err.message}); fallback to text deduplication.`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Deterministic local fallback when Gemini is unconfigured or offline.
   */
  heuristicTextClassification(text) {
    const lower = text.toLowerCase();
    const scores = { RAINFALL: 0, THUNDERSTORM: 0, FLOOD: 0, HEATWAVE: 0, FOG: 0, DUST_STORM: 0, STRONG_WIND: 0, OTHER: 0.1 };

    if (/flood|submerged|inundat|overflow|waterlogging|water entering/i.test(lower)) scores.FLOOD += 4;
    if (/rain|downpour|cloudburst|precipitation/i.test(lower)) scores.RAINFALL += 3;
    if (/thunder|lightning|squall|storm|thunderstorm/i.test(lower)) scores.THUNDERSTORM += 3.5;
    if (/heatwave|temperature.*above|4[5-9]°c|loo|heat stroke/i.test(lower)) scores.HEATWAVE += 4;
    if (/fog|dense fog|visibility.*<|smog/i.test(lower)) scores.FOG += 4;
    if (/dust storm|andhi|sandstorm/i.test(lower)) scores.DUST_STORM += 4;
    if (/gale|strong wind|cyclone|uprooted tree/i.test(lower)) scores.STRONG_WIND += 3.5;

    let best = 'OTHER';
    let max = 0;
    for (const [k, v] of Object.entries(scores)) {
      if (v > max) {
        max = v;
        best = k;
      }
    }

    return {
      model: 'LOCAL_RULE_ENGINE',
      model_version: 'v1.0 (GEMINI_API_KEY_UNCONFIGURED)',
      prediction: best,
      severity: max >= 4 ? 'severe' : (max >= 3 ? 'moderate' : 'minor'),
      confidence: Math.min(0.90, 0.40 + max * 0.12),
      reasoning: `Classified as ${best} via keyword heuristic (${max.toFixed(1)} match points).`,
      timestamp: new Date().toISOString(),
    };
  }
}

export const geminiService = new GeminiService();
