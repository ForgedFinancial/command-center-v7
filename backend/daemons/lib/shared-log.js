/**
 * SHARED-LOG.md writer
 */
const fs = require('fs');

const LOG_FILE = '/home/clawd/.openclaw/workspace/SHARED-LOG.md';

/**
 * Extract clean text from raw openclaw agent JSON output.
 * Strips systemPromptReport, tool schemas, cache stats, etc.
 */
function cleanImpact(raw) {
  if (!raw) return 'See task result';
  try {
    const parsed = JSON.parse(raw);
    const texts = parsed.payloads?.map(p => p.text).filter(Boolean).join('\n');
    if (texts) return texts.slice(0, 1000);
  } catch {
    // Not JSON — use as-is but cap length
  }
  return String(raw).slice(0, 1000) || 'See task result';
}

/**
 * Extract a short summary from raw agent output (for result_summary field).
 */
function extractSummary(raw) {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    const texts = parsed.payloads?.map(p => p.text).filter(Boolean).join('\n');
    if (texts) return texts.slice(0, 200);
  } catch {
    // Not JSON
  }
  return String(raw).slice(0, 200);
}

function appendLog(agent, type, project, { what, why, impact, status, files }) {
  const cleanedImpact = cleanImpact(impact);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const entry = `### [${now}] | ${agent.toUpperCase()} | ${type} | ${project}
**What:** ${what}
**Why:** ${why || 'Task assignment'}
**Impact:** ${cleanedImpact}
**Status:** ${status || 'DONE'}
**Files changed:** ${files || 'N/A'}
---
`;
  try {
    const existing = fs.readFileSync(LOG_FILE, 'utf8');
    fs.writeFileSync(LOG_FILE, entry + '\n' + existing, 'utf8');
  } catch (e) {
    console.error(`[SHARED-LOG] Failed to write: ${e.message}`);
  }
}

module.exports = { appendLog, cleanImpact, extractSummary };
