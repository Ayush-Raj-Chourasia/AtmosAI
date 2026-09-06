import { Injectable, Logger } from '@nestjs/common';
import { Signal } from '@n-weis/shared';

export interface DeduplicationMatch {
  isDuplicate: boolean;
  duplicateOfSignalId?: string;
  duplicateLayer?: 'exact' | 'semantic' | 'spatiotemporal';
  similarityScore: number;
  explanation: string;
}

@Injectable()
export class DeduplicationService {
  private readonly logger = new Logger(DeduplicationService.name);

  /**
   * Evaluates if an incoming signal is a duplicate of an existing signal
   */
  evaluateDuplicate(candidate: Signal, existingSignals: Signal[]): DeduplicationMatch {
    for (const existing of existingSignals) {
      if (candidate.id === existing.id) continue;

      // ============================================================
      // LAYER 1: EXACT IDENTIFIER MATCH
      // ============================================================
      if (
        candidate.external_id &&
        existing.external_id &&
        candidate.external_id === existing.external_id &&
        candidate.source_type === existing.source_type
      ) {
        return {
          isDuplicate: true,
          duplicateOfSignalId: existing.id,
          duplicateLayer: 'exact',
          similarityScore: 1.0,
          explanation: `Exact external source post ID match (${candidate.external_id})`,
        };
      }

      // Exact media URL match
      if (candidate.media_urls.length > 0 && existing.media_urls.length > 0) {
        const sharedMedia = candidate.media_urls.some(url => existing.media_urls.includes(url));
        if (sharedMedia) {
          return {
            isDuplicate: true,
            duplicateOfSignalId: existing.id,
            duplicateLayer: 'exact',
            similarityScore: 0.98,
            explanation: 'Identical media asset attachment URL detected across posts',
          };
        }
      }

      // ============================================================
      // LAYER 2: SEMANTIC TEXT SIMILARITY
      // ============================================================
      const sim = this.calculateJaccardSimilarity(candidate.text, existing.text);
      if (sim > 0.80) {
        return {
          isDuplicate: true,
          duplicateOfSignalId: existing.id,
          duplicateLayer: 'semantic',
          similarityScore: Number(sim.toFixed(2)),
          explanation: `High semantic phrasing overlap (${(sim * 100).toFixed(0)}% Jaccard token similarity)`,
        };
      }

      // ============================================================
      // LAYER 3: SPATIAL-TEMPORAL PROXIMITY
      // ============================================================
      if (
        candidate.latitude !== null &&
        candidate.longitude !== null &&
        existing.latitude !== null &&
        existing.longitude !== null
      ) {
        const distanceKm = this.calculateHaversineDistanceKm(
          candidate.latitude,
          candidate.longitude,
          existing.latitude,
          existing.longitude
        );

        const timeDiffMinutes = Math.abs(
          (new Date(candidate.timestamp).getTime() - new Date(existing.timestamp).getTime()) / (1000 * 60)
        );

        const sameEventType =
          candidate.event_candidate &&
          existing.event_candidate &&
          candidate.event_candidate === existing.event_candidate;

        // Proximity criteria: < 3 km distance, < 30 minutes interval, matching event type
        if (distanceKm <= 3.0 && timeDiffMinutes <= 30 && sameEventType && sim >= 0.40) {
          return {
            isDuplicate: true,
            duplicateOfSignalId: existing.id,
            duplicateLayer: 'spatiotemporal',
            similarityScore: 0.88,
            explanation: `Spatiotemporal co-location (${distanceKm.toFixed(1)} km, ${timeDiffMinutes.toFixed(0)} min, same ${candidate.event_candidate} event)`,
          };
        }
      }
    }

    return {
      isDuplicate: false,
      similarityScore: 0.0,
      explanation: 'No duplicate signatures detected; novel signal observation.',
    };
  }

  /**
   * Token-based Jaccard similarity
   */
  private calculateJaccardSimilarity(textA: string, textB: string): number {
    const tokensA = new Set(
      textA.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2)
    );
    const tokensB = new Set(
      textB.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2)
    );

    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const token of tokensA) {
      if (tokensB.has(token)) intersection++;
    }

    const union = tokensA.size + tokensB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Haversine formula for geodesic distance on WGS84 ellipsoid (in kilometers)
   */
  calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
