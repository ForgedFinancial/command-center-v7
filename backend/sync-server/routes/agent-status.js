/**
 * Agent Status API — Live gateway health checks
 * GET /api/comms/agents/status
 *
 * Status logic:
 *   GREEN  (online)  — gateway HTTP responding AND heartbeat file fresh (< 3 min)
 *   YELLOW (idle)    — gateway HTTP responding but no recent heartbeat
 *   RED    (offline) — gateway not responding
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const http = require('http');

const TASKS_FILE = '/home/clawd/claude-comms/tasks.json';

const AGENTS = [
  { id: 'clawd',    name: 'Clawd',    role: 'COO',          port: 18789, designation: 'FF-COO-001', model: 'claude-sonnet-4-6' },
  { id: 'soren',    name: 'Soren',    role: 'The Planner',  port: 18810, designation: 'FF-PLN-001', model: 'gpt-4o' },
  { id: 'mason',    name: 'Mason',    role: 'The Builder',  port: 18830, designation: 'FF-BLD-001', model: 'gpt-5.2-codex' },
  { id: 'sentinel', name: 'Sentinel', role: 'The Inspector',port: 18850, designation: 'FF-QA-001',  model: 'gpt-4o' },
  { id: 'kyle',     name: 'Kyle',     role: 'Desktop Agent',port: 18870, designation: 'CC-DSK-001', model: 'claude-sonnet-4-6' },
];

/**
 * Ping a gateway HTTP port to check if it's alive.
 * Returns true/false within 2 seconds.
 */
function pingGateway(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, { timeout: 2000 }, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

router.get('/', async (req, res) => {
  try {
    let tasks = [];
    try { tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8')); } catch {}

    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    const statuses = await Promise.all(AGENTS.map(async (agent) => {
      // Check gateway liveness
      const gatewayAlive = await pingGateway(agent.port);

      // Check heartbeat file for session activity
      const hbFile = `/tmp/forged-daemon-${agent.id}.heartbeat`;
      let lastHeartbeat = null;
      let sessionActive = false;
      try {
        const stat = fs.statSync(hbFile);
        lastHeartbeat = stat.mtime.toISOString();
        sessionActive = (now - stat.mtime.getTime()) < 180000; // < 3 minutes
      } catch {}

      // Task counts
      const agentTasks = tasks.filter(t => t.assigned_to === agent.id || t.assignee === agent.id);
      const running = agentTasks.find(t => t.status === 'running' || t.status === 'claimed');
      const completedToday = agentTasks.filter(t =>
        t.status === 'complete' && t.completed_at && t.completed_at.startsWith(today)
      ).length;

      // Determine status
      let status = 'offline'; // RED
      if (gatewayAlive && sessionActive) {
        status = running ? 'busy' : 'online'; // GREEN
      } else if (gatewayAlive) {
        status = 'idle'; // YELLOW
      }

      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        designation: agent.designation,
        model: agent.model,
        status,                    // offline | idle | online | busy
        gatewayAlive,
        sessionActive,
        last_heartbeat: lastHeartbeat,
        current_task: running ? running.id : null,
        current_task_title: running ? (running.title || running.description || '').substring(0, 60) : null,
        tasks_completed_today: completedToday,
        pending_tasks: agentTasks.filter(t => t.status === 'pending').length,
      };
    }));

    res.json(statuses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
