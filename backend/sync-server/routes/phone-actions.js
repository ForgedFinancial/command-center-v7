// Phone Action Routes — Call, Video, Message, Thread Read via Mac Bridge
const MAC_API = process.env.MAC_API_URL || 'http://100.84.3.117:7890'
const MAC_BRIDGE = process.env.MAC_BRIDGE_URL || 'http://100.84.3.117:7891'
const MAC_TOKEN = process.env.MAC_TOKEN || 'mac-api-secret-2026'
const BRIDGE_TOKEN = process.env.MAC_BRIDGE_TOKEN || 'mac-bridge-2026'

async function bridgeCall(endpoint, body = null) {
  const opts = {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${BRIDGE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(12000),
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${MAC_BRIDGE}${endpoint}`, opts)
  if (!res.ok) throw new Error(`Bridge ${res.status}: ${await res.text()}`)
  return res.json()
}

function registerRoutes(app) {

  // POST /api/phone/call — Dial via iPhone Continuity
  app.post('/api/phone/call', async (req, res) => {
    try {
      const { number } = req.body
      if (!number) return res.status(400).json({ error: 'number required' })
      const clean = number.replace(/[^\d+]/g, '')
      console.log(`[PHONE] Calling ${clean}`)
      const result = await bridgeCall('/dial', { number: clean })
      res.json({ success: true, number: clean, ...result })
    } catch (err) {
      console.error('[PHONE] Call error:', err.message)
      res.status(500).json({ error: err.message, hint: 'Is mac-bridge running on your Mac?' })
    }
  })

  // POST /api/phone/video — FaceTime video
  app.post('/api/phone/video', async (req, res) => {
    try {
      const { number } = req.body
      if (!number) return res.status(400).json({ error: 'number required' })
      const clean = number.replace(/[^\d+]/g, '')
      console.log(`[PHONE] FaceTime ${clean}`)
      const result = await bridgeCall('/facetime', { number: clean })
      res.json({ success: true, number: clean, ...result })
    } catch (err) {
      console.error('[PHONE] Video error:', err.message)
      res.status(500).json({ error: err.message, hint: 'Is mac-bridge running on your Mac?' })
    }
  })

  // POST /api/phone/send — Send iMessage
  app.post('/api/phone/send', async (req, res) => {
    try {
      const { to, message } = req.body
      if (!to || !message) return res.status(400).json({ error: 'to and message required' })
      console.log(`[PHONE] Sending iMessage to ${to}`)
      const result = await bridgeCall('/send', { to, message })
      res.json({ success: true, ...result })
    } catch (err) {
      console.error('[PHONE] Send error:', err.message)
      res.status(500).json({ error: err.message, hint: 'Is mac-bridge running on your Mac?' })
    }
  })

  // GET /api/phone/thread/:phone — Read iMessage thread
  app.get('/api/phone/thread/:phone', async (req, res) => {
    try {
      const { phone } = req.params
      const limit = req.query.limit || 30
      const result = await bridgeCall(`/thread/${phone}?limit=${limit}`)
      res.json(result)
    } catch (err) {
      console.error('[PHONE] Thread read error:', err.message)
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/phone/message — Legacy: open Messages (kept for compat)
  app.post('/api/phone/message', async (req, res) => {
    const { number } = req.body
    if (!number) return res.status(400).json({ error: 'number required' })
    res.json({ success: true, message: `Use /api/phone/send to send a message to ${number}` })
  })

  // GET /api/phone/bridge-status — Check if mac-bridge is alive
  app.get('/api/phone/bridge-status', async (req, res) => {
    try {
      const result = await bridgeCall('/health')
      res.json({ online: true, ...result })
    } catch (err) {
      res.json({ online: false, error: err.message })
    }
  })
}

module.exports = { registerRoutes }
