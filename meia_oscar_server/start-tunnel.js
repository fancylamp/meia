#!/usr/bin/env node
/**
 * Starts ngrok tunnel and sets BACKEND_PUBLIC_URL for the Python server
 * Usage: node start-tunnel.js
 * Requires: npm install @ngrok/ngrok
 */

const ngrok = require('@ngrok/ngrok');
const { spawn } = require('child_process');

const PORT = 8000;
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || 'meia.ngrok.app';

async function main() {
  console.log('Starting ngrok tunnel...');
  
  const listener = await ngrok.forward({
    addr: PORT,
    authtoken_from_env: true,
    domain: NGROK_DOMAIN,
  });
  
  const url = listener.url();
  console.log(`\n🚀 Ngrok tunnel established: ${url}`);
  console.log(`   WebSocket URL: ${url.replace('https://', 'wss://')}/call/`);
  console.log(`   Set this as your BACKEND_PUBLIC_URL\n`);

  // Start Python server with the public URL
  const server = spawn('uv', ['run', 'python', 'server.py'], {
    env: { ...process.env, BACKEND_PUBLIC_URL: url },
    stdio: 'inherit',
  });

  server.on('close', async (code) => {
    console.log('Server exited, closing tunnel...');
    await ngrok.disconnect();
    process.exit(code);
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    server.kill();
    await ngrok.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
