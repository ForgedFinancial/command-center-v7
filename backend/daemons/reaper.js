#!/usr/bin/env node
/**
 * Stale Task Reaper — runs every 5 min via systemd timer
 * Resets claimed tasks older than 10 min back to pending
 */
const fs = require('fs');
const lockfile = require('proper-lockfile');
const axios = require('axios');
const https = require('https');

const TASKS_FILE = '/home/clawd/claude-comms/tasks.json';
const API_URL = process.env.COMMS_API_URL || 'https://localhost:443';
const API_KEY = process.env.COMMS_API_KEY || '';
const agent = new https.Agent({ rejectUnauthorized: false });

async function run() {
  let release;
  try {
    release = await lockfile.lock(TASKS_FILE, { retries: 3, stale: 10000 });
    const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    const now = Date.now();
    let resetCount = 0;

    for (const task of tasks) {
      if (task.status === 'claimed' && task.claimed_at) {
        const age = now - new Date(task.claimed_at).getTime();
        if (age > 600000) { // 10 min
          task.status = 'pending';
          task.claimed_at = null;
          resetCount++;
        }
      }
    }

    if (resetCount > 0) {
      const tmp = TASKS_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(tasks, null, 2), 'utf8');
      fs.renameSync(tmp, TASKS_FILE);
      console.log(`Reset ${resetCount} stale tasks`);

      if (API_KEY) {
        await axios.post(`${API_URL}/api/comms/send`, {
          from: 'reaper', to: 'standup', topic: 'standup',
          message: `⚠️ STALE TASK REAPER: Reset ${resetCount} stale claimed task(s) back to pending`
        }, { headers: { 'x-api-key': API_KEY }, httpsAgent: agent, timeout: 10000 });
      }
    } else {
      console.log('No stale tasks');
    }
  } finally {
    if (release) await release();
  }
}

run().catch(e => { console.error(e.message); process.exit(1); });
