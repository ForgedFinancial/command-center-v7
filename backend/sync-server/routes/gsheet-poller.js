/**
 * Google Sheet Lead Poller
 * Polls a public Google Sheet CSV export for new leads
 * Writes new leads to pending-alerts.json for Telegram notification
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

const SHEET_ID = '195whJ8TKFft2LMtT8-FOW_W_vwPcI3s7tEdQ1soYP3Q';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
// Smart polling: 30s during business hours (8AM-11PM CT), 120s overnight
function getPollInterval() {
  const now = new Date();
  const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const hour = ct.getHours();
  return (hour >= 8 && hour < 23) ? 30_000 : 120_000;
}
const POLL_INTERVAL = 30_000; // default for initial start
const ALERT_FILE = '/home/clawd/.openclaw/data/leads/pending-alerts.json';
const SEEN_FILE = '/home/clawd/.openclaw/data/leads/gsheet-seen.json';
const LEADS_DIR = '/home/clawd/.openclaw/data/leads';
const WEBHOOK_FILE = path.join(LEADS_DIR, 'webhook-leads.json');

if (!fsSync.existsSync(LEADS_DIR)) fsSync.mkdirSync(LEADS_DIR, { recursive: true });

function readJSON(file) {
  try { return JSON.parse(fsSync.readFileSync(file, 'utf8')); } catch { return []; }
}
function writeJSON(file, data) {
  fsSync.writeFileSync(file, JSON.stringify(data, null, 2));
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const CF_ACCOUNT = 'bbaba6c44b7b5d3bba84ca01f4d38d02';
const CF_API_TOKEN = 'jsExsycjXPI0QktmAwsNUsvspvUUSfWN65BghpKC';
const D1_DB_ID = 'b2ae86e6-cc42-431a-80f9-f17e82379119';

async function checkDuplicateInD1(phone, name) {
  if (!phone && !name) return false;
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${D1_DB_ID}/query`;
    const conditions = [];
    const params = [];
    if (phone) { conditions.push('phone = ?'); params.push(phone); }
    if (name) { conditions.push('name = ?'); params.push(name); }
    const sql = `SELECT id FROM leads WHERE (${conditions.join(' OR ')}) LIMIT 1`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    });
    const data = await res.json();
    return (data.result?.[0]?.results?.length || 0) > 0;
  } catch { return false; }
}

async function insertLeadToD1(lead) {
  try {
    // Dedup check — skip if phone or name already exists
    const isDupe = await checkDuplicateInD1(lead.phone, lead.name);
    if (isDupe) {
      console.log(`[gsheet-poller] Skipping duplicate lead: ${lead.name} (${lead.phone})`);
      return;
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${D1_DB_ID}/query`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: `INSERT INTO leads (id, agent_id, name, phone, email, stage, pipeline, lead_type, state, tags, created_at, updated_at, dob, face_amount, beneficiary, beneficiary_relation, age, gender, health_history, has_life_insurance, favorite_hobby, ad_source, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          crypto.randomUUID(),
          'd1c2ebf5-ba43-4909-a0d8-4ac14ef62f50',
          lead.name, lead.phone, lead.email,
          'new_lead', 'new', 'FEX', lead.state,
          JSON.stringify(lead.tags || []),
          new Date().toISOString(), new Date().toISOString(),
          lead.dob || '', lead.amtRequested || '',
          lead.beneficiaryName || '', lead.beneficiary || '',
          lead.age || '', lead.gender || '',
          lead.healthHistory || '', lead.hasLifeInsurance || '',
          lead.favoriteHobby || '', lead.ad || '', lead.platform || ''
        ]
      })
    });
    const data = await res.json();
    if (!data.success) {
      console.error('[gsheet-poller] D1 insert error:', JSON.stringify(data.errors));
    } else {
      console.log(`[gsheet-poller] Lead inserted to D1 CRM: ${lead.name}`);
    }
  } catch (err) {
    console.error('[gsheet-poller] D1 insert failed:', err.message);
  }
}

function rowToLead(row) {
  const name = `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim();
  const phone = (row['Phone'] || '').replace(/[^\d+]/g, '');
  return {
    id: `gsheet_${crypto.randomBytes(8).toString('hex')}`,
    name: name || 'Unknown',
    firstName: row['First Name'] || '',
    lastName: row['Last Name'] || '',
    phone,
    email: row['Email'] || '',
    state: row['State'] || '',
    leadType: 'FEX',
    source: `Google Sheet - ${row['Ad'] || row['Platform'] || 'Unknown'}`,
    vendor: 'Google Sheet',
    stage: 'new_lead',
    pipeline: 'new',
    status: row['Status'] || 'New Lead',
    dob: row['DOB'] || '',
    gender: row['Gender'] || '',
    amtRequested: row['Amt Requested'] || '',
    beneficiary: row['Beneficiary'] || '',
    beneficiaryName: row['Beneficiary Name'] || '',
    platform: row['Platform'] || '',
    ad: row['Ad'] || '',
    age: row['Age'] || '',
    healthHistory: row['History of Heart Attack Stroke Cancer'] || '',
    hasLifeInsurance: row['Have Life Insurance'] || '',
    favoriteHobby: row['Favorite Hobby'] || '',
    tags: [],
    createdAt: row['Date/Time'] || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    gsheetRow: true
  };
}

function rowHash(row) {
  // Unique key: phone + name + date
  const key = `${row['Phone'] || ''}|${row['First Name'] || ''}|${row['Last Name'] || ''}|${row['Date/Time'] || ''}`;
  return crypto.createHash('md5').update(key).digest('hex');
}

let gsheetConsecutiveFailures = 0;

async function pollSheet() {
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) {
      console.error(`[gsheet-poller] HTTP ${res.status} fetching sheet`);
      gsheetConsecutiveFailures++;
      if (gsheetConsecutiveFailures >= 3 && process.env.TELEGRAM_BOT_TOKEN) {
        try {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: `⚠️ GSheet poller has failed ${gsheetConsecutiveFailures} times in a row. HTTP ${res.status}` })
          });
        } catch {}
      }
      return;
    }
    const text = await res.text();
    const rows = parseCSV(text);
    
    if (rows.length === 0) return;
    
    // Load seen hashes
    const seen = new Set(readJSON(SEEN_FILE));
    let newCount = 0;
    
    for (const row of rows) {
      const hash = rowHash(row);
      if (seen.has(hash)) continue;
      
      // New lead!
      seen.add(hash);
      const lead = rowToLead(row);
      
      // Add to webhook-leads.json (same as webhook endpoint)
      const leads = readJSON(WEBHOOK_FILE);
      leads.unshift(lead);
      writeJSON(WEBHOOK_FILE, leads);
      
      // Add to pending-alerts for Telegram notification
      const alerts = readJSON(ALERT_FILE);
      alerts.push({
        ...lead,
        alertAt: new Date().toISOString(),
        notified: false,
        reminded: false
      });
      writeJSON(ALERT_FILE, alerts);
      
      // Insert into YN-CRM D1 database (shows in CRM pipeline)
      await insertLeadToD1(lead);
      
      newCount++;
      console.log(`[gsheet-poller] New lead: ${lead.name} (${lead.phone}) from ${lead.state}`);
    }
    
    // Save seen hashes
    writeJSON(SEEN_FILE, [...seen]);
    
    if (newCount > 0) {
      console.log(`[gsheet-poller] ${newCount} new lead(s) detected`);
    }
    gsheetConsecutiveFailures = 0; // Reset on success
  } catch (err) {
    gsheetConsecutiveFailures++;
    console.error(`[gsheet-poller] Error (${gsheetConsecutiveFailures} consecutive):`, err.message);
    if (gsheetConsecutiveFailures >= 3 && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: `⚠️ GSheet poller has failed ${gsheetConsecutiveFailures} times in a row.\nError: ${err.message}` })
        });
      } catch {}
    }
  }
}

function start() {
  console.log(`[gsheet-poller] Started. Sheet: ${SHEET_ID}. Polling every ${POLL_INTERVAL/1000}s`);
  // First poll — mark all existing rows as seen (don't alert on historical data)
  initSeen().then(() => {
    // Adaptive polling — faster during business hours, slower overnight
    function scheduleNext() {
      setTimeout(() => { pollSheet().finally(scheduleNext); }, getPollInterval());
    }
    scheduleNext();
  });
}

async function initSeen() {
  const seenFile = readJSON(SEEN_FILE);
  if (seenFile.length > 0) {
    console.log(`[gsheet-poller] ${seenFile.length} rows already seen`);
    return; // Already initialized
  }
  
  // First run — mark all existing rows as seen
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) return;
    const text = await res.text();
    const rows = parseCSV(text);
    const hashes = rows.map(rowHash);
    writeJSON(SEEN_FILE, hashes);
    console.log(`[gsheet-poller] Initialized: ${hashes.length} existing rows marked as seen (no alerts for historical data)`);
  } catch (err) {
    console.error('[gsheet-poller] Init error:', err.message);
  }
}

module.exports = { start };
