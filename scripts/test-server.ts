#!/usr/bin/env bun

/**
 * Simple test server for Playwright e2e tests
 */

import { join } from 'node:path';

const port = Number(process.env['PORT']) || 4267;
const fixturesDir = join(process.cwd(), 'tests/e2e/fixtures');
const distDir = join(process.cwd(), 'dist');

console.log(`Starting test server on port ${port}`);
console.log(`Serving fixtures from: ${fixturesDir}`);
console.log(`Serving dist from: ${distDir}`);

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Default to index.html
    if (pathname === '/') {
      pathname = '/index.html';
    }

    try {
      // Serve dist files
      if (pathname.startsWith('/dist/')) {
        const distPath = join(distDir, pathname.replace('/dist/', ''));
        const file = Bun.file(distPath);
        
        if (await file.exists()) {
          return new Response(file, {
            headers: {
              'Content-Type': getContentType(pathname),
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // Serve fixture files
      const fixturePath = join(fixturesDir, pathname);
      const file = Bun.file(fixturePath);
      
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            'Content-Type': getContentType(pathname),
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // 404
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Server error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
});

function getContentType(pathname: string): string {
  if (pathname.endsWith('.html')) return 'text/html';
  if (pathname.endsWith('.js')) return 'application/javascript';
  if (pathname.endsWith('.css')) return 'text/css';
  if (pathname.endsWith('.json')) return 'application/json';
  return 'text/plain';
}

console.log(`Test server running at http://localhost:${port}`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down test server...');
  void server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down test server...');
  void server.stop();
  process.exit(0);
});