// Session persistence helper - saves sessions to disk
const fs = require('fs');
const path = require('path');
const SESSION_FILE = path.join(__dirname, '.sessions.json');

function saveSessions(sessions) {
  try {
    const data = {};
    for (const [k,v] of sessions) data[k] = v;
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data));
  } catch(e) {}
}

function loadSessions(sessions) {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      for (const [k,v] of Object.entries(data)) sessions.set(k, v);
      console.log(`[AUTH] Restored ${sessions.size} sessions from disk`);
    }
  } catch(e) {}
}

module.exports = { saveSessions, loadSessions };
