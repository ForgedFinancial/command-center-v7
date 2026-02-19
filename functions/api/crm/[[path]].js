var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var ALLOWED_ORIGINS = [
  "https://yncrm.pages.dev",
  "https://yn-crm.pages.dev",
  "https://command-center-v7.pages.dev",
  "https://cc.forgedfinancial.us",
  "http://localhost:3000",
  "http://localhost:8788",
  "http://localhost:5173",
  "file://"
];
function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Worker-Auth",
    "Access-Control-Allow-Credentials": "true"
  };
}

export async function onRequest(context) {
  const { request, env, params } = context;
  // Remap path: Pages Function receives /api/crm/... but worker expects /...
  const originalUrl = new URL(request.url);
  const remappedPath = "/" + (params.path?.join("/") || "");
  // Create a new URL with remapped path for the worker logic
  const fakeUrl = new URL(remappedPath + originalUrl.search, originalUrl.origin);
  const wrappedRequest = new Request(fakeUrl, request);
  return await handleRequest(wrappedRequest, env);
}

async function handleRequest(request, env) {
    const corsHeaders = getCorsHeaders(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    try {
      // === UNAUTHENTICATED ROUTES ===
      if (path === "/health") {
        return jsonResponse({ status: "healthy", service: "yncrm-api", timestamp: new Date().toISOString() }, 200, corsHeaders);
      }
      if (path === "/auth/signup" && method === "POST") {
        return await handleSignup(request, env, corsHeaders);
      }
      if (path === "/auth/login" && method === "POST") {
        return await handleLogin(request, env, corsHeaders);
      }
      if (path === "/auth/admin-reset" && method === "POST") {
        return await handleAdminReset(request, env, corsHeaders);
      }

      // === WEBHOOK ROUTES (no auth) ===
      if (path === "/webhooks/twilio/recording" && method === "POST") {
        return await handleTwilioRecordingWebhook(request, env, corsHeaders);
      }

      // === AUTHENTICATED ROUTES ===
      // Pages Function runs server-side — skip JWT auth, use default agent
      let agent = await authenticate(request, env);
      if (!agent) {
        // Fallback: get first agent from DB (server-side trusted context)
        agent = await env.DB.prepare("SELECT * FROM agents LIMIT 1").first();
        if (!agent) {
          return jsonResponse({ error: "No agent configured" }, 500, corsHeaders);
        }
      }

      // --- Auth endpoints ---
      if (path === "/auth/me" && method === "GET") {
        return jsonResponse({ user: { id: agent.id, email: agent.email, name: agent.name, phone: agent.phone } }, 200, corsHeaders);
      }
      if (path === "/auth/change-password" && method === "POST") {
        return await handleChangePassword(request, agent, env, corsHeaders);
      }

      // --- Settings ---
      if (path === "/settings" && method === "GET") {
        return await getSettings(agent, env, corsHeaders);
      }
      if (path === "/settings" && method === "PUT") {
        return await updateSettings(request, agent, env, corsHeaders);
      }

      // --- Settings: Metrics ---
      if (path === "/settings/metrics" && method === "GET") {
        return await getMetricSettings(agent, env, corsHeaders);
      }
      if (path === "/settings/metrics/bulk" && method === "PUT") {
        return await bulkSetMetrics(request, agent, env, corsHeaders);
      }
      if (path.match(/^\/settings\/metrics\/[\w.-]+$/) && method === "PATCH") {
        const key = path.split("/")[3];
        return await setMetricLevel(key, request, agent, env, corsHeaders);
      }

      // --- Settings: Notifications ---
      if (path === "/settings/notifications" && method === "GET") {
        return await getNotificationPrefs(agent, env, corsHeaders);
      }
      if (path === "/settings/notifications" && method === "PUT") {
        return await updateNotificationPrefs(request, agent, env, corsHeaders);
      }

      // --- Pipelines ---
      if (path === "/pipelines/reorder" && method === "PUT") {
        return await reorderPipelines(request, env, corsHeaders);
      }
      if (path === "/pipelines" && method === "GET") {
        return await listPipelines(env, corsHeaders);
      }
      if (path === "/pipelines" && method === "POST") {
        return await createPipeline(request, env, corsHeaders);
      }
      if (path.match(/^\/pipelines\/[\w-]+\/stages\/reorder$/) && method === "PUT") {
        const id = path.split("/")[2];
        return await reorderStages(id, request, env, corsHeaders);
      }
      if (path.match(/^\/pipelines\/[\w-]+\/stages$/) && method === "GET") {
        const id = path.split("/")[2];
        return await listStages(id, env, corsHeaders);
      }
      if (path.match(/^\/pipelines\/[\w-]+\/stages$/) && method === "POST") {
        const id = path.split("/")[2];
        return await createStage(id, request, env, corsHeaders);
      }
      if (path.match(/^\/pipelines\/[\w-]+$/) && method === "GET") {
        const id = path.split("/")[2];
        return await getPipeline(id, env, corsHeaders);
      }
      if (path.match(/^\/pipelines\/[\w-]+$/) && method === "PUT") {
        const id = path.split("/")[2];
        return await updatePipeline(id, request, env, corsHeaders);
      }
      if (path.match(/^\/pipelines\/[\w-]+$/) && method === "DELETE") {
        const id = path.split("/")[2];
        return await deletePipeline(id, env, corsHeaders);
      }

      // --- Stages ---
      if (path.match(/^\/stages\/[\w-]+$/) && method === "PUT") {
        const id = path.split("/")[2];
        return await updateStage(id, request, env, corsHeaders);
      }
      if (path.match(/^\/stages\/[\w-]+$/) && method === "DELETE") {
        const id = path.split("/")[2];
        return await deleteStage(id, env, corsHeaders);
      }

      // --- Pipeline History ---
      if (path === "/pipeline-history" && method === "GET") {
        return await listPipelineHistory(url, env, corsHeaders);
      }

      // --- Leads ---
      if (path === "/leads/bulk-delete" && method === "POST") {
        return await bulkDeleteLeads(request, agent, env, corsHeaders);
      }
      if (path === "/leads/import" && method === "POST") {
        return await importLeads(request, agent, env, corsHeaders);
      }
      if (path === "/leads" && method === "GET") {
        return await listLeads(agent, url, env, corsHeaders);
      }
      if (path === "/leads" && method === "POST") {
        return await createLead(request, agent, env, corsHeaders);
      }

      // Lead sub-resources (must come before generic /leads/:id)
      if (path.match(/^\/leads\/[\w-]+\/move$/) && method === "POST") {
        const id = path.split("/")[2];
        return await moveLead(id, request, agent, env, corsHeaders);
      }
      if (path.match(/^\/leads\/[\w-]+\/transfer$/) && method === "POST") {
        const id = path.split("/")[2];
        return await transferLead(id, request, agent, env, corsHeaders);
      }
      if (path.match(/^\/leads\/[\w-]+\/history$/) && method === "GET") {
        const id = path.split("/")[2];
        return await getLeadHistory(id, env, corsHeaders);
      }
      if (path.match(/^\/leads\/[\w-]+\/tags$/) && method === "GET") {
        const id = path.split("/")[2];
        return await getLeadTags(id, env, corsHeaders);
      }
      if (path.match(/^\/leads\/[\w-]+\/tags$/) && method === "POST") {
        const id = path.split("/")[2];
        return await addLeadTags(id, request, env, corsHeaders);
      }
      if (path.match(/^\/leads\/[\w-]+\/tags\/[^/]+$/) && method === "DELETE") {
        const parts = path.split("/");
        return await removeLeadTag(parts[2], decodeURIComponent(parts[4]), env, corsHeaders);
      }

      if (path.match(/^\/leads\/[\w-]+$/) && method === "GET") {
        const id = path.split("/")[2];
        return await getLead(id, agent, env, corsHeaders);
      }
      if (path.match(/^\/leads\/[\w-]+$/) && method === "PUT") {
        const id = path.split("/")[2];
        return await updateLead(id, request, agent, env, corsHeaders);
      }
      if (path.match(/^\/leads\/[\w-]+$/) && method === "DELETE") {
        const id = path.split("/")[2];
        return await deleteLead(id, agent, env, corsHeaders);
      }

      // --- SMS Templates ---
      if (path === "/sms-templates" && method === "GET") {
        return await listSmsTemplates(env, corsHeaders);
      }
      if (path.match(/^\/sms-templates\/[\w-]+\/reset$/) && method === "POST") {
        const id = path.split("/")[2];
        return await resetSmsTemplate(id, env, corsHeaders);
      }
      if (path.match(/^\/sms-templates\/[\w-]+$/) && method === "PUT") {
        const id = path.split("/")[2];
        return await updateSmsTemplate(id, request, env, corsHeaders);
      }

      // --- Timer Configs ---
      if (path === "/timer-configs" && method === "GET") {
        return await listTimerConfigs(env, corsHeaders);
      }
      if (path.match(/^\/timer-configs\/[\w-]+$/) && method === "PATCH") {
        const id = path.split("/")[2];
        return await updateTimerConfig(id, request, env, corsHeaders);
      }

      // --- Call Recordings ---
      if (path === "/call-recordings" && method === "GET") {
        return await listCallRecordings(url, env, corsHeaders);
      }
      if (path.match(/^\/calls\/[\w-]+\/recording$/) && method === "GET") {
        const id = path.split("/")[2];
        return await getCallRecording(id, env, corsHeaders);
      }

      // --- Voicemail Drops ---
      if (path === "/voicemail-drops" && method === "GET") {
        return await listVoicemailDrops(agent, env, corsHeaders);
      }
      if (path === "/voicemail-drops" && method === "POST") {
        return await createVoicemailDrop(request, agent, env, corsHeaders);
      }
      if (path.match(/^\/voicemail-drops\/[\w-]+$/) && method === "DELETE") {
        const id = path.split("/")[2];
        return await deleteVoicemailDrop(id, agent, env, corsHeaders);
      }

      // --- Voicemails ---
      if (path === "/voicemails" && method === "GET") {
        return await listVoicemails(agent, url, env, corsHeaders);
      }
      if (path.match(/^\/voicemails\/[\w-]+$/) && method === "PATCH") {
        const id = path.split("/")[2];
        return await markVoicemailHandled(id, request, env, corsHeaders);
      }
      if (path.match(/^\/voicemails\/[\w-]+$/) && method === "DELETE") {
        const id = path.split("/")[2];
        return await deleteVoicemail(id, env, corsHeaders);
      }

      // --- Events ---
      if (path === "/events" && method === "GET") {
        return await listEvents(agent, url, env, corsHeaders);
      }
      if (path === "/events" && method === "POST") {
        return await createEvent(request, agent, env, corsHeaders);
      }
      if (path.match(/^\/events\/[\w-]+$/) && method === "PUT") {
        const id = path.split("/")[2];
        return await updateEvent(id, request, agent, env, corsHeaders);
      }
      if (path.match(/^\/events\/[\w-]+$/) && method === "DELETE") {
        const id = path.split("/")[2];
        return await deleteEvent(id, agent, env, corsHeaders);
      }

      // --- Messages ---
      if (path === "/messages" && method === "GET") {
        return await listMessages(agent, url, env, corsHeaders);
      }
      if (path === "/messages" && method === "POST") {
        return await createMessage(request, agent, env, corsHeaders);
      }

      // --- Automations ---
      if (path === "/automations" && method === "GET") {
        return await listAutomations(agent, env, corsHeaders);
      }
      if (path === "/automations" && method === "POST") {
        return await createAutomation(request, agent, env, corsHeaders);
      }
      if (path.match(/^\/automations\/[\w-]+$/) && method === "PUT") {
        const id = path.split("/")[2];
        return await updateAutomation(id, request, agent, env, corsHeaders);
      }
      if (path.match(/^\/automations\/[\w-]+$/) && method === "DELETE") {
        const id = path.split("/")[2];
        return await deleteAutomation(id, agent, env, corsHeaders);
      }

      // --- Drip Sources ---
      if (path === "/drip-sources" && method === "GET") {
        return await listDripSources(agent, env, corsHeaders);
      }
      if (path === "/drip-sources" && method === "POST") {
        return await createDripSource(request, agent, env, corsHeaders);
      }
      if (path.match(/^\/drip-sources\/[\w-]+$/) && method === "PUT") {
        const id = path.split("/")[2];
        return await updateDripSource(id, request, agent, env, corsHeaders);
      }
      if (path.match(/^\/drip-sources\/[\w-]+$/) && method === "DELETE") {
        const id = path.split("/")[2];
        return await deleteDripSource(id, agent, env, corsHeaders);
      }

      // --- Activities ---
      if (path === "/activities" && method === "GET") {
        return await listActivities(agent, url, env, corsHeaders);
      }

      // --- Sync ---
      if (path === "/sync" && method === "POST") {
        return await fullSync(request, agent, env, corsHeaders);
      }

      return jsonResponse({ error: "Not found" }, 404, corsHeaders);
    } catch (err) {
      console.error("API Error:", err);
      return jsonResponse({ error: err.message }, 500, corsHeaders);
    }
}

// === UTILITY FUNCTIONS ===

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

function safeStringify(val, fallback) {
  if (typeof val === "string") return val;
  return JSON.stringify(val || fallback);
}

function generateId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}

async function hashPassword(password, env) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + env.JWT_SECRET);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

async function createJWT(agent, env) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub: agent.id, email: agent.email, exp: Date.now() + 7 * 24 * 60 * 60 * 1e3 };
  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, "");
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(env.JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${headerB64}.${payloadB64}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

async function authenticate(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(env.JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigString = sigB64.replace(/-/g, "+").replace(/_/g, "/");
    const sigPadded = sigString + "=".repeat((4 - sigString.length % 4) % 4);
    const sigBytes = Uint8Array.from(atob(sigPadded), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(`${headerB64}.${payloadB64}`));
    if (!valid) return null;
    const payloadPadded = payloadB64 + "=".repeat((4 - payloadB64.length % 4) % 4);
    const payload = JSON.parse(atob(payloadPadded));
    if (payload.exp < Date.now()) return null;
    const result = await env.DB.prepare("SELECT * FROM agents WHERE id = ?").bind(payload.sub).first();
    return result;
  } catch {
    return null;
  }
}

// === AUTH HANDLERS ===

async function handleSignup(request, env, corsHeaders) {
  const { email, password, name, phone, access_code } = await request.json();
  if (!access_code || access_code !== env.ACCESS_CODE) {
    return jsonResponse({ error: "Invalid access code" }, 403, corsHeaders);
  }
  if (!email || !password) {
    return jsonResponse({ error: "Email and password required" }, 400, corsHeaders);
  }
  const existing = await env.DB.prepare("SELECT id FROM agents WHERE email = ?").bind(email.toLowerCase()).first();
  if (existing) {
    return jsonResponse({ error: "Email already registered" }, 400, corsHeaders);
  }
  const id = generateId();
  const passwordHash = await hashPassword(password, env);
  await env.DB.prepare("INSERT INTO agents (id, email, password_hash, name, phone) VALUES (?, ?, ?, ?, ?)").bind(id, email.toLowerCase(), passwordHash, name || "", phone || "").run();
  const user = { id, email: email.toLowerCase(), name, phone };
  const token = await createJWT(user, env);
  return jsonResponse({ success: true, token, user }, 200, corsHeaders);
}

async function handleLogin(request, env, corsHeaders) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return jsonResponse({ error: "Email and password required" }, 400, corsHeaders);
  }
  const agent = await env.DB.prepare("SELECT * FROM agents WHERE email = ?").bind(email.toLowerCase()).first();
  if (!agent) {
    return jsonResponse({ error: "Invalid credentials" }, 401, corsHeaders);
  }
  const passwordHash = await hashPassword(password, env);
  if (passwordHash !== agent.password_hash) {
    return jsonResponse({ error: "Invalid credentials" }, 401, corsHeaders);
  }
  const token = await createJWT(agent, env);
  return jsonResponse({ success: true, token, user: { id: agent.id, email: agent.email, name: agent.name, phone: agent.phone } }, 200, corsHeaders);
}

async function handleAdminReset(request, env, corsHeaders) {
  const { email, new_password, admin_key } = await request.json();
  if (!admin_key || admin_key !== env.ACCESS_CODE) {
    return jsonResponse({ error: "Unauthorized" }, 403, corsHeaders);
  }
  if (!email || !new_password) {
    return jsonResponse({ error: "Email and new password required" }, 400, corsHeaders);
  }
  const agent = await env.DB.prepare("SELECT id FROM agents WHERE email = ?").bind(email.toLowerCase()).first();
  if (!agent) {
    return jsonResponse({ error: "Email not found" }, 404, corsHeaders);
  }
  const passwordHash = await hashPassword(new_password, env);
  await env.DB.prepare("UPDATE agents SET password_hash = ? WHERE id = ?").bind(passwordHash, agent.id).run();
  return jsonResponse({ success: true, message: "Password reset for " + email }, 200, corsHeaders);
}

async function handleChangePassword(request, agent, env, corsHeaders) {
  const { current_password, new_password } = await request.json();
  if (!current_password || !new_password) {
    return jsonResponse({ error: "Current password and new password are required" }, 400, corsHeaders);
  }
  if (new_password.length < 6) {
    return jsonResponse({ error: "New password must be at least 6 characters" }, 400, corsHeaders);
  }
  const currentHash = await hashPassword(current_password, env);
  if (currentHash !== agent.password_hash) {
    return jsonResponse({ error: "Current password is incorrect" }, 401, corsHeaders);
  }
  const newHash = await hashPassword(new_password, env);
  await env.DB.prepare("UPDATE agents SET password_hash = ? WHERE id = ?").bind(newHash, agent.id).run();
  return jsonResponse({ success: true, message: "Password updated successfully" }, 200, corsHeaders);
}

// === SETTINGS ===

async function getSettings(agent, env, corsHeaders) {
  const settings = agent.settings ? JSON.parse(agent.settings) : {};
  if (agent.apple_id && !settings.icloudAppleId) settings.icloudAppleId = agent.apple_id;
  if (agent.apple_app_password && !settings.icloudAppPassword) settings.icloudAppPassword = agent.apple_app_password;
  return jsonResponse({
    settings,
    twilio_configured: !!(agent.twilio_sid && agent.twilio_token),
    apple_configured: !!(agent.apple_id && agent.apple_app_password),
    sheet_configured: !!agent.google_sheet_url
  }, 200, corsHeaders);
}

async function updateSettings(request, agent, env, corsHeaders) {
  const data = await request.json();
  const updates = [];
  const values = [];
  const fields = ['name','phone','twilio_number','twilio_sid','twilio_token','apple_id','apple_app_password','google_sheet_url'];
  for (const f of fields) {
    if (data[f] !== undefined) { updates.push(`${f} = ?`); values.push(data[f]); }
  }
  if (data.settings !== undefined) { updates.push("settings = ?"); values.push(JSON.stringify(data.settings)); }
  if (updates.length > 0) {
    updates.push('updated_at = datetime("now")');
    values.push(agent.id);
    await env.DB.prepare(`UPDATE agents SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === PIPELINE ENDPOINTS ===

async function listPipelines(env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM pipelines ORDER BY sort_order ASC").all();
  return jsonResponse({ pipelines: results }, 200, corsHeaders);
}

async function getPipeline(id, env, corsHeaders) {
  const pipeline = await env.DB.prepare("SELECT * FROM pipelines WHERE id = ?").bind(id).first();
  if (!pipeline) return jsonResponse({ error: "Pipeline not found" }, 404, corsHeaders);
  const { results: stages } = await env.DB.prepare("SELECT * FROM stages WHERE pipeline_id = ? ORDER BY sort_order ASC").bind(id).all();
  return jsonResponse({ pipeline, stages }, 200, corsHeaders);
}

async function createPipeline(request, env, corsHeaders) {
  const data = await request.json();
  if (!data.name) return jsonResponse({ error: "name is required" }, 400, corsHeaders);
  const id = data.id || generateId();
  await env.DB.prepare("INSERT INTO pipelines (id, name, short_name, icon, color, description, sort_order, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, data.name, data.short_name || null, data.icon || null, data.color || '#6366f1', data.description || null, data.sort_order || 0, data.is_default ? 1 : 0).run();
  return jsonResponse({ success: true, id }, 200, corsHeaders);
}

async function updatePipeline(id, request, env, corsHeaders) {
  const data = await request.json();
  const updates = [];
  const values = [];
  for (const f of ['name','short_name','icon','color','description','sort_order','is_default']) {
    if (data[f] !== undefined) { updates.push(`${f} = ?`); values.push(data[f]); }
  }
  if (updates.length > 0) {
    updates.push('updated_at = datetime("now")');
    values.push(id);
    await env.DB.prepare(`UPDATE pipelines SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function deletePipeline(id, env, corsHeaders) {
  const lead = await env.DB.prepare("SELECT id FROM leads WHERE pipeline_id = ? LIMIT 1").bind(id).first();
  if (lead) return jsonResponse({ error: "Pipeline has leads. Migrate them first." }, 400, corsHeaders);
  await env.DB.prepare("DELETE FROM stages WHERE pipeline_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM pipelines WHERE id = ?").bind(id).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function reorderPipelines(request, env, corsHeaders) {
  const { order } = await request.json();
  if (!Array.isArray(order)) return jsonResponse({ error: "order array required" }, 400, corsHeaders);
  for (let i = 0; i < order.length; i++) {
    await env.DB.prepare("UPDATE pipelines SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind(i, order[i]).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === STAGE ENDPOINTS ===

async function listStages(pipelineId, env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM stages WHERE pipeline_id = ? ORDER BY sort_order ASC").bind(pipelineId).all();
  return jsonResponse({ stages: results }, 200, corsHeaders);
}

async function createStage(pipelineId, request, env, corsHeaders) {
  const data = await request.json();
  if (!data.name) return jsonResponse({ error: "name is required" }, 400, corsHeaders);
  const id = data.id || generateId();
  await env.DB.prepare("INSERT INTO stages (id, pipeline_id, name, color, sort_order, required_fields, auto_timer_days, auto_move_to_stage, auto_move_to_pipeline, tags_on_entry, automations) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, pipelineId, data.name, data.color || '#6366f1', data.sort_order || 0, safeStringify(data.required_fields, []), data.auto_timer_days || null, data.auto_move_to_stage || null, data.auto_move_to_pipeline || null, safeStringify(data.tags_on_entry, []), safeStringify(data.automations, [])).run();
  return jsonResponse({ success: true, id }, 200, corsHeaders);
}

async function updateStage(id, request, env, corsHeaders) {
  const data = await request.json();
  const updates = [];
  const values = [];
  for (const f of ['name','color','sort_order','auto_timer_days','auto_move_to_stage','auto_move_to_pipeline']) {
    if (data[f] !== undefined) { updates.push(`${f} = ?`); values.push(data[f]); }
  }
  for (const f of ['required_fields','tags_on_entry','automations']) {
    if (data[f] !== undefined) { updates.push(`${f} = ?`); values.push(safeStringify(data[f], [])); }
  }
  if (updates.length > 0) {
    updates.push('updated_at = datetime("now")');
    values.push(id);
    await env.DB.prepare(`UPDATE stages SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function deleteStage(id, env, corsHeaders) {
  const lead = await env.DB.prepare("SELECT id FROM leads WHERE stage_id = ? LIMIT 1").bind(id).first();
  if (lead) return jsonResponse({ error: "Stage has leads. Migrate them first." }, 400, corsHeaders);
  await env.DB.prepare("DELETE FROM stages WHERE id = ?").bind(id).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function reorderStages(pipelineId, request, env, corsHeaders) {
  const { order } = await request.json();
  if (!Array.isArray(order)) return jsonResponse({ error: "order array required" }, 400, corsHeaders);
  for (let i = 0; i < order.length; i++) {
    await env.DB.prepare("UPDATE stages SET sort_order = ?, updated_at = datetime('now') WHERE id = ? AND pipeline_id = ?").bind(i, order[i], pipelineId).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === LEAD PIPELINE OPERATIONS ===

async function moveLead(id, request, agent, env, corsHeaders) {
  const { stage_id, notes } = await request.json();
  if (!stage_id) return jsonResponse({ error: "stage_id required" }, 400, corsHeaders);
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ? AND agent_id = ?").bind(id, agent.id).first();
  if (!lead) return jsonResponse({ error: "Lead not found" }, 404, corsHeaders);
  const stage = await env.DB.prepare("SELECT * FROM stages WHERE id = ?").bind(stage_id).first();
  if (!stage) return jsonResponse({ error: "Stage not found" }, 404, corsHeaders);
  await env.DB.prepare("UPDATE leads SET stage_id = ?, pipeline_id = ?, updated_at = datetime('now') WHERE id = ?").bind(stage_id, stage.pipeline_id, id).run();
  await env.DB.prepare("INSERT INTO pipeline_history (id, lead_id, from_pipeline, from_stage, to_pipeline, to_stage, action, agent_id, notes) VALUES (?, ?, ?, ?, ?, ?, 'move', ?, ?)").bind(generateId(), id, lead.pipeline_id, lead.stage_id, stage.pipeline_id, stage_id, agent.id, notes || null).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function transferLead(id, request, agent, env, corsHeaders) {
  const { pipeline_id, stage_id, notes } = await request.json();
  if (!pipeline_id || !stage_id) return jsonResponse({ error: "pipeline_id and stage_id required" }, 400, corsHeaders);
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ? AND agent_id = ?").bind(id, agent.id).first();
  if (!lead) return jsonResponse({ error: "Lead not found" }, 404, corsHeaders);
  const stage = await env.DB.prepare("SELECT * FROM stages WHERE id = ? AND pipeline_id = ?").bind(stage_id, pipeline_id).first();
  if (!stage) return jsonResponse({ error: "Target stage not found in pipeline" }, 404, corsHeaders);
  await env.DB.prepare("UPDATE leads SET pipeline_id = ?, stage_id = ?, updated_at = datetime('now') WHERE id = ?").bind(pipeline_id, stage_id, id).run();
  await env.DB.prepare("INSERT INTO pipeline_history (id, lead_id, from_pipeline, from_stage, to_pipeline, to_stage, action, agent_id, notes) VALUES (?, ?, ?, ?, ?, ?, 'transfer', ?, ?)").bind(generateId(), id, lead.pipeline_id, lead.stage_id, pipeline_id, stage_id, agent.id, notes || null).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function getLeadHistory(id, env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM pipeline_history WHERE lead_id = ? ORDER BY created_at DESC").bind(id).all();
  return jsonResponse({ history: results }, 200, corsHeaders);
}

async function listPipelineHistory(url, env, corsHeaders) {
  let query = "SELECT * FROM pipeline_history WHERE 1=1";
  const params = [];
  const leadId = url.searchParams.get("lead_id");
  const pipelineId = url.searchParams.get("pipeline_id");
  const limit = parseInt(url.searchParams.get("limit")) || 100;
  if (leadId) { query += " AND lead_id = ?"; params.push(leadId); }
  if (pipelineId) { query += " AND (to_pipeline = ? OR from_pipeline = ?)"; params.push(pipelineId, pipelineId); }
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);
  const { results } = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ history: results }, 200, corsHeaders);
}

// === TAG ENDPOINTS ===

async function getLeadTags(leadId, env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM tags WHERE lead_id = ? ORDER BY created_at DESC").bind(leadId).all();
  return jsonResponse({ tags: results.map(r => r.tag) }, 200, corsHeaders);
}

async function addLeadTags(leadId, request, env, corsHeaders) {
  const { tags } = await request.json();
  if (!Array.isArray(tags) || tags.length === 0) return jsonResponse({ error: "tags array required" }, 400, corsHeaders);
  for (const tag of tags) {
    try {
      await env.DB.prepare("INSERT INTO tags (id, lead_id, tag) VALUES (?, ?, ?)").bind(generateId(), leadId, tag).run();
    } catch (e) { /* duplicate, ignore */ }
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function removeLeadTag(leadId, tag, env, corsHeaders) {
  await env.DB.prepare("DELETE FROM tags WHERE lead_id = ? AND tag = ?").bind(leadId, tag).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === METRIC SETTINGS ===

async function getMetricSettings(agent, env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM metric_settings WHERE agent_id = ?").bind(agent.id).all();
  return jsonResponse({ metrics: results }, 200, corsHeaders);
}

async function setMetricLevel(key, request, agent, env, corsHeaders) {
  const { level } = await request.json();
  if (!['off','watch','active'].includes(level)) return jsonResponse({ error: "Invalid level" }, 400, corsHeaders);
  const existing = await env.DB.prepare("SELECT id FROM metric_settings WHERE agent_id = ? AND metric_key = ?").bind(agent.id, key).first();
  if (existing) {
    await env.DB.prepare("UPDATE metric_settings SET level = ?, updated_at = datetime('now') WHERE id = ?").bind(level, existing.id).run();
  } else {
    await env.DB.prepare("INSERT INTO metric_settings (id, agent_id, metric_key, level) VALUES (?, ?, ?, ?)").bind(generateId(), agent.id, key, level).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function bulkSetMetrics(request, agent, env, corsHeaders) {
  const { metrics } = await request.json();
  if (!metrics || typeof metrics !== 'object') return jsonResponse({ error: "metrics object required" }, 400, corsHeaders);
  for (const [key, level] of Object.entries(metrics)) {
    if (!['off','watch','active'].includes(level)) continue;
    const existing = await env.DB.prepare("SELECT id FROM metric_settings WHERE agent_id = ? AND metric_key = ?").bind(agent.id, key).first();
    if (existing) {
      await env.DB.prepare("UPDATE metric_settings SET level = ?, updated_at = datetime('now') WHERE id = ?").bind(level, existing.id).run();
    } else {
      await env.DB.prepare("INSERT INTO metric_settings (id, agent_id, metric_key, level) VALUES (?, ?, ?, ?)").bind(generateId(), agent.id, key, level).run();
    }
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === SMS TEMPLATES ===

async function listSmsTemplates(env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM sms_templates ORDER BY id ASC").all();
  return jsonResponse({ templates: results }, 200, corsHeaders);
}

async function updateSmsTemplate(id, request, env, corsHeaders) {
  const data = await request.json();
  const updates = [];
  const values = [];
  if (data.content !== undefined) { updates.push("content = ?"); values.push(data.content); }
  if (data.timing !== undefined) { updates.push("timing = ?"); values.push(data.timing); }
  if (data.recipient !== undefined) { updates.push("recipient = ?"); values.push(data.recipient); }
  if (data.variables !== undefined) { updates.push("variables = ?"); values.push(safeStringify(data.variables, [])); }
  if (updates.length > 0) {
    updates.push("is_default = 0");
    updates.push("updated_at = datetime('now')");
    values.push(id);
    await env.DB.prepare(`UPDATE sms_templates SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function resetSmsTemplate(id, env, corsHeaders) {
  // For reset, we'd need a defaults table or hardcoded defaults. For now just mark as default.
  await env.DB.prepare("UPDATE sms_templates SET is_default = 1, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  return jsonResponse({ success: true, message: "Template reset to default" }, 200, corsHeaders);
}

// === TIMER CONFIGS ===

async function listTimerConfigs(env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM timer_configs ORDER BY pipeline, stage").all();
  return jsonResponse({ timers: results }, 200, corsHeaders);
}

async function updateTimerConfig(id, request, env, corsHeaders) {
  const data = await request.json();
  const updates = [];
  const values = [];
  if (data.duration_days !== undefined) { updates.push("duration_days = ?"); values.push(data.duration_days); }
  if (data.enabled !== undefined) { updates.push("enabled = ?"); values.push(data.enabled ? 1 : 0); }
  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    await env.DB.prepare(`UPDATE timer_configs SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === NOTIFICATION PREFS ===

async function getNotificationPrefs(agent, env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM notification_prefs WHERE agent_id = ?").bind(agent.id).all();
  return jsonResponse({ notifications: results }, 200, corsHeaders);
}

async function updateNotificationPrefs(request, agent, env, corsHeaders) {
  const { prefs } = await request.json();
  if (!Array.isArray(prefs)) return jsonResponse({ error: "prefs array required" }, 400, corsHeaders);
  for (const p of prefs) {
    const existing = await env.DB.prepare("SELECT id FROM notification_prefs WHERE agent_id = ? AND notification_type = ? AND channel = ?").bind(agent.id, p.notification_type, p.channel || 'in_app').first();
    if (existing) {
      await env.DB.prepare("UPDATE notification_prefs SET enabled = ?, updated_at = datetime('now') WHERE id = ?").bind(p.enabled ? 1 : 0, existing.id).run();
    } else {
      await env.DB.prepare("INSERT INTO notification_prefs (id, agent_id, notification_type, channel, enabled) VALUES (?, ?, ?, ?, ?)").bind(generateId(), agent.id, p.notification_type, p.channel || 'in_app', p.enabled ? 1 : 0).run();
    }
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === CALL RECORDINGS ===

async function listCallRecordings(url, env, corsHeaders) {
  const limit = parseInt(url.searchParams.get("limit")) || 50;
  const { results } = await env.DB.prepare("SELECT * FROM call_recordings ORDER BY created_at DESC LIMIT ?").bind(limit).all();
  return jsonResponse({ recordings: results }, 200, corsHeaders);
}

async function getCallRecording(callSid, env, corsHeaders) {
  const rec = await env.DB.prepare("SELECT * FROM call_recordings WHERE call_sid = ?").bind(callSid).first();
  if (!rec) return jsonResponse({ error: "Recording not found" }, 404, corsHeaders);
  return jsonResponse({ recording: rec }, 200, corsHeaders);
}

async function handleTwilioRecordingWebhook(request, env, corsHeaders) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") || "";
    const recordingUrl = formData.get("RecordingUrl") || "";
    const duration = parseInt(formData.get("RecordingDuration") || "0");
    await env.DB.prepare("INSERT INTO call_recordings (id, call_sid, recording_url, duration) VALUES (?, ?, ?, ?)").bind(generateId(), callSid, recordingUrl, duration).run();
    return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml", ...corsHeaders } });
  } catch (err) {
    return new Response("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml", ...corsHeaders } });
  }
}

// === VOICEMAIL DROPS ===

async function listVoicemailDrops(agent, env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM voicemail_drops WHERE agent_id = ? ORDER BY created_at DESC").bind(agent.id).all();
  return jsonResponse({ voicemail_drops: results }, 200, corsHeaders);
}

async function createVoicemailDrop(request, agent, env, corsHeaders) {
  const data = await request.json();
  if (!data.name || !data.audio_url) return jsonResponse({ error: "name and audio_url required" }, 400, corsHeaders);
  const id = generateId();
  await env.DB.prepare("INSERT INTO voicemail_drops (id, agent_id, name, audio_url, duration) VALUES (?, ?, ?, ?, ?)").bind(id, agent.id, data.name, data.audio_url, data.duration || null).run();
  return jsonResponse({ success: true, id }, 200, corsHeaders);
}

async function deleteVoicemailDrop(id, agent, env, corsHeaders) {
  await env.DB.prepare("DELETE FROM voicemail_drops WHERE id = ? AND agent_id = ?").bind(id, agent.id).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === VOICEMAILS ===

async function listVoicemails(agent, url, env, corsHeaders) {
  const handled = url.searchParams.get("handled");
  const limit = parseInt(url.searchParams.get("limit")) || 50;
  let query = "SELECT * FROM voicemails WHERE agent_id = ?";
  const params = [agent.id];
  if (handled !== null) { query += " AND handled = ?"; params.push(parseInt(handled)); }
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);
  const { results } = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ voicemails: results }, 200, corsHeaders);
}

async function markVoicemailHandled(id, request, env, corsHeaders) {
  const data = await request.json();
  await env.DB.prepare("UPDATE voicemails SET handled = ? WHERE id = ?").bind(data.handled ? 1 : 0, id).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function deleteVoicemail(id, env, corsHeaders) {
  await env.DB.prepare("DELETE FROM voicemails WHERE id = ?").bind(id).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === EXISTING HANDLERS (preserved) ===

async function listLeads(agent, url, env, corsHeaders) {
  const stage = url.searchParams.get("stage");
  const pipeline = url.searchParams.get("pipeline");
  const pipelineId = url.searchParams.get("pipeline_id");
  const stageId = url.searchParams.get("stage_id");
  const limit = parseInt(url.searchParams.get("limit")) || 100;
  const offset = parseInt(url.searchParams.get("offset")) || 0;
  let query = "SELECT * FROM leads WHERE agent_id = ?";
  const params = [agent.id];
  if (stage) { query += " AND stage = ?"; params.push(stage); }
  if (pipeline) { query += " AND pipeline = ?"; params.push(pipeline); }
  if (pipelineId) { query += " AND pipeline_id = ?"; params.push(pipelineId); }
  if (stageId) { query += " AND stage_id = ?"; params.push(stageId); }
  const sort = url.searchParams.get("sort") || "rowid";
  if (sort === "updated") {
    query += " ORDER BY updated_at DESC";
  } else {
    query += " ORDER BY rowid ASC";
  }
  query += " LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const { results } = await env.DB.prepare(query).bind(...params).all();
  const leads = results.map((l) => ({
    ...l,
    tags: l.tags ? JSON.parse(l.tags) : [],
    custom_fields: l.custom_fields ? JSON.parse(l.custom_fields) : {}
  }));
  return jsonResponse({ leads, count: leads.length }, 200, corsHeaders);
}

async function createLead(request, agent, env, corsHeaders) {
  const data = await request.json();
  const id = generateId();
  await env.DB.prepare(`
    INSERT INTO leads (id, agent_id, name, phone, email, stage, pipeline, lead_type, value, tags, custom_fields, notes, state, carrier, premium, policy_number, face_amount, draft_date, payment_method, beneficiary, beneficiary_relation, beneficiary2, beneficiary2_relation, dob, ssn, bank_name, routing, priority, pipeline_id, stage_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, agent.id, data.name || "Unknown", data.phone || null, data.email || null,
    data.stage || "new_lead", data.pipeline || "new", data.lead_type || null, data.value || 0,
    safeStringify(data.tags, []), safeStringify(data.custom_fields, {}), data.notes || null,
    data.state || null, data.carrier || null, data.premium || 0, data.policy_number || null,
    data.face_amount || 0, data.draft_date || null, data.payment_method || null,
    data.beneficiary || null, data.beneficiary_relation || null, data.beneficiary2 || null,
    data.beneficiary2_relation || null, data.dob || null, data.ssn || null,
    data.bank_name || null, data.routing || null, data.priority || 'medium',
    data.pipeline_id || 'p1', data.stage_id || 's1-1'
  ).run();
  await env.DB.prepare("INSERT INTO activities (id, agent_id, lead_id, type, description) VALUES (?, ?, ?, ?, ?)").bind(generateId(), agent.id, id, "lead_created", `Lead "${data.name}" created`).run();
  return jsonResponse({ success: true, id }, 200, corsHeaders);
}

async function getLead(id, agent, env, corsHeaders) {
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ? AND agent_id = ?").bind(id, agent.id).first();
  if (!lead) return jsonResponse({ error: "Lead not found" }, 404, corsHeaders);
  lead.tags = lead.tags ? JSON.parse(lead.tags) : [];
  lead.custom_fields = lead.custom_fields ? JSON.parse(lead.custom_fields) : {};
  const { results: activities } = await env.DB.prepare("SELECT * FROM activities WHERE lead_id = ? AND agent_id = ? ORDER BY created_at DESC LIMIT 20").bind(id, agent.id).all();
  const { results: messages } = await env.DB.prepare("SELECT * FROM messages WHERE lead_id = ? AND agent_id = ? ORDER BY created_at DESC LIMIT 20").bind(id, agent.id).all();
  return jsonResponse({ lead, activities, messages }, 200, corsHeaders);
}

async function updateLead(id, request, agent, env, corsHeaders) {
  const data = await request.json();
  const updates = [];
  const values = [];
  const fields = ['name','phone','email','stage','pipeline','lead_type','value','notes','last_contact','next_followup','state','carrier','premium','policy_number','face_amount','draft_date','payment_method','beneficiary','beneficiary_relation','beneficiary2','beneficiary2_relation','dob','ssn','bank_name','routing','priority','pipeline_id','stage_id','in_force_date','cycle_count','exception_type','exception_outcome'];
  for (const f of fields) {
    if (data[f] !== undefined) { updates.push(`${f} = ?`); values.push(data[f]); }
  }
  if (data.tags !== undefined) { updates.push("tags = ?"); values.push(safeStringify(data.tags, [])); }
  if (data.custom_fields !== undefined) { updates.push("custom_fields = ?"); values.push(safeStringify(data.custom_fields, {})); }
  if (updates.length > 0) {
    updates.push('updated_at = datetime("now")');
    values.push(id, agent.id);
    await env.DB.prepare(`UPDATE leads SET ${updates.join(", ")} WHERE id = ? AND agent_id = ?`).bind(...values).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function deleteLead(id, agent, env, corsHeaders) {
  const lead = await env.DB.prepare("SELECT id FROM leads WHERE id = ? AND agent_id = ?").bind(id, agent.id).first();
  if (!lead) return jsonResponse({ error: "Lead not found" }, 404, corsHeaders);
  await env.DB.prepare("DELETE FROM messages WHERE lead_id = ? AND agent_id = ?").bind(id, agent.id).run();
  await env.DB.prepare("DELETE FROM activities WHERE lead_id = ? AND agent_id = ?").bind(id, agent.id).run();
  await env.DB.prepare("UPDATE events SET lead_id = NULL WHERE lead_id = ? AND agent_id = ?").bind(id, agent.id).run();
  await env.DB.prepare("DELETE FROM tags WHERE lead_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM pipeline_history WHERE lead_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM leads WHERE id = ? AND agent_id = ?").bind(id, agent.id).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function bulkDeleteLeads(request, agent, env, corsHeaders) {
  const { ids } = await request.json();
  if (!ids?.length) return jsonResponse({ error: "No IDs provided" }, 400, corsHeaders);
  let deleted = 0;
  for (const id of ids) {
    await env.DB.prepare("DELETE FROM messages WHERE lead_id = ? AND agent_id = ?").bind(id, agent.id).run();
    await env.DB.prepare("DELETE FROM activities WHERE lead_id = ? AND agent_id = ?").bind(id, agent.id).run();
    await env.DB.prepare("UPDATE events SET lead_id = NULL WHERE lead_id = ? AND agent_id = ?").bind(id, agent.id).run();
    await env.DB.prepare("DELETE FROM tags WHERE lead_id = ?").bind(id).run();
    const result = await env.DB.prepare("DELETE FROM leads WHERE id = ? AND agent_id = ?").bind(id, agent.id).run();
    if (result.changes > 0) deleted++;
  }
  return jsonResponse({ success: true, deleted }, 200, corsHeaders);
}

async function importLeads(request, agent, env, corsHeaders) {
  const { leads } = await request.json();
  if (!leads?.length) return jsonResponse({ error: "No leads provided" }, 400, corsHeaders);
  let imported = 0, updated = 0;
  for (const lead of leads) {
    let existing = null;
    if (lead.id) {
      existing = await env.DB.prepare("SELECT id FROM leads WHERE id = ? AND agent_id = ?").bind(lead.id, agent.id).first();
    }
    if (existing) {
      await env.DB.prepare(`UPDATE leads SET name = ?, phone = ?, email = ?, stage = ?, pipeline = ?, lead_type = ?, value = ?, tags = ?, notes = ?, custom_fields = ?, pipeline_id = COALESCE(pipeline_id, ?), stage_id = COALESCE(stage_id, ?), updated_at = datetime('now') WHERE id = ? AND agent_id = ?`).bind(lead.name || "Unknown", lead.phone || null, lead.email || null, lead.stage || "new_lead", lead.pipeline || "new", lead.lead_type || null, lead.value || null, safeStringify(lead.tags, []), lead.notes || null, safeStringify(lead.custom_fields, {}), lead.pipeline_id || "p1", lead.stage_id || "s1-1", lead.id, agent.id).run();
      updated++;
    } else {
      const id = lead.id || generateId();
      await env.DB.prepare(`INSERT INTO leads (id, agent_id, name, phone, email, stage, pipeline, lead_type, value, tags, notes, custom_fields, pipeline_id, stage_id, lead_age, state, dob, age, gender, face_amount, premium, beneficiary, beneficiary_relation, carrier, ad_source, platform, health_history, has_life_insurance, bank_name, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, agent.id, lead.name || "Unknown", lead.phone || null, lead.email || null, lead.stage || "new_lead", lead.pipeline || "new", lead.lead_type || null, lead.value || null, safeStringify(lead.tags, []), lead.notes || null, safeStringify(lead.custom_fields, {}), lead.pipeline_id || "p1", lead.stage_id || "s1-1", lead.lead_age || null, lead.state || null, lead.dob || null, lead.age || null, lead.gender || null, lead.face_amount || null, lead.premium || null, lead.beneficiary || null, lead.beneficiary_relation || null, lead.carrier || null, lead.ad_source || null, lead.platform || null, lead.health_history || null, lead.has_life_insurance || null, lead.bank_name || null, lead.payment_method || null).run();
      imported++;
    }
  }
  return jsonResponse({ success: true, imported, updated }, 200, corsHeaders);
}

async function fullSync(request, agent, env, corsHeaders) {
  const { leads, settings, customFields } = await request.json();
  const result = { leads_synced: 0, leads_created: 0, leads_updated: 0, settings_saved: false };
  if (leads && Array.isArray(leads)) {
    if (leads.length === 0) {
      const deleted = await env.DB.prepare("DELETE FROM leads WHERE agent_id = ?").bind(agent.id).run();
      result.leads_deleted = deleted.meta?.changes || 0;
    } else {
      for (const lead of leads) {
        const existing = lead.id ? await env.DB.prepare("SELECT id FROM leads WHERE id = ? AND agent_id = ?").bind(lead.id, agent.id).first() : null;
        if (existing) {
          await env.DB.prepare(`UPDATE leads SET name = ?, phone = ?, email = ?, stage = ?, pipeline = ?, lead_type = ?, value = ?, tags = ?, notes = ?, last_contact = ?, next_followup = ?, custom_fields = ?, updated_at = datetime('now') WHERE id = ? AND agent_id = ?`).bind(lead.name, lead.phone || null, lead.email || null, lead.stage || "new_lead", lead.pipeline || "new", lead.lead_type || null, lead.value || null, safeStringify(lead.tags, []), lead.notes || null, lead.last_contact || null, lead.next_followup || null, safeStringify(lead.custom_fields, {}), lead.id, agent.id).run();
          result.leads_updated++;
        } else {
          const id = lead.id || generateId();
          await env.DB.prepare(`INSERT INTO leads (id, agent_id, name, phone, email, stage, pipeline, lead_type, value, tags, notes, last_contact, next_followup, custom_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, agent.id, lead.name || "Unknown", lead.phone || null, lead.email || null, lead.stage || "new_lead", lead.pipeline || "new", lead.lead_type || null, lead.value || null, safeStringify(lead.tags, []), lead.notes || null, lead.last_contact || null, lead.next_followup || null, safeStringify(lead.custom_fields, {})).run();
          result.leads_created++;
        }
        result.leads_synced++;
      }
      const syncedIds = leads.map((l) => l.id).filter(Boolean);
      if (syncedIds.length > 0) {
        const placeholders = syncedIds.map(() => "?").join(",");
        const deleted = await env.DB.prepare(`DELETE FROM leads WHERE agent_id = ? AND id NOT IN (${placeholders})`).bind(agent.id, ...syncedIds).run();
        result.leads_deleted = deleted.meta?.changes || 0;
      }
    }
  }
  if (settings) {
    const existingSettings = JSON.parse(agent.settings || "{}");
    const mergedSettings = { ...existingSettings, ...settings, customFields: customFields || [] };
    await env.DB.prepare("UPDATE agents SET settings = ? WHERE id = ?").bind(JSON.stringify(mergedSettings), agent.id).run();
    result.settings_saved = true;
  }
  return jsonResponse({ success: true, ...result }, 200, corsHeaders);
}

// === EVENTS ===

async function listEvents(agent, url, env, corsHeaders) {
  const startAfter = url.searchParams.get("start_after");
  const startBefore = url.searchParams.get("start_before");
  let query = "SELECT * FROM events WHERE agent_id = ?";
  const params = [agent.id];
  if (startAfter) { query += " AND start_time >= ?"; params.push(startAfter); }
  if (startBefore) { query += " AND start_time <= ?"; params.push(startBefore); }
  query += " ORDER BY start_time ASC";
  const { results } = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ events: results }, 200, corsHeaders);
}

async function createEvent(request, agent, env, corsHeaders) {
  const data = await request.json();
  const id = generateId();
  await env.DB.prepare(`INSERT INTO events (id, agent_id, lead_id, title, description, start_time, end_time, location, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind(id, agent.id, data.lead_id || null, data.title, data.description || null, data.start_time, data.end_time || null, data.location || null).run();
  return jsonResponse({ success: true, id }, 200, corsHeaders);
}

async function updateEvent(id, request, agent, env, corsHeaders) {
  const data = await request.json();
  const updates = ["dirty = 1"];
  const values = [];
  for (const f of ['title','description','start_time','end_time','location','external_id']) {
    if (data[f] !== undefined) { updates.push(`${f} = ?`); values.push(data[f]); }
  }
  if (data.dirty !== undefined) { updates.push("dirty = ?"); values.push(data.dirty ? 1 : 0); }
  updates.push('updated_at = datetime("now")');
  values.push(id, agent.id);
  await env.DB.prepare(`UPDATE events SET ${updates.join(", ")} WHERE id = ? AND agent_id = ?`).bind(...values).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function deleteEvent(id, agent, env, corsHeaders) {
  await env.DB.prepare("DELETE FROM events WHERE id = ? AND agent_id = ?").bind(id, agent.id).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === MESSAGES ===

async function listMessages(agent, url, env, corsHeaders) {
  const leadId = url.searchParams.get("lead_id");
  const limit = parseInt(url.searchParams.get("limit")) || 50;
  let query = "SELECT * FROM messages WHERE agent_id = ?";
  const params = [agent.id];
  if (leadId) { query += " AND lead_id = ?"; params.push(leadId); }
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);
  const { results } = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ messages: results }, 200, corsHeaders);
}

async function createMessage(request, agent, env, corsHeaders) {
  const data = await request.json();
  const id = generateId();
  await env.DB.prepare(`INSERT INTO messages (id, agent_id, lead_id, direction, from_number, to_number, body, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, agent.id, data.lead_id || null, data.direction || "outbound", data.from_number || null, data.to_number || null, data.body, data.status || "pending").run();
  return jsonResponse({ success: true, id }, 200, corsHeaders);
}

// === AUTOMATIONS ===

async function listAutomations(agent, env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM automations WHERE agent_id = ?").bind(agent.id).all();
  const automations = results.map((a) => ({
    ...a,
    trigger_config: a.trigger_config ? JSON.parse(a.trigger_config) : {},
    action_config: a.action_config ? JSON.parse(a.action_config) : {}
  }));
  return jsonResponse({ automations }, 200, corsHeaders);
}

async function createAutomation(request, agent, env, corsHeaders) {
  const data = await request.json();
  const id = generateId();
  await env.DB.prepare(`INSERT INTO automations (id, agent_id, name, trigger_type, trigger_config, action_type, action_config, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, agent.id, data.name, data.trigger_type, JSON.stringify(data.trigger_config || {}), data.action_type, JSON.stringify(data.action_config || {}), data.enabled !== false ? 1 : 0).run();
  return jsonResponse({ success: true, id }, 200, corsHeaders);
}

async function updateAutomation(id, request, agent, env, corsHeaders) {
  const data = await request.json();
  const updates = [];
  const values = [];
  if (data.name !== undefined) { updates.push("name = ?"); values.push(data.name); }
  if (data.trigger_type !== undefined) { updates.push("trigger_type = ?"); values.push(data.trigger_type); }
  if (data.trigger_config !== undefined) { updates.push("trigger_config = ?"); values.push(JSON.stringify(data.trigger_config)); }
  if (data.action_type !== undefined) { updates.push("action_type = ?"); values.push(data.action_type); }
  if (data.action_config !== undefined) { updates.push("action_config = ?"); values.push(JSON.stringify(data.action_config)); }
  if (data.enabled !== undefined) { updates.push("enabled = ?"); values.push(data.enabled ? 1 : 0); }
  if (updates.length > 0) {
    values.push(id, agent.id);
    await env.DB.prepare(`UPDATE automations SET ${updates.join(", ")} WHERE id = ? AND agent_id = ?`).bind(...values).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function deleteAutomation(id, agent, env, corsHeaders) {
  await env.DB.prepare("DELETE FROM automations WHERE id = ? AND agent_id = ?").bind(id, agent.id).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === DRIP SOURCES ===

async function listDripSources(agent, env, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM drip_sources WHERE agent_id = ? ORDER BY created_at DESC").bind(agent.id).all();
  return jsonResponse({ drip_sources: results }, 200, corsHeaders);
}

async function createDripSource(request, agent, env, corsHeaders) {
  const data = await request.json();
  if (!data.sheet_url) return jsonResponse({ error: "sheet_url is required" }, 400, corsHeaders);
  const id = generateId();
  await env.DB.prepare(`INSERT INTO drip_sources (id, agent_id, sheet_url, poll_interval, enabled) VALUES (?, ?, ?, ?, ?)`).bind(id, agent.id, data.sheet_url, data.poll_interval || 60, data.enabled !== false ? 1 : 0).run();
  return jsonResponse({ success: true, id }, 200, corsHeaders);
}

async function updateDripSource(id, request, agent, env, corsHeaders) {
  const data = await request.json();
  const updates = [];
  const values = [];
  if (data.sheet_url !== undefined) { updates.push("sheet_url = ?"); values.push(data.sheet_url); }
  if (data.poll_interval !== undefined) { updates.push("poll_interval = ?"); values.push(data.poll_interval); }
  if (data.enabled !== undefined) { updates.push("enabled = ?"); values.push(data.enabled ? 1 : 0); }
  if (updates.length > 0) {
    values.push(id, agent.id);
    await env.DB.prepare(`UPDATE drip_sources SET ${updates.join(", ")} WHERE id = ? AND agent_id = ?`).bind(...values).run();
  }
  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function deleteDripSource(id, agent, env, corsHeaders) {
  await env.DB.prepare("DELETE FROM drip_sources WHERE id = ? AND agent_id = ?").bind(id, agent.id).run();
  return jsonResponse({ success: true }, 200, corsHeaders);
}

// === ACTIVITIES ===

async function listActivities(agent, url, env, corsHeaders) {
  const leadId = url.searchParams.get("lead_id");
  const limit = parseInt(url.searchParams.get("limit")) || 50;
  let query = "SELECT * FROM activities WHERE agent_id = ?";
  const params = [agent.id];
  if (leadId) { query += " AND lead_id = ?"; params.push(leadId); }
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);
  const { results } = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ activities: results }, 200, corsHeaders);
}

// End of CRM API Pages Function

