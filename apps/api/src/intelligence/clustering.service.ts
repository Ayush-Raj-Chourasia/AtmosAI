import { Injectable, Logger } from '@nestjs/common';
import { Signal, EventCluster, WeatherEventType } from '@n-weis/shared';
import { DeduplicationService } from './deduplication.service';

export interface SignalClusterResult {
  clusterId: string;
  eventType: WeatherEventType;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  signals: Signal[];
  timeStart: string;
  timeEnd: string;
}

@Injectable()
export class ClusteringService {
  private readonly logger = new Logger(ClusteringService.name);

  constructor(private readonly dedupService: DeduplicationService) {}

  /**
   * SEDOM-DD Adaptive Spatiotemporal Clustering
   * Groups geotagged weather signals within adaptive distance (5-15 km) and time window
   */
  clusterSignals(signals: Signal[], maxDistanceKm = 10.0, maxTimeDiffHours = 2.0): SignalClusterResult[] {
    // 1. Filter signals with valid coordinates
    const validSignals = signals.filter(
      s => s.latitude !== null && s.longitude !== null && s.event_candidate
    );

    if (validSignals.length === 0) return [];

    const clusters: SignalClusterResult[] = [];
    const visited = new Set<string>();

    for (const signal of validSignals) {
      if (visited.has(signal.id)) continue;

      const group: Signal[] = [signal];
      visited.add(signal.id);

      for (const other of validSignals) {
        if (visited.has(other.id)) continue;
        if (other.event_candidate !== signal.event_candidate) continue;

        const dist = this.dedupService.calculateHaversineDistanceKm(
          signal.latitude!,
          signal.longitude!,
          other.latitude!,
          other.longitude!
        );

        const timeDiffHours = Math.abs(
          (new Date(signal.timestamp).getTime() - new Date(other.timestamp).getTime()) / (1000 * 60 * 60)
        );

        if (dist <= maxDistanceKm && timeDiffHours <= maxTimeDiffHours) {
          group.push(other);
          visited.add(other.id);
        }
      }

      // Calculate centroid coordinates
      const avgLat = group.reduce((sum, s) => sum + s.latitude!, 0) / group.length;
      const avgLng = group.reduce((sum, s) => sum + s.longitude!, 0) / group.length;

      // Calculate radius
      let maxR = 2.0;
      for (const s of group) {
        const d = this.dedupService.calculateHaversineDistanceKm(avgLat, avgLng, s.latitude!, s.longitude!);
        if (d > maxR) maxR = d;
      }

      // Time range
      const timestamps = group.map(s => new Date(s.timestamp).getTime());
      const minTime = new Date(Math.min(...timestamps)).toISOString();
      const maxTime = new Date(Math.max(...timestamps)).toISOString();

      clusters.push({
        clusterId: `cluster_${Date.now()}_${clusters.length + 1}`,
        eventType: signal.event_candidate!,
        centerLat: Number(avgLat.toFixed(5)),
        centerLng: Number(avgLng.toFixed(5)),
        radiusKm: Number(maxR.toFixed(1)),
        signals: group,
        timeStart: minTime,
        timeEnd: maxTime,
      });
    }

    return clusters;
  }
}
