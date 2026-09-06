import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../supabase/supabase.service';
import axios from 'axios';

import { IncidentsService } from '../../incidents/incidents.service';
import { MAX_SIGNAL_AGE } from '../../common/constants';
import { RemoteConfigService } from '../../config/remote-config.service';
import { reverseGeocodeCity } from '../../lib/reverseGeocoding';

@Injectable()
export class BmkgService {
  private readonly logger = new Logger(BmkgService.name);
  private readonly URLS = {
    monitor: 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json', // < 5 Felt
    alert: 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json', // >= 5
  };

  private get db() {
    return this.supabase.getClient();
  }

  constructor(
    private readonly supabase: SupabaseService,
    private readonly incidentsService: IncidentsService,
    private readonly remoteConfig: RemoteConfigService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async fetchQuakes() {
    // Check Remote Config before running cron
    if (!(await this.remoteConfig.isCronEnabled('bmkg'))) {
      this.logger.debug('BMKG cron is disabled via Remote Config');
      return;
    }

    this.logger.log('Fetching earthquake data from BMKG...');
    
    try {
      const  [monitorRes, alertRes] = await Promise.all([
        axios.get(this.URLS.monitor),
        axios.get(this.URLS.alert)
      ]);

      const monitorQuakes = this.parseQuakes(monitorRes.data).map(q => ({ ...q, _category: 'monitor' }));
      const alertQuakes = this.parseQuakes(alertRes.data).map(q => ({ ...q, _category: 'alert' }));
      
      const allQuakes = [...alertQuakes, ...monitorQuakes]; // Process alerts first
      this.logger.log(`Fetched ${allQuakes.length} quakes from BMKG. Processing...`);

      for (const quake of allQuakes) {
        await this.processQuake(quake, quake._category);
      }

    } catch (error) {
      this.logger.error('Failed to fetch/process BMKG data', error);
    }
  }

  private parseQuakes(data: any): any[] {
    // BMKG data structure: { Infogempa: { gempa: [ ... ] or { ... } } }
    // Sometimes 'gempa' is array, sometimes object if single result
    const info = data?.Infogempa?.gempa;
    if (!info) return [];
    return Array.isArray(info) ? info : [info];
  }

  private async processQuake(quake: any, category: 'monitor' | 'alert') {
    // 1. Generate ID (use DateTime + Coordinates as unique key)
    const bmkgId = `${quake.DateTime}_${quake.Coordinates}`;

    // 2. Check deduplication via bmkg_events table
    const { data: existing } = await (this.db as any)
      .from('bmkg_events')
      .select('id')
      .eq('bmkg_id', bmkgId)
      .maybeSingle();

    if (existing) {
      this.logger.debug(`Skipping existing quake: ${bmkgId}`);
      return;
    }

    // 3. Check Signal Age
    const happenedAt = this.parseDate(quake.DateTime);
    const eventTime = new Date(happenedAt).getTime();
    const now = Date.now();
    const ageHours = (now - eventTime) / (1000 * 60 * 60);

    if (ageHours > MAX_SIGNAL_AGE.earthquake) {
      this.logger.debug(`Skipping old quake: ${bmkgId} (Age: ${ageHours.toFixed(1)}h > ${MAX_SIGNAL_AGE.earthquake}h)`);
      return;
    }

    // 4. Map coordinates
    const [latStr, lngStr] = quake.Coordinates.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    // 5. Reverse geocode to get proper "City, Province" format
    let cityHint: string | null = null;
    try {
      cityHint = await reverseGeocodeCity(lat, lng);
      this.logger.debug(`Geocoded ${quake.Coordinates} → ${cityHint}`);
    } catch (err) {
      this.logger.warn(`Failed to geocode ${quake.Coordinates}, using Wilayah as fallback`);
      cityHint = quake.Wilayah;
    }

    // 6. Create Text Summary (without category tag - category goes in raw_payload)
    const text = `Earthquake Mag:${quake.Magnitude}, ${quake.DateTime}, Loc: ${quake.Wilayah} (${quake.Kedalaman})`;

    // 7. Insert into bmkg_events immediately
    await (this.db as any)
      .from('bmkg_events')
      .insert({
        bmkg_id: bmkgId,
        magnitude: quake.Magnitude,
        coordinates: quake.Coordinates,
        location: quake.Wilayah,
        depth: quake.Kedalaman,
        event_time: happenedAt,
        category,
        raw_data: quake,
      });

    // 8. Create signal directly in DB (bypass buffer for immediate processing)
    try {
      const { data: signal, error } = await (this.db as any)
        .from('signals')
        .insert({
          source: 'bmkg',
          text,
          lat,
          lng,
          city_hint: cityHint || quake.Wilayah, // Use geocoded city or fallback to Wilayah
          event_type: 'earthquake',
          happened_at: happenedAt,
          status: 'pending',
          raw_payload: {
            ...quake,
            bmkg_id: bmkgId,
            bmkg_category: category, // monitor or alert - used by incident processor
          },
        })
        .select('id')
        .single();

      if (error) {
        this.logger.error(`Failed to create signal for quake ${bmkgId}`, error);
        return;
      }

      // 9. Update bmkg_events with signal_id
      await (this.db as any)
        .from('bmkg_events')
        .update({ signal_id: signal.id })
        .eq('bmkg_id', bmkgId);

      // 10. Process signal directly (create incident immediately)
      this.logger.log(`Processing BMKG quake directly: ${text}`);
      await this.incidentsService.processSignal(signal.id, lat, lng, happenedAt);

    } catch (error) {
      this.logger.error(`Failed to process quake ${bmkgId}`, error);
    }
  }

  private parseDate(dateStr: string): string {
    // If ISO 8601 with timezone (contains Z or +), trust it
    if (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:\d{2}$/)) {
      return new Date(dateStr).toISOString();
    }

    // Assume UTC+7 (WIB) for "YYYY-MM-DD HH:mm:ss"
    // Replace space with T and append +07:00
    const isoLike = dateStr.replace(' ', 'T');
    return new Date(`${isoLike}+07:00`).toISOString();
  }
}
