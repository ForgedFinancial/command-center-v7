/**
 * Heartbeat writer for systemd watchdog + agent status
 * Uses native Unix socket — no sd-notify package required.
 */
const fs = require('fs');
const dgram = require('dgram');

function writeHeartbeat(agentName) {
  const file = `/tmp/forged-daemon-${agentName}.heartbeat`;
  fs.writeFileSync(file, new Date().toISOString(), 'utf8');
}

// Notify systemd watchdog via NOTIFY_SOCKET (no external deps)
function notifyWatchdog() {
  const socket = process.env.NOTIFY_SOCKET;
  if (!socket) return;
  try {
    const client = dgram.createSocket('unix_dgram');
    const msg = Buffer.from('WATCHDOG=1');
    // Handle abstract socket (starts with @)
    const socketPath = socket.startsWith('@') ? '\0' + socket.slice(1) : socket;
    client.send(msg, 0, msg.length, socketPath, () => {
      try { client.close(); } catch {}
    });
  } catch { /* silent — never crash daemon on watchdog error */ }
}

// Signal systemd READY=1 at startup
function notifyReady() {
  const socket = process.env.NOTIFY_SOCKET;
  if (!socket) return;
  try {
    const client = dgram.createSocket('unix_dgram');
    const msg = Buffer.from('READY=1');
    const socketPath = socket.startsWith('@') ? '\0' + socket.slice(1) : socket;
    client.send(msg, 0, msg.length, socketPath, () => {
      try { client.close(); } catch {}
    });
  } catch {}
}

module.exports = { writeHeartbeat, notifyWatchdog, notifyReady };
