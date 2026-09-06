
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class GoogleMapsTool {
  private readonly logger = new Logger(GoogleMapsTool.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY is missing. Geocoding tool will fail.');
    }
  }

  // Tool Definition for OpenAI/Gemini
  public readonly definition = {
    type: 'function',
    function: {
      name: 'geocode_location',
      description: 'Get latitude and longitude for a specific address or city name using Google Maps.',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'The location name or address to geocode (e.g. "Jakarta", "Pasar Baru, Bandung")',
          },
        },
        required: ['address'],
      },
    },
  };

  async geocode(address: string): Promise<{ lat: number; lng: number; formatted_address: string } | { error: string }> {
    if (!this.apiKey) return { error: 'API Key missing' };

    try {
      this.logger.debug(`Geocoding: ${address}`);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
      const response = await axios.get(url);

      console.log('response.data', response.data)
      if (response.data.status !== 'OK') {
        this.logger.warn(`Geocoding failed for ${address}: ${response.data.status}`);
        return { error: `Geocoding failed: ${response.data.status}` };
      }

      const result = response.data.results[0];
      const { lat, lng } = result.geometry.location;
      
      return {
        lat,
        lng,
        formatted_address: result.formatted_address,
      };

    } catch (error: any) {
      this.logger.error(`Geocoding error for ${address}`, error);
      return { error: error.message };
    }
  }
}
