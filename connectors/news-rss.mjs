/**
 * N-WEIS Live News RSS Connector (connectors/news-rss.mjs)
 * SIH26069 National Weather Big Data Analytics Platform
 * Connects to live Indian meteorological news RSS feeds and normalizes news bulletins
 */

import crypto from 'crypto';

export class NewsRssConnector {
  constructor() {
    this.sourceId = 'src_toi_01';
    this.sourceName = 'Times of India / Indian News Weather RSS';
    this.sourceType = 'news';
    this.baseReliability = 0.85;

    this.telemetry = {
      status: 'STANDBY',
      lastFetch: null,
      lastError: null,
      recordsFetched: 0,
      recordsAccepted: 0,
      latencyMs: 0,
      mode: 'LIVE'
    };

    this.rssUrls = [
      'https://news.google.com/rss/search?q=weather+IMD+India+rain+flood+when:2d&hl=en-IN&gl=IN&ceid=IN:en'
    ];

    this.cities = [
      { city: 'Guwahati', state: 'Assam', lat: 26.18, lng: 91.75 },
      { city: 'Mumbai', state: 'Maharashtra', lat: 19.08, lng: 72.88 },
      { city: 'New Delhi', state: 'Delhi', lat: 28.61, lng: 77.21 },
      { city: 'Delhi', state: 'Delhi', lat: 28.61, lng: 77.21 },
      { city: 'Kolkata', state: 'West Bengal', lat: 22.57, lng: 88.36 },
      { city: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lng: 80.27 },
      { city: 'Bengaluru', state: 'Karnataka', lat: 12.97, lng: 77.59 },
      { city: 'Jaipur', state: 'Rajasthan', lat: 26.91, lng: 75.79 },
      { city: 'Bhubaneswar', state: 'Odisha', lat: 20.30, lng: 85.82 },
      { city: 'Patna', state: 'Bihar', lat: 25.60, lng: 85.14 },
      { city: 'Shimla', state: 'Himachal Pradesh', lat: 31.10, lng: 77.17 }
    ];
  }

  async healthCheck() {
    return {
      sourceId: this.sourceId,
      sourceName: this.sourceName,
      sourceType: this.sourceType,
      status: this.telemetry.status,
      mode: this.telemetry.mode,
      lastFetch: this.telemetry.lastFetch,
      latencyMs: this.telemetry.latencyMs,
      recordsFetched: this.telemetry.recordsFetched,
      recordsAccepted: this.telemetry.recordsAccepted,
      reliability: this.baseReliability
    };
  }

  parseXmlItems(xmlText) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null && items.length < 15) {
      const block = match[1];
      const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
      const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
      const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim();
      const description = (block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '').replace(/<[^>]*>?/gm, '').trim();

      if (title) {
        items.push({ title, link, pubDate, description });
      }
    }
    return items;
  }

  classifyArticle(text) {
    const lower = text.toLowerCase();
    if (/flood|waterlogging|submerged|deluge|inundat/i.test(lower)) return 'FLOOD';
    if (/thunderstorm|lightning|squall|hail/i.test(lower)) return 'THUNDERSTORM';
    if (/heavy rain|cloudburst|downpour|rainfall|monsoon/i.test(lower)) return 'RAINFALL';
    if (/heatwave|extreme heat|scorching|loo|temperatures surge/i.test(lower)) return 'HEATWAVE';
    if (/fog|low visibility|dense fog/i.test(lower)) return 'FOG';
    if (/dust storm|andhi/i.test(lower)) return 'DUST_STORM';
    if (/cyclone|gale wind|gusty wind|squally wind/i.test(lower)) return 'STRONG_WIND';
    return 'OTHER';
  }

  async fetchSignals() {
    const signals = [];
    const start = Date.now();

    for (const url of this.rssUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) continue;

        const xml = await res.text();
        const items = this.parseXmlItems(xml);
        this.telemetry.recordsFetched += items.length;

        for (const item of items) {
          const candidate = this.classifyArticle(`${item.title} ${item.description}`);
          if (candidate === 'OTHER') continue; // Only process weather-relevant news

          // Detect location from text
          let matchedCity = this.cities[0];
          for (const c of this.cities) {
            const regex = new RegExp(`\\b${c.city}\\b`, 'i');
            if (regex.test(item.title) || regex.test(item.description)) {
              matchedCity = c;
              break;
            }
          }

          const idHash = crypto.createHash('md5').update(item.link || item.title).digest('hex').slice(0, 10);
          const signal = {
            source_id: this.sourceId,
            source_type: this.sourceType,
            source_name: 'Indian National News Wire',
            external_id: `news_${idHash}`,
            text: `[NEWS WIRE] ${item.title}`,
            city: matchedCity.city,
            state: matchedCity.state,
            latitude: matchedCity.lat,
            longitude: matchedCity.lng,
            location_confidence: 0.85,
            location_method: 'metadata',
            event_candidate: candidate,
            relevance_score: 0.88,
            credibility_score: this.baseReliability,
            misinformation_score: 0.05,
            verification_status: 'VERIFIED',
            hashtags: ['#NewsReport', '#IMD', '#Weather'],
            raw_payload: {
              url: item.link,
              pub_date: item.pubDate,
              summary: item.description
            }
          };

          signals.push(signal);
          this.telemetry.recordsAccepted++;
        }
      } catch (err) {
        this.telemetry.lastError = err.message;
        console.warn(`[NewsRssConnector] RSS fetch error: ${err.message}`);
      }
    }

    this.telemetry.status = signals.length > 0 ? 'ONLINE' : 'STANDBY';
    this.telemetry.lastFetch = new Date().toISOString();
    this.telemetry.latencyMs = Date.now() - start;

    return signals;
  }
}

export const newsRssConnector = new NewsRssConnector();
