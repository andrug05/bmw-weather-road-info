'use strict';
// HTTPS through mgu-uplink; DNS servers are taken from the app's uplink lease.
const https = require('https');
const url = require('url');
const uplink = require('./uplink');
let network = uplink.create(process.cwd());
function configure(dataDir) { network = uplink.create(dataDir || process.cwd()); }

function getJson(href, options) {
  options = options || {};
  return new Promise((resolve, reject) => {
    const parsed = url.parse(href);
    if (parsed.protocol !== 'https:' || !parsed.hostname) {
      reject(new Error('Only HTTPS URLs are supported'));
      return;
    }
    const timeoutMs = Math.max(1000, Number(options.timeout) || 20000);
    const requestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.path,
      method: 'GET',
      headers: { 'User-Agent': 'BMW-Weather-Road-Info/0.2.2', 'Accept': 'application/json' }
    };
    const lookup = network.lookup();
    if (lookup) requestOptions.lookup = lookup;
    let settled = false, timer = null, req = null;
    const fail = err => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    try {
      req = https.request(requestOptions, res => {
        let body = '';
        if (typeof res.setEncoding === 'function') res.setEncoding('utf8');
        res.on('data', chunk => {
          if (settled) return;
          body += chunk;
          if (body.length > 3 * 1024 * 1024) {
            const err = new Error('Response too large');
            try { req.destroy(err); } catch (e) {}
            fail(err);
          }
        });
        res.on('end', () => {
          if (settled) return;
          if (timer) clearTimeout(timer);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            fail(new Error('HTTP ' + res.statusCode));
            return;
          }
          try { settled = true; resolve(JSON.parse(body)); }
          catch (e) { fail(new Error('Invalid JSON: ' + e.message)); }
        });
        res.on('error', fail);
      });
      req.on('error', fail);
      req.on('timeout', () => {
        const err = new Error('Network socket timeout after ' + timeoutMs + ' ms');
        try { req.destroy(err); } catch (e) {}
        fail(err);
      });
      if (typeof req.setTimeout === 'function') req.setTimeout(timeoutMs);
      // Hard deadline also covers DNS lookup stalls before a socket timeout can fire.
      timer = setTimeout(() => {
        const err = new Error('Network request timeout after ' + timeoutMs + ' ms');
        try { req.destroy(err); } catch (e) {}
        fail(err);
      }, timeoutMs);
      req.end();
    } catch (e) { fail(e); }
  });
}
module.exports = { configure, getJson };
