#!/usr/bin/env node
// Helper: runs a command on Boss-MacBook via OpenClaw gateway WebSocket
// Usage: node mac-run.js "sqlite3" "-json" "/path/to/db" "SELECT ..."

const WebSocket = require('ws');

const GATEWAY_URL = 'ws://localhost:18789';
const GATEWAY_TOKEN = 'b18154b747e5e0e1e13466203d02b4c3c3b1265707ecdf28';
const NODE_ID = '9efb6c94688b431efb899e8ebda50cf1a4287ea13914bba2b83b3bc6bc63c046';

const command = process.argv.slice(2);
if (command.length === 0) { console.error('No command'); process.exit(1); }

const ws = new WebSocket(GATEWAY_URL, { headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` } });
let done = false;
const timeout = setTimeout(() => { if (!done) { console.error('Timeout'); process.exit(1); } }, 15000);

ws.on('open', () => {
  // Send invoke RPC for system.run
  ws.send(JSON.stringify({
    type: 'rpc',
    id: 'run1',
    method: 'node.invoke',
    params: {
      nodeId: NODE_ID,
      command: 'system.run',
      params: { command, timeoutMs: 12000 }
    }
  }));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.id === 'run1' || (msg.type === 'rpc-result' && msg.id === 'run1')) {
      done = true;
      clearTimeout(timeout);
      if (msg.error) {
        console.error(JSON.stringify(msg.error));
        process.exit(1);
      }
      const result = msg.result || msg.payload || msg;
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      process.exit(result.exitCode || 0);
    }
  } catch {}
});

ws.on('error', (err) => { console.error(err.message); process.exit(1); });
