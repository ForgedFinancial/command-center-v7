# CC v7 — Twilio Integration Plan
## Dedicated Work Phone: Calling & Texting from the Command Center

**Author:** Soren (FF-PLN-001) — The Planner  
**Date:** 2026-02-19  
**Status:** 🟡 PROPOSAL — Awaiting Boss Approval  
**Scope:** Complete Twilio integration for CC v7 — outbound/inbound calling and SMS via dedicated work number(s)

---

## BOTTOM LINE UP FRONT

Boss gets 1-2 dedicated Chicago-area work phone numbers. He can **call and text any lead/client directly from CC v7** — caller ID shows his business number, not his personal cell. Inbound calls and texts arrive in CC v7 in real-time. Everything runs through Twilio's programmable voice and messaging APIs. Estimated monthly cost: **~$45-80/month** at current volume (scales with usage). Setup time: **~2-3 weeks across 5 phases**.

---

## TABLE OF CONTENTS

1. [Twilio Account Setup](#1-twilio-account-setup)
2. [Number Strategy](#2-number-strategy)
3. [Architecture Overview](#3-architecture-overview)
4. [Outbound SMS Integration](#4-outbound-sms-integration)
5. [Outbound Voice (Browser Calling)](#5-outbound-voice-browser-calling)
6. [Inbound Call & SMS Handling](#6-inbound-call--sms-handling)
7. [CC v7 Frontend Integration](#7-cc-v7-frontend-integration)
8. [Call Recording & Voicemail](#8-call-recording--voicemail)
9. [Compliance & Legal](#9-compliance--legal)
10. [Cost Breakdown](#10-cost-breakdown)
11. [Build Phases](#11-build-phases)
12. [Future: Multi-Agent Scaling](#12-future-multi-agent-scaling)
13. [Risk Register](#13-risk-register)
14. [Appendix: API Code Examples](#appendix-api-code-examples)

---

## 1. TWILIO ACCOUNT SETUP

### 1.1 Account Creation
1. Go to [twilio.com](https://www.twilio.com) → Sign Up
2. Free trial includes ~$15 credit (enough for testing)
3. Upgrade to pay-as-you-go (credit card required) — no contract, no minimum
4. Twilio Console → note **Account SID** and **Auth Token**

### 1.2 API Key Generation
1. Console → Account → API Keys → Create New Key
2. Generate a **Standard API Key** (SID + Secret)
3. Store securely — the secret is only shown once
4. This API key is used to generate short-lived Access Tokens for the browser SDK

### 1.3 TwiML App Setup
1. Console → Voice → TwiML Apps → Create New
2. Set **Voice Request URL** to: `https://forged-sync.danielruh.workers.dev/twilio/voice` (or direct VPS endpoint)
3. Note the **TwiML App SID** — needed for Access Token generation
4. This TwiML App tells Twilio where to fetch call handling instructions

### 1.4 Required Credentials Summary

| Credential | Where It Lives | Purpose |
|-----------|---------------|---------|
| Account SID | Twilio Console | Identifies the Twilio account |
| Auth Token | Twilio Console | Server-side API authentication |
| API Key SID | Twilio Console → API Keys | Access Token signing (identifier) |
| API Key Secret | Stored at creation | Access Token signing (secret) |
| TwiML App SID | Twilio Console → TwiML Apps | Links browser calls to webhook URL |
| Phone Number SID | Twilio Console → Numbers | Identifies purchased number |

> ⚠️ All credentials stored in CLAWD-VPS-INFO.md on Boss's Desktop, and as environment variables on VPS. Never in code or git.

---

## 2. NUMBER STRATEGY

### 2.1 Recommended: Two Local Chicago Numbers

| Number | Area Code | Purpose | Use Case |
|--------|-----------|---------|----------|
| **Line 1 — Primary** | 312 or 773 | Boss's main work line | All outbound calls + SMS to leads/clients |
| **Line 2 — Campaigns** | 312 or 773 | Automated/bulk messaging | Appointment reminders, follow-up drips, automated sequences |

**Why two numbers:**
- Separates personal conversations from automated messaging
- If automated texts trigger carrier filtering on Line 2, Line 1 stays clean
- Line 2 can eventually be assigned to an agent or specific campaign
- Keeps Line 1's reputation pristine for important prospect calls

### 2.2 Local vs Toll-Free

| Factor | Local (312/773) | Toll-Free (800/888) |
|--------|-----------------|---------------------|
| Monthly cost | $1.15/mo | $2.15/mo |
| Trust/answer rate | ✅ Higher (local = familiar) | ⚠️ Lower (feels like sales) |
| SMS capability | ✅ Yes (with A2P 10DLC) | ✅ Yes (with TF verification) |
| CNAM branding | ✅ Supported | ⚠️ Via support ticket only |
| Insurance industry fit | ✅ Local agent = trust | ❌ Feels corporate |

**Recommendation: Two local 312 or 773 numbers.** Insurance is a trust business — a Chicago local number builds rapport. Toll-free is unnecessary and hurts answer rates.

### 2.3 Number Provisioning
```
# Search for available Chicago numbers via Twilio API
GET /2010-04-01/Accounts/{AccountSid}/AvailablePhoneNumbers/US/Local.json
    ?AreaCode=312
    &VoiceEnabled=true
    &SmsEnabled=true

# Purchase the number
POST /2010-04-01/Accounts/{AccountSid}/IncomingPhoneNumbers.json
    PhoneNumber=+1312XXXXXXX
    VoiceUrl=https://forged-sync.danielruh.workers.dev/twilio/voice/inbound
    SmsUrl=https://forged-sync.danielruh.workers.dev/twilio/sms/inbound
```

### 2.4 CNAM Caller ID Registration
So leads see **"Forged Financial"** instead of a random number:

1. Create **Business Profile** in Twilio Trust Hub (requires EIN or DUNS number)
2. Assign phone numbers to the Business Profile
3. Create **CNAM Trust Product** → submit for vetting
4. After approval, register CNAM display name (max 15 chars: `FORGED FINL` or `FORGED FIN`)
5. Enable **Caller Name Lookup** on the number in Console

**Important limitations:**
- CNAM only works on landlines by default
- Mobile carriers require recipient to have CNAM opt-in (varies by carrier)
- Twilio also supports **Branded Calling** ($0.03/call) for richer mobile display — consider for Phase 5

### 2.5 STIR/SHAKEN Attestation
Twilio automatically provides **Full Attestation (A-level)** for calls from numbers you own, which:
- Reduces "Spam Likely" labels on recipient phones
- Tells carriers you're a legitimate caller
- Is critical for cold-calling insurance leads

---

## 3. ARCHITECTURE OVERVIEW

### 3.1 System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        CC v7 (Browser)                           │
│                   React + Vite on Cloudflare Pages               │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Phone    │  │ Messages │  │ Pipeline │  │ Lead Detail   │   │
│  │ View     │  │ View     │  │ Cards    │  │ Modal         │   │
│  │          │  │          │  │ 📞 💬    │  │ Call/Text Hx  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘   │
│       │              │             │               │            │
│  ┌────▼──────────────▼─────────────▼───────────────▼────────┐   │
│  │          Twilio Voice JS SDK (@twilio/voice-sdk)          │   │
│  │          + REST API calls via Cloudflare Worker proxy      │   │
│  └────────────────────────┬──────────────────────────────────┘   │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                  ┌─────────▼──────────┐
                  │  Cloudflare Worker  │
                  │  (Proxy Layer)      │
                  │                     │
                  │  /twilio/token  ────┼──► VPS: Generate Access Token
                  │  /twilio/sms    ────┼──► VPS: Send SMS via Twilio API
                  │  /twilio/calls  ────┼──► VPS: Call history from D1
                  │  /twilio/messages ──┼──► VPS: SMS history from D1
                  └─────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │  VPS Sync Server   │
                  │  (Node.js/Express)  │
                  │  Port 443           │
                  │                     │
                  │  Twilio SDK (server)│
                  │  ┌────────────────┐ │
                  │  │ /twilio/token  │ │ ← Generates JWT Access Tokens
                  │  │ /twilio/voice  │ │ ← TwiML for outbound calls
                  │  │ /twilio/sms    │ │ ← Sends SMS, stores in D1
                  │  │ /twilio/inbound│ │ ← Webhooks from Twilio
                  │  └────────────────┘ │
                  └─────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │      Twilio        │
                  │                     │
                  │  Voice API          │ ← Outbound/inbound calls
                  │  Messaging API      │ ← Outbound/inbound SMS
                  │  Phone Numbers      │ ← 312/773 Chicago numbers
                  │  Webhooks      ─────┼──► VPS: /twilio/voice/inbound
                  │                ─────┼──► VPS: /twilio/sms/inbound
                  └─────────────────────┘
                            │
                  ┌─────────▼──────────┐
                  │  PSTN / Carriers   │
                  │                     │
                  │  Lead's phone rings │
                  │  SMS delivered      │
                  └─────────────────────┘
```

### 3.2 Where Does Twilio Logic Live?

| Component | Location | Why |
|-----------|----------|-----|
| **Access Token generation** | VPS sync server | Requires API Key Secret — must be server-side |
| **Outbound SMS API calls** | VPS sync server | Requires Auth Token — must be server-side |
| **TwiML voice handler** | VPS sync server | Twilio fetches TwiML from here during calls |
| **Inbound webhooks** | VPS sync server | Twilio POSTs to these endpoints |
| **SMS/Call history storage** | Cloudflare D1 (via yncrm-api Worker) | Same DB as contacts — enables join queries |
| **Voice JS SDK** | CC v7 browser (frontend) | Handles actual audio stream |
| **SMS compose UI** | CC v7 browser (frontend) | User types message, sends via API |
| **Cloudflare Worker proxy** | forged-sync Worker | Routes frontend requests to VPS (avoids self-signed cert issue) |

### 3.3 Data Flow: Outbound Call
```
1. Boss clicks 📞 on lead card in CC v7
2. CC v7 → Worker proxy → VPS /twilio/token → returns Access Token (JWT)
3. CC v7 initializes Twilio.Device with Access Token
4. Twilio.Device.connect({ To: '+1XXXXXXXXXX' })
5. Twilio receives connection, fetches TwiML from VPS /twilio/voice
6. VPS returns TwiML: <Response><Dial callerId="+1312XXXXXXX"><Number>+1XXXXXXXXXX</Number></Dial></Response>
7. Twilio dials the lead's phone. Caller ID shows Boss's work number.
8. Audio streams: Browser ↔ Twilio ↔ Lead's phone
9. Call ends → VPS logs to D1 (duration, timestamp, contact_id, recording URL)
```

### 3.4 Data Flow: Outbound SMS
```
1. Boss types message in Messages view or SMS composer
2. CC v7 → Worker proxy → VPS /twilio/sms/send
3. VPS calls Twilio Messaging API:
   POST /2010-04-01/Accounts/{SID}/Messages.json
   Body: From=+1312XXXXXXX, To=+1XXXXXXXXXX, Body="Hello..."
4. Twilio delivers SMS via carrier network
5. VPS stores message in D1 (message_body, direction, contact_id, timestamp)
6. CC v7 shows message in thread
```

### 3.5 Data Flow: Inbound Call
```
1. Lead calls +1312XXXXXXX (Boss's work number)
2. Twilio sends HTTP POST to VPS /twilio/voice/inbound
3. VPS looks up caller in D1 contacts → identifies lead
4. VPS returns TwiML:
   - If Boss is online: <Response><Dial><Client>boss</Client></Dial></Response>
   - If Boss is offline: <Response><Say>Leave a message</Say><Record/></Response>
5. If connected: CC v7 Twilio.Device receives incoming call → Boss answers in browser
6. VPS sends real-time notification (WebSocket) to CC v7 → shows incoming call popup
7. Call logged to D1
```

### 3.6 Data Flow: Inbound SMS
```
1. Lead texts +1312XXXXXXX
2. Twilio sends HTTP POST to VPS /twilio/sms/inbound
   Body includes: From, Body, MessageSid
3. VPS matches From number to D1 contact
4. VPS stores message in D1 (inbound, contact_id, body, timestamp)
5. VPS pushes real-time notification via WebSocket to CC v7
6. CC v7 Messages view updates with new message in thread
7. Boss sees notification badge + toast alert
```

---

## 4. OUTBOUND SMS INTEGRATION

### 4.1 D1 Database Schema — Messages Table

```sql
CREATE TABLE IF NOT EXISTS twilio_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twilio_sid TEXT UNIQUE,           -- Twilio MessageSid
  contact_id TEXT,                  -- FK to contacts table
  contact_phone TEXT NOT NULL,      -- E.164 format: +1XXXXXXXXXX
  twilio_number TEXT NOT NULL,      -- Which Twilio number sent/received
  direction TEXT NOT NULL,          -- 'outbound' | 'inbound'
  body TEXT NOT NULL,
  media_url TEXT,                   -- MMS attachment URL (if any)
  status TEXT DEFAULT 'sent',       -- sent | delivered | failed | received
  segments INTEGER DEFAULT 1,      -- Number of SMS segments (for billing tracking)
  error_code TEXT,                  -- Twilio error code if failed
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_contact ON twilio_messages(contact_id);
CREATE INDEX idx_messages_phone ON twilio_messages(contact_phone);
CREATE INDEX idx_messages_created ON twilio_messages(created_at DESC);
```

### 4.2 VPS Endpoint: Send SMS

```javascript
// POST /twilio/sms/send
// Body: { to: '+1XXXXXXXXXX', body: 'Hello...', contactId: 'abc123' }

app.post('/twilio/sms/send', async (req, res) => {
  const { to, body, contactId } = req.body;
  
  try {
    const message = await twilioClient.messages.create({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,  // +1312XXXXXXX
      to: to,
      statusCallback: `${BASE_URL}/twilio/sms/status`  // Delivery status webhook
    });
    
    // Store in D1 via yncrm-api Worker
    await storeMessage({
      twilio_sid: message.sid,
      contact_id: contactId,
      contact_phone: to,
      twilio_number: process.env.TWILIO_PHONE_NUMBER,
      direction: 'outbound',
      body: body,
      status: message.status,
      segments: message.numSegments
    });
    
    res.json({ success: true, sid: message.sid, status: message.status });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.code });
  }
});
```

### 4.3 SMS Status Callback
Twilio POSTs delivery status updates:

```javascript
// POST /twilio/sms/status (webhook from Twilio)
app.post('/twilio/sms/status', (req, res) => {
  const { MessageSid, MessageStatus, ErrorCode } = req.body;
  
  // Update message status in D1
  updateMessageStatus(MessageSid, MessageStatus, ErrorCode);
  
  // Push real-time update to CC v7 via WebSocket
  wsBroadcast('sms:status', { sid: MessageSid, status: MessageStatus });
  
  res.sendStatus(200);
});
```

---

## 5. OUTBOUND VOICE (BROWSER CALLING)

### 5.1 How Browser Calling Works

The **Twilio Voice JavaScript SDK** (`@twilio/voice-sdk`) creates a WebRTC audio connection between the browser and Twilio. No phone hardware needed — Boss uses his browser's microphone and speakers (or headset).

**Flow:**
1. Frontend requests an **Access Token** from VPS
2. Frontend initializes `Twilio.Device` with the token
3. When Boss clicks "Call," `device.connect({ params: { To: '+1XXXXXXXXXX' } })`
4. Twilio fetches TwiML from VPS → TwiML says `<Dial>` the target number
5. Audio streams in real-time: Browser microphone → Twilio → Lead's phone (and back)

### 5.2 VPS Endpoint: Access Token Generation

```javascript
// GET /twilio/token
const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

app.get('/twilio/token', (req, res) => {
  const identity = req.query.identity || 'boss';  // User identity
  
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    { identity: identity, ttl: 3600 }  // 1 hour lifetime
  );
  
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: true  // Allow incoming calls to this browser client
  });
  
  token.addGrant(voiceGrant);
  
  res.json({ token: token.toJwt(), identity: identity });
});
```

### 5.3 VPS Endpoint: TwiML Voice Handler (Outbound)

```javascript
// POST /twilio/voice (TwiML App webhook — called by Twilio during outbound calls)
app.post('/twilio/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const to = req.body.To;
  
  if (to) {
    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,  // Caller ID = work number
      record: 'record-from-answer-dual',           // Record both legs (optional)
      recordingStatusCallback: `${BASE_URL}/twilio/recording/status`
    });
    dial.number(to);
  } else {
    twiml.say('No destination number provided.');
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
});
```

### 5.4 Frontend: Twilio Device Setup

```javascript
// In CC v7 React component
import { Device } from '@twilio/voice-sdk';

// Initialize on app load or Phone view mount
async function initTwilioDevice() {
  const response = await fetch('/api/twilio/token?identity=boss');
  const { token } = await response.json();
  
  const device = new Device(token, {
    codecPreferences: ['opus', 'pcmu'],
    enableRingingState: true,
  });
  
  // Register for incoming calls
  await device.register();
  
  // Listen for incoming calls
  device.on('incoming', (call) => {
    // Show incoming call UI
    showIncomingCallModal(call);
  });
  
  // Token expiring — refresh before it dies
  device.on('tokenWillExpire', async () => {
    const resp = await fetch('/api/twilio/token?identity=boss');
    const { token: newToken } = await resp.json();
    device.updateToken(newToken);
  });
  
  return device;
}

// Make an outbound call
async function makeCall(phoneNumber) {
  const call = await device.connect({
    params: { To: phoneNumber }
  });
  
  call.on('accept', () => { /* Call connected — start timer */ });
  call.on('disconnect', () => { /* Call ended — log it */ });
  call.on('error', (err) => { /* Handle error */ });
  
  return call;
}

// Hang up
function hangUp(call) {
  call.disconnect();
}
```

### 5.5 D1 Database Schema — Calls Table

```sql
CREATE TABLE IF NOT EXISTS twilio_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twilio_sid TEXT UNIQUE,           -- Twilio CallSid
  contact_id TEXT,                  -- FK to contacts table
  contact_phone TEXT NOT NULL,
  twilio_number TEXT NOT NULL,
  direction TEXT NOT NULL,          -- 'outbound' | 'inbound'
  status TEXT DEFAULT 'initiated',  -- initiated | ringing | in-progress | completed | no-answer | busy | failed
  duration INTEGER DEFAULT 0,      -- seconds
  recording_url TEXT,               -- Twilio recording URL
  recording_duration INTEGER,       -- Recording length in seconds
  voicemail INTEGER DEFAULT 0,      -- 1 if this was a voicemail
  notes TEXT,                       -- Boss can add call notes
  disposition TEXT,                 -- Outcome: interested | callback | not-interested | no-answer | voicemail
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_calls_contact ON twilio_calls(contact_id);
CREATE INDEX idx_calls_created ON twilio_calls(created_at DESC);
CREATE INDEX idx_calls_status ON twilio_calls(status);
```

---

## 6. INBOUND CALL & SMS HANDLING

### 6.1 Inbound Call Webhook

```javascript
// POST /twilio/voice/inbound (Twilio webhook when someone calls the work number)
app.post('/twilio/voice/inbound', async (req, res) => {
  const { From, CallSid, CalledVia } = req.body;
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Look up caller in contacts
  const contact = await findContactByPhone(From);
  
  // Notify CC v7 via WebSocket (real-time incoming call alert)
  wsBroadcast('call:incoming', {
    callSid: CallSid,
    from: From,
    contactName: contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown',
    contactId: contact?.id
  });
  
  // Ring Boss's browser client for 30 seconds
  const dial = twiml.dial({
    timeout: 30,
    action: `${BASE_URL}/twilio/voice/inbound/complete`  // What to do if Boss doesn't answer
  });
  dial.client('boss');  // Ring the browser client registered as 'boss'
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// POST /twilio/voice/inbound/complete (after ring timeout or call ends)
app.post('/twilio/voice/inbound/complete', (req, res) => {
  const { DialCallStatus } = req.body;
  const twiml = new twilio.twiml.VoiceResponse();
  
  if (DialCallStatus !== 'completed') {
    // Boss didn't answer → voicemail
    twiml.say({ voice: 'Polly.Matthew' }, 
      'You\'ve reached Forged Financial. Please leave a message after the beep.');
    twiml.record({
      maxLength: 120,  // 2 minute max
      transcribe: true,
      transcribeCallback: `${BASE_URL}/twilio/voicemail/transcription`,
      recordingStatusCallback: `${BASE_URL}/twilio/recording/status`,
      action: `${BASE_URL}/twilio/voice/goodbye`
    });
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
});
```

### 6.2 Inbound SMS Webhook

```javascript
// POST /twilio/sms/inbound (Twilio webhook when someone texts the work number)
app.post('/twilio/sms/inbound', async (req, res) => {
  const { From, Body, MessageSid, NumMedia } = req.body;
  
  // Look up sender in contacts
  const contact = await findContactByPhone(From);
  
  // Store in D1
  await storeMessage({
    twilio_sid: MessageSid,
    contact_id: contact?.id,
    contact_phone: From,
    twilio_number: process.env.TWILIO_PHONE_NUMBER,
    direction: 'inbound',
    body: Body,
    status: 'received'
  });
  
  // Push real-time notification to CC v7
  wsBroadcast('sms:incoming', {
    sid: MessageSid,
    from: From,
    body: Body,
    contactName: contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown',
    contactId: contact?.id,
    timestamp: new Date().toISOString()
  });
  
  // Respond with empty TwiML (no auto-reply — Boss will reply manually)
  const twiml = new twilio.twiml.MessagingResponse();
  res.type('text/xml');
  res.send(twiml.toString());
});
```

### 6.3 Webhook URL Configuration

Twilio needs to reach the VPS. Two options:

**Option A: Via Cloudflare Worker Proxy (Recommended)**
```
Voice URL:  https://forged-sync.danielruh.workers.dev/twilio/voice/inbound
SMS URL:    https://forged-sync.danielruh.workers.dev/twilio/sms/inbound
```
Worker routes `/twilio/*` to VPS at `76.13.126.53:443/twilio/*`.

**Option B: Direct VPS with Tailscale Funnel (Alternative)**
If Worker proxy doesn't handle POST body forwarding well, consider:
- Tailscale Funnel to expose VPS endpoint publicly
- Or a dedicated Cloudflare Tunnel for Twilio webhooks

**Recommendation:** Option A — leverage the existing Worker proxy. Add `POST` forwarding for `/twilio/*` routes if not already supported.

---

## 7. CC v7 FRONTEND INTEGRATION

### 7.1 Phone View — Complete Redesign

**Current state:** Pulls call history from Mac via mac-api (FaceTime/Continuity calls)  
**New state:** Full softphone powered by Twilio Voice JS SDK

```
┌────────────────────────────────────────────────┐
│  📞 Phone                                       │
├──────────────┬─────────────────────────────────┤
│              │                                  │
│  RECENTS     │    ┌─────────────────────┐      │
│              │    │                     │      │
│  🔴 Missed   │    │   DIAL PAD          │      │
│  John Doe    │    │   ┌───┬───┬───┐     │      │
│  2 min ago   │    │   │ 1 │ 2 │ 3 │     │      │
│              │    │   ├───┼───┼───┤     │      │
│  ✅ Outgoing │    │   │ 4 │ 5 │ 6 │     │      │
│  Jane Smith  │    │   ├───┼───┼───┤     │      │
│  1 hour ago  │    │   │ 7 │ 8 │ 9 │     │      │
│              │    │   ├───┼───┼───┤     │      │
│  📥 Incoming │    │   │ * │ 0 │ # │     │      │
│  Bob Wilson  │    │   └───┴───┴───┘     │      │
│  Yesterday   │    │                     │      │
│              │    │   [  📞 CALL  ]     │      │
│  VOICEMAIL   │    │                     │      │
│  🎤 New (2)  │    │   ── or ──          │      │
│              │    │                     │      │
│              │    │   🔍 Search contact  │      │
│              │    └─────────────────────┘      │
│              │                                  │
│              │  ── ACTIVE CALL ──               │
│              │  ┌─────────────────────┐         │
│              │  │ 📞 John Doe        │         │
│              │  │ +1 (312) 555-1234  │         │
│              │  │ ⏱ 03:42           │         │
│              │  │                     │         │
│              │  │ [🔇 Mute] [⏸ Hold] │         │
│              │  │ [🔊 Speaker]       │         │
│              │  │ [🔴 End Call]      │         │
│              │  └─────────────────────┘         │
└──────────────┴─────────────────────────────────┘
```

**Key features:**
- Dial pad for manual number entry
- Contact search (searches D1 contacts by name or phone)
- Recent calls list (from `twilio_calls` table)
- Active call controls (mute, hold, end)
- Call timer
- Voicemail inbox with transcriptions
- Call notes / disposition after hang-up

### 7.2 Messages View — Real SMS Threads

**Current state:** Pulls iMessage from Mac via mac-api  
**New state:** Real SMS conversations via Twilio

```
┌────────────────────────────────────────────────┐
│  💬 Messages                                    │
├──────────────┬─────────────────────────────────┤
│              │                                  │
│  THREADS     │  ┌───────────────────────────┐  │
│              │  │ John Doe                  │  │
│  John Doe    │  │ +1 (312) 555-1234         │  │
│  "Thanks fo.."│  ├───────────────────────────┤  │
│  2 min ago   │  │                           │  │
│              │  │  Hey John, following up    │  │
│  Jane Smith  │  │  on our call yesterday.   │  │
│  "Sounds goo"│  │  Do you have time this    │  │
│  1 hour ago  │  │  Thursday at 2pm?         │  │
│              │  │              Sent 2:30 PM ✓│  │
│  Bob Wilson  │  │                           │  │
│  "What's the"│  │  Thanks for reaching out! │  │
│  Yesterday   │  │  Thursday works. What's   │  │
│              │  │  your office address?      │  │
│  ── New ──   │  │  Received 2:45 PM        │  │
│  +1(773)...  │  │                           │  │
│  "Hi, I saw" │  │                           │  │
│              │  ├───────────────────────────┤  │
│              │  │ [Type a message...     ] 📤│  │
│              │  └───────────────────────────┘  │
└──────────────┴─────────────────────────────────┘
```

**Key features:**
- Thread list grouped by contact (most recent first)
- Unread badge / bold for new inbound messages
- Message bubbles (outbound right, inbound left)
- Delivery status indicators (sent ✓, delivered ✓✓, failed ✗)
- Quick compose to new number
- Character count / segment counter (160 char = 1 segment)
- Template quick-insert for common messages

### 7.3 Pipeline Card Integration

Each pipeline card in the CRM view gets two action buttons:

```
┌─────────────────────────┐
│ John Doe                │
│ Life Insurance Lead     │
│ $500/mo premium         │
│ Last contact: 2 days ago│
│                         │
│  [📞 Call] [💬 Text]    │
└─────────────────────────┘
```

- **📞 Call** → Opens Phone view with number pre-dialed → one-click to call
- **💬 Text** → Opens Messages view with compose pre-filled with contact

### 7.4 Lead Detail Modal — Communication History Tab

```
┌──────────────────────────────────────┐
│ John Doe — Lead Detail               │
├──────────────────────────────────────┤
│ [Info] [Activity] [📞 Comms] [Notes] │
├──────────────────────────────────────┤
│                                      │
│ Feb 19, 3:15 PM — 📞 Outbound Call   │
│   Duration: 4:32 | Disposition: Callback │
│   Notes: "Interested in whole life.  │
│   Wife's birthday next month."       │
│   [▶️ Play Recording]                │
│                                      │
│ Feb 19, 3:20 PM — 💬 Outbound SMS    │
│   "Great talking with you John!      │
│   I'll send over those quotes."      │
│                                      │
│ Feb 18, 11:00 AM — 💬 Inbound SMS    │
│   "Hi, I saw your ad about life      │
│   insurance. Can you call me?"       │
│                                      │
│ Feb 17, 2:00 PM — 📞 Missed Call     │
│   Voicemail: "Hi, this is John..."   │
│   [▶️ Play Voicemail]                │
│                                      │
└──────────────────────────────────────┘
```

### 7.5 Notifications — Incoming Call/Text Alerts

**Incoming Call:**
```
┌─────────────────────────────┐
│ 📞 Incoming Call             │
│ John Doe (+1 312-555-1234)  │
│                             │
│  [✅ Answer]  [❌ Decline]   │
└─────────────────────────────┘
```

**Incoming Text:**
```
┌─────────────────────────────┐
│ 💬 New Message               │
│ John Doe: "Thanks for the   │
│ quote! When can we meet?"   │
│                             │
│  [View]  [Quick Reply]      │
└─────────────────────────────┘
```

Both delivered via WebSocket push from VPS → rendered as toast notifications in CC v7 + browser Notification API for when CC v7 is in background tab.

---

## 8. CALL RECORDING & VOICEMAIL

### 8.1 Call Recording

**⚠️ CRITICAL: Illinois is a TWO-PARTY CONSENT state.**

Both parties must consent to call recording. Implementation:

```javascript
// In TwiML voice handler, play consent announcement before connecting
app.post('/twilio/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const to = req.body.To;
  
  // Consent announcement (plays to both parties)
  twiml.say({ voice: 'Polly.Matthew' },
    'This call may be recorded for quality and compliance purposes.');
  
  const dial = twiml.dial({
    callerId: process.env.TWILIO_PHONE_NUMBER,
    record: 'record-from-answer-dual',  // Records both legs
    recordingStatusCallback: `${BASE_URL}/twilio/recording/status`
  });
  dial.number(to);
  
  res.type('text/xml');
  res.send(twiml.toString());
});
```

**Recording options:**
- **Always record** with consent announcement (recommended for insurance compliance)
- **Toggle recording** per call (Boss can enable/disable in call UI)
- **Never record** cold calls, always record policy discussions

**Recording storage:**
- Twilio stores recordings for 30 days by default
- Option to download and store on VPS/S3 for longer retention
- Twilio recording cost: $0.0025/min recording + $0.0005/min/mo storage

### 8.2 Voicemail System

When Boss doesn't answer within 30 seconds:

```javascript
// Voicemail greeting + recording
twiml.say({ voice: 'Polly.Matthew' },
  'You\'ve reached Forged Financial. We\'re unable to take your call right now. ' +
  'Please leave a message after the beep and we\'ll get back to you shortly.');
twiml.record({
  maxLength: 120,           // 2 minute max
  playBeep: true,
  transcribe: true,         // Auto-transcribe voicemail
  transcribeCallback: `${BASE_URL}/twilio/voicemail/transcription`,
  recordingStatusCallback: `${BASE_URL}/twilio/recording/status`,
  action: `${BASE_URL}/twilio/voice/goodbye`
});
```

**Voicemail transcription webhook:**
```javascript
app.post('/twilio/voicemail/transcription', async (req, res) => {
  const { RecordingSid, TranscriptionText, CallSid } = req.body;
  
  // Store transcription in D1
  await storeVoicemail({
    call_sid: CallSid,
    recording_sid: RecordingSid,
    transcription: TranscriptionText
  });
  
  // Notify Boss in real-time
  wsBroadcast('voicemail:new', {
    callSid: CallSid,
    transcription: TranscriptionText
  });
  
  res.sendStatus(200);
});
```

---

## 9. COMPLIANCE & LEGAL

### 9.1 A2P 10DLC Registration (REQUIRED for Business SMS)

**What:** Application-to-Person messaging on 10-digit long codes. All US businesses sending SMS from local numbers MUST register.

**Without registration:** Messages will be throttled or blocked by carriers (T-Mobile, AT&T, Verizon).

**Registration process:**

| Step | What | Cost | Timeline |
|------|------|------|----------|
| 1. Brand Registration | Register "Forged Financial" as a brand with TCR (The Campaign Registry) | $4.50 one-time | 1-3 business days |
| 2. Campaign Registration | Register messaging use case (e.g., "Customer Care" or "Mixed") | $15.00 one-time vetting fee | 1-5 business days |
| 3. Campaign Approval | TCR + carriers review and approve | — | 1-7 business days |
| 4. Number Assignment | Assign Twilio number(s) to approved campaign | — | Immediate after approval |

**Brand registration requires:**
- Legal business name
- EIN (Employer Identification Number)
- Business address
- Business website
- Vertical/industry (Insurance)
- Stock ticker (if public) — N/A for Forged Financial

**Campaign registration requires:**
- Use case description (e.g., "Appointment confirmations, follow-up messages to insurance leads")
- Sample messages (2-5 examples)
- Opt-in flow description (how contacts consent to receive SMS)
- Opt-out handling (must support STOP keyword)

**Campaign types that fit Forged Financial:**

| Use Case | Monthly Fee | Throughput | Best For |
|----------|-------------|------------|----------|
| Low Volume Mixed | $1.50/mo | 2,000 segments/day to T-Mobile | Starting out, mixed messaging |
| Customer Care | $10.00/mo | Higher throughput | Dedicated support line |
| Marketing | $10.00/mo | Higher throughput | Campaign/promotional texts |

**Recommendation:** Start with **Low Volume Mixed** ($1.50/mo). It covers 1:1 conversations AND basic automated messages. If volume exceeds 2,000 segments/day to T-Mobile (unlikely early on), upgrade to a Standard campaign.

### 9.2 SMS Compliance Requirements

| Requirement | Implementation |
|------------|----------------|
| **Opt-in** | Initial contact must have consent. For insurance leads from Meta ads, the lead form serves as opt-in. Document consent source in D1. |
| **Opt-out** | Must honor STOP, UNSUBSCRIBE, CANCEL, QUIT, END. Twilio handles this automatically with Advanced Opt-Out. |
| **Identify yourself** | Every first message should include business name: "Hi [Name], this is [Agent] from Forged Financial..." |
| **Message frequency** | Disclose in opt-in: "Msg frequency varies. Msg & data rates may apply." |
| **No prohibited content** | No SHAFT content (Sex, Hate, Alcohol, Firearms, Tobacco) — not applicable to insurance |

### 9.3 Call Recording Compliance (Illinois)

**Illinois Eavesdropping Act (720 ILCS 5/14-2):**
- Illinois is a **two-party consent** state
- ALL parties on the call must be notified and consent to recording
- Violation is a felony in Illinois

**Implementation:**
1. **Automated announcement** plays at start of every recorded call: *"This call may be recorded for quality and compliance purposes."*
2. Continuing the call after hearing this = implied consent
3. If the lead objects, Boss can disable recording mid-call (toggle in UI)
4. All automated announcements are logged with timestamp

### 9.4 Do-Not-Call (DNC) Compliance

| Level | Requirement | Implementation |
|-------|------------|----------------|
| Federal DNC | Check against FTC National DNC Registry | Integrate DNC check before outbound calls. API available at $0.01/query. |
| State DNC | Illinois has its own DNC list | Cross-reference Illinois DNC before calling IL numbers |
| Internal DNC | Honor requests to stop calling | `do_not_call` flag in contacts table, enforced in UI |

**For Phase 1:** Add `do_not_contact` boolean to contacts. Block calls/SMS to flagged contacts in both UI and API.  
**For Phase 5:** Integrate FTC DNC Registry API for automated screening.

---

## 10. COST BREAKDOWN

### 10.1 Twilio Pricing Table (Current as of Feb 2026)

| Item | Cost | Notes |
|------|------|-------|
| **Local phone number** | $1.15/mo each | Two numbers = $2.30/mo |
| **Outbound call (US/Canada)** | $0.014/min | Boss → Lead |
| **Inbound call (local)** | $0.0085/min | Lead → Boss |
| **Outbound SMS** | $0.0079/segment | 160 chars = 1 segment |
| **Inbound SMS** | $0.0079/segment | Lead texts Boss |
| **Carrier fee (outbound SMS)** | $0.003-$0.005/msg | Varies by carrier |
| **Carrier fee (inbound SMS)** | $0.003/msg | T-Mobile charges inbound too |
| **Call recording** | $0.0025/min | Recording audio |
| **Recording storage** | $0.0005/min/mo | 30 days free, then billed |
| **Branded Calling** | $0.03/call | Optional — richer mobile Caller ID |
| **A2P 10DLC brand registration** | $4.50 one-time | — |
| **A2P 10DLC campaign vetting** | $15.00 one-time | Per campaign |
| **A2P 10DLC campaign monthly** | $1.50-$10.00/mo | Per active campaign |

### 10.2 Monthly Cost Scenarios

#### Scenario A: Light Usage (Starting Out)
| Item | Volume | Monthly Cost |
|------|--------|-------------|
| 2 phone numbers | — | $2.30 |
| Outbound calls | 20 calls/day × 5 min avg × 22 days | $30.80 |
| Inbound calls | 5 calls/day × 3 min avg × 22 days | $2.81 |
| Outbound SMS | 30 msgs/day × 22 days | $7.18 |
| Inbound SMS | 10 msgs/day × 22 days | $2.39 |
| Carrier fees (SMS) | 40 msgs/day × 22 days | $2.64 |
| A2P 10DLC campaign | 1 campaign | $1.50 |
| Call recording | 110 min/day × 22 days | $6.05 |
| **TOTAL** | | **~$55.67/mo** |

#### Scenario B: Medium Usage (Fully Ramped)
| Item | Volume | Monthly Cost |
|------|--------|-------------|
| 2 phone numbers | — | $2.30 |
| Outbound calls | 50 calls/day × 5 min avg × 22 days | $77.00 |
| Inbound calls | 15 calls/day × 3 min avg × 22 days | $8.42 |
| Outbound SMS | 100 msgs/day × 22 days | $23.94 |
| Inbound SMS | 30 msgs/day × 22 days | $7.18 |
| Carrier fees (SMS) | 130 msgs/day × 22 days | $8.58 |
| A2P 10DLC campaigns | 2 campaigns | $11.50 |
| Call recording | 265 min/day × 22 days | $14.58 |
| **TOTAL** | | **~$153.50/mo** |

#### Scenario C: Heavy Usage (Full Team)
| Item | Volume | Monthly Cost |
|------|--------|-------------|
| 10 phone numbers (9 agents + Boss) | — | $11.50 |
| Outbound calls | 200 calls/day × 5 min avg × 22 days | $308.00 |
| SMS (all directions) | 500 msgs/day × 22 days | $119.68 |
| Carrier fees | 500 msgs/day × 22 days | $33.00 |
| A2P 10DLC campaigns | 3 campaigns | $21.50 |
| Call recording | 1000 min/day × 22 days | $55.00 |
| **TOTAL** | | **~$548.68/mo** |

### 10.3 Twilio vs Alternatives

| Feature | Twilio | OpenPhone | Dialpad |
|---------|--------|-----------|---------|
| Monthly base cost | $1.15/number (PAYG) | $15/user/mo | $15/user/mo |
| Custom integration | ✅ Full API control | ❌ Limited API | ❌ Limited API |
| Browser calling | ✅ Voice JS SDK | ✅ Web app | ✅ Web app |
| SMS API | ✅ Full programmatic | ⚠️ Basic | ⚠️ Basic |
| CRM integration | ✅ Build exactly what we need | ❌ Zapier only | ❌ Pre-built integrations |
| Multi-agent scaling | ✅ Programmatic number provisioning | ✅ But $15/user | ✅ But $15/user |
| Cost at 10 users | ~$549/mo (usage-based) | $150/mo (flat) + usage | $150/mo (flat) + usage |
| Automation capability | ✅ Unlimited (TwiML, webhooks, Studio) | ❌ Basic auto-reply | ❌ Basic IVR |
| Data ownership | ✅ Everything in our D1 database | ❌ Locked in their platform | ❌ Locked in their platform |

**Why Twilio wins:** Complete API control. Every call, text, and recording flows through OUR systems and stores in OUR database. No vendor lock-in. Custom UI in CC v7. Scales from 1 to 1000 agents without platform constraints. Insurance automation (appointment reminders, follow-up drips, policy renewal alerts) requires programmable messaging — OpenPhone/Dialpad can't do that.

---

## 11. BUILD PHASES

### Phase 1: Foundation — Account + Outbound SMS (Week 1)
**Goal:** Boss can send text messages from CC v7

| Step | Task | Owner | Time |
|------|------|-------|------|
| 1.1 | Create Twilio account + upgrade to PAYG | Boss | 30 min |
| 1.2 | Purchase 2 local Chicago numbers (312 or 773) | Boss | 15 min |
| 1.3 | Register A2P 10DLC Brand ("Forged Financial") | Boss | 30 min |
| 1.4 | Register A2P 10DLC Campaign (Low Volume Mixed) | Boss | 30 min |
| 1.5 | Create API Key + store credentials | Boss + Mason | 15 min |
| 1.6 | Add `twilio_messages` table to D1 schema | Mason | 1 hour |
| 1.7 | Build VPS endpoints: `/twilio/sms/send`, `/twilio/sms/inbound`, `/twilio/sms/status` | Mason | 4 hours |
| 1.8 | Add Worker proxy routes for `/twilio/*` | Mason | 1 hour |
| 1.9 | Build Messages View in CC v7 (thread list + compose) | Mason | 6 hours |
| 1.10 | Configure Twilio number webhooks (SMS URL → Worker proxy) | Mason | 30 min |
| 1.11 | Test: Send/receive SMS from CC v7 | Sentinel | 2 hours |

**Acceptance criteria:**
- [ ] Boss can open Messages view, see a thread list
- [ ] Boss can compose and send an SMS to any phone number
- [ ] Inbound SMS from a contact appears in the thread within 5 seconds
- [ ] Delivery status updates (sent → delivered) show in UI
- [ ] STOP/opt-out handled automatically by Twilio

**Blocked by:** A2P 10DLC approval (1-7 business days). Can test with trial account while waiting.

---

### Phase 2: Browser Calling — Outbound Calls (Week 2)
**Goal:** Boss can call leads directly from CC v7 browser

| Step | Task | Owner | Time |
|------|------|-------|------|
| 2.1 | Install `twilio` npm package on VPS sync server | Mason | 15 min |
| 2.2 | Create TwiML App in Twilio Console | Mason | 15 min |
| 2.3 | Build VPS endpoint: `/twilio/token` (Access Token generation) | Mason | 2 hours |
| 2.4 | Build VPS endpoint: `/twilio/voice` (TwiML handler for outbound) | Mason | 2 hours |
| 2.5 | Add `twilio_calls` table to D1 schema | Mason | 1 hour |
| 2.6 | Install `@twilio/voice-sdk` in CC v7 frontend | Mason | 30 min |
| 2.7 | Build TwilioProvider React context (device init, token refresh) | Mason | 3 hours |
| 2.8 | Build Phone View UI (dial pad, recent calls, active call controls) | Mason | 6 hours |
| 2.9 | Wire 📞 button on pipeline cards → Phone View with pre-filled number | Mason | 1 hour |
| 2.10 | Build call logging (duration, timestamp, contact_id → D1) | Mason | 2 hours |
| 2.11 | Test: Make outbound calls from CC v7, verify caller ID | Sentinel | 2 hours |

**Acceptance criteria:**
- [ ] Boss can dial any US number from CC v7 Phone view
- [ ] Caller ID on recipient's phone shows Boss's Twilio number
- [ ] Active call shows timer, mute button, end button
- [ ] Call history appears in Recent Calls list
- [ ] 📞 button on pipeline card initiates call to that contact
- [ ] Audio quality is clear with no dropped calls

---

### Phase 3: Inbound Handling — Receiving Calls & Texts (Week 2-3)
**Goal:** Leads can call/text Boss's work number and he receives in CC v7

| Step | Task | Owner | Time |
|------|------|-------|------|
| 3.1 | Build VPS endpoint: `/twilio/voice/inbound` (incoming call TwiML) | Mason | 3 hours |
| 3.2 | Build VPS endpoint: `/twilio/voice/inbound/complete` (no-answer handling) | Mason | 1 hour |
| 3.3 | Add WebSocket events for incoming calls/texts | Mason | 2 hours |
| 3.4 | Build incoming call modal UI (accept/decline/caller info) | Mason | 3 hours |
| 3.5 | Build incoming SMS toast notification | Mason | 1 hour |
| 3.6 | Wire browser Notification API for background tab alerts | Mason | 1 hour |
| 3.7 | Build caller ID lookup (match incoming number → contact in D1) | Mason | 2 hours |
| 3.8 | Test: Receive calls + SMS in CC v7, verify real-time delivery | Sentinel | 2 hours |

**Acceptance criteria:**
- [ ] Incoming call triggers modal with caller name (if in contacts) or number
- [ ] Boss can accept or decline incoming calls
- [ ] Incoming SMS appears in Messages thread within 3 seconds
- [ ] Browser notification fires when CC v7 is in background tab
- [ ] Missed calls are logged with "missed" status

---

### Phase 4: Recording & Voicemail (Week 3)
**Goal:** Calls can be recorded (with consent). Missed calls go to voicemail.

| Step | Task | Owner | Time |
|------|------|-------|------|
| 4.1 | Add consent announcement to outbound TwiML | Mason | 1 hour |
| 4.2 | Add recording toggle in active call UI | Mason | 2 hours |
| 4.3 | Build VPS endpoint: `/twilio/recording/status` (recording webhook) | Mason | 1 hour |
| 4.4 | Build voicemail system (greeting → record → transcribe) | Mason | 3 hours |
| 4.5 | Build VPS endpoint: `/twilio/voicemail/transcription` | Mason | 1 hour |
| 4.6 | Build voicemail inbox UI in Phone View | Mason | 3 hours |
| 4.7 | Build recording playback in call history / lead detail | Mason | 2 hours |
| 4.8 | Add call notes + disposition dropdown (post-call) | Mason | 2 hours |
| 4.9 | Test: Recording, voicemail, transcription accuracy | Sentinel | 2 hours |

**Acceptance criteria:**
- [ ] "This call may be recorded" plays at start of recorded calls
- [ ] Boss can toggle recording on/off mid-call
- [ ] Voicemail greeting plays after 30s of no answer
- [ ] Voicemail transcription appears in Phone View within 60 seconds
- [ ] Recordings are playable from call history and lead detail modal
- [ ] Post-call disposition captures outcome (interested, callback, etc.)

---

### Phase 5: Automation & Polish (Week 4+)
**Goal:** Automated SMS workflows. CNAM branding. DNC integration.

| Step | Task | Owner | Time |
|------|------|-------|------|
| 5.1 | Register CNAM ("FORGED FIN") via Trust Hub | Boss + Mason | 1 hour |
| 5.2 | Build SMS template system (reusable message templates) | Mason | 3 hours |
| 5.3 | Build appointment reminder automation (24hr before) | Mason | 4 hours |
| 5.4 | Build follow-up drip system (configurable sequences) | Mason | 6 hours |
| 5.5 | Add `do_not_contact` flag + DNC enforcement | Mason | 2 hours |
| 5.6 | Build Communication History tab in Lead Detail Modal | Mason | 3 hours |
| 5.7 | Implement Branded Calling (optional — $0.03/call) | Mason | 2 hours |
| 5.8 | Performance testing: concurrent calls, message throughput | Sentinel | 3 hours |
| 5.9 | Full regression testing across all Twilio features | Sentinel | 4 hours |

**Acceptance criteria:**
- [ ] CNAM shows "FORGED FIN" on outbound calls (where carrier supports it)
- [ ] SMS templates can be created, edited, and inserted in one click
- [ ] Appointment reminders auto-send 24 hours before scheduled appointments
- [ ] Follow-up sequences can be configured (day 1, day 3, day 7 messages)
- [ ] do_not_contact blocks all calls/SMS in UI and API
- [ ] Full communication history visible per contact

---

## 12. FUTURE: MULTI-AGENT SCALING

When 9 agents need their own numbers:

### Architecture
```
Twilio Subaccount per agent (or shared account with per-number routing)
    ↓
Each agent gets:
  - 1 local number (provisioned via API)
  - Own A2P 10DLC campaign (or shared campaign)
  - Own Access Token identity
  - Own call/SMS history in D1 (filtered by agent_id)
```

### Implementation
1. Add `agent_id` column to `twilio_calls` and `twilio_messages` tables
2. Access Token identity = agent's user ID
3. TwiML routing: look up which agent owns the called number → ring that agent's browser client
4. Each agent sees only their own call/SMS history in CC v7
5. Boss sees all agents' history (admin view)

### Cost impact
- +$1.15/mo per agent number
- +$15 one-time per additional campaign
- +$10/mo per additional standard campaign
- Per-minute and per-message costs scale linearly with usage

---

## 13. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| A2P 10DLC approval delayed | Medium | High — can't send SMS until approved | Submit registration IMMEDIATELY in Phase 1. Use trial for testing. |
| Calls marked "Spam Likely" | Medium | High — leads won't answer | Register CNAM, maintain STIR/SHAKEN A-attestation, monitor with Voice Integrity API |
| Audio quality issues | Low | Medium — bad calls hurt credibility | Require stable internet. Recommend wired connection or strong WiFi. Test headset quality. |
| Twilio outage | Very Low | High — no calls/texts | Twilio has 99.95% SLA. No practical mitigation except wait. |
| Carrier blocks SMS | Low | High — messages not delivered | Proper A2P registration. Don't send spam. Monitor delivery rates. |
| VPS downtime breaks webhooks | Medium | High — inbound calls/texts lost | Monitor VPS uptime. Twilio has fallback URL option — set to a TwiML Bin with voicemail. |
| Recording consent violation | Low | Critical — Illinois felony | Automated consent announcement on EVERY recorded call. No exceptions. |
| Worker proxy doesn't forward POST bodies | Low | Medium — webhooks broken | Test early in Phase 1. If broken, use Cloudflare Tunnel or Tailscale Funnel instead. |
| Token expiry during active call | Low | Low — call continues but no new calls | Token refresh logic in TwilioProvider. Set TTL to 1 hour, refresh at 50 min. |

---

## APPENDIX: API CODE EXAMPLES

### A. Complete VPS Twilio Module

```javascript
// /routes/twilio.js — VPS sync server Twilio routes
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const BASE_URL = process.env.TWILIO_WEBHOOK_BASE_URL;
// e.g., 'https://forged-sync.danielruh.workers.dev'

// ═══════════════════════════════════════
// ACCESS TOKEN (for Voice JS SDK in browser)
// ═══════════════════════════════════════
router.get('/token', (req, res) => {
  const identity = req.query.identity || 'boss';
  
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    { identity, ttl: 3600 }
  );
  
  token.addGrant(new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: true
  }));
  
  res.json({ token: token.toJwt(), identity });
});

// ═══════════════════════════════════════
// OUTBOUND CALL (TwiML handler)
// ═══════════════════════════════════════
router.post('/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const to = req.body.To;
  
  if (to && /^\+\d{10,15}$/.test(to)) {
    // Consent announcement for recording
    twiml.say({ voice: 'Polly.Matthew' },
      'This call may be recorded for quality and compliance purposes.');
    
    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,
      record: 'record-from-answer-dual',
      recordingStatusCallback: `${BASE_URL}/twilio/recording/status`
    });
    dial.number(to);
  } else {
    twiml.say('Invalid phone number.');
    twiml.hangup();
  }
  
  res.type('text/xml').send(twiml.toString());
});

// ═══════════════════════════════════════
// INBOUND CALL
// ═══════════════════════════════════════
router.post('/voice/inbound', async (req, res) => {
  const { From, CallSid } = req.body;
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Look up caller
  const contact = await findContactByPhone(From);
  
  // Notify CC v7 via WebSocket
  broadcastToClients('call:incoming', {
    callSid: CallSid,
    from: From,
    contactName: contact?.name || 'Unknown',
    contactId: contact?.id
  });
  
  // Ring Boss's browser for 30 seconds
  const dial = twiml.dial({
    timeout: 30,
    action: `${BASE_URL}/twilio/voice/inbound/complete`
  });
  dial.client('boss');
  
  res.type('text/xml').send(twiml.toString());
});

// After ring timeout → voicemail
router.post('/voice/inbound/complete', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  if (req.body.DialCallStatus !== 'completed') {
    twiml.say({ voice: 'Polly.Matthew' },
      "You've reached Forged Financial. Please leave a message after the beep.");
    twiml.record({
      maxLength: 120,
      transcribe: true,
      transcribeCallback: `${BASE_URL}/twilio/voicemail/transcription`,
      recordingStatusCallback: `${BASE_URL}/twilio/recording/status`
    });
  }
  
  res.type('text/xml').send(twiml.toString());
});

// ═══════════════════════════════════════
// SEND SMS
// ═══════════════════════════════════════
router.post('/sms/send', async (req, res) => {
  const { to, body, contactId } = req.body;
  
  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
      statusCallback: `${BASE_URL}/twilio/sms/status`
    });
    
    // Store in D1
    await db.run(
      `INSERT INTO twilio_messages (twilio_sid, contact_id, contact_phone, twilio_number, direction, body, status, segments)
       VALUES (?, ?, ?, ?, 'outbound', ?, ?, ?)`,
      [message.sid, contactId, to, process.env.TWILIO_PHONE_NUMBER, body, message.status, message.numSegments]
    );
    
    res.json({ success: true, sid: message.sid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// INBOUND SMS (webhook from Twilio)
// ═══════════════════════════════════════
router.post('/sms/inbound', async (req, res) => {
  const { From, Body, MessageSid } = req.body;
  
  const contact = await findContactByPhone(From);
  
  await db.run(
    `INSERT INTO twilio_messages (twilio_sid, contact_id, contact_phone, twilio_number, direction, body, status)
     VALUES (?, ?, ?, ?, 'inbound', ?, 'received')`,
    [MessageSid, contact?.id, From, process.env.TWILIO_PHONE_NUMBER, Body]
  );
  
  broadcastToClients('sms:incoming', {
    sid: MessageSid,
    from: From,
    body: Body,
    contactName: contact?.name || 'Unknown',
    contactId: contact?.id
  });
  
  res.type('text/xml').send(new twilio.twiml.MessagingResponse().toString());
});

// ═══════════════════════════════════════
// WEBHOOKS: Status callbacks
// ═══════════════════════════════════════
router.post('/sms/status', async (req, res) => {
  const { MessageSid, MessageStatus, ErrorCode } = req.body;
  await db.run(
    `UPDATE twilio_messages SET status = ?, error_code = ?, updated_at = datetime('now') WHERE twilio_sid = ?`,
    [MessageStatus, ErrorCode, MessageSid]
  );
  broadcastToClients('sms:status', { sid: MessageSid, status: MessageStatus });
  res.sendStatus(200);
});

router.post('/recording/status', async (req, res) => {
  const { CallSid, RecordingUrl, RecordingDuration } = req.body;
  await db.run(
    `UPDATE twilio_calls SET recording_url = ?, recording_duration = ?, updated_at = datetime('now') WHERE twilio_sid = ?`,
    [RecordingUrl, RecordingDuration, CallSid]
  );
  res.sendStatus(200);
});

router.post('/voicemail/transcription', async (req, res) => {
  const { CallSid, TranscriptionText, RecordingSid } = req.body;
  // Store voicemail transcription
  await db.run(
    `UPDATE twilio_calls SET voicemail = 1, notes = ?, updated_at = datetime('now') WHERE twilio_sid = ?`,
    [TranscriptionText, CallSid]
  );
  broadcastToClients('voicemail:new', { callSid: CallSid, transcription: TranscriptionText });
  res.sendStatus(200);
});

module.exports = router;
```

### B. Frontend React Context (TwilioProvider)

```jsx
// src/contexts/TwilioContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';

const TwilioContext = createContext(null);

export function TwilioProvider({ children }) {
  const [device, setDevice] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle | connecting | ringing | connected
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef(null);

  // Initialize Twilio Device
  const initDevice = useCallback(async () => {
    const res = await fetch('/api/twilio/token?identity=boss');
    const { token } = await res.json();
    
    const newDevice = new Device(token, {
      codecPreferences: ['opus', 'pcmu'],
      enableRingingState: true,
    });
    
    newDevice.on('incoming', (call) => {
      setIncomingCall(call);
    });
    
    newDevice.on('tokenWillExpire', async () => {
      const resp = await fetch('/api/twilio/token?identity=boss');
      const { token: newToken } = await resp.json();
      newDevice.updateToken(newToken);
    });
    
    await newDevice.register();
    setDevice(newDevice);
  }, []);

  // Make outbound call
  const makeCall = useCallback(async (phoneNumber) => {
    if (!device) return;
    setCallState('connecting');
    
    const call = await device.connect({
      params: { To: phoneNumber }
    });
    
    call.on('ringing', () => setCallState('ringing'));
    call.on('accept', () => {
      setCallState('connected');
      timerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    });
    call.on('disconnect', () => {
      setCallState('idle');
      setActiveCall(null);
      setCallDuration(0);
      clearInterval(timerRef.current);
    });
    call.on('error', (err) => {
      console.error('Call error:', err);
      setCallState('idle');
    });
    
    setActiveCall(call);
  }, [device]);

  // Hang up
  const hangUp = useCallback(() => {
    activeCall?.disconnect();
  }, [activeCall]);

  // Mute/unmute
  const toggleMute = useCallback(() => {
    if (activeCall) {
      activeCall.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [activeCall, isMuted]);

  // Accept incoming call
  const acceptCall = useCallback(() => {
    if (incomingCall) {
      incomingCall.accept();
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setCallState('connected');
    }
  }, [incomingCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    incomingCall?.reject();
    setIncomingCall(null);
  }, [incomingCall]);

  useEffect(() => {
    initDevice();
    return () => { device?.destroy(); };
  }, []);

  return (
    <TwilioContext.Provider value={{
      device, activeCall, callState, callDuration,
      incomingCall, isMuted,
      makeCall, hangUp, toggleMute, acceptCall, rejectCall
    }}>
      {children}
    </TwilioContext.Provider>
  );
}

export const useTwilio = () => useContext(TwilioContext);
```

### C. Environment Variables (VPS)

```bash
# Add to /home/clawd/.env or VPS environment
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1312XXXXXXX          # Primary work number
TWILIO_PHONE_NUMBER_2=+1312XXXXXXX        # Campaign number
TWILIO_WEBHOOK_BASE_URL=https://forged-sync.danielruh.workers.dev
```

---

## SUMMARY — WHAT BOSS NEEDS TO DO FIRST

Before Mason touches any code:

1. **Create Twilio account** → twilio.com → Sign Up → Upgrade to PAYG
2. **Buy 2 local numbers** → Phone Numbers → Buy → search "312" or "773" → pick two with SMS+Voice
3. **Register A2P 10DLC Brand** → Messaging → Trust Center → Brand → enter Forged Financial EIN
4. **Register A2P 10DLC Campaign** → Trust Center → Campaign → "Low Volume Mixed" → provide sample messages
5. **Create API Key** → Account → API Keys → Standard → save SID + Secret securely
6. **Share credentials** with Mason (via CLAWD-VPS-INFO.md, never in chat/code)

Then Mason builds Phase 1 (outbound SMS) → Phase 2 (browser calling) → Phase 3 (inbound) → Phase 4 (recording/voicemail) → Phase 5 (automation).

**Total estimated build time: ~3 weeks** (parallel with A2P approval)  
**Monthly cost at launch: ~$55-80/month**  
**One-time setup cost: ~$19.50** (brand + campaign registration)

---

*This plan is a PROPOSAL. Nothing executes without Boss's approval.*
