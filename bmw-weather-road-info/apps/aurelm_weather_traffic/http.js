'use strict';
// HTTPS via mgu-uplink per-UID routing. Try every IPv4 address returned by its DNS.
const https = require('https');
const url = require('url');
const uplink = require('./uplink');
let network = uplink.create(process.cwd());
function configure(dataDir) { network = uplink.create(dataDir || process.cwd()); }

function getJson(href, options) {
  options = options || {};
  return new Promise((resolve, reject) => {
    const parsed = url.parse(href);
    if (parsed.protocol !== 'https:' || !parsed.hostname) return reject(new Error('Network: only HTTPS URLs are supported'));
    const host = parsed.hostname;
    const timeoutMs = Math.max(5000, Number(options.timeout) || 20000);
    const status = network.status();
    if (!status.available) return reject(new Error('mgu-uplink lease/DNS unavailable; host=' + host + '; checked=' + (status.path || '/run/mgu-uplink/lease.json')));

    network.resolve(host).then(addresses => {
      let index = 0, lastError = null;
      function attempt() {
        if (index >= addresses.length) {
          const detail = lastError ? (lastError.code ? lastError.code + ': ' : '') + lastError.message : 'unknown error';
          return reject(new Error('Network TCP connect failed; host=' + host + '; tried=' + addresses.join(',') + '; ' + detail));
        }
        const ip = addresses[index++];
        let settled = false, phase = 'TCP connect', timer = null, req = null;
        const fail = err => {
          if (settled) return;
          settled = true;
          if (timer) clearTimeout(timer);
          lastError = err instanceof Error ? err : new Error(String(err));
          if (phase === 'TCP connect' && index < addresses.length) return attempt();
          reject(new Error('Network ' + phase + ' failed; host=' + host + '; ip=' + ip + '; ' +
            (lastError.code ? lastError.code + ': ' : '') + lastError.message));
        };
        try {
          req = https.request({
            hostname: ip, port: parsed.port || 443, path: parsed.path || '/', method: 'GET',
            family: 4, servername: host,
            headers: { 'Host': host, 'User-Agent': 'BMW-Weather-Road-Info/0.2.4', 'Accept': 'application/json' }
          }, res => {
            phase = 'HTTP response';
            let body = '';
            if (res.setEncoding) res.setEncoding('utf8');
            res.on('data', chunk => {
              if (settled) return;
              body += chunk;
              if (body.length > 3 * 1024 * 1024) {
                const e = new Error('Response exceeds 3 MB');
                try { req.destroy(e); } catch (_) {}
                fail(e);
              }
            });
            res.on('end', () => {
              if (settled) return;
              if (timer) clearTimeout(timer);
              if (res.statusCode < 200 || res.statusCode >= 300) return fail(new Error('HTTP status ' + res.statusCode));
              try { settled = true; resolve(JSON.parse(body)); }
              catch (e) { fail(new Error('Invalid JSON: ' + e.message)); }
            });
            res.on('error', fail);
          });
          req.on('socket', socket => {
            socket.on('connect', () => { phase = 'TLS handshake'; });
            socket.on('secureConnect', () => { phase = 'HTTP response'; });
          });
          req.on('error', fail);
          req.on('timeout', () => {
            const e = new Error('socket inactivity timeout after ' + timeoutMs + ' ms');
            try { req.destroy(e); } catch (_) {}
            fail(e);
          });
          if (req.setTimeout) req.setTimeout(timeoutMs);
          timer = setTimeout(() => {
            const e = new Error('deadline exceeded after ' + timeoutMs + ' ms');
            try { req.destroy(e); } catch (_) {}
            fail(e);
          }, timeoutMs);
          req.end();
        } catch (e) { fail(e); }
      }
      attempt();
    }).catch(err => reject(new Error('Network DNS lookup failed; host=' + host + '; ' + err.message)));
  });
}
module.exports = { configure, getJson };
