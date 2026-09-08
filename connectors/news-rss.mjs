/**
 * N-WEIS Live News RSS Connector (connectors/news-rss.mjs)
 * SIH26069 National Weather Big Data Analytics Platform
 *
 * Ingests and normalizes live Indian meteorological RSS news feeds.
 */

import crypto from 'node:crypto';
import { BaseWeatherConnector } from './base-connector.mjs';

export class NewsRssConnector extends BaseWeatherConnector {
  constructor() {
    super({
      id: 'src_toi_01',
      name: 'Times of India / Indian News Weather RSS',
      type: 'news',
      reliability: 0.85,
    });

    this.mode = 'LIVE';
    this.telemetry.status = 'STANDBY';
    this.telemetry.mode = 'LIVE';

    this.rssUrls = [
      'https://news.google.com/rss/search?q=weather+IMD+India+rain+flood+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
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
      { city: 'Shimla', state: 'Himachal Pradesh', lat: 31.10, lng: 77.17 },
    ];
  }

  parseXmlItems(xmlText) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];
      const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(itemContent);
      const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);
      const descMatch = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/.exec(itemContent);

      if (titleMatch) {
        items.push({
          title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
          link: linkMatch ? linkMatch[1].trim() : '',
          pubDate: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
          description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '',
        });
      }
    }
    return items;
  }

  classifyArticle(text) {
    const lower = text.toLowerCase();
    if (/flood|waterlogging|submerged|inundat/i.test(lower)) return 'FLOOD';
    if (/heavy rain|downpour|monsoon/i.test(lower)) return 'RAINFALL';
    if (/thunderstorm|lightning|squall/i.test(lower)) return 'THUNDERSTORM';
    if (/heatwave|extreme temperature/i.test(lower)) return 'HEATWAVE';
    if (/fog|dense fog|visibility/i.test(lower)) return 'FOG';
    if (/dust storm|sandstorm/i.test(lower)) return 'DUST_STORM';
    if (/gale|cyclone|strong winds/i.test(lower)) return 'STRONG_WIND';
    return 'OTHER';
  }

  matchCity(text) {
    const lower = text.toLowerCase();
    for (const c of this.cities) {
      if (lower.includes(c.city.toLowerCase())) return c;
    }
    return null;
  }

  async fetchSignals(limit = 10) {
    const signals = [];
    const feedUrl = this.rssUrls[0];
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    this.telemetry.last_fetch = new Date().toISOString();

    try {
      const res = await fetch(feedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'N-WEIS-News-Monitor/1.0' },
      });
      clearTimeout(timeout);
      this.telemetry.latency_ms = Date.now() - start;

      if (res.ok) {
        const xml = await res.text();
        const items = this.parseXmlItems(xml).slice(0, limit);
        this.telemetry.records_fetched += items.length;

        for (const item of items) {
          const fullText = `${item.title}. ${item.description}`;
          const cityMeta = this.matchCity(fullText);
          const candidate = this.classifyArticle(fullText);

          if (candidate !== 'OTHER') {
            const externalId = `rss_${crypto.createHash('md5').update(item.link || item.title).digest('hex').slice(0, 10)}`;
            const signal = this.normalize({
              source_id: this.id,
              source_type: this.type,
              source_name: 'Indian News Weather RSS',
              external_id: externalId,
              text: `[NEWS BULLETIN] ${item.title}`,
              timestamp: new Date(item.pubDate).toISOString(),
              city: cityMeta ? cityMeta.city : null,
              state: cityMeta ? cityMeta.state : null,
              country: 'India',
              latitude: cityMeta ? cityMeta.lat : null,
              longitude: cityMeta ? cityMeta.lng : null,
              location_confidence: cityMeta ? 0.90 : 0,
              location_method: cityMeta ? 'geo_reasoning' : 'unresolved',
              event_candidate: candidate,
              media_urls: [],
              media_types: [],
              hashtags: ['#NewsAlert', `#${candidate}`],
              raw_payload: item,
            });

            signals.push(signal);
            this.telemetry.records_accepted++;
          }
        }

        this.mode = 'LIVE';
        this.telemetry.status = 'ONLINE';
        this.telemetry.mode = 'LIVE';
        this.telemetry.last_success = new Date().toISOString();
      }
    } catch (err) {
      clearTimeout(timeout);
      this.mode = 'DEGRADED';
      this.telemetry.status = 'DEGRADED';
      this.telemetry.mode = 'DEGRADED';
      this.telemetry.last_error = err.message;
      console.warn(`[NewsRssConnector] Error fetching RSS: ${err.message}`);
    }

    return signals;
  }
}

export const newsRssConnector = new NewsRssConnector();
