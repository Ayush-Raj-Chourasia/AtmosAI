/**
 * N-WEIS Vercel Serverless Function Handler
 * Routes all incoming /api/*, /health, /events, /sse requests to N-WEIS core engine
 */

import { handleRequest, initializeNweis } from '../server-nweis.mjs';

let isReady = false;
let initPromise = null;

async function ensureInitialized() {
  if (isReady) return;
  if (!initPromise) {
    initPromise = initializeNweis().then(() => {
      isReady = true;
    }).catch(err => {
      console.error('[VERCEL] N-WEIS initialization error:', err);
      isReady = true;
    });
  }
  await initPromise;
}

export default async function handler(req, res) {
  await ensureInitialized();
  return handleRequest(req, res);
}
