/**
 * N-WEIS Vercel Serverless Function Bridge
 * Bridges Vercel serverless requests directly to the N-WEIS Unified Router.
 * Handles SIH26069 APIs: /health, /api/v1/events, /api/v1/signals, /api/v1/admin/analytics, etc.
 */

import { handleRequest, initializeNweis } from '../server-nweis.mjs';

let isInitialized = false;

export default async function handler(req, res) {
  if (!isInitialized) {
    try {
      await initializeNweis();
      isInitialized = true;
    } catch (err) {
      console.warn('[VERCEL] Serverless init warning:', err.message);
    }
  }

  return handleRequest(req, res);
}
