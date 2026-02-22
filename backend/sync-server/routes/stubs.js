// ==============================================
// Route Stubs — placeholder endpoints for CC v7
// Created 2026-02-19 by Mason
// ==============================================

const express = require('express');
const router = express.Router();

// ---- Notifications ----
// POST /api/notifications/telegram — MOVED to routes/notifications.js (2026-02-20)

// ---- Phone ----
// GET /api/phone/ping — MOVED to routes/mac-proxy.js (2026-02-20)

// ---- Messages ----
// GET /api/messages/:chatId — get messages for a specific chat
router.get('/messages/:chatId', (req, res) => {
  res.json({ messages: [], chatId: req.params.chatId });
});

// ---- Taskboard: suggestions GET ----
// GET /api/taskboard/suggestions — MOVED to routes/taskboard.js (2026-02-20)

// ---- Taskboard: document upload ----
// POST /api/taskboard/documents/upload — MOVED to routes/taskboard.js (2026-02-20)

// ---- Auth ----
// GET /api/auth/setup — check if auth is set up
router.get('/auth/setup', (req, res) => {
  res.json({ configured: true, method: 'api-key' });
});

// POST /api/auth/setup — configure auth (graceful stub)
router.post('/auth/setup', (req, res) => {
  res.json({ success: true, message: 'Auth configuration not yet available' });
});

module.exports = router;
