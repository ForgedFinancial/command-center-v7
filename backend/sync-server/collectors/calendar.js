const https = require('https');
const LOG = (msg) => console.log(`[COLLECTOR:CALENDAR] ${msg}`);

const CALDAV_URL = 'https://caldav.icloud.com';
const CALDAV_USER = process.env.CALDAV_USER;
const CALDAV_PASS = process.env.CALDAV_PASS;

if (!CALDAV_USER || !CALDAV_PASS) throw new Error('CalDAV credentials not configured');

let data = { events: [], calendars: [], lastPoll: null, error: null };
let discoveredCalendars = []; // [{name, href}] for createEvent/getCalendars
let interval = null;
let lastSuccessfulPoll = null;
let consecutiveFailures = 0;

function makeRequest(fullUrl, method, body, depth) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(fullUrl);
    const auth = Buffer.from(`${CALDAV_USER}:${CALDAV_PASS}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/xml; charset=utf-8',
      'Depth': String(depth != null ? depth : 1),
    };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);

    const req = https.request({
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + (parsed.search || ''),
      method: method || 'PROPFIND',
      headers,
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function extractHref(xml, tagPattern) {
  // Handle various XML namespace styles from iCloud
  const patterns = [
    new RegExp(tagPattern + '[^>]*>\\s*<href[^>]*>([^<]+)</href>', 'si'),
    new RegExp(tagPattern + '[^>]*>\\s*<[^:]*:href[^>]*>([^<]+)</[^:]*:href>', 'si'),
  ];
  for (const p of patterns) {
    const m = xml.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function parseICSDate(d) {
  if (!d) return null;
  const clean = d.replace(/[^0-9TZ]/g, '');
  if (clean.length >= 15) {
    return `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}T${clean.slice(9,11)}:${clean.slice(11,13)}:${clean.slice(13,15)}Z`;
  }
  if (clean.length >= 8) {
    return `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`;
  }
  return d;
}

function parseICS(ics) {
  const events = [];
  const vevents = ics.split('BEGIN:VEVENT');
  for (let i = 1; i < vevents.length; i++) {
    const block = vevents[i].split('END:VEVENT')[0];
    const get = (key) => {
      const m = block.match(new RegExp(`${key}[^:]*:(.+)`, 'm'));
      return m ? m[1].trim() : null;
    };
    const summary = get('SUMMARY');
    if (summary) {
      events.push({
        uid: get('UID') || null,
        summary,
        start: parseICSDate(get('DTSTART')),
        end: parseICSDate(get('DTEND')),
        location: get('LOCATION') || null,
        description: (get('DESCRIPTION') || '').substring(0, 200) || null,
      });
    }
  }
  return events;
}

async function poll() {
  LOG('Polling calendars...');
  try {
    // Step 1: Discover principal
    const principalBody = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`;
    const principalRes = await makeRequest(CALDAV_URL + '/', 'PROPFIND', principalBody, 0);
    const principalHref = extractHref(principalRes.body, 'current-user-principal');
    
    if (!principalHref) {
      data.error = 'Could not discover principal';
      data.lastPoll = new Date().toISOString();
      LOG('Could not find principal URL');
      return;
    }
    LOG(`Principal: ${principalHref}`);

    // Step 2: Discover calendar home
    const homeBody = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`;
    const homeRes = await makeRequest(CALDAV_URL + principalHref, 'PROPFIND', homeBody, 0);
    const homeHref = extractHref(homeRes.body, 'calendar-home-set');
    
    if (!homeHref) {
      data.error = 'Could not discover calendar home';
      data.lastPoll = new Date().toISOString();
      LOG('Could not find calendar home');
      return;
    }
    LOG(`Calendar home: ${homeHref}`);

    // Step 3: List calendars (homeHref may be a full URL for iCloud)
    const listBody = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>`;
    const listRes = await makeRequest(homeHref, 'PROPFIND', listBody, 1);

    // Parse responses - split on <response or </response
    const calendars = [];
    const responseBlocks = listRes.body.split(/<response[\s>]/i);
    for (let i = 1; i < responseBlocks.length; i++) {
      const block = responseBlocks[i];
      const isCalendar = /calendar/i.test(block) && /<resourcetype/i.test(block);
      const hrefM = block.match(/<href[^>]*>([^<]+)<\/href>/i);
      const nameM = block.match(/<displayname[^>]*>([^<]*)<\/displayname>/i);
      const href = hrefM ? hrefM[1].trim() : null;
      const name = nameM ? nameM[1].trim() : null;
      
      // Skip the home collection itself and non-calendar resources
      if (href && name && isCalendar && href !== homeHref.replace(/https?:\/\/[^/]+/, '')) {
        // Build full URL
        let fullUrl = href;
        if (!href.startsWith('http')) {
          const homeURL = new URL(homeHref);
          fullUrl = `${homeURL.protocol}//${homeURL.host}${href}`;
        }
        calendars.push({ name, href: fullUrl });
      }
    }

    data.calendars = calendars.map(c => c.name);
    LOG(`Found ${calendars.length} calendars: ${data.calendars.join(', ')}`);

    discoveredCalendars = calendars;

    // Step 4: Fetch events from each calendar (full current month + next month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const startStr = startOfMonth.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endStr = endOfNextMonth.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const reportBody = `<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="${startStr}" end="${endStr}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`;

    const allEvents = [];
    for (const cal of calendars) {
      try {
        const res = await makeRequest(cal.href, 'REPORT', reportBody, 1);
        // Extract ICS data
        const icsBlocks = res.body.match(/BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/g) || [];
        for (const ics of icsBlocks) {
          const decoded = ics.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
          const events = parseICS(decoded);
          for (const e of events) {
            e.calendar = cal.name;
            e.calendarHref = cal.href;
          }
          allEvents.push(...events);
        }
      } catch (err) {
        LOG(`Error fetching calendar "${cal.name}": ${err.message}`);
      }
    }

    allEvents.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    data.events = allEvents;
    data.lastPoll = new Date().toISOString();
    data.error = null;
    lastSuccessfulPoll = Date.now();
    consecutiveFailures = 0;
    LOG(`Poll complete: ${allEvents.length} events (${startOfMonth.toISOString().slice(0,10)} to ${endOfNextMonth.toISOString().slice(0,10)})`);
  } catch (err) {
    consecutiveFailures++;
    data.error = err.message;
    data.lastPoll = new Date().toISOString();
    LOG(`Poll error (${consecutiveFailures} consecutive): ${err.message}`);

    if (consecutiveFailures >= 3 && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const alertBody = JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `⚠️ CalDAV collector has failed ${consecutiveFailures} times in a row.\nLast success: ${lastSuccessfulPoll ? new Date(lastSuccessfulPoll).toISOString() : 'never'}\nError: ${err.message}`
        });
        const https2 = require('https');
        const req = https2.request({
          hostname: 'api.telegram.org',
          path: `/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(alertBody) }
        }, () => {});
        req.on('error', () => {});
        req.write(alertBody);
        req.end();
      } catch {} // Don't crash if Telegram alert fails
    }
  }
}

function start() {
  LOG('Starting (15 min interval)');
  poll().catch(e => LOG(`Initial poll error: ${e.message}`));
  interval = setInterval(() => poll().catch(e => LOG(`Poll error: ${e.message}`)), 15 * 60 * 1000);
}

function stop() {
  if (interval) { clearInterval(interval); interval = null; }
  LOG('Stopped');
}

function getData() {
  return data;
}

function getCalendars() {
  return discoveredCalendars.map(c => ({ name: c.name, href: c.href }));
}

async function createEvent(eventData) {
  const { title, start, end, location, description, calendar } = eventData;
  if (!title || !start) throw new Error('title and start are required');

  // Find target calendar
  let targetCal = discoveredCalendars.find(c => c.name === calendar);
  if (!targetCal) targetCal = discoveredCalendars.find(c => c.name === 'Work');
  if (!targetCal) targetCal = discoveredCalendars[0];
  if (!targetCal) throw new Error('No calendars discovered yet — wait for first poll');

  // Generate UUID
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });

  // Format dates for ICS
  const fmtDate = (d) => {
    const dt = new Date(d);
    return dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const dtStart = fmtDate(start);
  const dtEnd = end ? fmtDate(end) : fmtDate(new Date(new Date(start).getTime() + 3600000));
  const now = fmtDate(new Date());

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ForgedFinancial//CC v7//EN',
    'BEGIN:VEVENT',
    `UID:${uuid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
  ];
  if (location) ics.push(`LOCATION:${location}`);
  if (description) ics.push(`DESCRIPTION:${description}`);

  // Add VALARM alerts (iCloud push notifications)
  const alerts = eventData.alerts || [];
  for (const alert of alerts) {
    const minutes = parseInt(alert, 10);
    if (!isNaN(minutes) && minutes >= 0) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      ics.push('BEGIN:VALARM');
      ics.push('ACTION:DISPLAY');
      ics.push(`DESCRIPTION:${title}`);
      if (minutes === 0) {
        ics.push('TRIGGER:PT0S');
      } else {
        ics.push(`TRIGGER:-PT${hours > 0 ? hours + 'H' : ''}${mins > 0 ? mins + 'M' : ''}`);
      }
      ics.push('END:VALARM');
    }
  }

  ics.push('END:VEVENT', 'END:VCALENDAR');

  const icsBody = ics.join('\r\n');
  const eventUrl = `${targetCal.href}${uuid}.ics`;

  LOG(`Creating event "${title}" on "${targetCal.name}" → ${eventUrl}`);

  const parsed = new URL(eventUrl);
  const auth = Buffer.from(`${CALDAV_USER}:${CALDAV_PASS}`).toString('base64');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Length': Buffer.byteLength(icsBody),
      },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          LOG(`Event created: ${title} (${res.statusCode})`);
          // Trigger re-poll to pick up the new event
          poll().catch(() => {});
          resolve({ success: true, uid: uuid, calendar: targetCal.name });
        } else {
          LOG(`Event creation failed: ${res.statusCode} ${d}`);
          reject(new Error(`CalDAV PUT failed: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write(icsBody);
    req.end();
  });
}

async function updateEvent(eventData) {
  const { uid, title, start, end, location, description, calendar, alerts } = eventData;
  if (!uid) throw new Error('uid is required for update');

  // Find the event in our data to get the calendar href
  const existing = data.events.find(e => e.uid === uid);
  let calHref = existing?.calendarHref;
  
  // If calendar changed, find new target
  if (calendar && (!existing || existing.calendar !== calendar)) {
    const targetCal = discoveredCalendars.find(c => c.name === calendar);
    if (targetCal) calHref = targetCal.href;
  }
  if (!calHref) {
    const targetCal = discoveredCalendars.find(c => c.name === (calendar || 'Work')) || discoveredCalendars[0];
    if (!targetCal) throw new Error('No calendar found');
    calHref = targetCal.href;
  }

  const fmtDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtStart = fmtDate(start);
  const dtEnd = end ? fmtDate(end) : fmtDate(new Date(new Date(start).getTime() + 3600000));
  const now = fmtDate(new Date());

  let ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ForgedFinancial//CC v7//EN',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${now}`, `DTSTART:${dtStart}`, `DTEND:${dtEnd}`,
    `SUMMARY:${title || 'Untitled'}`,
  ];
  if (location) ics.push(`LOCATION:${location}`);
  if (description) ics.push(`DESCRIPTION:${description}`);
  
  const eventAlerts = alerts || [];
  for (const alert of eventAlerts) {
    const minutes = parseInt(alert, 10);
    if (!isNaN(minutes) && minutes >= 0) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      ics.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title || 'Untitled'}`);
      ics.push(minutes === 0 ? 'TRIGGER:PT0S' : `TRIGGER:-PT${hours > 0 ? hours + 'H' : ''}${mins > 0 ? mins + 'M' : ''}`);
      ics.push('END:VALARM');
    }
  }
  ics.push('END:VEVENT', 'END:VCALENDAR');

  const icsBody = ics.join('\r\n');
  const eventUrl = `${calHref}${uid}.ics`;

  LOG(`Updating event "${title}" (${uid}) → ${eventUrl}`);

  const parsed = new URL(eventUrl);
  const auth = Buffer.from(`${CALDAV_USER}:${CALDAV_PASS}`).toString('base64');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname, port: 443, path: parsed.pathname, method: 'PUT',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Length': Buffer.byteLength(icsBody) },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          LOG(`Event updated: ${title} (${res.statusCode})`);
          poll().catch(() => {});
          resolve({ success: true, uid });
        } else {
          LOG(`Event update failed: ${res.statusCode} ${d}`);
          reject(new Error(`CalDAV PUT failed: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write(icsBody);
    req.end();
  });
}

async function deleteEvent(uid) {
  if (!uid) throw new Error('uid is required for delete');
  
  const existing = data.events.find(e => e.uid === uid);
  if (!existing?.calendarHref) throw new Error('Event not found or missing calendar href');

  const eventUrl = `${existing.calendarHref}${uid}.ics`;
  LOG(`Deleting event "${existing.summary}" (${uid}) → ${eventUrl}`);

  const parsed = new URL(eventUrl);
  const auth = Buffer.from(`${CALDAV_USER}:${CALDAV_PASS}`).toString('base64');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname, port: 443, path: parsed.pathname, method: 'DELETE',
      headers: { 'Authorization': `Basic ${auth}` },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          LOG(`Event deleted (${res.statusCode})`);
          data.events = data.events.filter(e => e.uid !== uid);
          poll().catch(() => {});
          resolve({ success: true });
        } else {
          LOG(`Event delete failed: ${res.statusCode} ${d}`);
          reject(new Error(`CalDAV DELETE failed: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function getHealth() {
  return { lastSuccess: lastSuccessfulPoll, failures: consecutiveFailures, healthy: consecutiveFailures < 3 };
}

module.exports = { start, stop, getData, createEvent, updateEvent, deleteEvent, getCalendars, getHealth };
