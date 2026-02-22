var ALLOWED_ORIGINS = [
  "https://cc.forgedfinancial.us",
  "https://command-center-v7.pages.dev",
  "http://localhost:5173",
];

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Worker-Auth, x-api-key",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const originalUrl = new URL(request.url);
  const path = params.path?.join("/") || "";
  const target = `https://api.forgedfinancial.us/api/comms/${path}${originalUrl.search}`;

  const apiKey = env.SYNC_API_KEY;
  if (!apiKey) return jsonResponse({ error: "SYNC_API_KEY not configured" }, 500, corsHeaders);

  const headers = new Headers(request.headers);
  headers.set("x-api-key", apiKey);

  const init = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const resp = await fetch(target, init);
    const responseHeaders = new Headers(resp.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      responseHeaders.set(k, v);
    }
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}
