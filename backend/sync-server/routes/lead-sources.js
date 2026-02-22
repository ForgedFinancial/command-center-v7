// ========================================
// Lead Sources Settings API Routes
// Google Sheets integration config storage
// Added: 2026-02-18 by Mason (FF-BLD-001)
// ========================================

const express = require('express')
const router = express.Router()
const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const crypto = require('crypto')

const LEAD_TYPES = ['FEX', 'VETERANS', 'MORTGAGE PROTECTION', 'TRUCKERS', 'IUL']

const DATA_DIR = '/home/clawd/.openclaw/data/settings'
const DATA_FILE = path.join(DATA_DIR, 'lead-sources.json')

if (!fsSync.existsSync(DATA_DIR)) fsSync.mkdirSync(DATA_DIR, { recursive: true })

async function readSources() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeSources(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

// GET /api/settings/lead-sources — list all configured lead sources
router.get('/', async (_req, res) => {
  try {
    const sources = await readSources()
    res.json({ ok: true, data: sources, leadTypes: LEAD_TYPES })
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to read lead sources' })
  }
})

// POST /api/settings/lead-sources — save all lead sources (full replace)
router.post('/', async (req, res) => {
  try {
    const { sources } = req.body || {}
    if (!Array.isArray(sources)) {
      return res.status(400).json({ ok: false, error: 'sources must be an array' })
    }

    const validated = sources.map(s => ({
      id: s.id || `ls_${crypto.randomBytes(6).toString('hex')}`,
      name: (s.name || '').trim(),
      sheetUrl: (s.sheetUrl || '').trim(),
      leadType: LEAD_TYPES.includes((s.leadType || '').toUpperCase()) ? (s.leadType || '').toUpperCase() : '',
      active: s.active !== false,
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    await writeSources(validated)
    res.json({ ok: true, data: validated })
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to save lead sources' })
  }
})

module.exports = router
