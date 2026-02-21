# Theme + Twilio Fix Spec — 3 Sentinel-Rejected Issues
**Author:** Soren (FF-PLN-001) | **Date:** 2026-02-19  
**Status:** READY FOR MASON

---

## Fix 1 — CRITICAL: PhoneProvider Never Mounted

**File:** `/home/clawd/command-center-v7/src/App.jsx`  
**Action:** MODIFY

Add import at top:
```jsx
import { PhoneProvider } from './context/PhoneContext'
```

Wrap inside ThemeProvider, outside TaskBoardProvider. Final provider tree:
```jsx
<ThemeProvider>
  <PhoneProvider>
    <TaskBoardProvider>
      <CRMProvider>
        <Shell />
      </CRMProvider>
    </TaskBoardProvider>
  </PhoneProvider>
</ThemeProvider>
```

**Why PhoneProvider goes here:** It has no dependency on TaskBoard or CRM contexts, but phone UI appears across multiple tabs (CRM contacts, standalone Phone tab, Settings). Mounting it high ensures all consumers work.

**Edge cases:** PhoneProvider already handles missing Twilio config gracefully (try/catch in `loadLines`), so mounting it when Twilio isn't configured is safe.

---

## Fix 2 — CRITICAL: PhoneLinesSection Component Missing

**File to create:** `/home/clawd/command-center-v7/src/components/tabs/crm/settings/PhoneLinesSection.jsx`  
**File to modify:** `/home/clawd/command-center-v7/src/components/tabs/crm/settings/CRMSettings.jsx` (add import)

### CRMSettings.jsx Change

Add at top of file with other imports:
```jsx
import PhoneLinesSection from './PhoneLinesSection'
```

That's it — `<PhoneLinesSection />` is already referenced on ~line 87.

### PhoneLinesSection Component Spec

```jsx
import { useState } from 'react'
import { usePhone } from '../../../../context/PhoneContext'

export default function PhoneLinesSection() {
  const { lines, primaryLine, twilioConfigured, switchPrimaryLine, loadLines } = usePhone()
  const [switching, setSwitching] = useState(null) // lineId being switched

  // -- NOT CONFIGURED STATE --
  if (!twilioConfigured) {
    return (
      <div style={cardStyle}>
        <h3 style={sectionTitle}>📞 Phone Lines</h3>
        <div style={emptyState}>
          <span style={{ fontSize: '28px', marginBottom: '8px' }}>📵</span>
          <p>Twilio not configured yet.</p>
          <p style={{ fontSize: '11px', opacity: 0.7 }}>
            Phone lines will appear here once Twilio integration is set up.
          </p>
        </div>
      </div>
    )
  }

  // -- CONFIGURED: SHOW LINES --
  const handleSetPrimary = async (lineId) => {
    setSwitching(lineId)
    try {
      await switchPrimaryLine(lineId)
    } catch { /* error handled in context */ }
    setSwitching(null)
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ ...sectionTitle, margin: 0 }}>📞 Phone Lines</h3>
        <button onClick={loadLines} style={refreshBtn}>↻ Refresh</button>
      </div>

      {lines.length === 0 ? (
        <div style={emptyState}>No phone lines found.</div>
      ) : (
        lines.map(line => {
          const isPrimary = primaryLine?.id === line.id || primaryLine === line.id
          return (
            <div key={line.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '10px',
              background: 'var(--theme-bg)',
              border: `1px solid ${isPrimary ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
              marginBottom: '8px',
            }}>
              {/* Health indicator */}
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                background: line.health === 'green' || line.status === 'active'
                  ? 'var(--theme-success)'
                  : line.health === 'yellow' ? '#f59e0b' : 'var(--theme-error)',
              }} />

              {/* Line info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
                  {line.number || line.phoneNumber}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
                  {line.label || line.area || line.friendlyName || 'Unlabeled'}
                  {isPrimary && <span style={{ marginLeft: '8px', color: 'var(--theme-accent)', fontWeight: 600 }}>★ Primary</span>}
                </div>
              </div>

              {/* Set as primary button */}
              {!isPrimary && (
                <button
                  onClick={() => handleSetPrimary(line.id)}
                  disabled={switching === line.id}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                    border: '1px solid var(--theme-accent)',
                    background: 'var(--theme-accent-muted)',
                    color: 'var(--theme-accent)',
                    cursor: 'pointer', opacity: switching === line.id ? 0.5 : 1,
                  }}
                >
                  {switching === line.id ? '...' : 'Set Primary'}
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// Reuse same styles as CRMSettings (or import from shared)
const cardStyle = {
  padding: '24px', borderRadius: '12px',
  background: 'var(--theme-surface)',
  border: '1px solid var(--theme-border)',
  marginBottom: '16px',
}
const sectionTitle = {
  margin: '0 0 16px', fontSize: '15px', fontWeight: 600,
  color: 'var(--theme-text-primary)',
}
const emptyState = {
  padding: '24px', textAlign: 'center', borderRadius: '8px',
  border: '1px dashed var(--theme-border)',
  color: 'var(--theme-text-secondary)', fontSize: '12px',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
}
const refreshBtn = {
  padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
  border: '1px solid var(--theme-border)', background: 'transparent',
  color: 'var(--theme-text-secondary)', cursor: 'pointer',
}
```

**Key behaviors:**
- Uses `usePhone()` context for all data (lines, primaryLine, twilioConfigured, switchPrimaryLine, loadLines)
- Health dot: green for active/healthy, yellow for degraded, red for error/down
- Primary line marked with ★ and accent border
- "Set Primary" button on non-primary lines calls `switchPrimaryLine(lineId)`
- Empty/unconfigured states handled gracefully — no crashes
- Refresh button calls `loadLines()` for manual refresh

**Edge cases:**
- `primaryLine` could be an object or a string ID — check both (`primaryLine?.id === line.id || primaryLine === line.id`)
- Line data shape may vary — use fallbacks for `line.number || line.phoneNumber`, `line.label || line.area || line.friendlyName`

---

## Fix 3 — HIGH: Hold Button Missing from CallControls

**File:** `/home/clawd/command-center-v7/src/components/shared/CallControls.jsx`  
**Action:** MODIFY

### Changes Required

**1. Add `isOnHold` state and import twilioClient:**

At top, add:
```jsx
import twilioClient from '../../services/twilioClient'
```

Inside the component, add state:
```jsx
const [isOnHold, setIsOnHold] = useState(false)
```

**2. Add hold handler:**
```jsx
const handleHold = async () => {
  try {
    if (isOnHold) {
      await twilioClient.unholdCall(activeCall?.parameters?.CallSid || activeCall?.sid)
    } else {
      await twilioClient.holdCall(activeCall?.parameters?.CallSid || activeCall?.sid)
    }
    setIsOnHold(!isOnHold)
  } catch (err) {
    console.error('Hold toggle failed:', err)
  }
}
```

**3. Add Hold button — between Mute and DTMF pad buttons:**

```jsx
{/* In the controls flex container, after Mute button, before DTMF button */}
<button
  onClick={handleHold}
  style={{
    width: '56px', height: '56px', borderRadius: '50%',
    border: isOnHold ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
    background: isOnHold ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
    color: isOnHold ? '#f59e0b' : '#e4e4e7',
    fontSize: '20px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: isOnHold ? 'holdPulse 2s ease-in-out infinite' : 'none',
  }}
  title={isOnHold ? 'Resume' : 'Hold'}
>
  {isOnHold ? '▶️' : '⏸️'}
</button>
```

**4. Add CSS keyframes for pulse animation:**

Add a `<style>` tag inside the component return (or use inline with a useEffect):
```jsx
{/* At the top of the component's return JSX */}
<style>{`
  @keyframes holdPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.3); }
    50% { box-shadow: 0 0 12px 4px rgba(245,158,11,0.2); }
  }
`}</style>
```

**Button order (left to right):** Mute → **Hold** → DTMF Pad → End Call

**5. Reset hold on call end:**

In `handleEnd`, add before disconnect:
```jsx
setIsOnHold(false)
```

**Edge cases:**
- `activeCall` may not have a consistent SID path — try `activeCall?.parameters?.CallSid` first, fall back to `activeCall?.sid`
- If `twilioClient.holdCall` / `unholdCall` don't exist yet, Mason needs to add them to the twilioClient service (simple POST to server endpoint)
- Hold should only be available during `callState === 'active'` — disable the button for other states

---

## Summary

| # | Severity | File | Action |
|---|----------|------|--------|
| 1 | CRITICAL | `src/App.jsx` | Add PhoneProvider import + wrap |
| 2 | CRITICAL | `src/components/tabs/crm/settings/PhoneLinesSection.jsx` | CREATE new component |
| 2b | CRITICAL | `src/components/tabs/crm/settings/CRMSettings.jsx` | Add import for PhoneLinesSection |
| 3 | HIGH | `src/components/shared/CallControls.jsx` | Add Hold button + state + handler |

**Acceptance Criteria:**
1. App loads without runtime errors from missing PhoneProvider
2. Settings page renders without crash — PhoneLinesSection shows empty state or lines
3. CallControls shows 4 buttons during active call: Mute, Hold, DTMF, End
4. Hold button toggles visually (amber highlight + pulse) and calls twilioClient
