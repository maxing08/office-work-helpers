const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg' };
http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(target, (error, data) => { if (error) { res.writeHead(404); res.end('Not found'); return; } res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(data); });
  } catch { res.writeHead(400); res.end('Bad request'); }
}).listen(8765, '127.0.0.1', () => process.stdout.write('Local: http://127.0.0.1:8765\n'));
