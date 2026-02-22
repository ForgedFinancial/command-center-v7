const express = require('express')

const router = express.Router()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

function bad(res, status, error) {
  return res.status(status).json({ ok: false, error })
}

function safeParseJson(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

function normalizePriority(priority) {
  const p = String(priority || '').toLowerCase()
  if (['urgent', 'high', 'medium', 'low'].includes(p)) return p
  return 'medium'
}

function normalizeTaskFields(data = {}) {
  return {
    name: String(data.name || data.title || 'New Task').slice(0, 120),
    assignee: String(data.assignee || 'Unassigned').slice(0, 80),
    priority: normalizePriority(data.priority),
    dueDate: data.dueDate ? String(data.dueDate) : null,
  }
}

function normalizeChecklistItems(items) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => (typeof item === 'string' ? item : item?.text || ''))
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 20)
}

async function callOpenAiJson(system, user) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!response.ok) {
    const txt = await response.text().catch(() => '')
    throw new Error(`OpenAI request failed (${response.status}): ${txt.slice(0, 300)}`)
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  const parsed = safeParseJson(content)
  if (!parsed) throw new Error('OpenAI returned invalid JSON payload')
  return parsed
}

router.post('/ai-assist', async (req, res) => {
  try {
    const { prompt, type, projectId } = req.body || {}
    if (!prompt || typeof prompt !== 'string') return bad(res, 400, 'prompt is required')
    if (!['task', 'checklist'].includes(type)) return bad(res, 400, 'type must be task or checklist')

    if (!OPENAI_API_KEY) {
      return bad(res, 503, 'OPENAI_API_KEY not configured')
    }

    if (type === 'task') {
      const data = await callOpenAiJson(
        'You generate concise task fields for an insurance operations team. Output JSON object with keys: name, assignee, priority, dueDate. priority must be one of urgent|high|medium|low. dueDate should be ISO date (YYYY-MM-DD) or null.',
        `Project: ${projectId || 'unknown'}\nPrompt: ${prompt}`,
      )

      return res.json({ ok: true, fields: normalizeTaskFields(data) })
    }

    const data = await callOpenAiJson(
      'You generate practical checklist steps for insurance/project operations. Output JSON object with key items as an array of short action strings.',
      `Project: ${projectId || 'unknown'}\nPrompt: ${prompt}`,
    )

    const items = normalizeChecklistItems(data.items)
    return res.json({ ok: true, items })
  } catch (err) {
    console.error('[projects/ai-assist] error:', err.message)
    return bad(res, 500, err.message || 'AI assist failed')
  }
})

module.exports = router
