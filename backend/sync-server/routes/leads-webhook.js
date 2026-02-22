// ========================================
// Leads Webhook API Routes
// Accepts leads from external vendors (no auth)
// Added: 2026-02-18 by Mason (FF-BLD-001)
// ========================================

const express = require('express')
const router = express.Router()
const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const crypto = require('crypto')

const LEAD_TYPES = ['FEX', 'VETERANS', 'MORTGAGE PROTECTION', 'TRUCKERS', 'IUL']

const GATEWAY_URL = 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = 'b18154b747e5e0e1e13466203d02b4c3c3b1265707ecdf28'

async function sendTelegramAlert(lead) {
  try {
    await fetch(`${GATEWAY_URL}/api/message`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        channel: 'telegram',
        to: '5317054921',
        message: `🔔 *NEW LEAD*\n\n👤 ${lead.name}\n📞 ${lead.phone || 'No phone'}\n📋 ${lead.leadType || 'Unknown type'}\n📍 Source: ${lead.source}\n\n_Log into CC v7 and call within 5 minutes!_`
      })
    })
  } catch { /* don't block webhook on Telegram failure */ }
}

// 5-min reminder if Boss hasn't logged into CC v7
function scheduleReminder(lead) {
  setTimeout(async () => {
    try {
      const leadWatcher = require('../lead-watcher')
      // If Boss was active in CC in the last 5 min, skip reminder
      // recordCCActivity sets the timestamp; we check it
      // For simplicity, just send the reminder — the D1 poller handles CC activity tracking
      await fetch(`${GATEWAY_URL}/api/message`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          channel: 'telegram',
          to: '5317054921',
          message: `⏰ *5-MIN REMINDER*\n\n${lead.name} is still waiting for a call!\n📞 ${lead.phone || 'No phone'}\n\nGet on the phone, Boss! 📱`
        })
      })
    } catch { /* silent */ }
  }, 5 * 60 * 1000)
}


const DATA_DIR = '/home/clawd/.openclaw/data/leads'
const DATA_FILE = path.join(DATA_DIR, 'webhook-leads.json')
const NOTIF_DIR = '/home/clawd/.openclaw/data/notifications'
const NOTIF_FILE = path.join(NOTIF_DIR, 'notifications.json')

if (!fsSync.existsSync(DATA_DIR)) fsSync.mkdirSync(DATA_DIR, { recursive: true })

async function readLeads() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeLeads(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

async function createNotification(title, description, type, meta) {
  try {
    let notifications = []
    try {
      const raw = await fs.readFile(NOTIF_FILE, 'utf8')
      notifications = JSON.parse(raw)
    } catch { /* empty */ }

    const notif = {
      id: `notif_${crypto.randomBytes(8).toString('hex')}`,
      title,
      description,
      type,
      read: false,
      createdAt: new Date().toISOString(),
      meta: meta || {},
    }
    notifications.unshift(notif)
    if (notifications.length > 200) notifications.length = 200
    await fs.writeFile(NOTIF_FILE, JSON.stringify(notifications, null, 2))
  } catch { /* notification failure should not block webhook */ }
}

function genId() {
  return `lead_${crypto.randomBytes(8).toString('hex')}`
}

// POST /api/leads/webhook — receive lead from external vendor (NO AUTH)
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, phone, email,
      state: leadState, lead_type, source, vendor, timestamp,
    } = req.body || {}

    if (!first_name && !last_name && !phone && !email) {
      return res.status(400).json({ ok: false, error: 'At least one of first_name, last_name, phone, or email is required' })
    }

    const name = `${(first_name || '').trim()} ${(last_name || '').trim()}`.trim() || 'Unknown'
    const vendorName = vendor || source || 'Unknown'
    const leadTypeNormalized = lead_type ? lead_type.toUpperCase().trim() : ''
    const validLeadType = LEAD_TYPES.includes(leadTypeNormalized) ? leadTypeNormalized : ''

    const lead = {
      id: genId(),
      name,
      firstName: (first_name || '').trim(),
      lastName: (last_name || '').trim(),
      phone: (phone || '').trim(),
      email: (email || '').trim(),
      state: (leadState || '').trim(),
      leadType: validLeadType,
      source: vendorName,
      vendor: vendorName,
      stage: 'new_lead',
      pipeline: 'new',
      tags: ['Lead'],
      createdAt: timestamp || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      webhookReceived: true,
    }

    const leads = await readLeads()
    leads.unshift(lead)
    await writeLeads(leads)

    await createNotification(
      `New lead received: ${name}`,
      `From ${vendorName}${validLeadType ? ` • ${validLeadType}` : ''}${leadState ? ` • ${leadState}` : ''}`,
      'info',
      { leadId: lead.id, vendor: vendorName, leadType: validLeadType }
    )

    // Write to pending-alerts file for cron-based Telegram notification
    const alertFile = '/home/clawd/.openclaw/data/leads/pending-alerts.json'
    try {
      let alerts = []
      try { alerts = JSON.parse(await fs.readFile(alertFile, 'utf8')) } catch {}
      alerts.push({ ...lead, alertAt: new Date().toISOString(), notified: false, reminded: false })
      await fs.writeFile(alertFile, JSON.stringify(alerts, null, 2))
    } catch { /* don't block webhook */ }

    res.json({ ok: true, id: lead.id })
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Internal server error' })
  }
})

// GET /api/leads/webhook/types — return valid lead types
router.get('/types', (_req, res) => {
  res.json({ ok: true, leadTypes: LEAD_TYPES })
})

module.exports = router
