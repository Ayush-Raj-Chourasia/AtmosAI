#!/usr/bin/env node
/**
 * N-WEIS Database Reset Tool (scripts/reset.mjs)
 * SIH26069 National Weather Big Data Analytics Platform
 * Resets database to clean baseline.
 */

import { db } from '../database/db.mjs';

async function main() {
  console.log('====================================================');
  console.log('🧹 N-WEIS Database Reset Engine (SIH26069)');
  console.log('====================================================');

  await db.init();
  await db.reset();

  const info = db.getStorageInfo();
  console.log('[RESET]  Database reset complete.');
  console.log(JSON.stringify(info, null, 2));
  console.log('====================================================');
}

main().catch(err => {
  console.error('[RESET] Fatal error:', err);
  process.exit(1);
});
