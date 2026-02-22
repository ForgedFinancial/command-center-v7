#!/usr/bin/env node
/**
 * mac-bridge.js — Clawd's Mac capability bridge
 * Runs on Boss's Mac, exposes iMessage/Calls/FaceTime via AppleScript + sqlite3
 * Port: 7891 | Auth: Bearer MAC_BRIDGE_TOKEN
 */

const http = require('http')
const { exec, execFile } = require('child_process')
const path = require('path')
const os = require('os')

const PORT = 7891
const TOKEN = process.env.MAC_BRIDGE_TOKEN || 'mac-bridge-2026'
const CHAT_DB = path.join(os.homedir(), 'Library/Messages/chat.db')

// ─── Auth middleware ───────────────────────────────────────────────────────────
function auth(req) {
  const h = req.headers['authorization'] || ''
  return h === `Bearer ${TOKEN}`
}

// ─── AppleScript runner ────────────────────────────────────────────────────────
function runAppleScript(script) {
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', script], { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout.trim())
    })
  })
}

// ─── sqlite3 query ─────────────────────────────────────────────────────────────
function sqlQuery(query) {
  return new Promise((resolve, reject) => {
    execFile('sqlite3', ['-json', '-readonly', CHAT_DB, query], { timeout: 10000 }, (err, stdout) => {
      if (err) reject(new Error(err.message))
      else {
        try { resolve(JSON.parse(stdout || '[]')) }
        catch { resolve([]) }
      }
    })
  })
}

// ─── JSON body parser ──────────────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(data)) }
      catch { resolve({}) }
    })
  })
}

// ─── Routes ────────────────────────────────────────────────────────────────────
const routes = {

  // GET /health
  'GET /health': async () => ({
    ok: true,
    version: '1.0.0',
    time: new Date().toISOString(),
    capabilities: ['messages-read', 'messages-send', 'call-dial', 'facetime']
  }),

  // GET /thread/:phone — read last N messages from a thread
  'GET /thread': async (req, params) => {
    const phone = params.id
    const limit = params.limit || 30
    if (!phone) throw new Error('phone required')
    const clean = phone.replace(/[^\d+]/g, '')
    const rows = await sqlQuery(`
      SELECT
        m.text,
        m.is_from_me,
        datetime(m.date/1000000000 + strftime('%s','2001-01-01'), 'unixepoch') as sent_at,
        h.id as sender
      FROM message m
      JOIN handle h ON m.handle_id = h.rowid
      JOIN chat_message_join cmj ON m.rowid = cmj.message_id
      JOIN chat c ON cmj.chat_id = c.rowid
      WHERE c.chat_identifier = '${clean}' OR c.chat_identifier = '+${clean}'
        AND m.text IS NOT NULL
      ORDER BY m.date DESC
      LIMIT ${limit}
    `)
    return { phone: clean, messages: rows.reverse() }
  },

  // POST /send — send iMessage
  'POST /send': async (req) => {
    const { to, message } = await parseBody(req)
    if (!to || !message) throw new Error('to and message required')
    const clean = to.replace(/[^\d+]/g, '')
    const escaped = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const script = `tell application "Messages"
  set targetService to 1st service whose service type = iMessage
  set targetBuddy to buddy "${clean}" of targetService
  send "${escaped}" to targetBuddy
end tell`
    await runAppleScript(script)
    return { success: true, to: clean, message }
  },

  // POST /dial — dial phone number via FaceTime audio (auto-confirms)
  'POST /dial': async (req) => {
    const { number } = await parseBody(req)
    if (!number) throw new Error('number required')
    const clean = number.replace(/[^\d+]/g, '')
    // facetime-audio:// dials instantly — no banner, no confirmation required
    const script = `open location "facetime-audio://${clean}"`
    await runAppleScript(script)
    return { success: true, number: clean, method: 'facetime-audio-direct' }
  },

  // POST /facetime — FaceTime video call
  'POST /facetime': async (req) => {
    const { number } = await parseBody(req)
    if (!number) throw new Error('number required')
    const clean = number.replace(/[^\d+]/g, '')
    const script = `open location "facetime://${clean}"`
    await runAppleScript(script)
    return { success: true, number: clean, method: 'facetime-video' }
  },

  // GET /contacts/:name — search Mac Address Book
  'GET /contacts': async (req, params) => {
    const query = (params.id || '').toLowerCase()
    if (!query) throw new Error('name required')
    // Find AddressBook DB via mdfind
    const dbPath = await new Promise((resolve) => {
      // Look for the actual .abcddb file, exclude WAL/SHM lock files
      exec('mdfind -name "AddressBook-v22.abcddb" 2>/dev/null', { timeout: 5000 }, (err, out) => {
        const match = (out || '').split('\n').map(s => s.trim())
          .filter(p => p.endsWith('.abcddb') && !p.endsWith('-shm') && !p.endsWith('-wal'))
          .find(Boolean)
        if (match) return resolve(match)
        // fallback: hardcoded path
        const direct = path.join(os.homedir(), 'Library/Application Support/AddressBook/Sources')
        exec(`find "${direct}" -name "*.abcddb" ! -name "*-shm" ! -name "*-wal" 2>/dev/null | head -1`, { timeout: 5000 }, (e2, o2) => {
          resolve(o2.trim() || path.join(os.homedir(), 'Library/Application Support/AddressBook/AddressBook-v22.abcddb'))
        })
      })
    })
    if (!dbPath) throw new Error('AddressBook DB not found')
    return new Promise((resolve, reject) => {
      execFile('sqlite3', ['-json', '-readonly', dbPath,
        `SELECT ZABCDRECORD.ZFIRSTNAME, ZABCDRECORD.ZLASTNAME, ZABCDPHONENUMBER.ZFULLNUMBER
         FROM ZABCDRECORD
         LEFT JOIN ZABCDPHONENUMBER ON ZABCDPHONENUMBER.ZOWNER = ZABCDRECORD.Z_PK
         WHERE lower(ZABCDRECORD.ZFIRSTNAME || ' ' || coalesce(ZABCDRECORD.ZLASTNAME,'')) LIKE '%${query}%'
            OR lower(coalesce(ZABCDRECORD.ZLASTNAME,'') || ' ' || ZABCDRECORD.ZFIRSTNAME) LIKE '%${query}%'
         LIMIT 20`
      ], { timeout: 8000 }, (err, stdout) => {
        if (err) return reject(new Error(err.message))
        try {
          const rows = JSON.parse(stdout || '[]')
          const results = rows.map(r => ({
            name: `${r.ZFIRSTNAME || ''} ${r.ZLASTNAME || ''}`.trim(),
            phone: (r.ZFULLNUMBER || '').replace(/\s+/g, ''),
          })).filter(r => r.phone)
          resolve({ results, query })
        } catch { resolve({ results: [], query }) }
      })
    })
  },

  // POST /test-dial-click — dial tel:// then scan ALL processes for call button
  'POST /test-dial-click': async (req) => {
    const { number } = await parseBody(req)
    if (!number) throw new Error('number required')
    const clean = number.replace(/[^\d+]/g, '')
    // Research-confirmed working paths — try each in sequence
    const script = `
open location "tel://${clean}"
delay 2
set didClick to "false"

-- Path 1: Ventura/Sequoia (NotificationCenter, no space)
try
  tell application "System Events" to tell process "NotificationCenter"
    click button "Call" of group 1 of UI element 1 of scroll area 1 of group 1 of window 1
  end tell
  set didClick to "path1"
end try

-- Path 2: Big Sur direct UI element
if didClick is "false" then
  try
    tell application "System Events" to tell process "NotificationCenter"
      click UI element "Call" of scroll area 1 of window "Notification Center"
    end tell
    set didClick to "path2"
  end try
end if

-- Path 3: With space in process name
if didClick is "false" then
  try
    tell application "System Events" to tell process "Notification Center"
      click button "Call" of group 1 of UI element 1 of scroll area 1 of group 1 of window 1
    end tell
    set didClick to "path3"
  end try
end if

return didClick`
    const result = await runAppleScript(script)
    const [clicked, foundIn] = result.trim().split('|')
    return { success: true, number: clean, clicked, foundIn, method: 'full-scan-click' }
  },

  // GET /dump-notification — dump accessibility tree of NotificationCenter
  'GET /dump-notification': async () => {
    const script = `
tell application "System Events"
  set output to ""
  try
    tell process "NotificationCenter"
      set allWins to windows
      set output to output & "Windows: " & (count of allWins) & "\n"
      repeat with w in allWins
        try
          set allGroups to groups of scroll area 1 of w
          set output to output & "Groups: " & (count of allGroups) & "\n"
          repeat with g in allGroups
            set btns to buttons of g
            set output to output & "  Buttons: " & (count of btns) & "\n"
            repeat with b in btns
              set output to output & "    btn name=[" & (name of b) & "] desc=[" & (description of b) & "] role=[" & (role of b) & "]\n"
            end repeat
          end repeat
        end try
      end repeat
    end tell
  on error e
    set output to "Error: " & e
  end try
  return output
end tell`
    const result = await runAppleScript(script)
    return { dump: result }
  },

  // POST /exec — run a shell command on the Mac
  'POST /exec': async (req) => {
    const { command, timeout } = await parseBody(req)
    if (!command) throw new Error('command required')
    return new Promise((resolve, reject) => {
      exec(command, { timeout: timeout || 60000, shell: '/bin/zsh' }, (err, stdout, stderr) => {
        resolve({
          exitCode: err ? err.code || 1 : 0,
          stdout: stdout.toString().slice(0, 10000),
          stderr: stderr.toString().slice(0, 5000),
        })
      })
    })
  },

  // GET /threads — list recent conversations with names (sqlite only)
  'GET /threads': async () => {
    const rows = await sqlQuery(`
      SELECT
        c.chat_identifier,
        c.display_name,
        m.text as last_message,
        datetime(m.date/1000000000 + strftime('%s','2001-01-01'), 'unixepoch') as last_msg_time,
        COUNT(m.rowid) as msg_count
      FROM chat c
      JOIN chat_message_join cmj ON c.rowid = cmj.chat_id
      JOIN message m ON cmj.message_id = m.rowid
      WHERE m.text IS NOT NULL
      GROUP BY c.rowid
      ORDER BY m.date DESC
      LIMIT 50
    `)
    return { threads: rows }
  },

}

// ─── Server ────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')

  if (!auth(req)) {
    res.writeHead(401)
    return res.end(JSON.stringify({ error: 'Unauthorized' }))
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const parts = url.pathname.split('/').filter(Boolean)
  const base = `${req.method} /${parts[0] || ''}`
  const params = { id: parts[1], ...Object.fromEntries(url.searchParams) }

  const handler = routes[base] || routes[`${req.method} /${parts[0]}`]

  if (!handler) {
    res.writeHead(404)
    return res.end(JSON.stringify({ error: 'Not found', path: url.pathname }))
  }

  try {
    const result = await handler(req, params)
    res.writeHead(200)
    res.end(JSON.stringify(result))
  } catch (err) {
    console.error(`[mac-bridge] ${base} error:`, err.message)
    res.writeHead(500)
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ mac-bridge running on port ${PORT}`)
  console.log(`   Capabilities: iMessage read/send, dial, FaceTime`)
  console.log(`   Token: ${TOKEN}`)
})
