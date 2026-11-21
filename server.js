// ============================================================
// MAYUR ENTERPRISES — ZERO-DEPENDENCY LOCAL MOBILE SERVER
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(ROOT, reqPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('================================================================');
  console.log('  MAYUR ENTERPRISES — ANDROID MOBILE SERVER RUNNING');
  console.log('================================================================');
  console.log('');
  console.log('  Apne Android Mobile ke Chrome me yeh address daalein:');
  console.log('');
  console.log(`  👉  http://${ip}:${PORT}`);
  console.log('');
  console.log('----------------------------------------------------------------');
  console.log('  MOBILE ME INSTALL KARNE KE LIYE:');
  console.log('  1. Mobile Chrome me upar 3-dots (⋮) par tap karein.');
  console.log('  2. "Install app" ya "Add to Home screen" par tap karein.');
  console.log('  3. Yeh aapke phone me bina kisi file ke App ban jayega!');
  console.log('----------------------------------------------------------------');
  console.log('  (Band karne ke liye is window ko close karein ya Ctrl+C dabayein)');
  console.log('================================================================');
});
