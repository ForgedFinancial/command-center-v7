#!/usr/bin/env node
// AI Request Watcher — polls sync server for ai_request updates from CC
const fs = require('fs');
const path = require('path');

const SYNC_URL = 'http://localhost:443';
const API_KEY = fs.readFileSync(path.join(__dirname, '.api-key'), 'utf8').trim();
const STATE_FILE = path.join(__dirname, 'ai-watcher-state.json');
const OUTPUT_FILE = path.join(__dirname, 'ai-requests.json');

let lastTs = null;
try {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  lastTs = state.lastTs;
} catch(e) {}

async function poll() {
  try {
    const url = lastTs ? `${SYNC_URL}/api/poll?since=${encodeURIComponent(lastTs)}` : `${SYNC_URL}/api/poll`;
    const res = await fetch(url);
    const data = await res.json();
    
    const aiRequests = data.updates.filter(u => u.type === 'ai_request');
    
    if (aiRequests.length > 0) {
      // Append to requests file
      let existing = [];
      try { existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); } catch(e) {}
      existing.push(...aiRequests.map(r => ({ ...r, processed: false })));
      // Keep last 100
      if (existing.length > 100) existing = existing.slice(-100);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existing, null, 2));
      console.log(`[AI-WATCHER] ${aiRequests.length} new AI request(s)`);
      aiRequests.forEach(r => {
        console.log(`  → Task: "${r.data.title}" | Action: ${r.action}`);
        if (r.data.expectations) console.log(`    Expectations: ${r.data.expectations}`);
        if (r.data.suggestions) console.log(`    Suggestions: ${r.data.suggestions}`);
      });
    }
    
    if (data.updates.length > 0) {
      lastTs = data.updates[data.updates.length - 1].ts;
      fs.writeFileSync(STATE_FILE, JSON.stringify({ lastTs }));
    }
  } catch(e) {
    console.error('[AI-WATCHER] Poll error:', e.message);
  }
}

// Poll every 10 seconds
setInterval(poll, 10000);
poll();
console.log('[AI-WATCHER] Started — polling for AI requests every 10s');
