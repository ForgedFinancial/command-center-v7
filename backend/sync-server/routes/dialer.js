/**
 * Power Dialer Session Management
 * Routes: /api/twilio/dialer/*
 * Built by Mason (FF-BLD-001) — 2026-02-20
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'dialer-sessions.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readSessions() {
  try { return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')); } catch { return []; }
}
function writeSessions(data) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2));
}

// POST /api/twilio/dialer/session — create dialer session
router.post('/session', (req, res) => {
  const { leadListId, agentId, leads } = req.body;
  const session = {
    id: `ds-${Date.now()}`,
    leadListId: leadListId || null,
    agentId: agentId || 'dano',
    leads: leads || [],
    currentIndex: 0,
    status: 'active', // active | paused | ended
    dispositions: [],
    stats: { total: (leads || []).length, contacted: 0, noAnswer: 0, voicemail: 0, callback: 0, dnc: 0, notInterested: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    endedAt: null
  };
  const sessions = readSessions();
  sessions.unshift(session);
  writeSessions(sessions);
  res.json({ success: true, session });
});

// GET /api/twilio/dialer/session/:id — get session status
router.get('/session/:id', (req, res) => {
  const sessions = readSessions();
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const currentLead = session.leads[session.currentIndex] || null;
  res.json({ session, currentLead });
});

// PATCH /api/twilio/dialer/session/:id — update session (disposition, pause, resume, end)
router.patch('/session/:id', (req, res) => {
  const sessions = readSessions();
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { action, disposition, notes } = req.body;

  if (action === 'disposition' && disposition) {
    session.dispositions.push({
      leadIndex: session.currentIndex,
      lead: session.leads[session.currentIndex],
      disposition,
      notes: notes || '',
      at: new Date().toISOString()
    });
    // Update stats
    const statMap = { contacted: 'contacted', 'no-answer': 'noAnswer', voicemail: 'voicemail', callback: 'callback', dnc: 'dnc', 'not-interested': 'notInterested' };
    if (statMap[disposition]) session.stats[statMap[disposition]]++;
    // Auto-advance
    session.currentIndex++;
    if (session.currentIndex >= session.leads.length) {
      session.status = 'ended';
      session.endedAt = new Date().toISOString();
    }
  } else if (action === 'pause') {
    session.status = 'paused';
  } else if (action === 'resume') {
    session.status = 'active';
  } else if (action === 'end') {
    session.status = 'ended';
    session.endedAt = new Date().toISOString();
  } else if (action === 'skip') {
    session.currentIndex++;
    if (session.currentIndex >= session.leads.length) {
      session.status = 'ended';
      session.endedAt = new Date().toISOString();
    }
  }

  session.updatedAt = new Date().toISOString();
  writeSessions(sessions);
  res.json({ success: true, session });
});

// GET /api/twilio/dialer/sessions — list all sessions
router.get('/sessions', (req, res) => {
  const sessions = readSessions();
  res.json({ sessions: sessions.slice(0, 50) });
});

module.exports = router;
