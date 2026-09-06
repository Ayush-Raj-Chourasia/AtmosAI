import { Injectable, Logger } from '@nestjs/common';
import { IngestionService } from '../ingestion.service';
import { RawSignalInput } from '../../processing/signal-normalizer.service';

export interface WeatherObservationInput {
  stationName: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  temperatureC?: number;
  rainfallMm?: number;
  windSpeedKmh?: number;
  relativeHumidity?: number;
  visibilityKm?: number;
}

@Injectable()
export class WeatherApiService {
  private readonly logger = new Logger(WeatherApiService.name);

  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * Ingest a quantitative weather station observation
   */
  async ingestStationObservation(obs: WeatherObservationInput) {
    const descriptions: string[] = [];

    if (obs.rainfallMm !== undefined && obs.rainfallMm > 0) {
      if (obs.rainfallMm >= 64.5) {
        descriptions.push(`Very Heavy Rainfall recorded (${obs.rainfallMm} mm/hr)`);
      } else if (obs.rainfallMm >= 15.6) {
        descriptions.push(`Moderate to Heavy Rainfall recorded (${obs.rainfallMm} mm/hr)`);
      } else {
        descriptions.push(`Light Rainfall (${obs.rainfallMm} mm/hr)`);
      }
    }

    if (obs.temperatureC !== undefined && obs.temperatureC >= 42.0) {
      descriptions.push(`Severe high temperature recorded (${obs.temperatureC}°C)`);
    }

    if (obs.windSpeedKmh !== undefined && obs.windSpeedKmh >= 50.0) {
      descriptions.push(`High gale winds recorded at ${obs.windSpeedKmh} km/h`);
    }

    if (obs.visibilityKm !== undefined && obs.visibilityKm < 0.5) {
      descriptions.push(`Dense fog with low visibility (${(obs.visibilityKm * 1000).toFixed(0)} meters)`);
    }

    const text = descriptions.length > 0
      ? `Automatic Met Station at ${obs.stationName}, ${obs.city} (${obs.state}): ${descriptions.join(', ')}.`
      : `Met Station observation at ${obs.stationName}, ${obs.city}: Temperature ${obs.temperatureC ?? 'N/A'}°C, normal atmospheric conditions.`;

    const raw: RawSignalInput = {
      source_type: 'weather_api',
      source_name: `Met Station (${obs.stationName})`,
      text,
      city: obs.city,
      state: obs.state,
      latitude: obs.latitude,
      longitude: obs.longitude,
      hashtags: ['#MetData', '#WeatherStation'],
      author: {
        username: obs.stationName,
        verified: true,
        trust_score: 0.95,
      },
      raw_payload: obs,
    };

    return this.ingestionService.ingestSignal(raw);
  }
}
