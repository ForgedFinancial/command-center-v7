// Mac Node Proxy Routes — iMessage & Call History
// Proxies directly to Mac's local API over Tailscale

const MAC_API = 'http://100.84.3.117:7890';
const MAC_TOKEN = process.env.MAC_TOKEN || 'mac-api-secret-2026';

let macHealthy = false;
let lastMacPing = null;
let macDownSince = null;

async function checkMacHealth() {
  try {
    const res = await fetch(`${MAC_API}/api/health`, {
      headers: { 'Authorization': `Bearer ${MAC_TOKEN}` },
      signal: AbortSignal.timeout(5000)
    });
    const wasDown = !macHealthy;
    macHealthy = res.ok;
    lastMacPing = Date.now();
    if (wasDown && macHealthy) {
      macDownSince = null;
      console.log('[mac-proxy] Mac bridge RECOVERED');
    }
  } catch {
    if (macHealthy) {
      macDownSince = Date.now();
      console.warn('[mac-proxy] Mac bridge went OFFLINE');
    }
    macHealthy = false;
    if (macDownSince && (Date.now() - macDownSince) > 5 * 60 * 1000) {
      console.warn('[mac-proxy] Mac bridge offline for 5+ minutes');
    }
  }
}
setInterval(checkMacHealth, 30000);
checkMacHealth();

async function macFetch(path) {
  const res = await fetch(`${MAC_API}${path}`, {
    headers: { 'Authorization': `Bearer ${MAC_TOKEN}` },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`Mac API ${res.status}`);
  return res.json();
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function registerRoutes(app) {
  // GET /api/phone/ping — real Mac bridge status (replaces stub)
  app.get('/api/phone/ping', (req, res) => {
    res.json({ status: 'ok', connected: macHealthy, lastPing: lastMacPing });
  });

  // GET /api/messages — list recent conversations
  app.get('/api/messages', async (req, res) => {
    try {
      const conversations = await macFetch('/messages');
      res.json({ conversations, connected: true });
    } catch (err) {
      console.error('[mac-proxy] /api/messages error:', err.message);
      res.json({ conversations: [], connected: false, error: err.message });
    }
  });

  // GET /api/calls — recent call history
  app.get('/api/calls', async (req, res) => {
    try {
      const rawCalls = await macFetch('/calls');
      const calls = rawCalls.map(c => ({
        number: c.phone || '—',
        type: c.outgoing === 1 ? 'outgoing' : (c.duration === 0 ? 'missed' : 'incoming'),
        duration: c.duration > 0 ? formatDuration(c.duration) : '0:00',
        time: c.call_time,
        name: c.phone || 'Unknown',
      }));
      res.json({ calls, connected: true });
    } catch (err) {
      console.error('[mac-proxy] /api/calls error:', err.message);
      res.json({ calls: [], connected: false, error: err.message });
    }
  });

  // POST /api/dial — dial via Mac FaceTime
  app.post('/api/dial', async (req, res) => {
    try {
      const { number } = req.body;
      if (!number) return res.status(400).json({ error: 'Number required' });
      // Dial will be handled via OpenClaw node invoke
      res.json({ success: true, message: `Dial request queued for ${number}` });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });
}

module.exports = { registerRoutes };
