import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

interface CacheEntry {
  result: any;
  timestamp: number;
}

/**
 * In-memory cache for reasoning results
 * Reduces redundant LLM calls for similar signals
 */
@Injectable()
export class ReasoningCacheService {
  private readonly logger = new Logger(ReasoningCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate deterministic cache key from signals
   */
  generateCacheKey(
    city: string,
    eventType: string,
    signals: { source: string; text: string; created_at: string }[],
  ): string {
    // Sort signals for deterministic hashing
    const sortedSignals = [...signals].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );

    const signalHash = crypto
      .createHash('md5')
      .update(
        sortedSignals.map((s) => `${s.source}:${s.text}`).join('|'),
      )
      .digest('hex')
      .substring(0, 16);

    return `reasoning:${city}:${eventType}:${signalHash}`;
  }

  /**
   * Get cached reasoning result
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.logger.debug(`Cache miss: ${key}`);
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.DEFAULT_TTL_MS) {
      this.logger.debug(`Cache expired: ${key}`);
      this.cache.delete(key);
      return null;
    }

    this.logger.log(`Cache hit: ${key}`);
    return entry.result;
  }

  /**
   * Store reasoning result in cache
   */
  set(key: string, result: any): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
    this.logger.debug(`Cache set: ${key}`);
  }

  /**
   * Clear a specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.DEFAULT_TTL_MS) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`Cache cleanup: cleared ${cleared} entries`);
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
