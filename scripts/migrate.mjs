#!/usr/bin/env node
/**
 * N-WEIS Database Migration Tool (scripts/migrate.mjs)
 * SIH26069 National Weather Big Data Analytics Platform
 * Initializes schema.sql in PostgreSQL and prepares local persistent database store.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../database/db.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMA_PATH = path.join(__dirname, '..', 'apps', 'api', 'src', 'database', 'schema.sql');

async function main() {
  console.log('====================================================');
  console.log(' N-WEIS Database Migration Engine (SIH26069)');
  console.log('====================================================');

  await db.init();

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log(`[MIGRATE] Connecting to PostgreSQL at ${dbUrl.replace(/:[^:@]+@/, ':****@')}...`);
    try {
      const pg = await import('pg');
      const { Client } = pg.default || pg;
      const client = new Client({ connectionString: dbUrl });
      await client.connect();
      console.log('[MIGRATE]  Connected. Applying schema.sql...');

      const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
      await client.query(sql);
      console.log('[MIGRATE]  Schema tables, indexes & PostGIS geography created successfully.');
      await client.end();
    } catch (err) {
      console.error('[MIGRATE] ❌ PostgreSQL migration failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('[MIGRATE] ℹ️ No DATABASE_URL specified.');
    console.log('[MIGRATE]  Atomic Persistent Disk Database initialized at data/nweis-store.json');
  }

  const info = db.getStorageInfo();
  console.log('[MIGRATE]  Database state ready:', JSON.stringify(info, null, 2));
  console.log('====================================================');
  console.log(' Migration Complete.');
  console.log('====================================================');
}

main().catch(err => {
  console.error('[MIGRATE] Fatal error:', err);
  process.exit(1);
});
