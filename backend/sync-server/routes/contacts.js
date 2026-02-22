/**
 * Contacts API — Activity Timeline + Follow-Up Queue
 * Routes: /api/contacts/*
 * Built by Mason (FF-BLD-001) — 2026-02-20
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'contacts');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// GET /api/contacts/follow-up-queue — must be before /:id routes
router.get('/follow-up-queue', (req, res) => {
  const queuePath = path.join(DATA_DIR, 'follow-up-queue.json');
  let queue = [];
  try { queue = JSON.parse(fs.readFileSync(queuePath, 'utf8')); } catch {}

  const now = new Date();
  const active = queue
    .filter(item => new Date(item.followUpDate) >= new Date(now.toDateString()))
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));

  res.json({ queue: active, total: active.length });
});

// GET /api/contacts/:id/activity — contact activity timeline
router.get('/:id/activity', (req, res) => {
  const { id } = req.params;
  const activityPath = path.join(DATA_DIR, `${id}-activity.json`);
  let activity = [];
  if (fs.existsSync(activityPath)) {
    try { activity = JSON.parse(fs.readFileSync(activityPath, 'utf8')); } catch {}
  }

  res.json({
    contactId: id,
    activity: activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  });
});

module.exports = router;
