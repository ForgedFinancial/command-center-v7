const CRM_API = 'https://yncrm-api.danielruh.workers.dev';

let cachedToken = null;
let tokenExpiry = 0;

async function getToken(env) {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch(`${CRM_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.CRM_EMAIL,
      password: env.CRM_PASSWORD,
    }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('CRM auth failed');
  cachedToken = data.token;
  tokenExpiry = Date.now() + 6 * 24 * 60 * 60 * 1000;
  return cachedToken;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = '/' + (params.path?.join('/') || '');
  const url = new URL(request.url);
  const target = `${CRM_API}${path}${url.search}`;

  try {
    const token = await getToken(env);
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');

    const proxyRes = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
    });

    const body = await proxyRes.text();
    return new Response(body, {
      status: proxyRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
