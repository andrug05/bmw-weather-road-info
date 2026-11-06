'use strict';
// HTTPS transport using the per-UID mgu-uplink route and its DNS lease.
const https = require('https');
const url = require('url');
const uplink = require('./uplink');

let network = uplink.create(process.cwd());
function configure(dataDir) {
  network = uplink.create(dataDir || process.cwd());
}

function getJson(href, options) {
  options = options || {};
  return new Promise((resolve, reject) => {
    const parsed = url.parse(href);
    if (parsed.protocol !== 'https:' || !parsed.hostname) {
      reject(new Error('Network: only HTTPS URLs are supported'));
      return;
    }

    const host = parsed.hostname;
    const timeoutMs = Math.max(5000, Number(options.timeout) || 25000);
    const leaseStatus = network.status();
    const lookup = network.lookup();
    if (!lookup) {
      reject(new Error('mgu-uplink lease/DNS unavailable; host=' + host +
        '; checked=' + (leaseStatus.path || '/run/mgu-uplink/lease.json')));
      return;
    }

    const requestOptions = {
      hostname: host,
      port: parsed.port || 443,
      path: parsed.path || '/',
      method: 'GET',
      family: 4,
      lookup,
      headers: {
        'User-Agent': 'BMW-Weather-Road-Info/0.2.3',
        'Accept': 'application/json'
      }
    };

    let settled = false;
    let phase = 'DNS lookup';
    let timer = null;
    let req = null;

    const fail = err => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const message = err && err.message ? err.message : String(err);
      reject(new Error('Network ' + phase + ' failed; host=' + host + '; ' + message));
    };

    try {
      req = https.request(requestOptions, res => {
        phase = 'HTTP response';
        let body = '';
        if (typeof res.setEncoding === 'function') res.setEncoding('utf8');
        res.on('data', chunk => {
          if (settled) return;
          body += chunk;
          if (body.length > 3 * 1024 * 1024) {
            const err = new Error('Response exceeds 3 MB');
            try { req.destroy(err); } catch (e) {}
            fail(err);
          }
        });
        res.on('end', () => {
          if (settled) return;
          if (timer) clearTimeout(timer);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            fail(new Error('HTTP status ' + res.statusCode));
            return;
          }
          try {
            settled = true;
            resolve(JSON.parse(body));
          } catch (e) {
            fail(new Error('Invalid JSON: ' + e.message));
          }
        });
        res.on('error', fail);
      });

      req.on('socket', socket => {
        socket.on('lookup', (err) => {
          if (err) return fail(err);
          phase = 'TCP connect';
        });
        socket.on('connect', () => { phase = 'TLS handshake'; });
        socket.on('secureConnect', () => { phase = 'HTTP response'; });
      });
      req.on('error', fail);
      req.on('timeout', () => {
        const err = new Error('socket inactivity timeout after ' + timeoutMs + ' ms');
        try { req.destroy(err); } catch (e) {}
        fail(err);
      });
      if (typeof req.setTimeout === 'function') req.setTimeout(timeoutMs);

      timer = setTimeout(() => {
        const err = new Error('deadline exceeded after ' + timeoutMs + ' ms');
        try { req.destroy(err); } catch (e) {}
        fail(err);
      }, timeoutMs);
      req.end();
    } catch (e) {
      fail(e);
    }
  });
}

module.exports = { configure, getJson };
