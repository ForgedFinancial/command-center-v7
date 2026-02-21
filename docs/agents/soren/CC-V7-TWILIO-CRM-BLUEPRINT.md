# CC v7 — Twilio CRM Integration Blueprint
## Click-to-Call, SMS Conversations, Smart Number Routing
### Author: Soren (FF-PLN-001) | Date: 2026-02-19
### Status: 🟡 PROPOSAL — Awaiting Boss Approval

---

## BOTTOM LINE UP FRONT

Wire 5 existing Twilio numbers into CC v7 so Boss can **call any lead from the browser** (WebRTC), **send/receive SMS** (when A2P approves), and **auto-log everything** to the lead's Activity tab tied to the 13-disposition system. Smart routing picks the Twilio number matching the lead's state. iPhone stays primary for calls — Twilio is the backup that kicks in when Mac node is disconnected. The VPS sync server gets ~6 new endpoints, the frontend gets a floating call bar + SMS thread view, and D1 gets 2 new tables. **No changes to YN-CRM Worker.**

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Smart Number Routing](#2-smart-number-routing)
3. [UI/UX Design](#3-uiux-design)
4. [Twilio Client SDK Integration](#4-twilio-client-sdk-integration)
5. [VPS Backend Routes](#5-vps-backend-routes)
6. [D1 Schema Changes](#6-d1-schema-changes)
7. [Disposition Integration](#7-disposition-integration)
8. [iPhone Primary / Twilio Backup Logic](#8-iphone-primary--twilio-backup-logic)
9. [SMS A2P Pending State](#9-sms-a2p-pending-state)
10. [Compliance](#10-compliance)
11. [Build Sequence](#11-build-sequence)
12. [Risk Register](#12-risk-register)

---

## 1. ARCHITECTURE OVERVIEW

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CC v7 Browser (React + Vite)              │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Pipeline │  │ Lead     │  │ Messages │  │ Settings   │  │
│  │ Cards    │  │ Detail   │  │ View     │  │ Numbers    │  │
│  │ 📞 click │  │ Activity │  │ SMS      │  │ Management │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────────┘  │
│       │              │             │                         │
│  ┌────▼──────────────▼─────────────▼───────────────────┐    │
│  │  Twilio Voice SDK (@twilio/voice-sdk) — WebRTC      │    │
│  │  + TwilioProvider context (device, token, state)     │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │  Floating Call Bar (global, portal-mounted)          │    │
│  │  Lead name · 03:42 · [Mute] [Hold] [End]            │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
              ┌─────────────▼──────────────┐
              │  Cloudflare Pages Functions │
              │  /api/twilio/[[path]].js    │
              │  (proxy to VPS)             │
              └─────────────┬──────────────┘
                            │ HTTPS (Tailscale)
              ┌─────────────▼──────────────┐
              │  VPS Sync Server (port 443) │
              │  /twilio/token              │  → JWT Access Token
              │  /twilio/voice              │  → TwiML for outbound
              │  /twilio/voice/inbound      │  → TwiML for inbound
              │  /twilio/sms/send           │  → Send via Messaging Service
              │  /twilio/sms/inbound        │  → Webhook receiver
              │  /twilio/numbers            │  → Number config
              │  /twilio/call-log           │  → Store/fetch call history
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │         Twilio              │
              │  Account: AC3d80...3165     │
              │  Messaging SID: MGd5d4...   │
              │  5 Numbers (630/847/323/    │
              │              469/984)        │
              └─────────────┬──────────────┘
                            │ PSTN
              ┌─────────────▼──────────────┐
              │     Lead's Phone            │
              └─────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| VPS handles all Twilio API calls | Credentials stay server-side, never exposed to browser |
| New CF Pages function `/api/twilio/[[path]].js` | Separate proxy from CRM — doesn't touch YN-CRM Worker |
| Call/SMS logs stored via VPS → D1 direct | VPS has D1 binding via REST API. Avoids modifying YN-CRM Worker |
| Twilio Voice SDK in browser | WebRTC — no app install, no phone hardware needed |
| Floating call bar, not modal | Non-blocking — Boss can browse leads while on a call |
| WebSocket for real-time events | Inbound calls/SMS push instantly to browser |

### What We Do NOT Touch
- **YN-CRM Worker** — zero modifications
- **Existing phone-actions.js routes** — left intact (Mac/iPhone path)
- **Existing CRM proxy** — `/api/crm/[[path]].js` untouched

---

## 2. SMART NUMBER ROUTING

### Number Map

```javascript
const TWILIO_NUMBERS = [
  { number: '+16304896325', display: '(630) 489-6325', region: 'IL', area: 'West Chicago suburbs', areaCode: '630', isDefault: true },
  { number: '+18477448354', display: '(847) 744-8354', region: 'IL', area: 'North Chicago suburbs', areaCode: '847' },
  { number: '+13238493632', display: '(323) 849-3632', region: 'CA', area: 'Los Angeles', areaCode: '323' },
  { number: '+14692754702', display: '(469) 275-4702', region: 'TX', area: 'Dallas', areaCode: '469' },
  { number: '+19846004966', display: '(984) 600-4966', region: 'NC', area: 'Raleigh', areaCode: '984' },
];

// State → number mapping (extends as numbers are added)
const STATE_NUMBER_MAP = {
  'IL': '+16304896325',  // Default IL number
  'CA': '+13238493632',
  'TX': '+14692754702',
  'NC': '+19846004966',
};
```

### Routing Algorithm

```
selectNumberForLead(lead):
  1. IF lead.state exists in STATE_NUMBER_MAP → use that number
  2. IF lead.phone area code matches a Twilio number's area code → use that number
  3. ELSE → use default number (630)
```

```javascript
function selectNumberForLead(lead) {
  // Priority 1: Match lead's state
  if (lead.state && STATE_NUMBER_MAP[lead.state]) {
    return STATE_NUMBER_MAP[lead.state];
  }

  // Priority 2: Match area code
  if (lead.phone) {
    const areaCode = lead.phone.replace(/\D/g, '').slice(0, 3);
    // Handle +1 prefix
    const normalizedArea = lead.phone.startsWith('+1')
      ? lead.phone.replace(/\D/g, '').slice(1, 4)
      : areaCode;
    const match = TWILIO_NUMBERS.find(n => n.areaCode === normalizedArea);
    if (match) return match.number;
  }

  // Priority 3: Default
  return TWILIO_NUMBERS.find(n => n.isDefault).number;
}
```

The routing runs **server-side** in the VPS TwiML handler. The frontend sends the lead's state and phone — VPS picks the number. This keeps the logic centralized and lets us update routing without redeploying the frontend.

---

## 3. UI/UX DESIGN

### 3.1 Click-to-Call on Lead Cards

The existing 📞 button on pipeline kanban cards gets enhanced:

**Current behavior:** Calls via Mac node (FaceTime/Continuity)
**New behavior:** Attempts iPhone first, falls back to Twilio browser call

```
Pipeline Card (existing)
┌─────────────────────────┐
│ John Doe            IL  │
│ FEX · $85/mo            │
│ Last: 2 days ago        │
│                         │
│  [📞 Call] [💬 Text]    │  ← 📞 uses smart routing
└─────────────────────────┘     💬 opens SMS compose (or shows A2P pending)
```

**Click flow:**
1. User clicks 📞
2. System checks Mac node connectivity (ping `100.84.3.117:7890`)
3. **Mac online** → call via existing phone-actions.js (iPhone rings)
4. **Mac offline** → call via Twilio WebRTC (browser-based)
5. Either way, call is logged to lead's Activity tab

### 3.2 Floating Call Bar

When a Twilio WebRTC call is active, a floating bar appears at the bottom of the viewport. Not a modal — it floats above all content so Boss can keep working.

```
┌──────────────────────────────────────────────────────────────┐
│                    (normal CRM content above)                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🟢 John Doe · (312) 555-1234 · 03:42   [🔇] [⏸] [🔴] │  │
│  │      via (984) 600-4966                                │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Specs:**
- **Position:** `fixed`, bottom: 0, full width, z-index: 9999
- **Height:** 56px — compact single row
- **Background:** `bg-zinc-900/95 backdrop-blur-sm` — dark, semi-transparent
- **Border:** `border-t border-zinc-700`
- **Content (left):** Green pulse dot (connected) · Lead name · Phone number · Timer
- **Content (sub-left):** "via (984) 600-4966" — which Twilio number is being used
- **Content (right):** Mute toggle, Hold toggle, End call button
- **Mute button:** `🔇` / `🔊` toggle, zinc-700 bg, hover zinc-600
- **Hold button:** `⏸` / `▶` toggle, zinc-700 bg, hover zinc-600
- **End button:** `🔴` red circle, hover red-600, `bg-red-500 rounded-full w-10 h-10`
- **Transition:** Slides up from bottom with `transition-transform duration-200`
- **Incoming call variant:** Same bar but with `[✅ Answer] [❌ Decline]` instead of mute/hold/end, and a subtle pulse animation on the green dot

### 3.3 Post-Call Disposition Prompt

When a Twilio call ends, the floating call bar transforms into a disposition prompt:

```
┌────────────────────────────────────────────────────────────────┐
│  ✅ Call ended · John Doe · 4:32                               │
│                                                                │
│  [🆕 New] [📞 Called] [📅 Follow-Up] [📋 Appt] [🎯 Pitched]  │
│  [🎉 Sold] [🚫 N/I] [📵 Bad#] [🌱 Nurture] [🛑 DNC]        │
│                                                 [✕ Skip]      │
└────────────────────────────────────────────────────────────────┘
```

**Specs:**
- Same fixed-bottom position, expands to ~120px height
- Shows abbreviated disposition tiles (icon + short name)
- Clicking a disposition applies it immediately (same logic as disposition modal from CC-V7-DISPOSITION-BOB-BLUEPRINT.md)
- "Skip" closes the bar without dispositing
- Bar auto-dismisses after 30 seconds if no action (with a subtle countdown indicator)
- If disposition requires date picker (Follow-Up, Appointment), opens the full disposition modal instead

### 3.4 SMS Conversations View (Messages)

Lives in the existing Messages CRM sidebar navigation item.

```
┌──────────────┬─────────────────────────────────────────┐
│  💬 Messages │                                         │
├──────────────┤  John Doe                               │
│              │  (312) 555-1234 · IL · FEX              │
│ 🔍 Search    │  via (984) 600-4966                      │
│              ├─────────────────────────────────────────┤
│ John Doe     │                                         │
│ "Thanks f.." │     Hey John, this is Dano from         │
│ 2 min ago    │     Forged Financial. Following up       │
│              │     on your request for info.            │
│ Jane Smith   │                          2:30 PM ✓      │
│ "Sounds g.." │                                         │
│ 1 hour ago   │  Thanks for reaching out! What          │
│              │  kind of policies do you offer?          │
│ Bob Wilson   │  2:45 PM                                │
│ "What's t.." │                                         │
│ Yesterday    │     We specialize in final expense       │
│              │     and whole life. When's a good        │
│              │     time to chat?                        │
│              │                          2:47 PM ✓✓     │
│              │                                         │
│              ├─────────────────────────────────────────┤
│              │ [Type a message...                  ] 📤 │
│              │ 142/160 · 1 segment                      │
└──────────────┴─────────────────────────────────────────┘
```

**Specs:**
- **Thread list (left):** Contact name, last message preview (truncated), relative timestamp
- **Thread list sort:** Most recent message first
- **Unread indicator:** Bold name + blue dot for unread inbound
- **Conversation (right):** Chat bubbles — outbound right (blue-600), inbound left (zinc-700)
- **Status indicators:** ✓ sent, ✓✓ delivered, ✗ failed (red)
- **Compose bar:** Text input, character counter, segment counter, send button
- **Header:** Lead name, phone, state, lead type, which Twilio number is used
- **Empty state:** "No messages yet. Start a conversation by selecting a lead."
- **A2P pending state:** See [Section 9](#9-sms-a2p-pending-state)

### 3.5 Number Management (Settings)

New section in the existing Settings page:

```
┌─────────────────────────────────────────────────────────────┐
│  📱 Twilio Numbers                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⭐ (630) 489-6325 · West Chicago suburbs · IL       │    │
│  │   DEFAULT · Voice ✅ · SMS ⏳ A2P Pending            │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   (847) 744-8354 · North Chicago suburbs · IL       │    │
│  │   Voice ✅ · SMS ⏳ A2P Pending                      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   (323) 849-3632 · Los Angeles · CA                 │    │
│  │   Voice ✅ · SMS ⏳ A2P Pending                      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   (469) 275-4702 · Dallas · TX                      │    │
│  │   Voice ✅ · SMS ⏳ A2P Pending                      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   (984) 600-4966 · Raleigh · NC                     │    │
│  │   Voice ✅ · SMS ⏳ A2P Pending                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Routing: Auto-match lead state → nearest number            │
│  Fallback: (630) 489-6325                                   │
│                                                              │
│  Call Mode: [iPhone Primary ▼]                              │
│    iPhone via Mac node (when connected)                      │
│    Falls back to Twilio browser calling                      │
│                                                              │
│  A2P 10DLC Status: Submitted Feb 19 — est. approval ~Mar 5  │
│  Messaging Service: MGd5d41336ff45895b06005d2ab3a6995d       │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
- Each number card: number, area label, region, default star, voice status, SMS status
- Click number card to expand: set as default, edit region label
- A2P status banner at bottom — shows pending/approved with date
- Call mode dropdown: "iPhone Primary" (default), "Twilio Only", "iPhone Only"
- Stored in VPS config file (not D1 — this is system config, not lead data)

### 3.6 Incoming Call UI

When a Twilio inbound call arrives (WebSocket push), the floating call bar appears in "incoming" mode:

```
┌────────────────────────────────────────────────────────────────┐
│  📞 Incoming · John Doe · (312) 555-1234     [✅ Answer] [❌]  │
│      to (984) 600-4966 · Raleigh                               │
└────────────────────────────────────────────────────────────────┘
```

- Pulse animation on the 📞 icon
- Browser Notification API fires if tab is in background
- Audio ringtone via Web Audio API (subtle, professional)
- Auto-dismiss after 30 seconds (goes to voicemail)
- If lead is in CRM, shows name; otherwise shows raw number

---

## 4. TWILIO CLIENT SDK INTEGRATION

### 4.1 TwilioProvider React Context

```javascript
// src/contexts/TwilioContext.jsx
// Manages: Device instance, connection state, active call, token refresh

const TwilioContext = createContext(null);

function TwilioProvider({ children }) {
  const [device, setDevice] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle | connecting | connected | incoming | ended
  const [activeCall, setActiveCall] = useState(null);
  const [callMeta, setCallMeta] = useState(null); // { leadId, leadName, phone, twilioNumber, startTime }
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [duration, setDuration] = useState(0);

  // Initialize device on mount
  useEffect(() => {
    initDevice();
    return () => device?.destroy();
  }, []);

  async function initDevice() {
    const res = await fetch('/api/twilio/token?identity=boss');
    const { token } = await res.json();

    const dev = new Device(token, {
      codecPreferences: ['opus', 'pcmu'],
      enableRingingState: true,
    });

    dev.on('incoming', handleIncoming);
    dev.on('tokenWillExpire', refreshToken);
    dev.on('error', (err) => console.error('[Twilio]', err));

    await dev.register();
    setDevice(dev);
  }

  async function makeCall(lead) {
    // lead: { id, name, phone, state }
    const call = await device.connect({
      params: {
        To: lead.phone,
        LeadState: lead.state || '',
        LeadId: lead.id,
      }
    });

    setActiveCall(call);
    setCallState('connecting');
    setCallMeta({
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      twilioNumber: null, // Set by server response
      startTime: null,
    });

    call.on('accept', () => {
      setCallState('connected');
      setCallMeta(prev => ({ ...prev, startTime: Date.now() }));
    });

    call.on('disconnect', () => {
      setCallState('ended');
      // Duration calculated from startTime
    });

    call.on('error', (err) => {
      setCallState('idle');
      // Toast error
    });
  }

  function hangUp() {
    activeCall?.disconnect();
  }

  function toggleMute() {
    if (activeCall) {
      const newMuted = !isMuted;
      activeCall.mute(newMuted);
      setIsMuted(newMuted);
    }
  }

  // Hold = mute + server-side hold music (stretch goal)
  // For MVP, hold = mute only
  function toggleHold() {
    if (activeCall) {
      const newHold = !isOnHold;
      activeCall.mute(newHold);
      setIsOnHold(newHold);
    }
  }

  function handleIncoming(call) {
    setActiveCall(call);
    setCallState('incoming');
    setCallMeta({
      leadId: null, // Looked up from caller ID
      leadName: null,
      phone: call.parameters.From,
      twilioNumber: call.parameters.To,
      startTime: null,
    });
    // WebSocket will provide lead lookup data
  }

  function answerCall() {
    activeCall?.accept();
    setCallState('connected');
    setCallMeta(prev => ({ ...prev, startTime: Date.now() }));
  }

  function declineCall() {
    activeCall?.reject();
    setCallState('idle');
    setActiveCall(null);
  }

  async function refreshToken() {
    const res = await fetch('/api/twilio/token?identity=boss');
    const { token } = await res.json();
    device.updateToken(token);
  }

  // Duration timer
  useEffect(() => {
    if (callState !== 'connected' || !callMeta?.startTime) return;
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - callMeta.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [callState, callMeta?.startTime]);

  return (
    <TwilioContext.Provider value={{
      callState, activeCall, callMeta, duration,
      isMuted, isOnHold,
      makeCall, hangUp, toggleMute, toggleHold,
      answerCall, declineCall,
    }}>
      {children}
      {callState !== 'idle' && <FloatingCallBar />}
    </TwilioContext.Provider>
  );
}
```

### 4.2 NPM Dependencies

```json
{
  "@twilio/voice-sdk": "^2.x"
}
```

Single dependency on the frontend. The VPS uses the `twilio` server SDK (already common in Node projects).

### 4.3 Token Lifecycle

1. **On app load:** Fetch token from `/api/twilio/token` (TTL: 1 hour)
2. **`tokenWillExpire` event:** Fires ~60s before expiry → auto-refresh
3. **On token error:** Re-init device with fresh token
4. **Identity:** Always `"boss"` (single user). Multi-agent: use agent ID.

---

## 5. VPS BACKEND ROUTES

All routes added to the existing sync server (`/home/clawd/sync-server/`). New file: `routes/twilio.js`.

### 5.1 Route Table

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/twilio/token` | Generate Twilio Access Token (JWT) |
| POST | `/twilio/voice` | TwiML for outbound calls (Twilio webhook) |
| POST | `/twilio/voice/inbound` | TwiML for inbound calls (Twilio webhook) |
| POST | `/twilio/voice/status` | Call status callback (Twilio webhook) |
| POST | `/twilio/sms/send` | Send SMS via Messaging Service |
| POST | `/twilio/sms/inbound` | Receive inbound SMS (Twilio webhook) |
| POST | `/twilio/sms/status` | SMS delivery status (Twilio webhook) |
| GET | `/twilio/messages/:contactId` | Fetch SMS thread for a contact |
| GET | `/twilio/calls/:contactId` | Fetch call history for a contact |
| GET | `/twilio/numbers` | Get number config + status |
| PUT | `/twilio/numbers/default` | Set default number |

### 5.2 Access Token Generation

```javascript
// GET /twilio/token?identity=boss
const AccessToken = require('twilio').jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

app.get('/twilio/token', (req, res) => {
  const identity = req.query.identity || 'boss';

  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY_SID,
    TWILIO_API_KEY_SECRET,
    { identity, ttl: 3600 }
  );

  token.addGrant(new VoiceGrant({
    outgoingApplicationSid: TWILIO_TWIML_APP_SID,
    incomingAllow: true,
  }));

  res.json({ token: token.toJwt(), identity });
});
```

### 5.3 Outbound Voice TwiML

```javascript
// POST /twilio/voice — Twilio fetches this when browser calls out
app.post('/twilio/voice', (req, res) => {
  const { To, LeadState, LeadId } = req.body;
  const twiml = new VoiceResponse();

  if (!To) {
    twiml.say('No number provided.');
    return res.type('text/xml').send(twiml.toString());
  }

  // Illinois two-party consent disclosure
  twiml.say({ voice: 'Polly.Matthew' },
    'This call may be recorded for quality purposes.');

  // Smart number selection
  const callerId = selectNumberForLead({ phone: To, state: LeadState });

  const dial = twiml.dial({
    callerId,
    record: 'record-from-answer-dual',
    recordingStatusCallback: `${BASE_URL}/twilio/recording/status`,
    action: `${BASE_URL}/twilio/voice/status`,
  });
  dial.number(To);

  // Log call initiation
  logCallStart({ to: To, from: callerId, leadId: LeadId });

  res.type('text/xml').send(twiml.toString());
});
```

### 5.4 Inbound Voice TwiML

```javascript
// POST /twilio/voice/inbound — when someone calls a Twilio number
app.post('/twilio/voice/inbound', async (req, res) => {
  const { From, To, CallSid } = req.body;
  const twiml = new VoiceResponse();

  // Lookup caller in D1
  const contact = await findContactByPhone(From);

  // Push to browser via WebSocket
  wsBroadcast('call:incoming', {
    callSid: CallSid,
    from: From,
    to: To,
    contactName: contact?.name || null,
    contactId: contact?.id || null,
  });

  // Ring browser client for 25 seconds
  const dial = twiml.dial({
    timeout: 25,
    action: `${BASE_URL}/twilio/voice/inbound/missed`,
  });
  dial.client('boss');

  res.type('text/xml').send(twiml.toString());
});

// POST /twilio/voice/inbound/missed — voicemail if no answer
app.post('/twilio/voice/inbound/missed', (req, res) => {
  const { DialCallStatus } = req.body;
  const twiml = new VoiceResponse();

  if (DialCallStatus !== 'completed') {
    twiml.say({ voice: 'Polly.Matthew' },
      "You've reached Forged Financial. Please leave a message after the beep.");
    twiml.record({
      maxLength: 120,
      transcribe: true,
      transcribeCallback: `${BASE_URL}/twilio/voicemail/transcription`,
      playBeep: true,
    });
  }

  res.type('text/xml').send(twiml.toString());
});
```

### 5.5 SMS Send

```javascript
// POST /twilio/sms/send
// Body: { to, body, contactId, leadState }
app.post('/twilio/sms/send', async (req, res) => {
  const { to, body, contactId, leadState } = req.body;

  // Check A2P status
  const a2pApproved = await getA2PStatus(); // reads config
  if (!a2pApproved) {
    return res.status(503).json({ error: 'SMS unavailable — A2P registration pending' });
  }

  const fromNumber = selectNumberForLead({ phone: to, state: leadState });

  const message = await twilioClient.messages.create({
    body,
    from: fromNumber,
    to,
    messagingServiceSid: 'MGd5d41336ff45895b06005d2ab3a6995d',
    statusCallback: `${BASE_URL}/twilio/sms/status`,
  });

  // Store in D1
  await storeSmsMessage({
    twilio_sid: message.sid,
    contact_id: contactId,
    contact_phone: to,
    twilio_number: fromNumber,
    direction: 'outbound',
    body,
    status: message.status,
  });

  res.json({ success: true, sid: message.sid });
});
```

### 5.6 Inbound SMS Webhook

```javascript
// POST /twilio/sms/inbound — Twilio webhook
app.post('/twilio/sms/inbound', async (req, res) => {
  const { From, Body, MessageSid, To } = req.body;

  const contact = await findContactByPhone(From);

  await storeSmsMessage({
    twilio_sid: MessageSid,
    contact_id: contact?.id,
    contact_phone: From,
    twilio_number: To,
    direction: 'inbound',
    body: Body,
    status: 'received',
  });

  // Push to browser
  wsBroadcast('sms:incoming', {
    sid: MessageSid,
    from: From,
    body: Body,
    contactName: contact?.name || null,
    contactId: contact?.id || null,
  });

  // Empty response — no auto-reply
  res.type('text/xml').send('<Response></Response>');
});
```

### 5.7 Cloudflare Pages Proxy Function

New file: `/home/clawd/command-center-v7/functions/api/twilio/[[path]].js`

```javascript
// Proxies /api/twilio/* to VPS sync server /twilio/*
const VPS_URL = 'https://100.71.72.127';  // Tailscale IP

export async function onRequest(context) {
  const { request, params } = context;
  const path = '/twilio/' + (params.path?.join('/') || '');
  const url = new URL(request.url);
  const target = `${VPS_URL}${path}${url.search}`;

  const headers = new Headers(request.headers);
  // Add internal auth token
  headers.set('X-Internal-Auth', context.env.SYNC_SERVER_TOKEN);

  const proxyRes = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
  });

  return new Response(await proxyRes.text(), {
    status: proxyRes.status,
    headers: { 'Content-Type': proxyRes.headers.get('Content-Type') || 'application/json' },
  });
}
```

**Note:** Twilio webhooks (inbound calls/SMS) hit the VPS directly (not through CF Pages). The VPS must be reachable from Twilio — use the Cloudflare Worker proxy (`forged-sync.danielruh.workers.dev`) as the webhook URL, which already routes to VPS.

---

## 6. D1 SCHEMA CHANGES

**Important:** These tables are created via direct D1 REST API from VPS, NOT via YN-CRM Worker modifications.

### 6.1 New Table: `twilio_calls`

```sql
CREATE TABLE IF NOT EXISTS twilio_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twilio_sid TEXT UNIQUE,
  lead_id TEXT,                     -- FK to leads.id
  contact_phone TEXT NOT NULL,      -- E.164
  twilio_number TEXT NOT NULL,      -- Which of our 5 numbers
  direction TEXT NOT NULL,          -- 'outbound' | 'inbound'
  status TEXT DEFAULT 'initiated',  -- initiated | ringing | in-progress | completed | no-answer | busy | failed
  duration INTEGER DEFAULT 0,      -- seconds
  recording_url TEXT,
  voicemail_transcription TEXT,
  disposition TEXT,                 -- Links to 13-disposition system
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_twilio_calls_lead ON twilio_calls(lead_id);
CREATE INDEX idx_twilio_calls_created ON twilio_calls(created_at DESC);
```

### 6.2 New Table: `twilio_messages`

```sql
CREATE TABLE IF NOT EXISTS twilio_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twilio_sid TEXT UNIQUE,
  lead_id TEXT,                     -- FK to leads.id
  contact_phone TEXT NOT NULL,
  twilio_number TEXT NOT NULL,
  direction TEXT NOT NULL,          -- 'outbound' | 'inbound'
  body TEXT NOT NULL,
  status TEXT DEFAULT 'sent',       -- sent | delivered | failed | received
  error_code TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_twilio_messages_lead ON twilio_messages(lead_id);
CREATE INDEX idx_twilio_messages_phone ON twilio_messages(contact_phone);
CREATE INDEX idx_twilio_messages_created ON twilio_messages(created_at DESC);
```

### 6.3 Number Config (VPS file, not D1)

```json
// /home/clawd/sync-server/config/twilio-numbers.json
{
  "numbers": [
    { "number": "+16304896325", "display": "(630) 489-6325", "region": "IL", "area": "West Chicago suburbs", "areaCode": "630", "isDefault": true, "voiceEnabled": true, "smsEnabled": false },
    { "number": "+18477448354", "display": "(847) 744-8354", "region": "IL", "area": "North Chicago suburbs", "areaCode": "847", "isDefault": false, "voiceEnabled": true, "smsEnabled": false },
    { "number": "+13238493632", "display": "(323) 849-3632", "region": "CA", "area": "Los Angeles", "areaCode": "323", "isDefault": false, "voiceEnabled": true, "smsEnabled": false },
    { "number": "+14692754702", "display": "(469) 275-4702", "region": "TX", "area": "Dallas", "areaCode": "469", "isDefault": false, "voiceEnabled": true, "smsEnabled": false },
    { "number": "+19846004966", "display": "(984) 600-4966", "region": "NC", "area": "Raleigh", "areaCode": "984", "isDefault": false, "voiceEnabled": true, "smsEnabled": false }
  ],
  "a2pStatus": "pending",
  "a2pSubmittedAt": "2026-02-19",
  "messagingServiceSid": "MGd5d41336ff45895b06005d2ab3a6995d",
  "callMode": "iphone-primary",
  "stateMap": {
    "IL": "+16304896325",
    "CA": "+13238493632",
    "TX": "+14692754702",
    "NC": "+19846004966"
  }
}
```

`smsEnabled` flips to `true` when A2P is approved — single config change enables SMS across the system.

---

## 7. DISPOSITION INTEGRATION

Ties into the 13-disposition system from CC-V7-DISPOSITION-BOB-BLUEPRINT.md.

### 7.1 Auto-Logging Calls to Activity

Every Twilio call (inbound or outbound) creates an activity entry on the lead:

```javascript
// After call completes
addActivityEntry(leadId, 'twilio_call', {
  direction: 'outbound',
  duration: 247, // seconds
  twilioNumber: '(984) 600-4966',
  status: 'completed',
  callSid: 'CA...',
  disposition: null, // Set when Boss dispositions
});
```

Activity tab display:
```
📞 Outbound Call · 4:07 · via (984) 600-4966
   Feb 19, 3:15 PM · Disposition: Called — auto follow-up 2hrs
```

### 7.2 Post-Call Disposition Flow

```
Call ends
    │
    ▼
Floating bar shows disposition tiles (abbreviated)
    │
    ├── Boss clicks a disposition → applyDisposition(leadId, dispositionId)
    │   ├── Stage moves per disposition rules
    │   ├── Activity logged with call reference
    │   ├── Call record in twilio_calls updated with disposition
    │   ├── Auto follow-up scheduled (if applicable)
    │   └── Bar dismisses
    │
    └── Boss clicks "Skip" or 30s timeout
        └── Call logged without disposition
            └── Bar dismisses
```

### 7.3 Call Attempt Tracking

When disposition is "Called" or "Follow-Up", `client.callAttempts` increments (per disposition blueprint). The Twilio call record links to this via `lead_id`.

### 7.4 SMS Activity Logging

Every SMS (sent or received) also creates an activity entry:

```
💬 Outbound SMS · via (984) 600-4966
   "Hey John, following up on our call..."
   Feb 19, 3:20 PM · Delivered ✓✓
```

---

## 8. IPHONE PRIMARY / TWILIO BACKUP LOGIC

### Decision Flow on 📞 Click

```javascript
async function handleCallClick(lead) {
  const callMode = getCallMode(); // From settings: 'iphone-primary' | 'twilio-only' | 'iphone-only'

  if (callMode === 'twilio-only') {
    return twilioCall(lead);
  }

  if (callMode === 'iphone-only') {
    return iphoneCall(lead);
  }

  // Default: iPhone primary with Twilio fallback
  const macOnline = await checkMacNode(); // Ping 100.84.3.117:7890, 3s timeout

  if (macOnline) {
    // Use existing phone-actions.js route
    await fetch('/api/phone/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: lead.phone }),
    });
    // Note: iPhone calls are NOT logged to Twilio tables
    // They're logged via the existing activity system
  } else {
    // Mac disconnected — auto-failover to Twilio
    twilioCall(lead);
    showToast('Mac offline — calling via Twilio', 'info');
  }
}

async function checkMacNode() {
  try {
    const res = await fetch('/api/phone/ping', { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
```

### Mac Health Check

Add a simple ping endpoint to phone-actions.js:

```javascript
app.get('/api/phone/ping', (req, res) => {
  // Quick check if Mac API is reachable
  fetch(`${MAC_API}/health`, { signal: AbortSignal.timeout(2000) })
    .then(() => res.json({ online: true }))
    .catch(() => res.json({ online: false }));
});
```

### Visual Indicator

The 📞 button on lead cards shows the call mode subtly:

- **Mac online:** `📞` (default, no extra indicator)
- **Mac offline:** `📞` with a small Twilio icon overlay or tooltip "Will call via Twilio"
- This check can be cached for 30 seconds to avoid spamming pings

---

## 9. SMS A2P PENDING STATE

Until A2P 10DLC is approved (~10-15 days from Feb 19), SMS is blocked. The UI handles this gracefully.

### Messages View — Pending State

```
┌─────────────────────────────────────────────────────────────┐
│  💬 Messages                                                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │          📱                                         │    │
│  │                                                     │    │
│  │    SMS is almost ready                              │    │
│  │                                                     │    │
│  │    A2P 10DLC registration was submitted on          │    │
│  │    Feb 19, 2026. Carrier approval typically         │    │
│  │    takes 10-15 business days.                       │    │
│  │                                                     │    │
│  │    Estimated availability: ~March 5, 2026           │    │
│  │                                                     │    │
│  │    Voice calling is available now.                   │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 💬 Button on Lead Cards — Pending State

- Button still visible but muted (opacity-50)
- On click: tooltip "SMS available when A2P is approved (~Mar 5)"
- No disabled attribute — just soft block with explanation

### Activation

When A2P is approved:
1. Update `/home/clawd/sync-server/config/twilio-numbers.json` → set `a2pStatus: "approved"` and `smsEnabled: true` on all numbers
2. Frontend checks `/api/twilio/numbers` on load → if SMS enabled, full Messages view activates
3. No code changes needed — config-driven activation

---

## 10. COMPLIANCE

### 10.1 Illinois Two-Party Consent

**Every recorded call** starts with:
> "This call may be recorded for quality purposes."

Played by Twilio TwiML `<Say>` before the `<Dial>`. This is baked into the outbound and inbound voice handlers. Boss cannot skip this.

If Boss wants to disable recording for a specific call, the call bar has a "🔴 Recording" toggle. When off, no recording — but the disclosure still plays (safer to always play it).

### 10.2 DNC Integration

- Leads flagged as DNC (via disposition system) are blocked from Twilio calls/SMS
- The `handleCallClick()` function checks `lead.isDNC` before initiating
- SMS send endpoint checks DNC flag server-side
- Visual: DNC leads have their 📞 and 💬 buttons disabled with red slash icon

### 10.3 TCPA / SMS Consent

- Every first outbound SMS must identify the business: "This is [Name] from Forged Financial"
- STOP/HELP keywords handled automatically by Twilio's Advanced Opt-Out
- Consent source tracked per lead (ad form, verbal, etc.)

---

## 11. BUILD SEQUENCE

### Phase 1: VPS Twilio Backend (3-4 days)
**Goal:** All server-side Twilio infrastructure in place

| # | Task | Est. |
|---|------|------|
| 1.1 | Create `routes/twilio.js` on VPS sync server | 1hr |
| 1.2 | Implement `/twilio/token` — Access Token generation | 2hr |
| 1.3 | Implement `/twilio/voice` — outbound TwiML with smart number routing | 3hr |
| 1.4 | Implement `/twilio/voice/inbound` + `/inbound/missed` (voicemail) | 3hr |
| 1.5 | Implement `/twilio/sms/send` + `/sms/inbound` + `/sms/status` | 3hr |
| 1.6 | Implement `/twilio/numbers` config endpoint | 1hr |
| 1.7 | Create D1 tables (`twilio_calls`, `twilio_messages`) via REST API | 1hr |
| 1.8 | Create `config/twilio-numbers.json` with number map | 30min |
| 1.9 | Configure Twilio Console: TwiML App, webhook URLs, number config | 1hr |
| 1.10 | Add WebSocket broadcast for incoming calls/SMS | 2hr |
| 1.11 | Create CF Pages proxy function `/api/twilio/[[path]].js` | 1hr |

**Acceptance Criteria:**
- [ ] `/twilio/token` returns valid JWT that Twilio SDK accepts
- [ ] `/twilio/voice` returns valid TwiML with correct callerId based on lead state
- [ ] `/twilio/sms/send` successfully sends SMS (test with personal number)
- [ ] Inbound call webhook fires and returns TwiML to ring browser client
- [ ] Inbound SMS webhook stores message in D1 and fires WebSocket event
- [ ] All 5 numbers configured in Twilio Console with correct webhook URLs
- [ ] CF Pages proxy successfully routes `/api/twilio/*` to VPS

### Phase 2: Browser Calling — Click-to-Call (3-4 days)
**Goal:** Boss can call leads from CC v7 browser

| # | Task | Est. |
|---|------|------|
| 2.1 | Install `@twilio/voice-sdk` in CC v7 | 30min |
| 2.2 | Build `TwilioProvider` context (device init, token management) | 4hr |
| 2.3 | Build `FloatingCallBar` component (connected + incoming states) | 4hr |
| 2.4 | Wire 📞 button on pipeline cards → iPhone-primary + Twilio-fallback logic | 3hr |
| 2.5 | Add Mac node health check (`/api/phone/ping`) | 1hr |
| 2.6 | Build post-call disposition prompt in floating bar | 3hr |
| 2.7 | Wire disposition to `applyDisposition()` from disposition blueprint | 2hr |
| 2.8 | Auto-log calls to lead Activity tab | 2hr |
| 2.9 | Handle incoming calls (answer/decline in floating bar) | 2hr |
| 2.10 | Browser Notification API for background tab | 1hr |

**Acceptance Criteria:**
- [ ] Click 📞 on pipeline card → Mac online = iPhone rings; Mac offline = browser WebRTC call
- [ ] Floating call bar appears during active call with timer, mute, hold, end
- [ ] Caller ID on recipient's phone shows correct Twilio number (state-matched)
- [ ] Post-call disposition prompt appears; clicking disposition applies it
- [ ] Incoming calls show in floating bar with answer/decline
- [ ] Call logged to lead's Activity tab with duration and disposition
- [ ] Token auto-refreshes before expiry

### Phase 3: SMS Conversations (2-3 days)
**Goal:** Full SMS thread view (activates when A2P approves)

| # | Task | Est. |
|---|------|------|
| 3.1 | Build Messages view — thread list (left panel) | 3hr |
| 3.2 | Build conversation view — chat bubbles (right panel) | 4hr |
| 3.3 | Build compose bar with character/segment counter | 2hr |
| 3.4 | Wire send to `/api/twilio/sms/send` with smart number routing | 1hr |
| 3.5 | Real-time inbound SMS via WebSocket → thread update | 2hr |
| 3.6 | Delivery status updates (sent → delivered → failed) | 1hr |
| 3.7 | A2P pending empty state | 1hr |
| 3.8 | SMS activity logging to lead Activity tab | 1hr |
| 3.9 | Wire 💬 button on pipeline cards → Messages view pre-composed | 1hr |

**Acceptance Criteria:**
- [ ] Messages view shows thread list sorted by most recent
- [ ] Clicking thread shows full conversation with chat bubbles
- [ ] Can compose and send SMS; message appears in thread immediately
- [ ] Inbound SMS appears in thread within 3 seconds
- [ ] Delivery status (✓ / ✓✓ / ✗) updates in real-time
- [ ] A2P pending state shows graceful "almost ready" message
- [ ] 💬 on pipeline card opens Messages with that lead's thread
- [ ] Character counter shows segment count (160 chars = 1 segment)

### Phase 4: Number Management + Polish (1-2 days)
**Goal:** Settings UI, edge cases, production hardening

| # | Task | Est. |
|---|------|------|
| 4.1 | Build Number Management section in Settings | 3hr |
| 4.2 | Call mode selector (iPhone Primary / Twilio Only / iPhone Only) | 1hr |
| 4.3 | DNC enforcement on call/SMS buttons | 1hr |
| 4.4 | Voicemail inbox in call history | 3hr |
| 4.5 | Recording playback in Activity tab | 2hr |
| 4.6 | Error handling polish (network failures, Twilio errors) | 2hr |
| 4.7 | End-to-end testing | 3hr |

**Acceptance Criteria:**
- [ ] Settings shows all 5 numbers with status, region, default indicator
- [ ] Can change default number and call mode
- [ ] DNC leads have disabled call/SMS buttons
- [ ] Voicemails appear with transcription
- [ ] Recording playback works in Activity tab
- [ ] Graceful handling of: Twilio down, VPS down, token expired, WebSocket disconnect

---

## 12. RISK REGISTER

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| A2P takes longer than 15 days | Medium | Low | SMS UI built but gated behind config flag. Voice works Day 1. |
| WebRTC audio quality issues | Low | High | Twilio's CDN handles this well. Opus codec preferred. Test headset vs speakers. |
| VPS goes down during active call | Low | High | Active WebRTC calls survive brief VPS outage (peer-to-peer via Twilio). Logging catches up on reconnect. |
| Twilio webhook can't reach VPS | Medium | High | Use `forged-sync.danielruh.workers.dev` as webhook URL (already routes to VPS). Monitor webhook delivery in Twilio Console. |
| Browser tab closed during call | Low | Medium | Call disconnects. Status callback still fires on Twilio side → VPS logs it. |
| Mac node connectivity flaky | Medium | Low | Health check has 3s timeout + 30s cache. Twilio fallback is seamless. |
| Illinois two-party consent violation | Very Low | Very High | Disclosure baked into TwiML — cannot be skipped. Recording toggle available. |
| Caller ID shows wrong number | Low | Medium | Server-side routing only — frontend never chooses number. Integration tests verify state→number mapping. |
| Token expiry during long session | Low | Low | `tokenWillExpire` event auto-refreshes. 1-hour TTL with 60s pre-refresh. |
| Cost overrun | Low | Low | Pay-as-you-go. At current volume (~20 calls/day), ~$55/month. No minimums. |

---

## APPENDIX: FILE MAP

### New Files
| File | Location | Purpose |
|------|----------|---------|
| `routes/twilio.js` | VPS: `/home/clawd/sync-server/routes/` | All Twilio backend routes |
| `config/twilio-numbers.json` | VPS: `/home/clawd/sync-server/config/` | Number config + routing |
| `[[path]].js` | CC v7: `functions/api/twilio/` | CF Pages proxy for Twilio routes |
| `TwilioContext.jsx` | CC v7: `src/contexts/` | React context for Twilio Device |
| `FloatingCallBar.jsx` | CC v7: `src/components/` | In-call UI + post-call disposition |
| `MessagesView.jsx` | CC v7: `src/views/` | SMS conversation threads |
| `NumberSettings.jsx` | CC v7: `src/components/settings/` | Number management UI |

### Modified Files
| File | Change |
|------|--------|
| `sync-server/server.js` | Register `routes/twilio.js` |
| `sync-server/routes/phone-actions.js` | Add `/api/phone/ping` health check |
| Pipeline card component | Wire 📞 to `handleCallClick()`, add 💬 button |
| Lead detail Activity tab | Render call/SMS activity entries |
| App root component | Wrap in `<TwilioProvider>` |
| Settings page | Add Number Management section |

### D1 Tables (created via VPS, not Worker)
| Table | Purpose |
|-------|---------|
| `twilio_calls` | Call history (direction, duration, disposition, recording) |
| `twilio_messages` | SMS history (direction, body, delivery status) |
