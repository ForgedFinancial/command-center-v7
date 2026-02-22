// ========================================
// Notifications API Routes
// JSON file-backed notification storage
// Added: 2026-02-18 by Mason (FF-BLD-001)
// ========================================

const express = require('express')
const router = express.Router()
const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const crypto = require('crypto')

const DATA_DIR = '/home/clawd/.openclaw/data/notifications'
const DATA_FILE = path.join(DATA_DIR, 'notifications.json')

if (!fsSync.existsSync(DATA_DIR)) fsSync.mkdirSync(DATA_DIR, { recursive: true })

async function readNotifications() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeNotifications(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

function genId() {
  return `notif_${crypto.randomBytes(8).toString('hex')}`
}

// GET /api/notifications — list notifications (newest first)
router.get('/', async (req, res) => {
  try {
    const notifications = await readNotifications()
    const limit = parseInt(req.query.limit) || 50
    const unreadOnly = req.query.unread === 'true'
    let result = notifications
    if (unreadOnly) result = result.filter(n => !n.read)
    result = result.slice(0, limit)
    const unreadCount = notifications.filter(n => !n.read).length
    res.json({ ok: true, data: result, unreadCount })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// POST /api/notifications — create a notification
router.post('/', async (req, res) => {
  try {
    const notifications = await readNotifications()
    const notif = {
      id: genId(),
      title: req.body.title || 'Notification',
      description: req.body.description || '',
      type: req.body.type || 'info', // info, success, warning, error, task, agent, build
      read: false,
      createdAt: new Date().toISOString(),
      meta: req.body.meta || {},
    }
    notifications.unshift(notif)
    // Keep max 200 notifications
    if (notifications.length > 200) notifications.length = 200
    await writeNotifications(notifications)
    res.json({ ok: true, data: notif })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// PUT /api/notifications/:id/read — mark single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notifications = await readNotifications()
    const notif = notifications.find(n => n.id === req.params.id)
    if (!notif) return res.status(404).json({ ok: false, error: 'Not found' })
    notif.read = true
    notif.readAt = new Date().toISOString()
    await writeNotifications(notifications)
    res.json({ ok: true, data: notif })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// POST /api/notifications/mark-all-read — mark all as read
router.post('/mark-all-read', async (req, res) => {
  try {
    const notifications = await readNotifications()
    const now = new Date().toISOString()
    notifications.forEach(n => { if (!n.read) { n.read = true; n.readAt = now } })
    await writeNotifications(notifications)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// POST /api/notifications/telegram — send Telegram notification (replaces stub)
router.post('/telegram', async (req, res) => {
  const { message, chatId } = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(503).json({ error: 'Telegram not configured' });
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId || process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    const data = await tgRes.json();
    res.json({ success: data.ok, messageId: data.result?.message_id });
  } catch (err) {
    res.status(500).json({ error: 'Telegram send failed', detail: err.message });
  }
});

module.exports = router
