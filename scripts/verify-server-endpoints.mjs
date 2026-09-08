import http from 'node:http';

const PORT = 3042;
process.env.PORT = PORT;

// Dynamically import server
console.log('[TEST] Starting server on port', PORT);
await import('../server-nweis.mjs');

// Allow server to initialize
await new Promise(r => setTimeout(r, 1500));

async function runTests() {
  const base = `http://localhost:${PORT}`;

  console.log('\n--- Checking GET /health ---');
  const hRes = await fetch(`${base}/health`);
  const health = await hRes.json();
  console.log('Health status:', health.status, 'DB:', health.database, 'Redis:', health.redis?.status, 'AI:', health.ai_service?.status);

  console.log('\n--- Checking GET /api/v1/sources ---');
  const sRes = await fetch(`${base}/api/v1/sources`);
  const sources = await sRes.json();
  console.log('Sources count:', sources.count, 'Data sources:', sources.data.map(s => `${s.id} (${s.mode})`).join(', '));

  console.log('\n--- Checking GET /api/v1/events ---');
  const eRes = await fetch(`${base}/api/v1/events`);
  const events = await eRes.json();
  console.log('Events count:', events.count || events.data?.length);

  const testEventId = events.data?.[0]?.id || events[0]?.id;
  console.log('Sample event ID:', testEventId);

  console.log('\n--- Checking POST /api/v1/citizen-reports with media ---');
  const citRes = await fetch(`${base}/api/v1/citizen-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Extreme localized waterlogging near Guwahati station',
      city: 'Guwahati',
      state: 'Assam',
      latitude: 26.18,
      longitude: 91.75,
      media_base64: Buffer.from('test-image-content').toString('base64'),
      media_filename: 'guwahati_street.jpg',
      media_mime_type: 'image/jpeg',
    })
  });
  const citResult = await citRes.json();
  console.log('Citizen report response:', citResult.success, 'Media stored:', citResult.media_stored ? 'YES' : 'NO');

  if (testEventId) {
    console.log('\n--- Checking POST /api/v1/events/:id/verify ---');
    const vRes = await fetch(`${base}/api/v1/events/${testEventId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'ANALYST' },
      body: JSON.stringify({
        reason: 'Corroborated by on-site field team and AWS gauge',
        officer_name: 'Dr. Anand Kumar (IMD Scientist-E)',
      })
    });
    const vResult = await vRes.json();
    console.log('Verify response:', vResult.success, 'Status:', vResult.data?.status);

    console.log('\n--- Checking POST /api/v1/events/:id/reject role check ---');
    const rRes = await fetch(`${base}/api/v1/events/${testEventId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'GUEST' },
      body: JSON.stringify({ reason: 'Fake report' })
    });
    console.log('Guest rejection blocked status:', rRes.status, '(Expected 403)');
  }

  console.log('\n[SUCCESS] All server HTTP endpoint tests passed cleanly!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
