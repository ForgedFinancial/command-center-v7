// ========================================
// Call Script Panel — Phase 3A
// Context-aware talk tracks that display during active calls
// Variables auto-filled, collapsible UI
// ========================================
import { useState, useEffect } from 'react'
import { usePhone } from '../../../../context/PhoneContext'

const DEFAULT_SCRIPTS = {
  initial_contact: {
    title: 'Initial Contact',
    icon: '📞',
    script: `Hi {{name}}, this is [Your Name] from Forged Financial. I'm reaching out because you recently inquired about life insurance coverage in {{state}}. 

Do you have a quick minute to talk about securing your family's financial future?

[PAUSE FOR RESPONSE]

Great! I see you're looking for about \${{face_amount}} in coverage for your {{carrier}}. Let me ask you a few quick questions to see how we can best help you...`
  },
  follow_up: {
    title: 'Follow-Up',
    icon: '📅',
    script: `Hi {{name}}, this is [Your Name] from Forged Financial calling back as we discussed. 

I wanted to follow up on the life insurance coverage we talked about for your family in {{state}}.

Have you had a chance to think about what we discussed regarding the \${{face_amount}} policy?

[PAUSE FOR RESPONSE]

Perfect! Let me walk you through the next steps...`
  },
  appointment_setting: {
    title: 'Appointment Setting',
    icon: '📋',
    script: `{{name}}, I think we have some great options for you based on what you've told me about your situation in {{state}}.

Rather than trying to go through all the details over the phone, I'd love to schedule a brief 15-minute appointment where I can show you exactly how we can get you that \${{face_amount}} in coverage.

Would tomorrow evening work, or would later this week be better?

[PAUSE FOR RESPONSE]

Excellent! I'm going to send you a calendar invite right now...`
  },
  close_pitch: {
    title: 'Close/Pitch',
    icon: '🎯',
    script: `{{name}}, based on everything you've shared with me, here's what I recommend for your family:

A \${{face_amount}} {{lead_type}} policy with {{carrier}} that will give your family complete peace of mind.

The monthly premium is going to be [AMOUNT] - which breaks down to just [DAILY AMOUNT] per day. 

That's less than what most people spend on coffee to protect your family's entire financial future.

Does this sound like something that makes sense for you and your family?

[PAUSE FOR RESPONSE]`
  },
  objection_handling: {
    title: 'Objection Handling',
    icon: '💭',
    script: `I completely understand your concern, {{name}}. That's actually a very common question I get from families in {{state}}.

Let me ask you this - what's more important to you: saving a few dollars now, or making sure your family never has to worry about money if something happens to you?

[PAUSE FOR RESPONSE]

Here's what I want you to consider... The cost of NOT having this protection is far greater than the small monthly investment we're talking about.

Can we at least get the application started so you have options?`
  }
}

export default function CallScriptPanel({ isVisible = false }) {
  const { callState, callMeta } = usePhone()
  const [selectedScript, setSelectedScript] = useState('initial_contact')
  const [scripts, setScripts] = useState(() => {
    const saved = localStorage.getItem('forgedos_call_scripts')
    return saved ? JSON.parse(saved) : DEFAULT_SCRIPTS
  })
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [customVariables, setCustomVariables] = useState(() => {
    const saved = localStorage.getItem('forgedos_script_variables')
    return saved ? JSON.parse(saved) : {
      name: 'Customer',
      lead_type: 'Life Insurance',
      state: 'IL',
      carrier: 'Carrier Name',
      face_amount: '500K'
    }
  })

  // Auto-save scripts to localStorage
  useEffect(() => {
    localStorage.setItem('forgedos_call_scripts', JSON.stringify(scripts))
  }, [scripts])

  useEffect(() => {
    localStorage.setItem('forgedos_script_variables', JSON.stringify(customVariables))
  }, [customVariables])

  // Auto-fill variables from call meta
  useEffect(() => {
    if (callMeta) {
      setCustomVariables(prev => ({
        ...prev,
        name: callMeta.leadName || prev.name,
        state: callMeta.leadState || prev.state,
      }))
    }
  }, [callMeta])

  // Don't show if no active call or explicitly hidden
  if (callState === 'idle' || !isVisible) return null

  const currentScript = scripts[selectedScript]
  
  // Replace variables in script text
  const fillScript = (text) => {
    let filled = text
    Object.entries(customVariables).forEach(([key, value]) => {
      filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`)
    })
    return filled
  }

  if (isCollapsed) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        background: 'rgba(24,24,27,0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: '8px',
        border: '1px solid rgba(74,222,128,0.3)',
        padding: '8px 12px',
        cursor: 'pointer',
      }}
      onClick={() => setIsCollapsed(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>{currentScript?.icon}</span>
          <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>Scripts</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '380px',
      maxHeight: '70vh',
      zIndex: 1000,
      background: 'rgba(24,24,27,0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: '12px',
      border: '1px solid rgba(74,222,128,0.3)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(74,222,128,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>{currentScript?.icon}</span>
          <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>Call Scripts</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          style={{
            padding: '4px',
            background: 'none',
            border: 'none',
            color: '#71717a',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ➖
        </button>
      </div>

      {/* Script Selector */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        overflowX: 'auto',
      }}>
        {Object.entries(scripts).map(([key, script]) => (
          <button
            key={key}
            onClick={() => setSelectedScript(key)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: selectedScript === key ? '1px solid rgba(74,222,128,0.3)' : '1px solid transparent',
              background: selectedScript === key ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
              color: selectedScript === key ? '#4ade80' : '#a1a1aa',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {script.icon} {script.title}
          </button>
        ))}
      </div>

      {/* Script Content */}
      <div style={{ padding: '16px', maxHeight: '50vh', overflowY: 'auto' }}>
        <div style={{
          fontSize: '13px',
          lineHeight: 1.6,
          color: '#e4e4e7',
          whiteSpace: 'pre-line',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {fillScript(currentScript?.script || '')}
        </div>
      </div>

      {/* Variables Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ fontSize: '10px', color: '#71717a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
          Quick Variables
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {Object.entries(customVariables).slice(0, 4).map(([key, value]) => (
            <input
              key={key}
              type="text"
              value={value}
              onChange={e => setCustomVariables(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={`{{${key}}}`}
              style={{
                padding: '4px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e4e4e7',
                fontSize: '10px',
                outline: 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}