/**
 * Stand-Up Room poster
 */
const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

async function postStandup(apiUrl, apiKey, from, message) {
  try {
    await axios.post(`${apiUrl}/api/comms/send`, {
      from,
      to: 'standup',
      topic: 'standup',
      message
    }, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      timeout: 10000,
      httpsAgent: agent
    });
  } catch (e) {
    console.error(`[STANDUP] Failed to post: ${e.message}`);
  }
}

async function broadcastTransition(apiUrl, apiKey, { taskName, fromStage, toStage, fromAgent, toAgent, action, summary, flags, taskId, rejectionCount }) {
  const msg = [
    `📋 PIPELINE UPDATE — ${taskName}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Stage: ${fromStage} → ${toStage}`,
    `Handler: ${fromAgent} → ${toAgent}`,
    `Action: ${action}`,
    summary ? `Summary: ${summary}` : null,
    flags ? `Flags: ${flags}` : null,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Task ID: ${taskId} | Rejection cycles: ${rejectionCount || 0}`
  ].filter(Boolean).join('\n');

  await postStandup(apiUrl, apiKey, 'system', msg);
}

module.exports = { postStandup, broadcastTransition };
