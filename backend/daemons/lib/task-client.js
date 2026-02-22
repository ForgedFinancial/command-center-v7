/**
 * Task Queue HTTP Client
 */
const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

class TaskClient {
  constructor(apiUrl, apiKey, agentName) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.agentName = agentName;
    this.client = axios.create({
      baseURL: `${apiUrl}/api/comms`,
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      timeout: 15000,
      httpsAgent: agent
    });
  }

  async getTasks(status = 'pending', limit = 1) {
    const { data } = await this.client.get(`/tasks?for=${this.agentName}&status=${status}&limit=${limit}`);
    return data;
  }

  async claimTask(taskId) {
    const { data } = await this.client.post(`/tasks/${taskId}/claim`, { agent: this.agentName });
    return data;
  }

  async updateTask(taskId, updates) {
    const { data } = await this.client.patch(`/tasks/${taskId}`, updates);
    return data;
  }

  async healthCheck() {
    const { data } = await this.client.get('/tasks?limit=1');
    return true;
  }

  /**
   * Advance a pipeline task after daemon completion.
   * Calls POST /api/ops/pipeline/tasks/:opsTaskId/advance
   */
  async advancePipeline(opsTaskId, agentName, action, summary, rejectionNotes) {
    try {
      const opsClient = axios.create({
        baseURL: this.apiUrl,
        headers: { 'x-api-key': this.apiKey, 'Content-Type': 'application/json' },
        timeout: 15000,
        httpsAgent: agent,
      });
      const body = { agent: agentName, action, summary: summary || '' };
      if (rejectionNotes) body.rejection_notes = rejectionNotes;
      const { data } = await opsClient.post(`/api/ops/pipeline/tasks/${opsTaskId}/advance`, body);
      console.log(`[TASK-CLIENT] Pipeline advanced: ${opsTaskId} → ${data.next_stage} (${action})`);
      return data;
    } catch (e) {
      console.error(`[TASK-CLIENT] advancePipeline failed for ${opsTaskId}: ${e.message}`);
      return null;
    }
  }
}

module.exports = TaskClient;
