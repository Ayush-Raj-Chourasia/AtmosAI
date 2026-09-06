import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SchemaService implements OnModuleInit {
  private readonly logger = new Logger(SchemaService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Checking database schema...');
    
    const dbUrl = this.configService.get<string>('DATABASE_URL');
    if (!dbUrl) {
      this.logger.warn('DATABASE_URL not set. Skipping schema sync.');
      return;
    }

    const client = new Client({
      connectionString: dbUrl,
    });

    try {
      await client.connect();
      
      const schemaPath = path.join(process.cwd(), 'dist/database/schema.sql');
      // In dev mode (nest start), path might be distinct from dist specific
      // We try both src and dist locations or bundle it.
      // For now, let's assume valid read from source if dist fails or vice versa.
      
      let sql = '';
      try {
        sql = fs.readFileSync(schemaPath, 'utf8');
      } catch (e) {
        // Fallback to src location for dev
        const srcPath = path.join(process.cwd(), 'apps/api/src/database/schema.sql');
        sql = fs.readFileSync(srcPath, 'utf8');
      }

      this.logger.log('Executing schema migration...');

      // Run the entire schema as a single transaction
      // PostGIS-dependent columns use DO blocks with EXCEPTION handlers
      await client.query(sql);

      this.logger.log('Schema migration completed successfully.');

    } catch (error) {
      this.logger.error('Schema migration failed:', error);
    } finally {
      await client.end();
    }
  }
}
