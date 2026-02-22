const http = require('http');
const https = require('https');
const proxy = http.createServer((req, res) => {
  const opts = { hostname: 'localhost', port: 443, path: req.url, method: req.method, headers: {...req.headers}, rejectUnauthorized: false };
  delete opts.headers.host;
  const p = https.request(opts, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  req.pipe(p);
  p.on('error', (e) => { res.writeHead(502); res.end('Proxy error: ' + e.message); });
});
proxy.listen(8081, '127.0.0.1', () => console.log('CF Proxy running on 8081 → localhost:443'));
