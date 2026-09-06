import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');

export interface CronConfig {
  bmkg: boolean;
  rss: boolean;
  tiktok: boolean;
  incidents: boolean;
  batch_eval: boolean;
}

@Injectable()
export class RemoteConfigService implements OnModuleInit {
  private readonly logger = new Logger(RemoteConfigService.name);
  private config: Record<string, any> = {};
  private lastFetch = 0;
  private readonly CACHE_TTL = 60_000; // 1 minute cache
  private isFetching = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeFirebase();
    await this.fetchConfig();
  }

  /**
   * Initialize Firebase Admin SDK if not already initialized
   */
  private async initializeFirebase(): Promise<void> {
    if (admin.apps.length) {
      this.logger.debug('Firebase Admin already initialized by another service');
      return;
    }

    const serviceAccountBase64 = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_BASE64');

    if (!serviceAccountBase64) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT_BASE64 not found in config. Remote Config will be disabled.');
      return;
    }

    try {
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.logger.log(`Firebase Admin initialized by RemoteConfigService. Project ID: ${serviceAccount.project_id}`);
    } catch (error: any) {
      this.logger.error('Failed to initialize Firebase Admin:', error?.message || error);
    }
  }

  /**
   * Fetch latest Remote Config from Firebase
   */
  private async fetchConfig(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      if (!admin.apps.length) {
        this.logger.debug('Firebase App not initialized, using default config');
        this.setDefaultConfig();
        return;
      }

      // Use Manual REST API Fetch to bypass SDK weirdness
      const projectId = admin.app().options.credential.projectId || this.configService.get('FIREBASE_PROJECT_ID') || 'disaster-pulse-7962f';
      const accessTokenObj = await admin.app().options.credential.getAccessToken();
      const accessToken = accessTokenObj.access_token;

      const url = `https://firebaseremoteconfig.googleapis.com/v1/projects/${projectId}/remoteConfig`;
      this.logger.debug(`Fetching Remote Config via REST API: ${url}`);

      const axios = require('axios');
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept-Encoding': 'gzip',
        }
      });

      const template = response.data;
      this.logger.debug('Fetched Server Template via REST API successfully');

      this.config = {};
      const parameters = template.parameters || {};

      this.logger.debug(`Parameters found: ${Object.keys(parameters).length}`);

      for (const [key, param] of Object.entries(parameters)) {
        // Handle different value types
        const defaultValue = (param as any).defaultValue?.value;
        if (defaultValue === 'true') {
          this.config[key] = true;
        } else if (defaultValue === 'false') {
          this.config[key] = false;
        } else {
          this.config[key] = defaultValue;
        }
      }

      this.lastFetch = Date.now();
      this.logger.log(`Remote Config values fetched (${Object.keys(this.config).length} items):`, JSON.stringify(this.config));

    } catch (error: any) {
      this.logger.error('Failed to fetch Remote Config via REST API:', error?.message || error);
      if (error.response) {
        this.logger.error(`API Error: ${JSON.stringify(error.response.data)}`);
      }
      this.setDefaultConfig();
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Set default config values when Remote Config is unavailable
   */
  private setDefaultConfig(): void {
    this.config = {
      cron_bmkg_enabled: true,
      cron_rss_enabled: true,
      cron_tiktok_enabled: true,
      cron_incidents_enabled: true,
    };
    this.lastFetch = Date.now();
    this.logger.log('Using default Remote Config values');
  }

  /**
   * Get a boolean config value
   */
  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    // Refresh if cache expired
    if (Date.now() - this.lastFetch > this.CACHE_TTL) {
      await this.fetchConfig();
    }
    return this.config[key] ?? defaultValue;
  }

  /**
   * Get a string config value
   */
  async getString(key: string, defaultValue = ''): Promise<string> {
    if (Date.now() - this.lastFetch > this.CACHE_TTL) {
      await this.fetchConfig();
    }
    return this.config[key] ?? defaultValue;
  }

  /**
   * Get a number config value
   */
  async getNumber(key: string, defaultValue = 0): Promise<number> {
    if (Date.now() - this.lastFetch > this.CACHE_TTL) {
      await this.fetchConfig();
    }
    const value = this.config[key];
    return typeof value === 'number' ? value : (parseFloat(value) || defaultValue);
  }

  /**
   * Check if a specific cron job is enabled
   * @param cronName - The cron identifier (e.g., 'bmkg', 'rss', 'tiktok', 'incidents')
   */
  async isCronEnabled(cronName: keyof CronConfig): Promise<boolean> {
    return this.getBoolean(`cron_${cronName}_enabled`, true);
  }

  /**
   * Get all cron statuses at once
   */
  async getCronStatuses(): Promise<CronConfig> {
    if (Date.now() - this.lastFetch > this.CACHE_TTL) {
      await this.fetchConfig();
    }

    return {
      bmkg: this.config['cron_bmkg_enabled'] ?? true,
      rss: this.config['cron_rss_enabled'] ?? true,
      tiktok: this.config['cron_tiktok_enabled'] ?? true,
      incidents: this.config['cron_incidents_enabled'] ?? true,
      batch_eval: this.config['cron_batch_eval_enabled'] ?? true,
    };
  }

  /**
   * Force refresh the config (useful for admin endpoints)
   */
  async forceRefresh(): Promise<Record<string, any>> {
    this.lastFetch = 0; // Reset cache
    await this.fetchConfig();
    return this.config;
  }
}
