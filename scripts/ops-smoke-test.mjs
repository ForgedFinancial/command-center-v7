import process from 'node:process'

const BASE_URL = process.env.OPS_BASE_URL || 'https://localhost:3737'
const API_KEY = process.env.SYNC_API_KEY || process.env.CC_API_KEY || ''

if (!API_KEY) {
  console.error('[ops-smoke] Missing SYNC_API_KEY or CC_API_KEY environment variable')
  process.exit(1)
}

if (BASE_URL.startsWith('https://localhost')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(options.headers || {}),
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status} ${path}: ${data.error || 'Unknown error'}`)
  return data
}

async function main() {
  console.log(`[ops-smoke] Base URL: ${BASE_URL}`)

  const created = await request('/api/ops/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: `Ops smoke task ${Date.now()}`,
      description: 'Smoke test task for ops board v2',
      classification: 'FULLSTACK',
      priority: 'medium',
      spec: 'Smoke test spec section',
    }),
  })

  const task = created.task
  console.log(`[ops-smoke] Created: ${task.id}`)

  await request(`/api/ops/tasks/${task.id}/gates/specApproved`, {
    method: 'PUT',
    body: JSON.stringify({ passed: true }),
  })

  await request(`/api/ops/tasks/${task.id}/stage/PLANNING`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'smoke: planning transition' }),
  })
  console.log('[ops-smoke] Moved to PLANNING')

  await request(`/api/ops/tasks/${task.id}/gates/planApproved`, {
    method: 'PUT',
    body: JSON.stringify({ passed: true }),
  })

  await request(`/api/ops/tasks/${task.id}/stage/BUILD`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'smoke: build transition' }),
  })
  console.log('[ops-smoke] Moved to BUILD')

  await request(`/api/ops/tasks/${task.id}/gates/validate`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  console.log('[ops-smoke] Gate validation endpoint OK')

  await request(`/api/ops/tasks/${task.id}/checkpoints`, {
    method: 'POST',
    body: JSON.stringify({ messageCount: 1 }),
  })
  console.log('[ops-smoke] Checkpoint created')

  await request(`/api/ops/tasks/${task.id}`, {
    method: 'DELETE',
  })
  console.log('[ops-smoke] Task archived')

  console.log('[ops-smoke] PASS')
}

main().catch(err => {
  console.error('[ops-smoke] FAIL:', err.message)
  process.exit(1)
})