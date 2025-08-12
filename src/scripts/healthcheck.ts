#!/usr/bin/env tsx

/**
 * Simple health check script using Node.js + fetch
 * Usage: tsx scripts/healthcheck.ts [port]
 */

// Make this file a module to enable top-level await
export {};

const port = process.argv[2] || '7646';
const url = `http://localhost:${port}/health`;

console.log(`🔍 Health checking API at ${url}...`);

try {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  const body = await response.text();

  console.log(`📡 HTTP Status: ${response.status}`);
  console.log(`📄 Response Body: ${body}`);

  if (response.ok) {
    console.log('✅ Health check passed! API is healthy.');

    // Try to parse and pretty-print JSON
    try {
      const json = JSON.parse(body);
      console.log('📊 Parsed Response:');
      console.log(JSON.stringify(json, null, 2));
    } catch {
      // Not JSON, that's fine
    }

    process.exit(0);
  } else {
    console.log(`❌ Health check failed with HTTP ${response.status}`);
    process.exit(1);
  }
} catch (error) {
  console.log(`❌ Health check failed - could not connect to ${url}`);
  console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  console.log('   Make sure the server is running with: pnpm run dev');
  process.exit(1);
}
